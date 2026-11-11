import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z, ZodError, type ZodRawShape } from 'zod';
import * as articles from '../core/articles';
import * as engine from '../core/engine';
import { insertInlineImages } from '../core/images';
import { listActivity, listJobs, retryJob } from '../core/jobs';
import * as media from '../core/media';
import { listProjects, projectFor } from '../core/projects';
import * as publish from '../core/publish';
import type { Ctx, Scope } from '../core/types';
import { CmsError } from '../core/types';

const project = z.string().describe('Project ID from list_projects, e.g. "animesparks".');
const article = z.string().describe('Stable article ID (the `id` field). Never a title.');
const input = articles.articleInput.shape;
const editable = { title: input.title.optional(), slug: input.slug, excerpt: input.excerpt, body: input.body, bodyMarkdown: input.bodyMarkdown, tags: input.tags, faq: input.faq, sources: input.sources, fields: input.fields, relatedIds: input.relatedIds };

/**
 * MCP tools are thin adapters over the same services the dashboard and REST API use.
 * A tool is only registered when the credential's permissions allow it, so read-only tokens
 * never even see write or publishing tools.
 */
export function buildMcpServer(ctx: Ctx) {
  const server = new McpServer({ name: 'headless-cms', version: '1.0.0' }, {
    instructions: 'Headless CMS. Create articles as drafts; the publishing engine then fills missing metadata, sources and attaches images, validates, and publishes or schedules per project policy — do not retry or re-edit to "fix" those. Always identify articles by `id`. Every write returns the real outcome, including validation errors.',
  });
  const has = (scope: Scope) => ctx.actor.scopes.has(scope) || ctx.actor.scopes.has('admin');
  const tool = <S extends ZodRawShape>(name: string, scope: Scope, description: string, shape: S, run: (args: z.infer<z.ZodObject<S>>) => Promise<unknown>, hints: { destructive?: boolean; idempotent?: boolean; openWorld?: boolean } = {}) => {
    if (!has(scope)) return;
    server.registerTool(name, {
      description, inputSchema: shape,
      annotations: { readOnlyHint: scope === 'read', destructiveHint: !!hints.destructive, idempotentHint: scope === 'read' || !!hints.idempotent, openWorldHint: !!hints.openWorld },
    }, (async (args: z.infer<z.ZodObject<S>>) => {
      try { return { content: [{ type: 'text' as const, text: JSON.stringify(await run(args), null, 1) }] }; }
      catch (error) {
        const body = error instanceof CmsError ? { error: error.code, message: error.message, details: error.details }
          : error instanceof ZodError ? { error: 'invalid', message: 'Input validation failed.', details: error.issues.map(i => ({ path: i.path.join('.'), message: i.message })) }
          : { error: 'internal', message: `Operation failed and was not completed: ${(error as Error).message}` };
        return { content: [{ type: 'text' as const, text: JSON.stringify(body, null, 1) }], isError: true };
      }
    }) as never);
  };
  const summary = (a: Awaited<ReturnType<typeof articles.getArticle>>) => ({ id: a.id, title: a.title, slug: a.slug, status: a.meta?.status, version: a.meta?.version, issues: a.meta?.issues });

  // ── Content ───────────────────────────────────────────────────────────────
  tool('list_projects', 'read', 'List the projects this credential can access, with their publishing policy and custom fields.', {}, async () =>
    (await listProjects(ctx)).map(p => ({ id: p._id, name: p.name, siteUrl: p.siteUrl, timezone: p.timezone, approvalMode: p.publishing.approvalMode, automationEnabled: p.automation.enabled, customFields: p.customFields })));
  const listShape = { project, status: z.enum(['draft', 'needs_repair', 'awaiting_media', 'awaiting_review', 'ready', 'scheduled', 'published', 'failed']).optional(), language: z.string().optional(), page: z.number().int().min(1).optional(), limit: z.number().int().min(1).max(100).optional() };
  tool('list_articles', 'read', 'List articles (newest first), optionally filtered by workflow status.', listShape, a => articles.listArticles(ctx, a.project, a));
  tool('search_articles', 'read', 'Search articles by title, slug, tag, franchise or excerpt. Use before drafting to avoid duplicate topics.', { ...listShape, q: z.string().min(1) }, a => articles.listArticles(ctx, a.project, a));
  tool('get_article', 'read', 'Get one article with its body, workflow status, version and open issues.', { project, id: article }, a => articles.getArticle(ctx, a.project, a.id));
  tool('get_article_revisions', 'read', 'List an article\'s saved versions; pass `version` to get that version\'s full snapshot.', { project, id: article, version: z.number().int().optional() }, a => articles.getRevisions(ctx, a.project, a.id, a.version));
  const createShape = { project, ...input, idempotencyKey: z.string().max(200).optional().describe('Reuse the same key when retrying so the article is not created twice.') };
  tool('create_draft', 'write', 'Create a draft article. Only a title and body are needed; the engine fills author, category, SEO fields and images.', createShape,
    ({ project: p, idempotencyKey, ...rest }) => articles.createArticle(ctx, p, rest, { idempotencyKey }).then(r => ({ ...summary(r as never), created: r.created, processing: (r as { processing?: string }).processing })), { idempotent: true });
  tool('create_article', 'write', 'Create an article and state what should happen next: leave it as a draft, publish when complete, or schedule. It is never published incomplete.',
    { ...createShape, publish: z.enum(['none', 'when_ready']).default('none'), scheduledAt: z.string().optional().describe('ISO date-time to publish at (requires publish permission).') },
    async ({ project: p, idempotencyKey, publish: mode, scheduledAt, ...rest }) => {
      const created = await articles.createArticle(ctx, p, rest, { idempotencyKey });
      const wantsPublish = mode === 'when_ready' || scheduledAt;
      if (!wantsPublish || !created.created) return { ...summary(created as never), created: created.created };
      if (!has('publish')) return { ...summary(created as never), created: true, publishing: { outcome: 'not_requested', message: 'This credential cannot publish; the article was saved as a draft.' } };
      return { ...summary(created as never), created: true, publishing: await publish.requestPublish(ctx, p, created.id, { at: scheduledAt }) };
    }, { idempotent: true });
  tool('update_article', 'write', 'Update fields of an article. Send only what changes. Pass `expectedVersion` from get_article to avoid overwriting a concurrent edit.',
    { project, id: article, expectedVersion: z.number().int().optional(), ...editable },
    ({ project: p, id, expectedVersion, ...rest }) => articles.updateArticle(ctx, p, id, rest, { expectedVersion }).then(r => ({ ...summary(r as never), changed: r.changed })));

  // ── Metadata ──────────────────────────────────────────────────────────────
  tool('list_authors', 'read', 'List the project\'s authors. Only these IDs can be assigned.', { project }, a => articles.listTaxonomy(ctx, a.project, 'authors'));
  tool('list_categories', 'read', 'List the project\'s categories. Only these IDs can be assigned.', { project }, a => articles.listTaxonomy(ctx, a.project, 'categories'));
  tool('assign_author', 'write', 'Assign an existing author to an article.', { project, id: article, authorId: z.string() }, a => articles.updateArticle(ctx, a.project, a.id, { authorId: a.authorId }).then(r => ({ ...summary(r as never), changed: r.changed })), { idempotent: true });
  tool('assign_categories', 'write', 'Replace an article\'s categories with existing category IDs.', { project, id: article, categoryIds: z.array(z.string()).min(1) }, a => articles.updateArticle(ctx, a.project, a.id, { categoryIds: a.categoryIds }).then(r => ({ ...summary(r as never), changed: r.changed })), { idempotent: true });
  tool('update_seo_metadata', 'write', 'Set SEO title, meta description, excerpt, canonical URL or Open Graph values.',
    { project, id: article, seoTitle: input.seoTitle, seoDescription: input.seoDescription, excerpt: input.excerpt, canonicalUrl: input.canonicalUrl, openGraph: input.openGraph },
    ({ project: p, id, ...rest }) => articles.updateArticle(ctx, p, id, rest).then(r => ({ ...summary(r as never), changed: r.changed })), { idempotent: true });
  tool('validate_article', 'read', 'Run every completeness check and report blocking errors and warnings. Changes nothing.', { project, id: article }, a => engine.validateArticle(ctx, a.project, a.id));
  tool('repair_article_metadata', 'write', 'Fill missing or invalid metadata (author, category, slug, SEO, excerpt) from project defaults and rules. Valid values and the body are left untouched.',
    { project, id: article, includePublished: z.boolean().optional().describe('Required to repair an already published article.') }, a => engine.repairArticle(ctx, a.project, a.id, { includePublished: a.includePublished }), { idempotent: true });

  // ── Media ─────────────────────────────────────────────────────────────────
  tool('search_media', 'read', 'Search the project media library by text or franchise.', { project, q: z.string().optional(), franchise: z.string().optional(), filter: z.enum(['unused', 'broken', 'cms']).optional(), page: z.number().int().min(1).optional() }, a => media.listMedia(ctx, a.project, a));
  tool('get_media', 'read', 'Get one media asset (dimensions, source, licence, which articles use it).', { project, assetKey: z.string() }, a => media.getMedia(ctx, a.project, a.assetKey));
  tool('upload_media', 'media', 'Add an image to the media library from an HTTPS URL or base64 data. It is validated, optimised, de-duplicated and stored; success is reported only after the stored file is verified.',
    { project, url: z.url().optional(), base64: z.string().max(21_000_000).optional(), filename: z.string().optional(), alt: z.string().max(300).optional(), title: z.string().max(200).optional(), franchise: z.string().max(120).optional().describe('Anime/franchise the image depicts.'), sourcePage: z.string().optional(), license: z.string().optional(), rightsConfirmed: z.boolean().describe('Must be true: you have the right to publish this image.') },
    ({ project: p, base64, ...rest }) => media.uploadMedia(ctx, p, { ...rest, bytes: base64 ? Uint8Array.from(atob(base64.replace(/^data:[^,]+,/, '')), ch => ch.charCodeAt(0)) : undefined })
      .then(a => ({ assetKey: a.r2Key, publicUrl: a.publicUrl, width: a.width, height: a.height, bytes: a.byteSize, reused: a.reused })), { openWorld: true });
  tool('attach_hero_image', 'write', 'Set a media-library asset as the article\'s hero image (the real hero field).', { project, id: article, assetKey: z.string(), alt: z.string().max(300).optional() },
    a => articles.updateArticle(ctx, a.project, a.id, { heroImage: { assetKey: a.assetKey, alt: a.alt } }).then(r => ({ ...summary(r as never), changed: r.changed, heroImage: r.mainImage })), { idempotent: true });
  tool('insert_inline_images', 'write', 'Insert media-library assets into the article body as image blocks, after a named heading or block index.',
    { project, id: article, images: z.array(z.object({ assetKey: z.string(), alt: z.string().max(300).optional(), caption: z.string().max(300).optional(), afterHeading: z.string().optional(), afterBlock: z.number().int().optional() })).min(1).max(10) },
    async a => { const p = await projectFor(ctx, a.project, 'write'); return insertInlineImages(ctx, p, await articles.findArticle(ctx, p, a.id), a.images); });
  tool('process_article_images', 'media', 'Run the automatic image pipeline for an article: find topic-matched permitted images, store them, attach the hero and insert inline images.', { project, id: article }, a => engine.processArticleImages(ctx, a.project, a.id), { openWorld: true });
  tool('list_articles_missing_images', 'read', 'List articles without a hero image or with too few inline images.', { project, includePublished: z.boolean().optional() }, a => engine.missingImages(ctx, a.project, a.includePublished));

  // ── Publishing ────────────────────────────────────────────────────────────
  tool('publish_article', 'publish', 'Publish an article now. If it is incomplete, repair is queued and it is published automatically once every check passes; the response says which happened.', { project, id: article }, a => publish.requestPublish(ctx, a.project, a.id), { destructive: true, idempotent: true, openWorld: true });
  tool('schedule_article', 'publish', 'Schedule an article for a future time (ISO 8601, any offset).', { project, id: article, scheduledAt: z.string() }, a => publish.requestPublish(ctx, a.project, a.id, { at: a.scheduledAt }), { destructive: true, idempotent: true, openWorld: true });
  tool('get_publishing_status', 'read', 'Workflow status, timestamps (created/updated/scheduled/published), live-URL check, open issues and recent jobs for an article.', { project, id: article }, a => publish.publishingStatus(ctx, a.project, a.id));
  tool('list_failed_jobs', 'read', 'List background jobs that failed permanently or exhausted their retries.', { project }, a => listJobs(ctx, a.project, { status: ['failed', 'dead'] }).then(jobs => jobs.map(j => ({ jobId: j._id, type: j.type, articleId: j.articleId, status: j.status, attempts: j.attempts, error: j.error, failedAt: j.finishedAt }))));
  tool('retry_failed_job', 'write', 'Re-queue a failed job.', { project, jobId: z.string() }, a => retryJob(ctx, a.project, a.jobId).then(j => ({ jobId: j._id, status: j.status, runAt: j.runAt })));
  tool('get_processing_history', 'read', 'Chronological activity (repairs, uploads, publishing attempts, failures) for one article or the whole project.', { project, id: article.optional(), limit: z.number().int().min(1).max(200).optional() }, a => listActivity(ctx, a.project, { articleId: a.id, limit: a.limit }));
  return server;
}
