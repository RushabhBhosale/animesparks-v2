import type { Article, ArticleMeta, Ctx, Project } from './types';
import { CmsError, conflict, invalid } from './types';
import { articleId, ensureMeta, findArticle, present, queueProcessing, self, setStatus, withArticleLock } from './articles';
import { cms, collections, projectFor } from './projects';
import { enqueue, log } from './jobs';
import { blocking, evaluate, publicationAdvisories } from './quality';
import { articleUrl, contentHash, nextSlot, now } from './util';

async function deployHook(ctx: Ctx, project: Project, article: Article, url: string) {
  const hook = project.publishing.deployHook;
  if (!hook) return 'none';
  try {
    const response = hook.type === 'github_dispatch'
      ? await ctx.fetch(`https://api.github.com/repos/${hook.repository}/dispatches`, { method: 'POST', headers: { Authorization: `Bearer ${ctx.env.GITHUB_ACTIONS_TOKEN}`, Accept: 'application/vnd.github+json', 'X-GitHub-Api-Version': '2022-11-28', 'Content-Type': 'application/json', 'User-Agent': 'cms' }, body: JSON.stringify({ event_type: hook.eventType, client_payload: { articleUrl: url, articleId: articleId(article) } }) })
      : await ctx.fetch(hook.url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ event: 'article.published', projectId: project._id, articleId: articleId(article), url }) });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    return 'requested';
  } catch (error) {
    await log(ctx, { projectId: project._id, articleId: articleId(article), title: article.title, type: 'deploy.hook_failed', level: 'warning', message: `Site rebuild hook failed (${(error as Error).message}); the site's own rebuild schedule will pick the article up.` });
    return 'failed';
  }
}

/**
 * The single place an article becomes public. It re-checks completeness, moves through an explicit
 * `publishing` state, and records `published` only after the stored document is read back as published.
 */
export async function performPublish(ctx: Ctx, project: Project, article: Article, meta: ArticleMeta, opts: { allowIncomplete?: boolean } = {}) {
  const id = articleId(article), url = articleUrl(project, article);
  if (article.publicationState === 'published') return { published: true, alreadyPublished: true, url, publishedAt: article.publishedAt };
  const evaluated = await evaluate(ctx, project, article, meta, { verifyMedia: !!ctx.storage(project) });
  const issues = opts.allowIncomplete ? publicationAdvisories(evaluated) : evaluated;
  const blockers = blocking(issues);
  if (blockers.length) {
    await cms(ctx).meta.updateOne({ _id: meta._id }, { $set: { issues } });
    throw new CmsError(422, 'not_ready', `Article is not ready to publish: ${blockers.map(i => i.message).join(' ')}`, { issues: blockers });
  }
  if (!['ready', 'scheduled', 'failed'].includes(meta.status)) await setStatus(ctx, meta, 'ready', { issues });
  await setStatus(ctx, meta, 'publishing', { issues });
  await log(ctx, { projectId: project._id, articleId: id, title: article.title, type: 'publish.attempted', message: 'Publishing attempted' });
  const { articles } = collections(ctx, project);
  // publishedAt is the moment of first publication; a republish keeps the original, a draft's placeholder date is not trusted.
  const publishedAt = meta.firstPublishedAt || now();
  try {
    const filter = self(article);
    await articles.updateOne(filter, { $set: { publicationState: 'published', publishedAt, updatedAt: now() } });
    const stored = await articles.findOne(filter, { projection: { publicationState: 1, publishedAt: 1 } });
    if (stored?.publicationState !== 'published') throw new Error('The article did not read back as published after the write.');
  } catch (error) {
    const message = (error as { code?: number }).code === 11000 ? `Another published article already uses the slug "${article.slug}".` : (error as Error).message;
    await setStatus(ctx, meta, 'failed', { lastError: message });
    await log(ctx, { projectId: project._id, articleId: id, title: article.title, type: 'publish.failed', level: 'error', message: `Publishing failed: ${message}` });
    throw (error as { code?: number }).code === 11000 ? conflict(message) : error;
  }
  await setStatus(ctx, meta, 'published', { firstPublishedAt: publishedAt, live: { url } }, [
    'intent', 'scheduledAt', 'lastError', ...(!issues.some(i => i.code === 'hero_missing' || i.code === 'inline_images_missing') ? ['mediaReview' as const] : []),
  ]);
  await log(ctx, { projectId: project._id, articleId: id, title: article.title, type: 'publish.succeeded', level: 'success', message: `Published — ${url}`, data: { url, publishedAt } });
  const deploy = await deployHook(ctx, project, article, url);
  if (project.publishing.verifyLive) await enqueue(ctx, { projectId: project._id, articleId: id, type: 'verify_live', idempotencyKey: `live:${project._id}:${id}:${publishedAt}`, runAt: new Date(Date.now() + 120_000).toISOString(), maxAttempts: 8 });
  return { published: true, alreadyPublished: false, url, publishedAt, deploy, liveCheck: project.publishing.verifyLive ? 'queued' : 'disabled', issues };
}

/** Confirms the public URL actually serves the article. Throws (so the job retries with backoff) until it does. */
export async function verifyLive(ctx: Ctx, project: Project, article: Article, meta: ArticleMeta) {
  const url = articleUrl(project, article);
  let status = 0;
  try { status = (await ctx.fetch(url, { redirect: 'manual', headers: { 'User-Agent': 'cms-live-check/1.0' }, signal: AbortSignal.timeout(15_000) })).status; } catch { /* network error → status 0 */ }
  await cms(ctx).meta.updateOne({ _id: meta._id }, { $set: { live: { url, lastStatus: status, checkedAt: now(), ...(status === 200 ? { verifiedAt: now() } : {}) } } });
  if (status !== 200) throw new Error(`Public URL ${url} returned ${status || 'no response'}; the site has not rebuilt yet.`);
  await log(ctx, { projectId: project._id, articleId: articleId(article), title: article.title, type: 'publish.live', level: 'success', message: `Live on the site: ${url}` });
  return { live: true, url };
}

/** What happens to a complete article, per explicit intent first and project policy second. */
export async function advance(ctx: Ctx, project: Project, article: Article, meta: ArticleMeta) {
  const intent = meta.intent, mode = project.publishing.approvalMode;
  const schedule = async (at: string) => {
    if (Date.parse(at) <= Date.now()) return performPublish(ctx, project, article, meta);
    if (meta.status !== 'scheduled' || meta.scheduledAt !== at) {
      if (meta.status !== 'ready' && meta.status !== 'scheduled') await setStatus(ctx, meta, 'ready');
      await setStatus(ctx, meta, 'scheduled', { scheduledAt: at });
      await log(ctx, { projectId: project._id, articleId: articleId(article), title: article.title, type: 'publish.scheduled', level: 'success', message: `Scheduled for ${new Intl.DateTimeFormat('en-GB', { dateStyle: 'medium', timeStyle: 'short', timeZone: project.timezone }).format(new Date(at))} (${project.timezone})`, data: { scheduledAt: at } });
    }
    return { published: false, status: 'scheduled' as const, scheduledAt: at };
  };
  if (intent?.type === 'publish') return performPublish(ctx, project, article, meta);
  if (intent?.type === 'schedule' && intent.at) return schedule(intent.at);
  if (mode === 'auto') return performPublish(ctx, project, article, meta);
  if (mode === 'scheduled') {
    if (meta.status === 'scheduled' && meta.scheduledAt) return { published: false, status: 'scheduled' as const, scheduledAt: meta.scheduledAt };
    const taken = await cms(ctx).meta.find({ projectId: project._id, status: 'scheduled' }, { projection: { scheduledAt: 1 } }).toArray();
    return schedule(nextSlot(project, taken.map(t => t.scheduledAt!).filter(Boolean)));
  }
  if (meta.status !== 'awaiting_review') await setStatus(ctx, meta, 'awaiting_review');
  return { published: false, status: 'awaiting_review' as const };
}

/** Explicit Publish can waive completeness checks; scheduling and publish-when-ready still require them. */
export async function requestPublish(ctx: Ctx, projectId: string, id: string, opts: { at?: string; allowIncomplete?: boolean } = {}) {
  const project = await projectFor(ctx, projectId, 'publish');
  if (opts.at !== undefined && !(Number.isFinite(Date.parse(opts.at)) && Date.parse(opts.at) > Date.now() - 60_000)) throw invalid('scheduledAt must be a valid ISO date-time in the future.');
  if (opts.allowIncomplete && !opts.at) {
    const result = await withArticleLock(ctx, project, id, `publish:${crypto.randomUUID()}`, async () => {
      const article = await findArticle(ctx, project, id), meta = await ensureMeta(ctx, project, article);
      if (meta.status === 'publishing') throw conflict('Article is already being published.');
      const published = await performPublish(ctx, project, article, meta, opts);
      return { outcome: published.alreadyPublished ? 'already_published' : 'published', ...published };
    });
    if (result === 'locked') throw new CmsError(409, 'locked', 'Article is being processed. Try publishing again in a moment.');
    return result;
  }
  const article = await findArticle(ctx, project, id);
  let meta = await ensureMeta(ctx, project, article);
  if (article.publicationState === 'published') return { outcome: 'already_published', url: articleUrl(project, article), publishedAt: article.publishedAt };
  if (meta.status === 'publishing') throw conflict('Article is already being published.');
  const intent: ArticleMeta['intent'] = { type: opts.at ? 'schedule' : 'publish', at: opts.at ? new Date(opts.at).toISOString() : undefined, by: ctx.actor.id, requestedAt: now() };
  await cms(ctx).meta.updateOne({ _id: meta._id }, { $set: { intent } });
  meta = { ...meta, intent };
  const issues = await evaluate(ctx, project, article, meta);
  const blockers = blocking(issues);
  if (blockers.length) {
    await cms(ctx).meta.updateOne({ _id: meta._id }, { $set: { issues } });
    const fixable = blockers.every(i => i.repairable);
    const queued = fixable ? await queueProcessing(ctx, project, articleId(article), await contentHash(article), true) : null;
    return {
      outcome: queued ? 'queued_for_repair' : 'blocked',
      message: queued ? 'Article is incomplete. Repair is queued; it will be published automatically once every check passes.' : 'Article cannot be published until these issues are fixed manually.',
      issues: blockers, jobId: queued?.job._id,
    };
  }
  const result = await advance(ctx, project, article, meta);
  return { outcome: result.published ? 'published' : 'scheduled', ...result };
}

export async function unpublish(ctx: Ctx, projectId: string, id: string) {
  const project = await projectFor(ctx, projectId, 'publish');
  const article = await findArticle(ctx, project, id), meta = await ensureMeta(ctx, project, article);
  if (article.publicationState !== 'published') throw conflict('Article is not published.');
  await collections(ctx, project).articles.updateOne(self(article), { $set: { publicationState: 'draft', updatedAt: now() } });
  await setStatus(ctx, meta, 'draft', {}, ['intent', 'scheduledAt']);
  await log(ctx, { projectId, articleId: id, title: article.title, type: 'publish.unpublished', level: 'warning', message: 'Unpublished (returned to draft)' });
  return present({ ...article, publicationState: 'draft' }, meta);
}
export async function cancelSchedule(ctx: Ctx, projectId: string, id: string) {
  const project = await projectFor(ctx, projectId, 'publish');
  const article = await findArticle(ctx, project, id), meta = await ensureMeta(ctx, project, article);
  if (meta.status !== 'scheduled' && !meta.intent) throw conflict('Article has no pending schedule or publish request.');
  await setStatus(ctx, meta, meta.status === 'scheduled' ? 'ready' : meta.status, {}, ['intent', 'scheduledAt']);
  await log(ctx, { projectId, articleId: id, title: article.title, type: 'publish.schedule_cancelled', message: 'Schedule cancelled' });
  return { status: meta.status };
}
export async function publishingStatus(ctx: Ctx, projectId: string, id: string) {
  const project = await projectFor(ctx, projectId, 'read');
  const article = await findArticle(ctx, project, id), meta = await ensureMeta(ctx, project, article);
  const jobs = await cms(ctx).jobs.find({ projectId, articleId: id }).sort({ updatedAt: -1 }).limit(5).toArray();
  return {
    id, title: article.title, status: meta.status, publicationState: article.publicationState, url: articleUrl(project, article),
    createdAt: article.createdAt || meta.createdAt, updatedAt: article.updatedAt, scheduledAt: meta.scheduledAt, publishedAt: article.publicationState === 'published' ? article.publishedAt : undefined,
    live: meta.live, pendingRequest: meta.intent, issues: meta.issues, lastError: meta.lastError,
    recentJobs: jobs.map(j => ({ id: j._id, type: j.type, status: j.status, attempts: j.attempts, error: j.error, runAt: j.runAt })),
  };
}
