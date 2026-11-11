import { z } from 'zod';
import type { Ctx, Project, Article, CategoryDocument, AuthorDocument, MediaAsset, ArticleMeta, Job, Scope } from './types';
import { CmsError, conflict, notFound } from './types';
import { now, slugify, validTimeZone } from './util';

export const collections = (ctx: Ctx, project: Project) => {
  const db = ctx.client.db(project.content.dbName);
  return {
    articles: db.collection<Article>(project.content.articles),
    categories: db.collection<CategoryDocument>(project.content.categories),
    authors: db.collection<AuthorDocument>(project.content.authors),
    assets: db.collection<MediaAsset>(project.content.assets),
  };
};
export const cms = (ctx: Pick<Ctx, 'db'>) => ({
  projects: ctx.db.collection<Project>('cmsProjects'),
  meta: ctx.db.collection<ArticleMeta>('cmsArticleMeta'),
  revisions: ctx.db.collection<{ projectId: string; articleId: string; version: number; snapshot: Partial<Article>; by: string; at: string; reason: string }>('cmsRevisions'),
  jobs: ctx.db.collection<Job>('cmsJobs'),
  activity: ctx.db.collection<Activity>('cmsActivity'),
  tokens: ctx.db.collection<{ _id: string; name: string; hash: string; projectIds: string[]; scopes: Scope[]; createdAt: string; lastUsedAt?: string; createdBy: string }>('cmsTokens'),
  rateLimits: ctx.db.collection<{ _id: string; count: number; expiresAt: Date }>('cmsRateLimits'),
});
export interface Activity { projectId: string; articleId?: string; title?: string; type: string; level: 'info' | 'success' | 'warning' | 'error'; message: string; actor: string; data?: unknown; at: string }

export async function ensureIndexes(ctx: Pick<Ctx, 'db'>) {
  const c = cms(ctx);
  await Promise.all([
    c.jobs.createIndex({ idempotencyKey: 1 }, { unique: true }),
    c.jobs.createIndex({ status: 1, runAt: 1 }),
    c.jobs.createIndex({ projectId: 1, articleId: 1, createdAt: -1 }),
    c.meta.createIndex({ projectId: 1, status: 1, updatedAt: -1 }),
    c.meta.createIndex({ projectId: 1, articleId: 1 }, { unique: true }),
    c.activity.createIndex({ projectId: 1, at: -1 }),
    c.activity.createIndex({ projectId: 1, articleId: 1, at: -1 }),
    c.revisions.createIndex({ projectId: 1, articleId: 1, version: -1 }),
    c.tokens.createIndex({ hash: 1 }, { unique: true }),
    c.rateLimits.createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0 }),
  ]);
}

const slots = z.array(z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/)).max(24);
export const projectPatch = z.object({
  name: z.string().min(1).max(80),
  siteUrl: z.url(),
  timezone: z.string().refine(validTimeZone, 'Unknown IANA time zone'),
  urls: z.object({ article: z.string().includes('{slug}'), byLanguage: z.record(z.string(), z.string().includes('{slug}')).optional() }),
  customFields: z.array(z.object({
    key: z.string().regex(/^[a-zA-Z][a-zA-Z0-9]{1,40}$/), label: z.string().min(1).max(60),
    type: z.enum(['string', 'text', 'number', 'boolean', 'select', 'tags']), options: z.array(z.string()).optional(), required: z.boolean().optional(), default: z.unknown().optional(),
  })).max(40),
  defaults: z.object({ authorId: z.string().optional(), categoryId: z.string().optional(), language: z.string().optional() }),
  categoryRules: z.array(z.object({ categoryId: z.string(), keywords: z.array(z.string().min(1)).max(80), articleTypes: z.array(z.string()).optional() })).max(60),
  publishing: z.object({
    approvalMode: z.enum(['manual', 'auto', 'scheduled']), slots, minLeadMinutes: z.number().int().min(0).max(1440), verifyLive: z.boolean(),
    deployHook: z.union([z.object({ type: z.literal('github_dispatch'), repository: z.string().regex(/^[\w.-]+\/[\w.-]+$/), eventType: z.string().min(1) }), z.object({ type: z.literal('webhook'), url: z.url() })]).nullable().optional(),
  }).partial(),
  quality: z.object({
    minWords: z.number().int().min(0), requireHeadings: z.boolean(), requireExcerpt: z.boolean(),
    metaTitleMax: z.number().int().min(20).max(200), metaDescriptionMin: z.number().int().min(0).max(300), metaDescriptionMax: z.number().int().min(50).max(400),
    requireHero: z.boolean(), minInlineImages: z.number().int().min(0).max(20), wordsPerInlineImage: z.number().int().min(0), maxInlineImages: z.number().int().min(0).max(30),
    checkInternalLinks: z.boolean(), allowedBlockTypes: z.array(z.string()).min(1),
  }).partial(),
  repair: z.object({ enabled: z.boolean(), author: z.boolean(), category: z.boolean(), seo: z.boolean(), slug: z.boolean(), internalLinks: z.boolean(), maxInternalLinks: z.number().int().min(0).max(10), useAi: z.boolean() }).partial(),
  media: z.object({
    enabled: z.boolean(), bucket: z.string().optional(), publicBaseUrl: z.url(), keyPrefix: z.string().regex(/^[a-z0-9][a-z0-9/_-]*$/),
    providers: z.array(z.enum(['library', 'translation', 'anilist', 'fandom', 'ai'])), fandomWikis: z.record(z.string(), z.string().regex(/^[a-z0-9-]+$/)),
    heroMaxWidth: z.number().int().min(400).max(4000), inlineMaxWidth: z.number().int().min(300).max(4000), heroMinWidth: z.number().int().min(100), inlineMinWidth: z.number().int().min(100), quality: z.number().int().min(40).max(95),
    aiGeneration: z.object({ enabled: z.boolean(), stylePrompt: z.string().max(600) }),
  }).partial(),
  automation: z.object({ enabled: z.boolean(), maxAttempts: z.number().int().min(1).max(10) }).partial(),
}).partial();
export const projectCreate = z.object({ id: z.string().regex(/^[a-z][a-z0-9-]{1,30}$/).optional(), name: z.string().min(1).max(80), siteUrl: z.url(), timezone: z.string().refine(validTimeZone).default('UTC') });

export function defaultProject(id: string, name: string, siteUrl: string, timezone: string, dbName: string): Project {
  const prefix = id.replace(/-/g, '_');
  return {
    _id: id, name, siteUrl, timezone,
    content: { dbName, articles: `${prefix}_articles`, categories: `${prefix}_categories`, authors: `${prefix}_authors`, assets: `${prefix}_assets` },
    urls: { article: '/blog/{slug}' },
    customFields: [], defaults: {}, categoryRules: [],
    publishing: { approvalMode: 'manual', slots: ['09:00', '17:00'], minLeadMinutes: 10, verifyLive: false },
    quality: {
      minWords: 300, requireHeadings: true, requireExcerpt: true, metaTitleMax: 65, metaDescriptionMin: 70, metaDescriptionMax: 165,
      requireHero: true, minInlineImages: 1, wordsPerInlineImage: 450, maxInlineImages: 4, checkInternalLinks: true, allowedBlockTypes: ['block', 'image'],
    },
    repair: { enabled: true, author: true, category: true, seo: true, slug: true, internalLinks: true, maxInternalLinks: 3, useAi: false },
    media: {
      enabled: true, publicBaseUrl: siteUrl, keyPrefix: `cms/${id}`, providers: ['translation', 'library'], fandomWikis: {},
      heroMaxWidth: 1600, inlineMaxWidth: 1200, heroMinWidth: 800, inlineMinWidth: 400, quality: 80,
      aiGeneration: { enabled: false, stylePrompt: 'Original editorial illustration, no text, no logos, no real people.' },
    },
    automation: { enabled: false, maxAttempts: 5 },
    createdAt: now(), updatedAt: now(),
  };
}

export async function listProjects(ctx: Ctx) {
  const all = await cms(ctx).projects.find({}).sort({ name: 1 }).toArray();
  return ctx.actor.projectIds === '*' ? all : all.filter(p => (ctx.actor.projectIds as string[]).includes(p._id));
}
export async function getProject(ctx: Ctx, id: string) {
  const project = await cms(ctx).projects.findOne({ _id: id });
  if (!project) throw notFound('Project');
  return project;
}
/** Every service call goes through this: project isolation + scope check in one place. */
export async function projectFor(ctx: Ctx, id: string, scope: Scope) {
  const { actor } = ctx;
  if (actor.projectIds !== '*' && !actor.projectIds.includes(id)) throw new CmsError(403, 'forbidden', 'This credential has no access to that project.');
  if (!actor.scopes.has(scope) && !actor.scopes.has('admin')) throw new CmsError(403, 'forbidden', `This credential lacks the "${scope}" permission.`);
  return getProject(ctx, id);
}

export async function createProject(ctx: Ctx, input: z.infer<typeof projectCreate>) {
  if (!ctx.actor.scopes.has('admin') || ctx.actor.projectIds !== '*') throw new CmsError(403, 'forbidden', 'Only administrators can create projects.');
  const id = input.id || slugify(input.name);
  if (!/^[a-z][a-z0-9-]{1,30}$/.test(id)) throw new CmsError(400, 'invalid', 'Project ID must be lowercase letters, digits and hyphens.');
  if (await cms(ctx).projects.findOne({ _id: id })) throw conflict(`Project "${id}" already exists.`);
  const project = defaultProject(id, input.name, input.siteUrl, input.timezone, ctx.db.databaseName);
  await cms(ctx).projects.insertOne(project);
  const c = collections(ctx, project);
  await Promise.all([
    c.articles.createIndex({ sanityId: 1 }, { unique: true }),
    c.articles.createIndex({ language: 1, slug: 1 }),
    c.assets.createIndex({ sha1: 1 }, { unique: true }),
    c.assets.createIndex({ r2Key: 1 }, { unique: true }),
    c.categories.createIndex({ sanityId: 1 }, { unique: true }),
    c.authors.createIndex({ sanityId: 1 }, { unique: true }),
  ]);
  return project;
}

export async function updateProject(ctx: Ctx, id: string, input: unknown) {
  const project = await projectFor(ctx, id, 'admin');
  const patch = projectPatch.parse(input);
  const set: Record<string, unknown> = { updatedAt: now() };
  for (const [key, value] of Object.entries(patch)) {
    if (value === undefined) continue;
    const current = (project as unknown as Record<string, unknown>)[key];
    set[key] = value && typeof value === 'object' && !Array.isArray(value) && current && typeof current === 'object' ? { ...current, ...value } : value;
  }
  const publishing = set.publishing as Project['publishing'] | undefined;
  if (publishing && (publishing.deployHook as unknown) === null) delete publishing.deployHook;
  const automation = set.automation as Project['automation'] | undefined;
  if (automation?.enabled && !project.automation.enabled) automation.enabledAt = now();
  const c = collections(ctx, project);
  const defaults = set.defaults as Project['defaults'] | undefined;
  if (defaults?.authorId && !await c.authors.findOne({ sanityId: defaults.authorId })) throw new CmsError(400, 'invalid', 'Default author does not exist in this project.');
  if (defaults?.categoryId && !await c.categories.findOne({ sanityId: defaults.categoryId })) throw new CmsError(400, 'invalid', 'Default category does not exist in this project.');
  await cms(ctx).projects.updateOne({ _id: id }, { $set: set });
  return getProject(ctx, id);
}

/** Registers the existing AnimeSparks site as the first project. Reads taxonomy only; writes nothing to its collections. */
export async function bootstrapAnimeSparks(ctx: Ctx) {
  if (await cms(ctx).projects.findOne({ _id: 'animesparks' })) return;
  const dbName = ctx.env.ANIMESPARKS_CONTENT_DB || ctx.env.MONGODB_DB_NAME || 'animesparks';
  const project = defaultProject('animesparks', 'AnimeSparks', 'https://www.animesparks.blog', 'Asia/Kolkata', dbName);
  project.content = { dbName, articles: 'articles', categories: 'categories', authors: 'authors', assets: 'assets' };
  project.urls = { article: '/blog/{slug}', byLanguage: { es: '/es/blog/{slug}' } };
  project.customFields = [
    { key: 'language', label: 'Language', type: 'select', options: ['en', 'es'], required: true, default: 'en' },
    { key: 'animeName', label: 'Anime / franchise', type: 'string' },
    { key: 'articleType', label: 'Article type', type: 'select', options: ['news', 'release-date', 'explained', 'explainer', 'list', 'recommendation', 'review', 'opinion', 'analysis', 'guide', 'characters', 'controversy', 'other'] },
  ];
  project.defaults.language = 'en';
  const c = collections(ctx, project);
  const [authors, categories] = await Promise.all([c.authors.find({}).limit(5).toArray(), c.categories.find({}).toArray()]);
  if (authors.length === 1) project.defaults.authorId = authors[0].sanityId;
  const rules: Record<string, { keywords: string[]; articleTypes?: string[] }> = {
    'anime-news-and-updates': { keywords: ['announced', 'confirmed', 'confirms', 'release date', 'trailer', 'premiere', 'delayed', 'leak', 'rumor', 'rumour', 'reveals', 'cast', 'new season', 'key visual'], articleTypes: ['news', 'release-date', 'episode-release-date', 'controversy'] },
    'anime-lists': { keywords: ['top 10', 'best anime', 'ranked', 'ranking', 'anime like', 'strongest', 'funniest'], articleTypes: ['list', 'recommendation'] },
    'anime-reviews': { keywords: ['review', 'worth watching'], articleTypes: ['review'] },
    'anime-opinions': { keywords: ['explained', 'theory', 'why ', 'what is', 'who is', 'meaning', 'analysis', ' vs '], articleTypes: ['opinion', 'analysis', 'explained', 'explainer', 'characters', 'guide'] },
    kdrama: { keywords: ['kdrama', 'k-drama', 'korean drama'] },
    'tv-series': { keywords: ['live-action', 'live action', 'tv series', 'netflix series'] },
  };
  project.categoryRules = categories.filter(cat => rules[cat.slug]).map(cat => ({ categoryId: cat.sanityId, ...rules[cat.slug] }));
  project.publishing = { approvalMode: 'manual', slots: ['09:00', '13:00', '18:00', '21:00'], minLeadMinutes: 10, verifyLive: true };
  project.quality.minInlineImages = 2;
  project.media = { ...project.media, bucket: ctx.env.R2_BUCKET || 'animesparks-staging', publicBaseUrl: 'https://images.animesparks.blog', keyPrefix: 'uploads/cms', providers: ['translation', 'library', 'anilist'] };
  await cms(ctx).projects.insertOne(project);
}
