// Cloudflare Worker entry: dashboard API + MCP endpoint + a light cron engine pass.
// The dashboard itself is served as static assets without invoking the Worker (see wrangler.jsonc).
import { MongoClient } from 'mongodb';
import { aiFromEnv } from '../core/ai';
import { tick } from '../core/engine';
import type { Ctx, Storage } from '../core/types';
import { engineActor } from '../core/types';
import { createApp } from './app';

interface Bucket {
  put(key: string, value: Uint8Array, options?: { httpMetadata?: Record<string, string> }): Promise<unknown>;
  head(key: string): Promise<{ size: number } | null>;
  delete(key: string): Promise<void>;
}
interface Env { MONGODB_URI?: string; CMS_DB_NAME?: string; MONGODB_DB_NAME?: string; CMS_WORKER_IMAGES?: string; IMAGES_BUCKET?: Bucket; [key: string]: unknown }
interface Execution { waitUntil(promise: Promise<unknown>): void }

function runtime(env: Env) {
  const vars = Object.fromEntries(Object.entries(env).filter(([, v]) => typeof v === 'string')) as Record<string, string>;
  if (!vars.MONGODB_URI) throw new Error('MONGODB_URI secret is not set on this Worker.');
  // Workers cannot keep sockets across requests: one short-lived client per invocation, closed afterwards.
  const client = new MongoClient(vars.MONGODB_URI, { maxPoolSize: 2, serverSelectionTimeoutMS: 10_000, connectTimeoutMS: 8_000 });
  const bucket = env.IMAGES_BUCKET;
  const storage: Storage | null = bucket ? {
    kind: 'r2-binding',
    async put(key, bytes, contentType) { await bucket.put(key, bytes, { httpMetadata: { contentType, cacheControl: 'public, max-age=31536000, immutable' } }); },
    async head(key) { const object = await bucket.head(key); return object ? { size: object.size } : null; },
    delete: key => bucket.delete(key),
  } : null;
  let connected: Promise<unknown> | null = null;
  const base = async (): Promise<Omit<Ctx, 'actor'>> => {
    await (connected ||= client.connect());
    return {
      client, db: client.db(vars.CMS_DB_NAME || vars.MONGODB_DB_NAME || 'animesparks'), env: vars, storage: () => storage, ai: aiFromEnv(vars),
      // No image optimizer at the edge: image jobs are left for a Node runner unless originals are explicitly allowed.
      capabilities: new Set(vars.CMS_WORKER_IMAGES === 'true' && storage ? ['images'] : []), fetch: (input, init) => fetch(input, init),
    };
  };
  return { vars, base, close: () => (connected ? client.close().catch(() => {}) : Promise.resolve()) };
}

export default {
  async fetch(request: Request, env: Env, execution: Execution): Promise<Response> {
    const rt = runtime(env);
    try { return await createApp({ base: rt.base, env: rt.vars, secureCookies: new URL(request.url).protocol === 'https:' }).fetch(request); }
    catch (error) { console.error('[cms] worker request failed:', (error as Error).message); return Response.json({ error: { code: 'unavailable', message: 'CMS backend unavailable.' } }, { status: 503 }); }
    finally { execution.waitUntil(rt.close()); }
  },
  async scheduled(_event: unknown, env: Env, execution: Execution) {
    const rt = runtime(env);
    execution.waitUntil((async () => {
      try { console.log('[engine]', JSON.stringify(await tick({ ...(await rt.base()), actor: engineActor }, { workerId: `worker:${crypto.randomUUID().slice(0, 8)}`, maxJobs: 3 }))); }
      catch (error) { console.error('[engine] pass failed:', (error as Error).message); }
      finally { await rt.close(); }
    })());
  },
};
