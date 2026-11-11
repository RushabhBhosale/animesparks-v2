import { Hono, type Context } from 'hono';
import { z, ZodError } from 'zod';
import { createSessionToken, verifyPassword, verifySessionToken } from '../../src/lib/admin/auth';
import type { Actor, Ctx, Scope } from '../core/types';
import { CmsError } from '../core/types';
import * as articles from '../core/articles';
import { actorFromToken, createToken, listTokens, rateLimit, revokeToken, SCOPES } from '../core/auth';
import * as engine from '../core/engine';
import { listActivity, listJobs, retryJob } from '../core/jobs';
import * as media from '../core/media';
import { renderHtml } from '../core/portable';
import { createProject, getProject, listProjects, projectCreate, projectFor, updateProject } from '../core/projects';
import * as publish from '../core/publish';
import { articleUrl, escapeHtml, publicMediaUrl, safeEqual } from '../core/util';
import { handleMcp } from '../mcp/http';

export interface AppDeps {
  /** Runtime context without an actor; each request gets its own copy with the authenticated actor. */
  base(): Promise<Omit<Ctx, 'actor'>> | Omit<Ctx, 'actor'>;
  env: Record<string, string | undefined>;
  secureCookies: boolean;
}
type Vars = { Variables: { ctx: Ctx } };
// Catalogue results supplied by the dashboard. Shape-checked here; image hosts are restricted where candidates are built.
const text = z.string().max(600).nullish();
const art = { id: z.number(), title: z.object({ english: text, romaji: text }), bannerImage: text, coverImage: z.object({ extraLarge: text }).nullish() };
const catalogInput = z.record(z.string().max(200), z.array(z.object({
  ...art, synonyms: z.array(z.string().max(300)).max(60).nullish(), trailer: z.object({ id: text, site: text }).nullish(),
  streamingEpisodes: z.array(z.object({ title: text, thumbnail: text, url: text, site: text })).max(400).nullish(),
  relations: z.object({ edges: z.array(z.object({ relationType: z.string().max(40), node: z.object({ ...art, type: z.string().max(20) }) })).max(80) }).nullish(),
})).max(8)).refine(value => Object.keys(value).length <= 10, 'Too many catalogue searches.');
const COOKIE = '__cms_s';
const adminActor = (user: string): Actor => ({ type: 'user', id: `user:${user}`, scopes: new Set<Scope>(SCOPES), projectIds: '*' });
const cookieOf = (c: Context) => (c.req.header('cookie') || '').split(';').map(p => p.trim().split('=')).find(([name]) => name === COOKIE)?.slice(1).join('=');
const intq = (c: Context, key: string) => { const v = Number(c.req.query(key)); return Number.isFinite(v) && v > 0 ? Math.floor(v) : undefined; };

export function createApp(deps: AppDeps) {
  const app = new Hono<Vars>();
  const { env } = deps;

  app.onError((error, c) => {
    if (error instanceof CmsError) return c.json({ error: { code: error.code, message: error.message, details: error.details } }, error.status as 400);
    if (error instanceof ZodError) return c.json({ error: { code: 'invalid', message: 'Input validation failed.', details: error.issues.map(i => ({ path: i.path.join('.'), message: i.message })) } }, 400);
    if (error instanceof SyntaxError) return c.json({ error: { code: 'invalid', message: 'Request body must be valid JSON.' } }, 400);
    console.error('[cms] request failed:', error);
    return c.json({ error: { code: 'internal', message: 'Unexpected server error. The operation was not completed.' } }, 500);
  });
  app.use('*', async (c, next) => {
    await next();
    c.header('X-Robots-Tag', 'noindex, nofollow');
    c.header('X-Content-Type-Options', 'nosniff');
    if (c.req.path.startsWith('/api/') || c.req.path.startsWith('/mcp')) c.header('Cache-Control', 'no-store');
  });

  // ── Authentication ────────────────────────────────────────────────────────
  const ip = (c: Context) => c.req.header('cf-connecting-ip') || c.req.header('x-forwarded-for')?.split(',')[0].trim() || 'local';
  app.post('/api/auth/login', async c => {
    const base = await deps.base();
    await rateLimit(base.db, `login:${ip(c)}`, 8);
    const { username, password } = z.object({ username: z.string().max(100), password: z.string().max(200) }).parse(await c.req.json());
    if (!env.ADMIN_USER || !env.ADMIN_PASS_HASH || !env.ADMIN_JWT_SECRET) throw new CmsError(503, 'not_configured', 'Dashboard login is not configured. Run `npm run setup` in cms/ (sets ADMIN_USER, ADMIN_PASS_HASH, ADMIN_JWT_SECRET).');
    const ok = (await safeEqual(username, env.ADMIN_USER)) && (await verifyPassword(password, env.ADMIN_PASS_HASH));
    if (!ok) throw new CmsError(401, 'unauthorized', 'Wrong username or password.');
    const token = await createSessionToken(env.ADMIN_JWT_SECRET, username);
    c.header('Set-Cookie', `${COOKIE}=${token}; HttpOnly; SameSite=Strict; Path=/; Max-Age=28800${deps.secureCookies ? '; Secure' : ''}`);
    return c.json({ user: username });
  });
  app.post('/api/auth/logout', c => { c.header('Set-Cookie', `${COOKIE}=; HttpOnly; SameSite=Strict; Path=/; Max-Age=0`); return c.json({ ok: true }); });

  app.use('/api/*', async (c, next) => {
    if (c.req.path.startsWith('/api/auth/log')) return next();
    const bearer = /^Bearer (\S+)$/.exec(c.req.header('authorization') || '')?.[1];
    // Anonymous traffic is turned away before a database connection is opened.
    if (!bearer && !cookieOf(c)) throw new CmsError(401, 'unauthorized', 'Sign in or supply a valid API token.');
    const base = await deps.base();
    let actor: Actor | null = null;
    if (bearer) {
      actor = await actorFromToken(base.db, bearer);
      if (actor) await rateLimit(base.db, actor.id, 240);
    } else {
      const session = cookieOf(c);
      const user = session && env.ADMIN_JWT_SECRET ? await verifySessionToken(env.ADMIN_JWT_SECRET, session) : null;
      if (user) {
        // Cookie sessions are only honoured for same-origin requests (CSRF).
        const origin = c.req.header('origin');
        if (!['GET', 'HEAD'].includes(c.req.method) && origin && new URL(origin).host !== new URL(c.req.url).host && origin !== env.CMS_PUBLIC_URL) throw new CmsError(403, 'forbidden', 'Cross-origin request rejected.');
        actor = adminActor(user);
      }
    }
    if (!actor) throw new CmsError(401, 'unauthorized', 'Sign in or supply a valid API token.');
    c.set('ctx', { ...base, actor });
    return next();
  });
  const x = (c: Context<Vars>) => c.get('ctx');
  const pid = (c: Context) => c.req.param('pid')!;
  const aid = (c: Context) => c.req.param('id')!;

  app.get('/api/auth/me', c => c.json({ actor: x(c).actor.id, scopes: [...x(c).actor.scopes], projects: x(c).actor.projectIds }));

  // ── Projects, settings, credentials ───────────────────────────────────────
  app.get('/api/projects', async c => c.json(await listProjects(x(c))));
  app.post('/api/projects', async c => c.json(await createProject(x(c), projectCreate.parse(await c.req.json())), 201));
  app.get('/api/projects/:pid', async c => c.json(await projectFor(x(c), pid(c), 'read')));
  app.patch('/api/projects/:pid', async c => c.json(await updateProject(x(c), pid(c), await c.req.json())));
  app.get('/api/projects/:pid/tokens', async c => c.json(await listTokens(x(c), pid(c))));
  app.post('/api/projects/:pid/tokens', async c => c.json(await createToken(x(c), pid(c), z.object({ name: z.string().min(1).max(80), scopes: z.array(z.enum(['read', 'write', 'media', 'publish'])) }).parse(await c.req.json())), 201));
  app.delete('/api/projects/:pid/tokens/:tid', async c => { await revokeToken(x(c), pid(c), c.req.param('tid')!); return c.json({ revoked: true }); });
  app.get('/api/projects/:pid/overview', async c => c.json(await engine.overview(x(c), pid(c))));
  app.post('/api/projects/:pid/storage-test', async c => {
    const ctx = x(c), project = await projectFor(ctx, pid(c), 'admin');
    const storage = ctx.storage(project);
    if (!storage) throw new CmsError(412, 'storage_unavailable', 'No media storage is configured for this runtime.');
    const key = `${project.media.keyPrefix}/_healthcheck/${Date.now()}.txt`, bytes = new TextEncoder().encode('cms storage check');
    await storage.put(key, bytes, 'text/plain');
    const head = await storage.head(key);
    const url = publicMediaUrl(ctx, project, key);
    const publicStatus = await ctx.fetch(url, { method: 'HEAD' }).then(r => r.status).catch(() => 0);
    await storage.delete(key);
    return c.json({ storage: storage.kind, written: !!head, publicUrl: url, publicStatus, ok: !!head && publicStatus === 200 });
  });

  // ── Articles ──────────────────────────────────────────────────────────────
  app.get('/api/projects/:pid/articles', async c => c.json(await articles.listArticles(x(c), pid(c), {
    status: c.req.query('status'), q: c.req.query('q'), language: c.req.query('language'), missing: c.req.query('missing') as never, sort: c.req.query('sort') as never, page: intq(c, 'page'), limit: intq(c, 'limit') })));
  app.post('/api/projects/:pid/articles', async c => c.json(await articles.createArticle(x(c), pid(c), await c.req.json(), { idempotencyKey: c.req.header('idempotency-key') }), 201));
  app.get('/api/projects/:pid/articles/:id', async c => c.json(await articles.getArticle(x(c), pid(c), aid(c))));
  app.patch('/api/projects/:pid/articles/:id', async c => {
    const { expectedVersion, ...input } = await c.req.json() as { expectedVersion?: number };
    return c.json(await articles.updateArticle(x(c), pid(c), aid(c), input, { expectedVersion: typeof expectedVersion === 'number' ? expectedVersion : undefined }));
  });
  app.get('/api/projects/:pid/articles/:id/revisions', async c => c.json(await articles.getRevisions(x(c), pid(c), aid(c), intq(c, 'version'))));
  app.post('/api/projects/:pid/articles/:id/revisions/:version/restore', async c => c.json(await articles.restoreRevision(x(c), pid(c), aid(c), Number(c.req.param('version')))));
  app.post('/api/projects/:pid/articles/:id/validate', async c => c.json(await engine.validateArticle(x(c), pid(c), aid(c))));
  app.post('/api/projects/:pid/articles/:id/repair', async c => c.json(await engine.repairArticle(x(c), pid(c), aid(c), await c.req.json().catch(() => ({})))));
  app.get('/api/projects/:pid/articles/:id/image-plan', async c => c.json(await engine.imagePlan(x(c), pid(c), aid(c))));
  app.post('/api/projects/:pid/articles/:id/images', async c => c.json(await engine.processArticleImages(x(c), pid(c), aid(c), z.object({ catalog: catalogInput.optional() }).parse(await c.req.json().catch(() => ({}))))));
  app.post('/api/projects/:pid/articles/:id/process', async c => c.json(await engine.requestProcessing(x(c), pid(c), aid(c)), 202));
  app.post('/api/projects/:pid/articles/:id/publish', async c => c.json(await publish.requestPublish(x(c), pid(c), aid(c))));
  app.post('/api/projects/:pid/articles/:id/schedule', async c => c.json(await publish.requestPublish(x(c), pid(c), aid(c), { at: z.object({ scheduledAt: z.string() }).parse(await c.req.json()).scheduledAt })));
  app.delete('/api/projects/:pid/articles/:id/schedule', async c => c.json(await publish.cancelSchedule(x(c), pid(c), aid(c))));
  app.post('/api/projects/:pid/articles/:id/unpublish', async c => c.json(await publish.unpublish(x(c), pid(c), aid(c))));
  app.get('/api/projects/:pid/articles/:id/status', async c => c.json(await publish.publishingStatus(x(c), pid(c), aid(c))));
  app.get('/api/projects/:pid/articles/:id/activity', async c => c.json(await listActivity(x(c), pid(c), { articleId: aid(c), limit: 60 })));
  app.get('/api/projects/:pid/articles/:id/preview', async c => {
    const ctx = x(c), project = await getProject(ctx, pid(c)), article = await articles.getArticle(ctx, pid(c), aid(c));
    const img = (key: string) => publicMediaUrl(ctx, project, key);
    const hero = article.mainImage?.asset?.r2Key;
    return c.html(`<!doctype html><html lang="${escapeHtml(String(article.language || 'en'))}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex"><title>${escapeHtml(article.metaTitle || article.title)}</title>
<style>body{font:18px/1.7 Georgia,serif;max-width:760px;margin:0 auto;padding:32px 20px;color:#16181d}h1{font:700 38px/1.15 system-ui,sans-serif;margin:8px 0 12px}h2,h3,h4{font-family:system-ui,sans-serif;line-height:1.25;margin-top:1.8em}img{max-width:100%;height:auto;border-radius:8px}figure{margin:28px 0}figcaption{font:13px system-ui;color:#667}blockquote{border-left:4px solid #d33;margin:24px 0;padding:4px 18px;color:#444}.bar{font:13px system-ui;background:#fff7d6;border:1px solid #ecd27a;padding:8px 12px;border-radius:6px;margin-bottom:24px}.ex{color:#555;font-size:20px}a{color:#c1272d}</style></head><body>
<div class="bar">Preview · ${escapeHtml(article.meta?.status || '')} · ${escapeHtml(articleUrl(project, article))}</div><h1>${escapeHtml(article.title)}</h1>${article.excerpt ? `<p class="ex">${escapeHtml(article.excerpt)}</p>` : ''}
${hero ? `<figure><img src="${escapeHtml(article.mainImage?.asset?.publicUrl || img(hero))}" alt="${escapeHtml(article.mainImage?.alt || '')}"></figure>` : ''}${renderHtml(article.body, img)}</body></html>`);
  });

  // ── Authors & categories ──────────────────────────────────────────────────
  for (const kind of ['authors', 'categories'] as const) {
    app.get(`/api/projects/:pid/${kind}`, async c => c.json(await articles.listTaxonomy(x(c), pid(c), kind)));
    app.post(`/api/projects/:pid/${kind}`, async c => c.json(await articles.saveTaxonomy(x(c), pid(c), kind, await c.req.json()), 201));
    app.patch(`/api/projects/:pid/${kind}/:id`, async c => c.json(await articles.saveTaxonomy(x(c), pid(c), kind, await c.req.json(), aid(c))));
  }

  // ── Media ─────────────────────────────────────────────────────────────────
  app.get('/api/projects/:pid/media', async c => c.json(await media.listMedia(x(c), pid(c), { q: c.req.query('q'), franchise: c.req.query('franchise'), filter: c.req.query('filter') as never, page: intq(c, 'page'), limit: intq(c, 'limit') })));
  app.post('/api/projects/:pid/media', async c => {
    if ((c.req.header('content-type') || '').includes('application/json')) return c.json(await media.uploadMedia(x(c), pid(c), z.object({ url: z.url(), alt: z.string().optional(), title: z.string().optional(), franchise: z.string().optional(), rightsConfirmed: z.boolean(), sourcePage: z.string().optional(), license: z.string().optional() }).parse(await c.req.json())), 201);
    if (Number(c.req.header('content-length') || 0) > 16 * 1024 * 1024) throw new CmsError(413, 'too_large', 'Image exceeds 15 MB.');
    const form = await c.req.formData(), file = form.get('file');
    if (!(file instanceof File)) throw new CmsError(400, 'invalid', 'Send the image as multipart field "file".');
    const text = (key: string) => { const v = form.get(key); return typeof v === 'string' && v.trim() ? v.trim() : undefined; };
    return c.json(await media.uploadMedia(x(c), pid(c), { bytes: new Uint8Array(await file.arrayBuffer()), filename: file.name, alt: text('alt'), title: text('title'), franchise: text('franchise'), rightsConfirmed: form.get('rightsConfirmed') === 'true' }), 201);
  });
  app.post('/api/projects/:pid/media/verify', async c => c.json(await media.verifyMedia(x(c), pid(c), (await c.req.json().catch(() => ({})) as { keys?: string[] }).keys)));
  app.get('/api/projects/:pid/media/asset', async c => c.json(await media.getMedia(x(c), pid(c), c.req.query('key') || '')));
  app.patch('/api/projects/:pid/media/asset', async c => c.json(await media.updateMedia(x(c), pid(c), c.req.query('key') || '', await c.req.json())));

  // ── Automation ────────────────────────────────────────────────────────────
  app.get('/api/projects/:pid/repair-queue', async c => c.json(await engine.repairQueue(x(c), pid(c))));
  app.get('/api/projects/:pid/missing-images', async c => c.json(await engine.missingImages(x(c), pid(c), c.req.query('published') === 'true')));
  app.get('/api/projects/:pid/jobs', async c => c.json(await listJobs(x(c), pid(c), { status: c.req.query('status')?.split(',').filter(Boolean), articleId: c.req.query('articleId'), limit: intq(c, 'limit') })));
  app.post('/api/projects/:pid/jobs/:id/retry', async c => c.json(await retryJob(x(c), pid(c), aid(c))));
  app.get('/api/projects/:pid/activity', async c => c.json(await listActivity(x(c), pid(c), { types: c.req.query('types')?.split(',').filter(Boolean), limit: intq(c, 'limit'), before: c.req.query('before') })));
  app.post('/api/projects/:pid/engine/run', async c => {
    await projectFor(x(c), pid(c), 'admin');
    return c.json(await engine.tick(x(c), { workerId: `manual:${crypto.randomUUID().slice(0, 8)}`, maxJobs: 5 }));
  });

  // ── MCP (Streamable HTTP). The same services, the same project-scoped tokens. ──
  app.all('/mcp/:token?', async c => {
    const raw = /^Bearer (\S+)$/.exec(c.req.header('authorization') || '')?.[1] || c.req.param('token');
    const base = raw ? await deps.base() : null;
    const actor = base ? await actorFromToken(base.db, raw) : null;
    if (!base || !actor) return c.json({ jsonrpc: '2.0', id: null, error: { code: -32001, message: 'Unauthorized: supply a project API token.' } }, 401);
    await rateLimit(base.db, `mcp:${actor.id}`, 240);
    return handleMcp({ ...base, actor }, c.req.raw);
  });
  app.all('/api/*', c => c.json({ error: { code: 'not_found', message: 'Unknown API route.' } }, 404));
  return app;
}
