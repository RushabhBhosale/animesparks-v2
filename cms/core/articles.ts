import { ObjectId, type Filter } from 'mongodb';
import { z } from 'zod';
import type { Article, ArticleMeta, Ctx, Project, Status, PortableBlock } from './types';
import { CmsError, conflict, invalid, notFound, STATUSES } from './types';
import { cms, collections, projectFor } from './projects';
import { enqueue, log } from './jobs';
import { markdownToPortable, sanitizeBody } from './portable';
import { contentHash, escapeRegex, now, slugify, uid, validSlug } from './util';

const str = (max: number) => z.string().trim().max(max);
export const articleInput = z.object({
  title: str(180).min(1),
  slug: z.string().refine(validSlug, 'slug must be lowercase letters, digits and single hyphens').optional(),
  excerpt: str(1000).optional(),
  body: z.array(z.record(z.string(), z.unknown())).optional().describe('Portable Text blocks (block and image types).'),
  bodyMarkdown: z.string().max(400_000).optional().describe('Alternative to body: Markdown, converted to Portable Text.'),
  authorId: z.string().optional(),
  categoryIds: z.array(z.string()).max(30).optional(),
  tags: z.array(str(120)).max(50).optional(),
  seoTitle: str(180).optional(),
  seoDescription: str(320).optional(),
  heroImage: z.object({ assetKey: z.string(), alt: str(300).optional() }).nullable().optional(),
  canonicalUrl: z.url().optional(),
  openGraph: z.object({ title: str(180).optional(), description: str(320).optional(), image: z.url().optional() }).optional(),
  relatedIds: z.array(z.string()).max(20).optional(),
  faq: z.array(z.object({ question: str(400), answer: str(4000) })).max(30).optional(),
  sources: z.array(z.object({ name: str(300), url: z.url().refine(u => u.startsWith('https://'), 'sources must be HTTPS') })).max(50).optional(),
  fields: z.record(z.string(), z.unknown()).optional().describe('Project custom fields, e.g. language, animeName, articleType.'),
  translationOfId: z.string().optional(),
});
export type ArticleInput = z.infer<typeof articleInput>;

const TRANSITIONS: Record<Status, Status[]> = {
  draft: ['needs_repair', 'awaiting_media', 'awaiting_review', 'ready'],
  needs_repair: ['draft', 'awaiting_media', 'awaiting_review', 'ready'],
  awaiting_media: ['draft', 'needs_repair', 'awaiting_review', 'ready'],
  awaiting_review: ['draft', 'needs_repair', 'awaiting_media', 'ready'],
  ready: ['draft', 'needs_repair', 'awaiting_media', 'awaiting_review', 'scheduled', 'publishing'],
  scheduled: ['draft', 'needs_repair', 'awaiting_media', 'awaiting_review', 'ready', 'publishing'],
  publishing: ['published', 'failed'],
  published: ['draft'],
  failed: ['draft', 'needs_repair', 'awaiting_media', 'awaiting_review', 'ready', 'publishing'],
};

export const articleId = (article: Article) => article.sanityId || String((article as { _id?: unknown })._id);
export const metaId = (project: Project, id: string) => `${project._id}:${id}`;
/** Filter matching exactly this stored document. */
export const self = (article: Article) => ({ _id: (article as unknown as { _id: ObjectId })._id }) as Filter<Article>;
const byId = (id: string): Filter<Article> => ({ $or: [{ sanityId: id }, ...(ObjectId.isValid(id) && id.length === 24 ? [{ _id: new ObjectId(id) } as Filter<Article>] : [])] });

export async function findArticle(ctx: Ctx, project: Project, id: string) {
  const article = await collections(ctx, project).articles.findOne(byId(id), { projection: { sourceDocument: 0, sourceUnknownFields: 0 } });
  if (!article) throw notFound('Article');
  return article;
}
/** Workflow state lives beside the article (never inside it) so the site's documents and build fingerprint are untouched. */
export async function ensureMeta(ctx: Ctx, project: Project, article: Article): Promise<ArticleMeta> {
  const id = articleId(article), _id = metaId(project, id), published = article.publicationState === 'published';
  const existing = await cms(ctx).meta.findOne({ _id });
  if (existing) {
    // The site's document is the source of truth for what is live; reconcile if it was changed elsewhere.
    if (published !== (existing.status === 'published') && existing.status !== 'publishing') {
      const status: Status = published ? 'published' : 'draft';
      await cms(ctx).meta.updateOne({ _id }, { $set: { status, updatedAt: now(), ...(published && !existing.firstPublishedAt ? { firstPublishedAt: article.publishedAt } : {}) } });
      return { ...existing, status };
    }
    return existing;
  }
  const meta: ArticleMeta = {
    _id, projectId: project._id, articleId: id, status: published ? 'published' : 'draft', version: 1, issues: [], repaired: [],
    contentHash: await contentHash(article), firstPublishedAt: published ? article.publishedAt : undefined, createdAt: article.createdAt || now(), updatedAt: now(),
  };
  try { await cms(ctx).meta.insertOne(meta); } catch (error) { if ((error as { code?: number }).code !== 11000) throw error; return (await cms(ctx).meta.findOne({ _id }))!; }
  return meta;
}
export async function setStatus(ctx: Ctx, meta: ArticleMeta, to: Status, extra: Partial<ArticleMeta> = {}, unset: Array<keyof ArticleMeta> = []) {
  if (meta.status !== to && !TRANSITIONS[meta.status].includes(to)) throw conflict(`Cannot move an article from "${meta.status}" to "${to}".`);
  const result = await cms(ctx).meta.updateOne({ _id: meta._id, status: meta.status }, {
    $set: { ...extra, status: to, updatedAt: now() }, ...(unset.length ? { $unset: Object.fromEntries(unset.map(k => [k, ''])) } : {}) });
  if (!result.matchedCount) throw conflict('The article changed state while this operation was running. Reload and retry.');
  for (const key of unset) delete (extra as Record<string, unknown>)[key];
  return Object.assign(meta, extra, { status: to }, Object.fromEntries(unset.map(k => [k, undefined])));
}

export const present = (article: Article, meta?: ArticleMeta | null) => ({ ...article, _id: undefined, id: articleId(article), meta: meta ? { ...meta, lock: undefined } : undefined });

export async function getArticle(ctx: Ctx, projectId: string, id: string) {
  const project = await projectFor(ctx, projectId, 'read');
  const article = await findArticle(ctx, project, id);
  return present(article, await ensureMeta(ctx, project, article));
}

export interface ListQuery { status?: string; q?: string; language?: string; missing?: 'hero' | 'author' | 'category' | 'seo'; page?: number; limit?: number; sort?: 'updated' | 'published' | 'title' }
const LIST_PROJECTION = { body: 0, faq: 0, sources: 0, sourceDocument: 0, sourceUnknownFields: 0, internalLinks: 0, migration: 0 } as const;
export async function listArticles(ctx: Ctx, projectId: string, query: ListQuery = {}) {
  const project = await projectFor(ctx, projectId, 'read');
  const { articles } = collections(ctx, project);
  const page = Math.max(1, query.page || 1), limit = Math.min(100, Math.max(1, query.limit || 25));
  const and: Filter<Article>[] = [];
  if (query.status === 'published') and.push({ publicationState: 'published' });
  else if (query.status === 'draft' || query.status === 'unpublished') and.push({ publicationState: { $ne: 'published' } });
  else if (query.status && (STATUSES as readonly string[]).includes(query.status)) {
    const ids = await cms(ctx).meta.find({ projectId, status: query.status as Status }, { projection: { articleId: 1 } }).limit(2000).toArray();
    and.push({ sanityId: { $in: ids.map(m => m.articleId) } });
  }
  if (query.language) and.push({ language: query.language as 'en' });
  if (query.q?.trim()) { const rx = { $regex: escapeRegex(query.q.trim()), $options: 'i' }; and.push({ $or: [{ title: rx }, { slug: rx }, { animeName: rx }, { tags: rx }, { excerpt: rx }] } as Filter<Article>); }
  if (query.missing === 'hero') and.push({ 'mainImage.asset.r2Key': { $in: [null, ''] } } as Filter<Article>);
  if (query.missing === 'author') and.push({ authorSanityId: { $in: [null, ''] } } as Filter<Article>);
  if (query.missing === 'category') and.push({ $or: [{ categorySanityIds: { $exists: false } }, { categorySanityIds: { $size: 0 } }] } as Filter<Article>);
  if (query.missing === 'seo') and.push({ $or: [{ metaTitle: { $in: [null, ''] } }, { metaDescription: { $in: [null, ''] } }] } as Filter<Article>);
  const filter: Filter<Article> = and.length ? { $and: and } : {};
  const sort: Record<string, 1 | -1> = query.sort === 'title' ? { title: 1 } : query.sort === 'published' ? { publishedAt: -1 } : { updatedAt: -1, publishedAt: -1 };
  const [rows, total] = await Promise.all([articles.find(filter, { projection: LIST_PROJECTION }).sort(sort).skip((page - 1) * limit).limit(limit).toArray(), articles.countDocuments(filter)]);
  const metas = new Map((await cms(ctx).meta.find({ _id: { $in: rows.map(r => metaId(project, articleId(r))) } }).toArray()).map(m => [m.articleId, m]));
  return {
    total, page, limit, pages: Math.ceil(total / limit),
    items: rows.map(row => {
      const meta = metas.get(articleId(row));
      return { ...row, _id: undefined, id: articleId(row), status: meta?.status || (row.publicationState === 'published' ? 'published' : 'draft'), scheduledAt: meta?.scheduledAt, issueCount: meta?.issues.length || 0, version: meta?.version || 1 };
    }),
  };
}

/** Maps API input onto the document shape the site already renders. Returns only the fields that were supplied. */
async function toDocument(ctx: Ctx, project: Project, input: Partial<ArticleInput>, current?: Article) {
  const { articles, authors, categories, assets } = collections(ctx, project);
  const set: Partial<Article> = {}, seo: NonNullable<ArticleMeta['seo']> = {};
  if (input.title !== undefined) set.title = input.title;
  if (input.excerpt !== undefined) set.excerpt = input.excerpt;
  if (input.tags !== undefined) set.tags = [...new Set(input.tags.filter(Boolean))];
  if (input.seoTitle !== undefined) set.metaTitle = input.seoTitle;
  if (input.seoDescription !== undefined) set.metaDescription = input.seoDescription;
  if (input.faq !== undefined) set.faq = input.faq.map((row, i) => ({ _key: `f${i + 1}`, _type: 'faqItem', ...row }));
  if (input.sources !== undefined) set.sources = input.sources.map((row, i) => ({ _key: `s${i + 1}`, _type: 'articleSource', ...row }));
  if (input.body !== undefined || input.bodyMarkdown !== undefined) {
    const { body, errors } = sanitizeBody(input.body ?? markdownToPortable(input.bodyMarkdown || ''), project.quality.allowedBlockTypes);
    if (errors.length) throw invalid('Article body is not valid.', errors);
    set.body = body;
  }
  for (const [key, value] of Object.entries(input.fields || {})) {
    const field = project.customFields.find(f => f.key === key);
    if (!field) throw invalid(`Unknown custom field "${key}". Defined fields: ${project.customFields.map(f => f.key).join(', ') || 'none'}.`);
    if (field.type === 'select' && value != null && value !== '' && !field.options?.includes(String(value))) throw invalid(`${field.label} must be one of: ${field.options?.join(', ')}.`);
    if (current && key === 'language' && value !== current.language) throw invalid('Language cannot be changed after creation.');
    (set as Record<string, unknown>)[key] = value;
  }
  const language = (set.language ?? current?.language) as string | undefined;
  if (input.slug !== undefined && input.slug !== current?.slug) {
    if (current?.publicationState === 'published') throw conflict('The slug of a published article cannot change; its public URL must stay stable.');
    const clash = await articles.findOne({ slug: input.slug, ...(language ? { language: language as 'en' } : {}) }, { projection: { sanityId: 1 } });
    if (clash && clash.sanityId !== current?.sanityId) throw conflict(`Slug "${input.slug}" is already used by article ${clash.sanityId}.`);
    set.slug = input.slug;
  }
  if (input.authorId !== undefined) {
    if (input.authorId && !await authors.findOne({ sanityId: input.authorId }, { projection: { _id: 1 } })) throw invalid(`Author "${input.authorId}" does not exist. Use list_authors.`);
    set.authorSanityId = input.authorId || undefined;
  }
  if (input.categoryIds !== undefined) {
    const ids = [...new Set(input.categoryIds)];
    if (ids.length && await categories.countDocuments({ sanityId: { $in: ids } }) !== ids.length) throw invalid('One or more categories do not exist. Use list_categories.');
    set.categorySanityIds = ids;
  }
  if (input.heroImage !== undefined) {
    if (input.heroImage === null) set.mainImage = undefined;
    else {
      const asset = await assets.findOne({ r2Key: input.heroImage.assetKey });
      if (!asset) throw invalid('Hero image is not in the media library. Upload it first (upload_media).');
      set.mainImage = { _type: 'image', alt: input.heroImage.alt ?? asset.alt ?? '', asset: { r2Key: asset.r2Key, publicUrl: asset.publicUrl } };
    }
  }
  if (input.canonicalUrl) seo.canonicalUrl = input.canonicalUrl;
  if (input.openGraph) Object.assign(seo, { ogTitle: input.openGraph.title, ogDescription: input.openGraph.description, ogImage: input.openGraph.image });
  return { set, seo, relatedIds: input.relatedIds };
}

const SNAPSHOT_SKIP = new Set(['_id', 'viewCount', 'sourceDocument', 'sourceUnknownFields', 'migration']);
const snapshot = (article: Article) => Object.fromEntries(Object.entries(article).filter(([k]) => !SNAPSHOT_SKIP.has(k)));
async function saveRevision(ctx: Ctx, project: Project, article: Article, version: number, reason: string) {
  const { revisions } = cms(ctx), id = articleId(article);
  await revisions.insertOne({ projectId: project._id, articleId: id, version, snapshot: snapshot(article), by: ctx.actor.id, at: now(), reason });
  const old = await revisions.find({ projectId: project._id, articleId: id }, { projection: { version: 1 } }).sort({ version: -1 }).skip(40).limit(1).toArray();
  if (old[0]) await revisions.deleteMany({ projectId: project._id, articleId: id, version: { $lte: old[0].version } });
}
/** People edit in bursts: the engine waits until a dashboard editor has been idle this long before touching their draft. */
const EDIT_GRACE_MS = 3 * 60_000;
export async function queueProcessing(ctx: Ctx, project: Project, id: string, hash: string, force = false) {
  if (!project.automation.enabled && !force) return null;
  const runAt = new Date(Date.now() + (!force && ctx.actor.type === 'user' ? EDIT_GRACE_MS : 0)).toISOString();
  // One pending job per article: further edits push it back instead of piling up jobs.
  const pending = await cms(ctx).jobs.findOneAndUpdate({ projectId: project._id, articleId: id, type: 'process_article', status: 'queued' }, { $set: { runAt, updatedAt: now() } }, { returnDocument: 'after' });
  if (pending) return { job: pending, created: false };
  return enqueue(ctx, { projectId: project._id, articleId: id, type: 'process_article', idempotencyKey: `process:${project._id}:${id}:${hash}${force ? `:${Date.now()}` : ''}`, maxAttempts: project.automation.maxAttempts, runAt });
}

export async function createArticle(ctx: Ctx, projectId: string, raw: unknown, opts: { idempotencyKey?: string } = {}) {
  const project = await projectFor(ctx, projectId, 'write');
  const { articles } = collections(ctx, project);
  if (opts.idempotencyKey) {
    const prior = await cms(ctx).meta.findOne({ projectId, createKey: opts.idempotencyKey } as Filter<ArticleMeta>);
    if (prior) return { ...present(await findArticle(ctx, project, prior.articleId), prior), created: false };
  }
  const input = articleInput.parse(raw);
  const fields = { ...Object.fromEntries(project.customFields.filter(f => f.default !== undefined).map(f => [f.key, f.default])), ...input.fields };
  const language = fields.language as string | undefined;
  let slug = input.slug || slugify(input.title);
  if (!validSlug(slug)) throw invalid('Could not derive a valid slug from the title; supply one.');
  if (await articles.findOne({ slug, ...(language ? { language: language as 'en' } : {}) }, { projection: { _id: 1 } })) {
    if (input.slug) throw conflict(`Slug "${slug}" is already in use.`);
    slug = `${slug}-${crypto.randomUUID().slice(0, 6)}`;
  }
  const { set, seo, relatedIds } = await toDocument(ctx, project, { ...input, slug: undefined, fields });
  if (input.translationOfId) {
    const source = await articles.findOne({ sanityId: input.translationOfId });
    if (!source) throw invalid('translationOfId does not reference an existing article.');
    if (await articles.findOne({ translationOfSanityId: input.translationOfId, language: language as 'en' })) throw conflict('That article already has a translation in this language.');
    set.translationOfSanityId = input.translationOfId;
  }
  const at = now();
  const article = { body: [] as PortableBlock[], tags: [], categorySanityIds: [], ...set, sanityId: uid('cms-'), slug, publicationState: 'draft', createdAt: at, updatedAt: at } as Article;
  await articles.insertOne(article);
  const hash = await contentHash(article);
  const meta: ArticleMeta & { createKey?: string } = {
    _id: metaId(project, article.sanityId), projectId, articleId: article.sanityId, status: 'draft', version: 1, issues: [], repaired: [], contentHash: hash,
    seo: Object.keys(seo).length ? seo : undefined, relatedIds, createdAt: at, updatedAt: at, ...(opts.idempotencyKey ? { createKey: opts.idempotencyKey } : {}),
  };
  await cms(ctx).meta.insertOne(meta);
  await saveRevision(ctx, project, article, 1, 'created');
  await log(ctx, { projectId, articleId: article.sanityId, title: article.title, type: 'article.created', message: 'Article created as draft' });
  const queued = await queueProcessing(ctx, project, article.sanityId, hash);
  return { ...present(article, meta), created: true, processing: queued ? 'queued' : 'automation is paused for this project' };
}

export async function updateArticle(ctx: Ctx, projectId: string, id: string, raw: unknown, opts: { expectedVersion?: number; reason?: string; skipQueue?: boolean } = {}) {
  const project = await projectFor(ctx, projectId, 'write');
  const input = articleInput.partial().parse(raw);
  return applyUpdate(ctx, project, await findArticle(ctx, project, id), await toDocument(ctx, project, input, await findArticle(ctx, project, id)), opts);
}
/** Single write path for every change (editor, API, MCP, repairs): versioned, revisioned, change-detected. */
export async function applyUpdate(ctx: Ctx, project: Project, current: Article, change: { set: Partial<Article>; seo?: ArticleMeta['seo']; relatedIds?: string[] }, opts: { expectedVersion?: number; reason?: string; skipQueue?: boolean } = {}) {
  const meta = await ensureMeta(ctx, project, current), id = articleId(current);
  if (opts.expectedVersion !== undefined && opts.expectedVersion !== meta.version) throw new CmsError(409, 'version_conflict', `Article was changed by someone else (version ${meta.version}, you have ${opts.expectedVersion}).`, { currentVersion: meta.version });
  if (meta.status === 'publishing') throw conflict('Article is being published; try again shortly.');
  const set: Record<string, unknown> = {}, unset: Record<string, ''> = {};
  for (const [key, value] of Object.entries(change.set)) {
    if (JSON.stringify(value ?? null) === JSON.stringify(current[key] ?? null)) continue;
    if (value === undefined || value === null) unset[key] = ''; else set[key] = value;
  }
  const changed = [...Object.keys(set), ...Object.keys(unset)];
  const metaSet: Partial<ArticleMeta> = {};
  if (change.seo && Object.keys(change.seo).length) metaSet.seo = { ...meta.seo, ...change.seo };
  if (change.relatedIds) metaSet.relatedIds = change.relatedIds;
  if (!changed.length && !Object.keys(metaSet).length) return { ...present(current, meta), changed: [] as string[] };
  let next = current;
  if (changed.length) {
    set.updatedAt = now();
    const { articles } = collections(ctx, project);
    await articles.updateOne(self(current), { $set: set, ...(Object.keys(unset).length ? { $unset: unset } : {}) });
    next = { ...current, ...set } as Article;
    for (const key of Object.keys(unset)) delete next[key];
    metaSet.contentHash = await contentHash(next);
  }
  const bumped = await cms(ctx).meta.findOneAndUpdate({ _id: meta._id, version: meta.version }, { $set: { ...metaSet, updatedAt: now() }, $inc: { version: 1 } }, { returnDocument: 'after' });
  if (!bumped) throw new CmsError(409, 'version_conflict', 'Article was changed concurrently. Reload and retry.');
  if (changed.length) {
    await saveRevision(ctx, project, next, bumped.version, opts.reason || 'edited');
    if (ctx.actor.type !== 'engine') await log(ctx, { projectId: project._id, articleId: id, title: next.title, type: 'article.updated', message: `Updated ${changed.join(', ')}` });
    if (!opts.skipQueue && next.publicationState !== 'published') await queueProcessing(ctx, project, id, bumped.contentHash!);
  }
  return { ...present(next, bumped), changed };
}

export async function getRevisions(ctx: Ctx, projectId: string, id: string, withSnapshot?: number) {
  await projectFor(ctx, projectId, 'read');
  const filter = { projectId, articleId: id, ...(withSnapshot !== undefined ? { version: withSnapshot } : {}) };
  return cms(ctx).revisions.find(filter, { projection: { _id: 0, ...(withSnapshot === undefined ? { snapshot: 0 } : {}) } }).sort({ version: -1 }).limit(50).toArray();
}
const RESTORABLE = ['title', 'excerpt', 'body', 'mainImage', 'authorSanityId', 'categorySanityIds', 'tags', 'metaTitle', 'metaDescription', 'faq', 'sources'];
export async function restoreRevision(ctx: Ctx, projectId: string, id: string, version: number) {
  const project = await projectFor(ctx, projectId, 'write');
  const revision = await cms(ctx).revisions.findOne({ projectId, articleId: id, version });
  if (!revision) throw notFound('Revision');
  const set = Object.fromEntries(RESTORABLE.map(k => [k, revision.snapshot[k]]));
  return applyUpdate(ctx, project, await findArticle(ctx, project, id), { set }, { reason: `restored version ${version}` });
}

// ── Authors & categories (existing collections, existing shape) ──────────────
export const taxonomyInput = z.object({ name: str(120).min(1), slug: z.string().refine(validSlug).optional(), description: str(600).optional() });
export async function listTaxonomy(ctx: Ctx, projectId: string, kind: 'authors' | 'categories') {
  const project = await projectFor(ctx, projectId, 'read');
  const c = collections(ctx, project);
  const projection = { _id: 0, sanityId: 1, name: 1, title: 1, slug: 1, description: 1, publicationState: 1 };
  const rows = kind === 'authors' ? await c.authors.find({}, { projection }).sort({ name: 1 }).toArray() : await c.categories.find({}, { projection }).sort({ title: 1 }).toArray();
  const field = kind === 'authors' ? 'authorSanityId' : 'categorySanityIds';
  const counts = new Map((await c.articles.aggregate<{ _id: string; n: number }>([{ $unwind: `$${field}` }, { $group: { _id: `$${field}`, n: { $sum: 1 } } }]).toArray()).map(r => [r._id, r.n]));
  return rows.map(row => ({ id: row.sanityId, name: (row as { name?: string }).name ?? (row as { title?: string }).title, slug: row.slug, description: (row as { description?: string }).description, articleCount: counts.get(row.sanityId) || 0,
    isDefault: row.sanityId === (kind === 'authors' ? project.defaults.authorId : project.defaults.categoryId) }));
}
export async function saveTaxonomy(ctx: Ctx, projectId: string, kind: 'authors' | 'categories', raw: unknown, id?: string) {
  const project = await projectFor(ctx, projectId, 'admin');
  const input = taxonomyInput.parse(raw);
  const collection = collections(ctx, project)[kind] as unknown as import('mongodb').Collection<Record<string, unknown>>;
  const slug = input.slug || slugify(input.name);
  const clash = await collection.findOne({ slug });
  if (clash && clash.sanityId !== id) throw conflict(`Slug "${slug}" is already used.`);
  const nameField = kind === 'authors' ? 'name' : 'title';
  if (id) {
    const current = await collection.findOne({ sanityId: id });
    if (!current) throw notFound(kind === 'authors' ? 'Author' : 'Category');
    // Slugs of existing records are public URLs; only the label and description change.
    await collection.updateOne({ sanityId: id }, { $set: { [nameField]: input.name, ...(kind === 'categories' && input.description !== undefined ? { description: input.description } : {}) } });
  } else {
    id = uid();
    await collection.insertOne({ sanityId: id, [nameField]: input.name, slug, publicationState: 'published', ...(kind === 'categories' ? { description: input.description || '' } : {}) });
  }
  await log(ctx, { projectId, type: `${kind}.saved`, message: `${kind === 'authors' ? 'Author' : 'Category'} "${input.name}" saved` });
  return { id, name: input.name, slug: id ? slug : slug };
}
