import type { Article, ArticleMeta, Ctx, Issue, Job, Project, Status } from './types';
import { CmsError, engineActor } from './types';
import { articleId, ensureMeta, findArticle, metaId, queueProcessing, setStatus, withArticleLock } from './articles';
import { cms, collections, getProject, projectFor } from './projects';
import { claim, complete, defer, enqueue, fail, log } from './jobs';
import { CATALOG_ENDPOINT, CATALOG_QUERY, catalogFrom, imageSearches, processImages } from './images';
import { verifyMedia } from './media';
import { advance, performPublish, verifyLive } from './publish';
import { blocking, evaluate, inlineImages, inlineTargets } from './quality';
import { repairMetadata } from './repair';
import { contentHash, now } from './util';

const statusFor = (issues: Issue[]): Status | null => {
  const errors = blocking(issues);
  if (errors.some(i => i.group !== 'media')) return 'needs_repair';
  if (errors.length) return 'awaiting_media';
  return null;
};
async function saveEvaluation(ctx: Ctx, meta: ArticleMeta, issues: Issue[], hash: string, processed: boolean) {
  await cms(ctx).meta.updateOne({ _id: meta._id }, { $set: { issues, evaluatedHash: hash, ...(processed ? { processedHash: hash } : {}), updatedAt: now() } as Partial<ArticleMeta> });
  meta.issues = issues;
}
async function queueImagesForRunner(ctx: Ctx, project: Project, id: string, note: string) {
  const waiting = await cms(ctx).jobs.findOne({ projectId: project._id, articleId: id, type: 'process_images', status: { $in: ['queued', 'running'] } });
  const { job, created } = waiting ? { job: waiting, created: false } : await enqueue(ctx, {
    projectId: project._id, articleId: id, type: 'process_images', idempotencyKey: `images:${project._id}:${id}:manual:${Date.now()}`,
    requires: ['images'], maxAttempts: project.automation.maxAttempts,
  });
  return { queued: true as const, jobId: job._id, created, note };
}

/**
 * The autonomous workflow for one article: repair metadata → images → verify → decide.
 * Every step is idempotent, so a retry after any failure resumes safely.
 */
export async function processArticle(ctx: Ctx, project: Project, id: string, opts: { images?: boolean } = {}) {
  let article = await findArticle(ctx, project, id);
  let meta = await ensureMeta(ctx, project, article);
  const published = article.publicationState === 'published';
  let repaired: Array<{ field: string; note?: string }> = [];
  if (project.repair.enabled && !(published && opts.images)) ({ article, meta, repaired } = await repairMetadata(ctx, project, article, { includePublished: published }));
  let issues = await evaluate(ctx, project, article, meta);

  let images: Awaited<ReturnType<typeof processImages>> | undefined;
  const mediaWork = opts.images || (published
    ? !article.mainImage?.asset?.r2Key || inlineImages(article.body).length < inlineTargets(project, article).target
    : issues.some(i => i.group === 'media' && i.repairable && i.severity === 'error'));
  if (mediaWork && project.media.enabled) {
    if (!ctx.capabilities.has('images')) {
      // This runtime cannot process images (e.g. an edge worker): hand over to a runner that can.
      const note = 'Image processing queued for an image-capable runner.';
      const hash = await contentHash(article);
      if (published) {
        const job = await queueImagesForRunner(ctx, project, id, note);
        await saveEvaluation(ctx, meta, issues, hash, false);
        return { ...job, status: meta.status, issues, repaired };
      }
      await enqueue(ctx, { projectId: project._id, articleId: id, type: 'process_images', idempotencyKey: `images:${project._id}:${id}:${hash}`, requires: ['images'], maxAttempts: project.automation.maxAttempts });
      if (meta.status !== 'awaiting_media') await setStatus(ctx, meta, 'awaiting_media', { issues });
      return { status: meta.status, issues, repaired, note };
    }
    images = await processImages(ctx, project, article);
    article = await findArticle(ctx, project, id);
    meta = (await cms(ctx).meta.findOne({ _id: meta._id }))!;
  }
  issues = await evaluate(ctx, project, article, meta, { verifyMedia: !!ctx.storage(project) });
  await saveEvaluation(ctx, meta, issues, await contentHash(article), true);

  const blocked = statusFor(issues);
  let outcome: Record<string, unknown> = {};
  if (!published) {
    if (blocked) { if (meta.status !== blocked) await setStatus(ctx, meta, blocked); }
    else outcome = await advance(ctx, project, article, meta);
  }
  const status = (await cms(ctx).meta.findOne({ _id: meta._id }, { projection: { status: 1 } }))!.status;
  await log(ctx, {
    projectId: project._id, articleId: id, title: article.title, type: 'article.processed', level: blocked ? 'warning' : 'success',
    message: blocked ? `Processed — ${status.replace('_', ' ')}: ${blocking(issues).map(i => i.message).join(' ')}` : `Processed — ${status.replace('_', ' ')}`,
    data: { repaired: repaired.map(r => r.field), images },
  });
  return { status, issues, repaired, images, ...outcome };
}

async function run(ctx: Ctx, job: Job): Promise<unknown> {
  const project = await getProject(ctx, job.projectId);
  if (job.type === 'verify_media') return verifyMedia(ctx, project._id, job.payload?.keys as string[] | undefined);
  const id = job.articleId!;
  const result = await withArticleLock(ctx, project, id, job._id, async () => {
    const article = await findArticle(ctx, project, id), meta = await ensureMeta(ctx, project, article);
    switch (job.type) {
      case 'process_article': return processArticle(ctx, project, id);
      case 'process_images': return processArticle(ctx, project, id, { images: true });
      case 'publish_article': return performPublish(ctx, project, article, meta);
      case 'verify_live': return verifyLive(ctx, project, article, meta);
    }
  });
  if (result === 'locked') throw new Deferred();
  return result;
}
class Deferred extends Error {}

/** Unchanged articles are never queued twice: the job key includes the content fingerprint. */
export async function scan(ctx: Ctx) {
  const projects = await cms(ctx).projects.find({ 'automation.enabled': true }).toArray();
  let queued = 0, evaluated = 0;
  for (const project of projects) {
    const drafts = await collections(ctx, project).articles.find({ publicationState: { $ne: 'published' } }, { projection: { sourceDocument: 0, sourceUnknownFields: 0 } }).sort({ updatedAt: -1 }).limit(300).toArray();
    const metas = new Map((await cms(ctx).meta.find({ _id: { $in: drafts.map(d => metaId(project, articleId(d))) } }).toArray()).map(m => [m.articleId, m as ArticleMeta & { evaluatedHash?: string }]));
    for (const draft of drafts) {
      const id = articleId(draft), hash = await contentHash(draft), known = metas.get(id);
      if (known?.processedHash === hash || known?.status === 'publishing') continue;
      // Drafts that predate automation are only inspected (they show up in the repair queue); newer ones are processed.
      const since = project.automation.enabledAt || project.createdAt;
      if ((draft.updatedAt || draft.createdAt || '') >= since || known?.intent) {
        // A job already waiting (e.g. inside an editor's grace period) is left alone.
        if (await cms(ctx).jobs.findOne({ projectId: project._id, articleId: id, type: 'process_article', status: { $in: ['queued', 'running'] } }, { projection: { _id: 1 } })) continue;
        if ((await queueProcessing(ctx, project, id, hash))?.created) queued++;
      }
      else if (known?.evaluatedHash !== hash) {
        const meta = known || await ensureMeta(ctx, project, draft);
        await saveEvaluation(ctx, meta, await evaluate(ctx, project, draft, meta), hash, false);
        evaluated++;
      }
    }
    const due = await cms(ctx).meta.find({ projectId: project._id, status: 'scheduled', scheduledAt: { $lte: now() } }).limit(50).toArray();
    for (const meta of due) if ((await enqueue(ctx, { projectId: project._id, articleId: meta.articleId, type: 'publish_article', idempotencyKey: `publish:${project._id}:${meta.articleId}:${meta.scheduledAt}`, maxAttempts: project.automation.maxAttempts })).created) queued++;
  }
  return { queued, evaluated };
}

/** One engine pass. Safe to run from any number of runners at once (cron worker, Node daemon, CLI). */
export async function tick(base: Ctx, opts: { workerId: string; maxJobs?: number; scan?: boolean } = { workerId: 'engine' }) {
  const ctx: Ctx = { ...base, actor: engineActor };
  const summary = { scanned: opts.scan === false ? null : await scan(ctx), ran: 0, succeeded: 0, failed: 0, deferred: 0 };
  for (let i = 0; i < (opts.maxJobs ?? 10); i++) {
    const job = await claim(ctx, opts.workerId);
    if (!job) break;
    summary.ran++;
    try { await complete(ctx, job, await run(ctx, job)); summary.succeeded++; }
    catch (error) {
      if (error instanceof Deferred) { await defer(ctx, job, 20); summary.deferred++; continue; }
      const outcome = await fail(ctx, job, error);
      summary.failed++;
      const quiet = job.type === 'verify_live' && outcome.status === 'queued';
      if (!quiet) await log(ctx, {
        projectId: job.projectId, articleId: job.articleId, type: 'job.failed', level: outcome.status === 'queued' ? 'warning' : 'error',
        message: `${job.type} failed (attempt ${job.attempts}/${job.maxAttempts}): ${outcome.message}${outcome.retryAt ? ` — retrying at ${outcome.retryAt}` : outcome.status === 'dead' ? ' — retries exhausted, needs attention' : ' — needs attention'}`,
        data: { jobId: job._id, details: error instanceof CmsError ? error.details : undefined },
      }).catch(() => {});
      if (outcome.status !== 'queued' && job.articleId && job.type !== 'verify_live') {
        // A job that will not be retried must leave the article in a visible, recoverable state.
        const meta = await cms(ctx).meta.findOne({ _id: `${job.projectId}:${job.articleId}` });
        if (meta && !['published', 'failed'].includes(meta.status) && !(error instanceof CmsError && error.status === 422))
          await cms(ctx).meta.updateOne({ _id: meta._id }, { $set: { status: 'failed', lastError: outcome.message, updatedAt: now() } });
      }
    }
  }
  return summary;
}

// ── Services shared by the dashboard, REST API and MCP tools ─────────────────
export async function validateArticle(ctx: Ctx, projectId: string, id: string) {
  const project = await projectFor(ctx, projectId, 'read');
  const article = await findArticle(ctx, project, id), meta = await ensureMeta(ctx, project, article);
  const issues = await evaluate(ctx, project, article, meta, { verifyMedia: !!ctx.storage(project) });
  await saveEvaluation(ctx, meta, issues, await contentHash(article), false);
  return { id, status: meta.status, ready: !blocking(issues).length, errors: blocking(issues), warnings: issues.filter(i => i.severity === 'warning') };
}
export async function repairArticle(ctx: Ctx, projectId: string, id: string, opts: { includePublished?: boolean } = {}) {
  const project = await projectFor(ctx, projectId, 'write');
  const result = await repairMetadata(ctx, project, await findArticle(ctx, project, id), opts);
  const next = statusFor(result.issues);
  if (result.article.publicationState !== 'published' && next && result.meta.status !== next && !['publishing', 'scheduled'].includes(result.meta.status)) await setStatus(ctx, result.meta, next);
  return { id, repaired: result.repaired, unresolved: result.unresolved, remainingIssues: result.issues, status: next || result.meta.status };
}
/**
 * Runs the image pipeline now when this runtime can, otherwise queues it for a runner that can.
 * The Worker can use the library, an official trailer, or catalogue results from the caller.
 */
export async function processArticleImages(ctx: Ctx, projectId: string, id: string, opts: { catalog?: Record<string, unknown[]> } = {}) {
  const project = await projectFor(ctx, projectId, 'media');
  const canLookupCatalogue = ctx.capabilities.has('images');
  const canStoreImages = ctx.capabilities.has('image-store');
  const catalog = !canLookupCatalogue && canStoreImages && opts.catalog ? catalogFrom(opts.catalog) : undefined;
  const queueImages = (note: string) => queueImagesForRunner(ctx, project, id, note);
  const result = await withArticleLock(ctx, project, id, `manual:${ctx.actor.id}:${crypto.randomUUID()}`, async () => {
    const article = await findArticle(ctx, project, id);
    const meta = await ensureMeta(ctx, project, article);
    if (meta.mediaReview) await cms(ctx).meta.updateOne({ _id: meta._id }, { $unset: { mediaReview: '' } });
    if (!canLookupCatalogue && !canStoreImages) return queueImages('Image processing was queued for the background runner.');

    const { retryOnRunner, ...images } = await processImages(ctx, project, article, { catalog });
    const fresh = await findArticle(ctx, project, id), freshMeta = (await cms(ctx).meta.findOne({ _id: meta._id }))!;
    const issues = await evaluate(ctx, project, fresh, freshMeta, { verifyMedia: !!ctx.storage(project) });
    await saveEvaluation(ctx, freshMeta, issues, await contentHash(fresh), false);
    const blocked = statusFor(issues);
    if (fresh.publicationState !== 'published') {
      if (blocked) { if (freshMeta.status !== blocked && !['publishing', 'scheduled'].includes(freshMeta.status)) await setStatus(ctx, freshMeta, blocked); }
      else await advance(ctx, project, fresh, freshMeta);
    }
    const status = (await cms(ctx).meta.findOne({ _id: meta._id }, { projection: { status: 1 } }))!.status;
    const job = retryOnRunner
      ? await queueImages(`${retryOnRunner} Image processing was queued for the background runner.`)
      : { queued: false as const };
    return { ...job, ...images, status, ready: !blocked, remainingIssues: blocking(issues) };
  });
  if (result === 'locked') throw new CmsError(409, 'locked', 'Article is being processed by the engine right now; try again in a moment.');
  return result;
}
/** Tells a client whether it must supply catalogue results itself, and which searches to run. */
export async function imagePlan(ctx: Ctx, projectId: string, id: string) {
  const project = await projectFor(ctx, projectId, 'media');
  const article = await findArticle(ctx, project, id);
  const clientLookup = !ctx.capabilities.has('images') && ctx.capabilities.has('image-store') && project.media.enabled && project.media.providers.includes('anilist') && !article.officialTrailerUrl;
  return { clientLookup, endpoint: CATALOG_ENDPOINT, query: CATALOG_QUERY, searches: clientLookup ? imageSearches(project, article) : [] };
}
export async function requestProcessing(ctx: Ctx, projectId: string, id: string) {
  const project = await projectFor(ctx, projectId, 'write');
  const article = await findArticle(ctx, project, id);
  const meta = await ensureMeta(ctx, project, article);
  if (meta.mediaReview) await cms(ctx).meta.updateOne({ _id: meta._id }, { $unset: { mediaReview: '' } });
  if (meta.status === 'failed') await setStatus(ctx, meta, 'draft', {}, ['lastError']);
  const queued = await queueProcessing(ctx, project, id, await contentHash(article), true);
  return { queued: true, jobId: queued!.job._id };
}

export async function overview(ctx: Ctx, projectId: string) {
  const project = await projectFor(ctx, projectId, 'read');
  const { articles, assets } = collections(ctx, project), c = cms(ctx);
  const unpublished = { publicationState: { $ne: 'published' } } as const;
  const week = new Date(Date.now() - 7 * 86400_000).toISOString();
  const [total, published, drafts, noHero, statusRows, metaIssues, mediaIssues, failedJobs, queuedJobs, processed, mediaCount, recent] = await Promise.all([
    articles.countDocuments({}), articles.countDocuments({ publicationState: 'published' }), articles.countDocuments(unpublished),
    articles.countDocuments({ ...unpublished, 'mainImage.asset.r2Key': { $in: [null, ''] } } as never),
    c.meta.aggregate<{ _id: Status; n: number }>([{ $match: { projectId } }, { $group: { _id: '$status', n: { $sum: 1 } } }]).toArray(),
    c.meta.countDocuments({ projectId, status: { $ne: 'published' }, issues: { $elemMatch: { group: 'metadata', severity: 'error' } } }),
    c.meta.countDocuments({ projectId, status: { $ne: 'published' }, issues: { $elemMatch: { group: 'media', severity: 'error' } } }),
    c.jobs.countDocuments({ projectId, status: { $in: ['failed', 'dead'] } }), c.jobs.countDocuments({ projectId, status: { $in: ['queued', 'running'] } }),
    c.jobs.countDocuments({ projectId, type: 'process_article', status: 'succeeded', finishedAt: { $gte: week } }),
    assets.estimatedDocumentCount(), c.activity.find({ projectId }, { projection: { _id: 0 } }).sort({ at: -1 }).limit(12).toArray(),
  ]);
  const by = Object.fromEntries(statusRows.map(r => [r._id, r.n])) as Partial<Record<Status, number>>;
  return {
    project: { id: project._id, name: project.name, approvalMode: project.publishing.approvalMode, automation: project.automation.enabled, timezone: project.timezone },
    runtime: { storage: ctx.storage(project)?.kind || null, images: ctx.capabilities.has('images'), imagesOnClick: ctx.capabilities.has('image-store'), aiText: !!ctx.ai?.text, aiImage: !!ctx.ai?.image },
    counts: {
      total, published, drafts, scheduled: by.scheduled || 0, awaitingReview: by.awaiting_review || 0, ready: by.ready || 0,
      missingImages: Math.max(noHero, mediaIssues), missingMetadata: metaIssues, awaitingRepair: (by.needs_repair || 0) + (by.awaiting_media || 0),
      failed: by.failed || 0, failedJobs, queuedJobs, processedThisWeek: processed, media: mediaCount,
    },
    recent,
  };
}
export async function repairQueue(ctx: Ctx, projectId: string) {
  const project = await projectFor(ctx, projectId, 'read');
  const metas = await cms(ctx).meta.find({ projectId, status: { $nin: ['published', 'publishing'] }, $or: [{ status: { $in: ['needs_repair', 'awaiting_media', 'failed'] } }, { issues: { $elemMatch: { severity: 'error' } } }] }).sort({ updatedAt: -1 }).limit(100).toArray();
  const rows = await collections(ctx, project).articles.find({ sanityId: { $in: metas.map(m => m.articleId) }, publicationState: { $ne: 'published' } }, { projection: { sanityId: 1, title: 1, slug: 1, updatedAt: 1, animeName: 1 } }).toArray();
  const titles = new Map(rows.map(r => [r.sanityId, r]));
  return metas.filter(m => titles.has(m.articleId)).map(m => ({
    id: m.articleId, title: titles.get(m.articleId)!.title, status: m.status, updatedAt: titles.get(m.articleId)!.updatedAt, issues: m.issues.filter(i => i.severity === 'error'),
    warnings: m.issues.filter(i => i.severity === 'warning').length, lastError: m.lastError, mediaReview: m.mediaReview, pendingRequest: m.intent?.type,
  }));
}
export async function missingImages(ctx: Ctx, projectId: string, includePublished = false) {
  const project = await projectFor(ctx, projectId, 'read');
  const { articles } = collections(ctx, project);
  const scope = includePublished ? {} : { publicationState: { $ne: 'published' } };
  const flagged = (await cms(ctx).meta.find({ projectId, issues: { $elemMatch: { code: { $in: ['inline_images_missing', 'hero_missing', 'image_broken'] } } } }, { projection: { articleId: 1, issues: 1 } }).limit(500).toArray());
  const rows = await articles.find({ ...scope, $or: [{ 'mainImage.asset.r2Key': { $in: [null, ''] } }, { sanityId: { $in: flagged.map(f => f.articleId) } }] } as never, { projection: { sanityId: 1, title: 1, slug: 1, publicationState: 1, mainImage: 1, 'body._type': 1 } }).limit(200).toArray();
  const issues = new Map(flagged.map(f => [f.articleId, f.issues.filter(i => i.group === 'media')]));
  return rows.map((a: Article) => ({ id: articleId(a), title: a.title, state: a.publicationState, heroMissing: !a.mainImage?.asset?.r2Key, inlineImages: (a.body || []).filter(b => b._type === 'image').length, issues: issues.get(articleId(a)) || [] }));
}
