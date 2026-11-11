import type { Db } from 'mongodb';
import type { Actor, Ctx, Scope } from './types';
import { CmsError } from './types';
import { cms, projectFor } from './projects';
import { digest, now } from './util';

export const SCOPES: Scope[] = ['read', 'write', 'media', 'publish', 'admin'];

/** Project API credentials. Only the SHA-256 hash is stored; the raw token is shown once. */
export async function createToken(ctx: Ctx, projectId: string, input: { name: string; scopes: Scope[] }) {
  await projectFor(ctx, projectId, 'admin');
  const scopes = [...new Set(input.scopes)].filter(s => SCOPES.includes(s) && s !== 'admin');
  if (!scopes.length) throw new CmsError(400, 'invalid', 'Choose at least one permission.');
  const raw = `cms_${crypto.randomUUID().replace(/-/g, '')}${crypto.randomUUID().replace(/-/g, '')}`;
  const doc = { _id: crypto.randomUUID(), name: input.name.slice(0, 80) || 'API token', hash: await digest('SHA-256', raw), projectIds: [projectId], scopes, createdAt: now(), createdBy: ctx.actor.id };
  await cms(ctx).tokens.insertOne(doc);
  return { id: doc._id, name: doc.name, scopes, token: raw };
}
export async function listTokens(ctx: Ctx, projectId: string) {
  await projectFor(ctx, projectId, 'admin');
  return cms(ctx).tokens.find({ projectIds: projectId }, { projection: { hash: 0 } }).sort({ createdAt: -1 }).toArray();
}
export async function revokeToken(ctx: Ctx, projectId: string, id: string) {
  await projectFor(ctx, projectId, 'admin');
  const result = await cms(ctx).tokens.deleteOne({ _id: id, projectIds: projectId });
  if (!result.deletedCount) throw new CmsError(404, 'not_found', 'Token not found.');
}
export async function actorFromToken(db: Db, raw: string | undefined | null): Promise<Actor | null> {
  if (!raw || !/^cms_[a-f0-9]{64}$/.test(raw)) return null;
  const tokens = cms({ db }).tokens;
  const doc = await tokens.findOneAndUpdate({ hash: await digest('SHA-256', raw) }, { $set: { lastUsedAt: now() } });
  return doc ? { type: 'token', id: `token:${doc.name}`, scopes: new Set(doc.scopes), projectIds: doc.projectIds } : null;
}

/** Fixed-window limiter stored in MongoDB so it holds across isolates and processes. */
export async function rateLimit(db: Db, identity: string, perMinute: number) {
  const minute = Math.floor(Date.now() / 60000);
  const doc = await cms({ db }).rateLimits.findOneAndUpdate(
    { _id: `${identity}:${minute}` }, { $inc: { count: 1 }, $setOnInsert: { expiresAt: new Date((minute + 2) * 60000) } }, { upsert: true, returnDocument: 'after' });
  if ((doc?.count || 0) > perMinute) throw new CmsError(429, 'rate_limited', 'Too many requests. Retry in a minute.');
}
