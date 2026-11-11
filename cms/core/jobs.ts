import type { Filter } from 'mongodb';
import type { Ctx, Job, JobType } from './types';
import { CmsError, notFound } from './types';
import { cms, projectFor, type Activity } from './projects';
import { now, uid } from './util';

export async function log(ctx: Ctx, entry: Omit<Activity, 'at' | 'actor' | 'level'> & { level?: Activity['level'] }) {
  await cms(ctx).activity.insertOne({ level: 'info', ...entry, actor: ctx.actor.id, at: now() });
}
export async function listActivity(ctx: Ctx, projectId: string, opts: { articleId?: string; types?: string[]; limit?: number; before?: string } = {}) {
  await projectFor(ctx, projectId, 'read');
  const filter: Filter<Activity> = { projectId };
  if (opts.articleId) filter.articleId = opts.articleId;
  if (opts.types?.length) filter.type = { $in: opts.types };
  if (opts.before) filter.at = { $lt: opts.before };
  return cms(ctx).activity.find(filter, { projection: { _id: 0 } }).sort({ at: -1 }).limit(Math.min(opts.limit || 50, 200)).toArray();
}

/**
 * Durable queue in MongoDB. The unique idempotency key makes enqueueing safe to repeat:
 * the same work is never queued twice, whoever asks (dashboard, MCP, scanner).
 */
export async function enqueue(ctx: Ctx, input: { projectId: string; articleId?: string; type: JobType; idempotencyKey: string; payload?: Record<string, unknown>; runAt?: string; maxAttempts?: number; requires?: string[] }) {
  const job: Job = {
    _id: uid('job_'), status: 'queued', attempts: 0, maxAttempts: input.maxAttempts ?? 5, runAt: input.runAt || now(), createdAt: now(), updatedAt: now(),
    projectId: input.projectId, articleId: input.articleId, type: input.type, idempotencyKey: input.idempotencyKey, payload: input.payload, requires: input.requires || [],
  };
  try { await cms(ctx).jobs.insertOne(job); return { job, created: true }; }
  catch (error) {
    if ((error as { code?: number }).code !== 11000) throw error;
    const existing = await cms(ctx).jobs.findOne({ idempotencyKey: input.idempotencyKey });
    return { job: existing!, created: false };
  }
}

const LOCK_MS = 5 * 60_000;
/** Atomically claims one due job this runtime can execute. Stale locks (crashed workers) are reclaimed. */
export async function claim(ctx: Ctx, workerId: string): Promise<Job | null> {
  const at = now();
  const capable = { $or: [{ requires: { $exists: false } }, { requires: { $not: { $elemMatch: { $nin: [...ctx.capabilities] } } } }] };
  return cms(ctx).jobs.findOneAndUpdate(
    { $and: [capable, { $or: [{ status: 'queued', runAt: { $lte: at } }, { status: 'running', lockedUntil: { $lt: at } }] }] },
    { $set: { status: 'running', lockedBy: workerId, lockedUntil: new Date(Date.now() + LOCK_MS).toISOString(), updatedAt: at }, $inc: { attempts: 1 } },
    { sort: { runAt: 1 }, returnDocument: 'after' });
}
export async function complete(ctx: Ctx, job: Job, result: unknown) {
  await cms(ctx).jobs.updateOne({ _id: job._id, lockedBy: job.lockedBy }, { $set: { status: 'succeeded', result, updatedAt: now(), finishedAt: now() }, $unset: { lockedBy: '', lockedUntil: '', error: '' } });
}
/** Put a claimed job back without counting the attempt (e.g. the article is locked by another job). */
export async function defer(ctx: Ctx, job: Job, seconds: number) {
  await cms(ctx).jobs.updateOne({ _id: job._id }, { $set: { status: 'queued', runAt: new Date(Date.now() + seconds * 1000).toISOString(), updatedAt: now() }, $inc: { attempts: -1 }, $unset: { lockedBy: '', lockedUntil: '' } });
}
/** Retryable errors back off exponentially (30s, 1m, 2m … capped at 1h); exhausted jobs are dead-lettered. */
export async function fail(ctx: Ctx, job: Job, error: unknown) {
  const message = error instanceof Error ? error.message : String(error);
  const permanent = error instanceof CmsError && error.status < 500 && error.status !== 429;
  const status = permanent ? 'failed' : job.attempts >= job.maxAttempts ? 'dead' : 'queued';
  const runAt = new Date(Date.now() + Math.min(30_000 * 2 ** (job.attempts - 1), 3_600_000)).toISOString();
  await cms(ctx).jobs.updateOne({ _id: job._id }, {
    $set: { status, error: message.slice(0, 1000), updatedAt: now(), ...(status === 'queued' ? { runAt } : { finishedAt: now() }) }, $unset: { lockedBy: '', lockedUntil: '' } });
  return { status, retryAt: status === 'queued' ? runAt : undefined, message };
}

export async function listJobs(ctx: Ctx, projectId: string, opts: { status?: string[]; articleId?: string; limit?: number } = {}) {
  await projectFor(ctx, projectId, 'read');
  const filter: Filter<Job> = { projectId };
  if (opts.status?.length) filter.status = { $in: opts.status as Job['status'][] };
  if (opts.articleId) filter.articleId = opts.articleId;
  return cms(ctx).jobs.find(filter).sort({ updatedAt: -1 }).limit(Math.min(opts.limit || 50, 200)).toArray();
}
export async function retryJob(ctx: Ctx, projectId: string, jobId: string) {
  await projectFor(ctx, projectId, 'write');
  const job = await cms(ctx).jobs.findOneAndUpdate(
    { _id: jobId, projectId, status: { $in: ['failed', 'dead'] } },
    { $set: { status: 'queued', attempts: 0, runAt: now(), updatedAt: now() }, $unset: { finishedAt: '' } }, { returnDocument: 'after' });
  if (!job) {
    if (await cms(ctx).jobs.findOne({ _id: jobId, projectId })) throw new CmsError(409, 'conflict', 'Only failed jobs can be retried.');
    throw notFound('Job');
  }
  await log(ctx, { projectId, articleId: job.articleId, type: 'job.retry', message: `Retry requested for ${job.type}` });
  return job;
}
