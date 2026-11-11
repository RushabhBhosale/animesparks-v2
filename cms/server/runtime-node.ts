import { existsSync, mkdirSync, readFileSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { MongoClient } from 'mongodb';
import sharp from 'sharp';
import { aiFromEnv } from '../core/ai';
import { bootstrapAnimeSparks, ensureIndexes } from '../core/projects';
import type { Ctx, Optimizer, Project, Storage } from '../core/types';
import { engineActor } from '../core/types';

export const CMS_DIR = resolve(dirname(fileURLToPath(import.meta.url)), '..');

/** process.env wins, then cms/.env, then the site's .dev.vars (so the existing MONGODB_URI is reused). */
export function loadEnv(): Record<string, string | undefined> {
  const env: Record<string, string | undefined> = {};
  for (const file of [join(CMS_DIR, '..', '.dev.vars'), join(CMS_DIR, '.env')]) {
    if (!existsSync(file)) continue;
    for (const line of readFileSync(file, 'utf8').split(/\r?\n/)) {
      const match = /^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/.exec(line);
      if (!match || line.trim().startsWith('#')) continue;
      let value = match[2];
      if (/^".*"$/.test(value)) { try { value = JSON.parse(value); } catch { value = value.slice(1, -1); } }
      else if (/^'.*'$/.test(value)) value = value.slice(1, -1);
      env[match[1]] = value;
    }
  }
  return { ...env, ...process.env };
}

function localStorage(dir: string, publicBase: string): Storage {
  const path = (key: string) => { const full = resolve(dir, key); if (!full.startsWith(resolve(dir))) throw new Error('Invalid storage key'); return full; };
  return {
    kind: 'local', publicBase,
    async put(key, bytes) { mkdirSync(dirname(path(key)), { recursive: true }); writeFileSync(path(key), bytes); },
    async head(key) { try { return { size: statSync(path(key)).size }; } catch { return null; } },
    async delete(key) { rmSync(path(key), { force: true }); },
  };
}
/** R2 through the Cloudflare REST API (API token with R2 write access). Existence is checked on the public domain, which is what readers hit. */
function r2Api(env: Record<string, string | undefined>, bucket: string, publicBaseUrl: string): Storage | null {
  const account = env.CLOUDFLARE_ACCOUNT_ID;
  const token = () => {
    if (env.CLOUDFLARE_API_TOKEN) return env.CLOUDFLARE_API_TOKEN;
    if (env.CMS_USE_WRANGLER_LOGIN !== 'true') return undefined;
    for (const file of [join(homedir(), 'Library/Preferences/.wrangler/config/default.toml'), join(homedir(), '.config/.wrangler/config/default.toml')]) {
      const match = existsSync(file) && /oauth_token\s*=\s*"([^"]+)"/.exec(readFileSync(file, 'utf8'));
      if (match) return match[1];
    }
  };
  if (!account || !token()) return null;
  const url = (key: string) => `https://api.cloudflare.com/client/v4/accounts/${account}/r2/buckets/${bucket}/objects/${key.split('/').map(encodeURIComponent).join('/')}`;
  const call = async (key: string, init: RequestInit) => {
    const response = await fetch(url(key), { ...init, headers: { Authorization: `Bearer ${token()}`, ...init.headers } });
    if (!response.ok) throw new Error(`R2 ${init.method} ${key} failed: HTTP ${response.status} ${(await response.text()).slice(0, 200)}`);
  };
  return {
    kind: `r2:${bucket}`,
    put: (key, bytes, contentType) => call(key, { method: 'PUT', headers: { 'Content-Type': contentType, 'Cache-Control': 'public, max-age=31536000, immutable' }, body: bytes as BodyInit }),
    async head(key) {
      const response = await fetch(`${publicBaseUrl.replace(/\/$/, '')}/${key.split('/').map(encodeURIComponent).join('/')}`, { method: 'HEAD', headers: { 'Cache-Control': 'no-cache' } });
      return response.ok ? { size: Number(response.headers.get('content-length') || 0) } : null;
    },
    delete: key => call(key, { method: 'DELETE' }),
  };
}

const optimize: Optimizer = async (bytes, { maxWidth, quality }) => {
  const { data, info } = await sharp(bytes, { failOn: 'error' }).rotate().resize({ width: maxWidth, withoutEnlargement: true }).webp({ quality }).toBuffer({ resolveWithObject: true });
  return { bytes: new Uint8Array(data), width: info.width, height: info.height, mimeType: 'image/webp', ext: 'webp' };
};

export async function createNodeRuntime() {
  const env = loadEnv();
  if (!env.MONGODB_URI) throw new Error('MONGODB_URI is not set (cms/.env or the site .dev.vars).');
  const client = new MongoClient(env.MONGODB_URI, { maxPoolSize: 8, serverSelectionTimeoutMS: 10_000 });
  await client.connect();
  const db = client.db(env.CMS_DB_NAME || env.MONGODB_DB_NAME || 'animesparks');
  const port = Number(env.CMS_PORT || 4400);
  const publicUrl = (env.CMS_PUBLIC_URL || `http://localhost:${port}`).replace(/\/$/, '');
  const mediaDir = resolve(CMS_DIR, env.CMS_LOCAL_MEDIA_DIR || '.data/media');
  const mode = env.CMS_STORAGE || 'r2';
  if (mode === 'local') mkdirSync(mediaDir, { recursive: true });
  const stores = new Map<string, Storage | null>();
  const storage = (project: Project) => {
    const key = mode === 'local' ? 'local' : `${project.media.bucket || env.R2_BUCKET}|${project.media.publicBaseUrl}`;
    if (!stores.has(key)) {
      const bucket = project.media.bucket || env.R2_BUCKET;
      stores.set(key, mode === 'local' ? localStorage(mediaDir, `${publicUrl}/media-files`) : bucket ? r2Api(env, bucket, project.media.publicBaseUrl) : null);
    }
    return stores.get(key)!;
  };
  const base: Omit<Ctx, 'actor'> = { client, db, env, storage, optimize, ai: aiFromEnv(env), capabilities: new Set(['images']), fetch: (input, init) => fetch(input, init) };
  await ensureIndexes(base);
  await bootstrapAnimeSparks({ ...base, actor: engineActor });
  return { base, env, port, publicUrl, mediaDir, storageMode: mode, close: () => client.close() };
}
