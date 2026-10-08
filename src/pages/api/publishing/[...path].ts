import type { APIRoute } from 'astro';
import { env } from 'cloudflare:workers';
import { withDatabase } from '../../../lib/content/mongodb';
import type { ArticleDocument, CategoryDocument, AuthorDocument } from '../../../lib/content/types';
import { apiResponse, applyRateLimit, authenticate, audit, escapeRegex, newArticleId, readJson, validateArticle } from '../../../lib/publishing/api';

const respond = (payload: unknown, status = 200) => apiResponse(payload, status);
const fail = (message: string, status: number) => respond({ error: message }, status);
async function ghDispatch(jobId: string, articleUrl?: string) {
  const token = env.GITHUB_ACTIONS_TOKEN, repository = env.GITHUB_REPOSITORY;
  if (!token || !repository || !/^[\w.-]+\/[\w.-]+$/.test(repository)) return { requested: false, state: 'not_configured' as const };
  const response = await fetch(`https://api.github.com/repos/${repository}/dispatches`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, Accept: 'application/vnd.github+json', 'X-GitHub-Api-Version': '2022-11-28', 'Content-Type': 'application/json' },
    body: JSON.stringify({ event_type: 'animesparks-publish', client_payload: { jobId, articleUrl } }),
  });
  return { requested: response.ok, state: response.ok ? 'queued' as const : 'failed' as const };
}
async function requestRebuild(db: import('mongodb').Db, reason: string, articleUrl?: string) {
  const jobId = crypto.randomUUID();
  await db.collection('publishingRebuilds').insertOne({ jobId, reason, state: 'requested', requestedAt: new Date().toISOString() });
  let result;
  try { result = await ghDispatch(jobId, articleUrl); }
  catch { result = { requested: false, state: 'failed' as const }; }
  await db.collection('publishingRebuilds').updateOne({ jobId }, { $set: { state: result.state, updatedAt: new Date().toISOString() } });
  return { jobId, state: result.state };
}
const keyTag = async (key: string) => Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(key)))).slice(0, 12).map(x => x.toString(16).padStart(2, '0')).join('');

export const ALL: APIRoute = async ({ request, params }) => {
  const path = (params.path || '').split('/').filter(Boolean).map(decodeURIComponent);
  const authKey = path[0] === 'deployment-result' ? env.DEPLOYMENT_CALLBACK_KEY : env.PUBLISHING_API_KEY;
  if (!await authenticate(request, authKey)) return fail('Unauthorized', 401);
  const method = request.method.toUpperCase();
  const write = ['POST','PUT','PATCH','DELETE'].includes(method) && path[0] !== 'deployment-result';
  if (write && env.PUBLISHING_WRITES_ENABLED !== 'true') return fail('Publishing writes are disabled.', 403);
  const parsed = new URL(request.url);
  const identity = await keyTag(env.PUBLISHING_API_KEY!);
  try {
    return await withDatabase(env.MONGODB_URI, async db => {
      if (!await applyRateLimit(db, identity)) return fail('Rate limit exceeded. Retry in one minute.', 429);
      const articles = db.collection<ArticleDocument>('articles');
      if (method === 'GET' && path[0] === 'articles') {
        const limit = Math.min(100, Math.max(1, Number(parsed.searchParams.get('limit') || 25)));
        const filter: Record<string, unknown> = {};
        const state = parsed.searchParams.get('state');
        const language = parsed.searchParams.get('language');
        if (state === 'published' || state === 'draft') filter.publicationState = state;
        if (language === 'en' || language === 'es') filter.language = language;
        if (path.length > 1) {
          const article = await articles.findOne({ $or: [{ sanityId: path[1] }, { slug: path[1] }] });
          if (!article) return fail('Article not found.', 404);
          await audit(db, { action: 'article.read', articleId: article.sanityId, actor: identity });
          return respond({ article });
        }
        const q = parsed.searchParams.get('q')?.trim();
        if (q) filter.$or = ['title','slug','animeName','excerpt'].map(field => ({ [field]: { $regex: escapeRegex(q), $options: 'i' } }));
        const rows = await articles.find(filter, { projection: { _id: 0 } }).sort({ updatedAt: -1, publishedAt: -1 }).limit(limit).toArray();
        await audit(db, { action: 'articles.list', query: q || '', count: rows.length, actor: identity });
        return respond({ articles: rows, count: rows.length, limit });
      }
      if (method === 'GET' && path[0] === 'taxonomy') {
        const [categories, authors] = await Promise.all([
          db.collection<CategoryDocument>('categories').find({ publicationState: { $ne: 'draft' } }, { projection: { _id: 0, sanityId: 1, title: 1, slug: 1, description: 1 } }).toArray(),
          db.collection<AuthorDocument>('authors').find({}, { projection: { _id: 0, sanityId: 1, name: 1, slug: 1 } }).toArray(),
        ]);
        return respond({ categories, authors });
      }
      if (method === 'GET' && path[0] === 'status') {
        const latest = await db.collection('publishingRebuilds').find({}).sort({ requestedAt: -1 }).limit(10).toArray();
        return respond({ rebuilds: latest });
      }
      if (method === 'POST' && path[0] === 'deployment-result') {
        let body: { jobId?: string; state?: string; runUrl?: string };
        try { body = await readJson(request) as typeof body; } catch (error) { return fail(error instanceof Error ? error.message : 'Request body must be valid JSON.', 400); }
        if (!body.jobId || !['succeeded','failed'].includes(body.state || '') || !/^[a-f0-9-]{36}$/i.test(body.jobId)) return fail('Invalid deployment result.', 400);
        const updated = await db.collection('publishingRebuilds').updateOne({ jobId: body.jobId }, { $set: { state: body.state, runUrl: body.runUrl, completedAt: new Date().toISOString() } });
        if (!updated.matchedCount) return fail('Rebuild job not found.', 404);
        await audit(db, { action: 'deployment.result', jobId: body.jobId, state: body.state, actor: identity });
        return respond({ recorded: true });
      }
      if (method === 'POST' && path[0] === 'rebuild') {
        const rebuild = await requestRebuild(db, 'manual');
        await audit(db, { action: 'rebuild.request', ...rebuild, actor: identity });
        return respond(rebuild, rebuild.state === 'failed' ? 503 : 202);
      }
      if (method === 'POST' && path[0] === 'articles' && path.length === 1) {
        const idem = request.headers.get('idempotency-key');
        if (!idem || idem.length > 200) return fail('A valid Idempotency-Key header is required.', 400);
        const idemKey = `${identity}:${idem}`;
        const previous = await db.collection('publishingIdempotency').findOne({ _id: idemKey as never });
        if (previous) return respond(previous.response, 200);
        let input: unknown; try { input = await readJson(request); } catch (error) { return fail(error instanceof Error ? error.message : 'Request body must be valid JSON.', 400); }
        const validation = validateArticle(input);
        if (!validation.article) return fail(validation.error!, 400);
        const data = validation.article;
        if (!await validReferences(db, data)) return fail('Category or author reference does not exist.', 400);
        if (!await validR2References(data)) return fail('An article image does not exist in the configured R2 bucket.', 400);
        const normalizedTitle = data.title!.trim().toLocaleLowerCase().replace(/[^\p{L}\p{N}]+/gu, ' ');
        const conflict = await articles.findOne({ $or: [{ language: data.language, slug: data.slug }, { language: data.language, title: { $regex: `^${escapeRegex(data.title!.trim())}$`, $options: 'i' } }, ...(data.sanityId ? [{ sanityId: data.sanityId }] : [])] }, { projection: { _id: 0, sanityId: 1, slug: 1 } });
        if (conflict) return fail('Slug or article ID already exists.', 409);
        if (data.translationOfSanityId) {
          const english = await articles.findOne({ sanityId: data.translationOfSanityId, language: 'en' });
          const existingTranslation = await articles.findOne({ translationOfSanityId: data.translationOfSanityId, language: 'es' });
          if (data.language !== 'es' || !english || existingTranslation) return fail('Spanish translation must reference an existing English article and may only be created once.', 409);
          data.mainImage = english.mainImage;
          try { data.body = preserveImages(english.body || [], data.body || []); }
          catch (error) { return fail(error instanceof Error ? error.message : 'Image placement is invalid.', 400); }
        }
        const now = new Date().toISOString();
        delete data.publishedAt;
        const doc: ArticleDocument = { ...data, sanityId: data.sanityId || newArticleId(), publicationState: 'draft', updatedAt: now } as ArticleDocument;
        if (!await claimSlug(db, doc.language, doc.slug, doc.sanityId)) return fail('Slug is already reserved or in use for this language.', 409);
        if (doc.translationOfSanityId && !await claimTranslation(db, doc.translationOfSanityId, doc.sanityId)) return fail('English article already has a Spanish translation.', 409);
        await articles.insertOne(doc);
        const response = { article: doc, contentSaved: true, deployment: 'not_requested' };
        await db.collection('publishingIdempotency').insertOne({ _id: idemKey as never, response, createdAt: now, titleKey: normalizedTitle });
        await audit(db, { action: 'article.create', articleId: doc.sanityId, language: doc.language, state: doc.publicationState, actor: identity });
        return respond(response, 201);
      }
      if (path[0] === 'articles' && path[1] && ['PUT','PATCH'].includes(method)) {
        let input: unknown; try { input = await readJson(request); } catch (error) { return fail(error instanceof Error ? error.message : 'Request body must be valid JSON.', 400); }
        const validation = validateArticle(input, true);
        if (!validation.article) return fail(validation.error!, 400);
        const current = await articles.findOne({ sanityId: path[1] });
        if (!current) return fail('Article not found.', 404);
        const data = validation.article;
        if (data.language && data.language !== current.language) return fail('Article language cannot be changed after creation.', 400);
        if (data.translationOfSanityId !== undefined && data.translationOfSanityId !== current.translationOfSanityId) return fail('Translation relationships cannot be changed after creation.', 400);
        if (data.slug && data.slug !== current.slug && await articles.findOne({ language: current.language, slug: data.slug })) return fail('Slug is already in use.', 409);
        if (data.slug && data.slug !== current.slug && !await claimSlug(db, current.language, data.slug, current.sanityId)) return fail('Slug is already reserved or in use for this language.', 409);
        if (current.translationOfSanityId && data.mainImage && JSON.stringify(data.mainImage) !== JSON.stringify(current.mainImage)) return fail('Spanish translation hero image must reuse the English article R2 image.', 400);
        if (current.translationOfSanityId) {
          data.mainImage = current.mainImage;
          try { if (data.body) data.body = preserveImages(current.body || [], data.body); }
          catch (error) { return fail(error instanceof Error ? error.message : 'Image placement is invalid.', 400); }
        }
        if (!await validReferences(db, { ...current, ...data })) return fail('Category or author reference does not exist.', 400);
        if (!await validR2References({ ...current, ...data })) return fail('An article image does not exist in the configured R2 bucket.', 400);
        if (data.publishedAt !== undefined && data.publishedAt !== current.publishedAt) return fail('publishedAt is assigned by publication and cannot be edited.', 400);
        delete data.publicationState;
        data.publishedAt = current.publishedAt;
        data.updatedAt = new Date().toISOString();
        await articles.updateOne({ sanityId: current.sanityId }, { $set: data });
        const significant = ['title','slug','metaTitle','metaDescription','excerpt','mainImage','body'].some(key => key in data);
        const articleUrl = `https://www.animesparks.blog/${current.language === 'es' ? 'es/' : ''}blog/${data.slug || current.slug}`;
        const rebuild = significant && current.publicationState === 'published' ? await requestRebuild(db, `article-update:${current.sanityId}`, articleUrl) : null;
        await audit(db, { action: 'article.update', articleId: current.sanityId, fields: Object.keys(data), actor: identity, rebuild: rebuild?.state });
        return respond({ contentSaved: true, id: current.sanityId, deployment: rebuild?.state || 'not_requested', rebuild });
      }
      if (method === 'POST' && path[0] === 'articles' && path[1] && path[2] === 'publish') {
        const current = await articles.findOne({ sanityId: path[1] });
        if (!current) return fail('Article not found.', 404);
        const allowed = new Set(['sanityId','publicationState','language','slug','title','metaTitle','metaDescription','excerpt','publishedAt','updatedAt','sourceUpdatedAt','articleType','animeName','mainImage','body','authorSanityId','categorySanityIds','translationOfSanityId','tags','faq','sources','internalLinks']);
        const validation = validateArticle(Object.fromEntries(Object.entries(current).filter(([key]) => allowed.has(key))));
        if (!validation.article || !current.metaTitle || !current.metaDescription || !current.body?.length) return fail(validation.error || 'Article needs SEO title, SEO description and body before publishing.', 400);
        if (!await validReferences(db, current) || !await validR2References(current)) return fail('Article taxonomy, author or image references are invalid.', 400);
        if (current.language === 'es' && !current.translationOfSanityId) return fail('Spanish article must link to its English source.', 400);
        const now = new Date().toISOString();
        await articles.updateOne({ sanityId: current.sanityId }, { $set: { publicationState: 'published', publishedAt: current.publishedAt || now, updatedAt: now } });
        const articleUrl = `https://www.animesparks.blog/${current.language === 'es' ? 'es/' : ''}blog/${current.slug}`;
        const rebuild = await requestRebuild(db, `article-publish:${current.sanityId}`, articleUrl);
        await audit(db, { action: 'article.publish', articleId: current.sanityId, actor: identity, rebuild: rebuild.state });
        return respond({ contentSaved: true, publicationState: 'published', deployment: rebuild.state, rebuild }, rebuild.state === 'failed' ? 503 : 202);
      }
      return fail('Unknown publishing API operation.', 404);
    });
  } catch (error) {
    console.error('Publishing API request failed:', error instanceof Error ? error.name : 'unknown');
    return fail('Publishing API unavailable.', 503);
  }
};

function preserveImages(source: NonNullable<ArticleDocument['body']>, translated: NonNullable<ArticleDocument['body']>) {
  const images = source.filter(block => block._type === 'image');
  const translatedImages = translated.filter(block => block._type === 'image');
  if (translatedImages.length !== images.length) throw new Error('Spanish translation must preserve every in-content image.');
  let cursor = 0;
  return translated.map(block => block._type === 'image' ? { ...images[cursor++], alt: block.alt, caption: block.caption } : block);
}

async function claimSlug(db: import('mongodb').Db, language: 'en' | 'es', slug: string, articleId: string) {
  const articles = db.collection<ArticleDocument>('articles');
  const existing = await articles.findOne({ language, slug });
  if (existing && existing.sanityId !== articleId) return false;
  const key = `${language}:${slug}`;
  const locks = db.collection('publishingSlugLocks');
  const held = await locks.findOne({ _id: key as never });
  if (held) return (held as { articleId?: string }).articleId === articleId;
  try { await locks.insertOne({ _id: key as never, articleId, createdAt: new Date().toISOString() }); return true; }
  catch (error) { if ((error as { code?: number }).code === 11000) return false; throw error; }
}
async function claimTranslation(db: import('mongodb').Db, sourceId: string, translationId: string) {
  const key = `es:${sourceId}`;
  const locks = db.collection('publishingTranslationLocks');
  const held = await locks.findOne({ _id: key as never });
  if (held) return (held as { translationId?: string }).translationId === translationId;
  try { await locks.insertOne({ _id: key as never, translationId, createdAt: new Date().toISOString() }); return true; }
  catch (error) { if ((error as { code?: number }).code === 11000) return false; throw error; }
}
async function validReferences(db: import('mongodb').Db, article: Partial<ArticleDocument>) {
  const ids = [...new Set(article.categorySanityIds || [])];
  if (ids.length !== (article.categorySanityIds || []).length) return false;
  if (ids.length && await db.collection<CategoryDocument>('categories').countDocuments({ sanityId: { $in: ids }, publicationState: { $ne: 'draft' } }) !== ids.length) return false;
  if (article.authorSanityId && !await db.collection<AuthorDocument>('authors').findOne({ sanityId: article.authorSanityId }, { projection: { _id: 1 } })) return false;
  return true;
}
async function validR2References(article: Partial<ArticleDocument>) {
  const bucket = env.IMAGES_BUCKET;
  const images = [article.mainImage?.asset?.r2Key, ...(article.body || []).filter(block => block._type === 'image').map(block => block.asset?.r2Key)].filter((key): key is string => !!key);
  if (!images.length) return true;
  if (!bucket) return false;
  const unique = [...new Set(images)];
  const objects = await Promise.all(unique.map(key => bucket.head(key)));
  return objects.every(Boolean);
}
