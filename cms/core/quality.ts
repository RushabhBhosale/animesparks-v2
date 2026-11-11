import type { Article, ArticleMeta, Ctx, Issue, Project, PortableBlock } from './types';
import { collections } from './projects';
import { blockText, bodyText, validSlug, wordCount } from './util';

export const inlineImages = (body: PortableBlock[] = []) => body.filter(b => b._type === 'image');
/** How many inline images an article should carry: required minimum and the pipeline's target. */
export function inlineTargets(project: Project, article: Article) {
  const body = article.body || [], q = project.quality;
  const words = wordCount(bodyText(body));
  if (!words) return { required: 0, target: 0 };
  const sections = Math.max(1, body.filter(b => b._type === 'block' && (b.style === 'h2' || b.style === 'h1')).length);
  const byWords = q.wordsPerInlineImage ? Math.floor(words / q.wordsPerInlineImage) : 0;
  const required = Math.min(q.minInlineImages, sections);
  return { required, target: Math.max(required, Math.min(q.maxInlineImages, byWords, sections)) };
}

/**
 * Completeness and correctness checks only — no keyword-density or SEO scoring.
 * `error` blocks publication; `repairable` tells the engine it can fix the issue itself.
 */
export async function evaluate(ctx: Ctx, project: Project, article: Article, meta?: ArticleMeta, opts: { verifyMedia?: boolean } = {}): Promise<Issue[]> {
  const issues: Issue[] = [], q = project.quality, c = collections(ctx, project);
  const add = (code: string, group: Issue['group'], message: string, o: Partial<Issue> = {}) => issues.push({ code, group, message, severity: 'error', repairable: false, ...o });
  const body = article.body || [], text = bodyText(body), words = wordCount(text);
  const draft = article.publicationState !== 'published';

  if (!article.title?.trim()) add('title_missing', 'content', 'Title is missing.', { field: 'title' });
  if (!validSlug(article.slug)) add('slug_invalid', 'metadata', 'Slug is missing or invalid.', { field: 'slug', repairable: draft && project.repair.slug && !!article.title });
  else {
    const clash = await c.articles.findOne({ slug: article.slug, ...(article.language ? { language: article.language } : {}), sanityId: { $ne: article.sanityId } }, { projection: { sanityId: 1 } });
    if (clash) add('slug_duplicate', 'metadata', `Slug is also used by article ${clash.sanityId}.`, { field: 'slug', repairable: draft && project.repair.slug });
  }
  if (!words) add('body_empty', 'content', 'Article body is empty.', { field: 'body' });
  else if (words < q.minWords) add('body_short', 'content', `Body has ${words} words (minimum ${q.minWords}).`, { field: 'body', severity: 'warning' });
  if (words && q.requireHeadings && !body.some(b => b._type === 'block' && /^h[1-4]$/.test(b.style || ''))) add('headings_missing', 'content', 'Body has no section headings.', { field: 'body' });
  const unsupported = [...new Set(body.filter(b => !q.allowedBlockTypes.includes(b._type)).map(b => b._type))];
  if (unsupported.length) add('unsupported_block', 'content', `Body contains block types the site cannot render: ${unsupported.join(', ')}.`, { field: 'body' });

  if (!article.authorSanityId) add('author_missing', 'metadata', 'No author assigned.', { field: 'author', repairable: project.repair.author && !!project.defaults.authorId });
  else if (!await c.authors.findOne({ sanityId: article.authorSanityId }, { projection: { _id: 1 } })) add('author_invalid', 'metadata', 'Assigned author does not exist.', { field: 'author', repairable: project.repair.author && !!project.defaults.authorId });
  const categoryIds = article.categorySanityIds || [];
  if (!categoryIds.length) add('category_missing', 'metadata', 'No category assigned.', { field: 'categories', repairable: project.repair.category });
  else if (await c.categories.countDocuments({ sanityId: { $in: categoryIds } }) !== new Set(categoryIds).size) add('category_invalid', 'metadata', 'A category reference does not exist.', { field: 'categories', repairable: project.repair.category });
  for (const field of project.customFields.filter(f => f.required)) {
    const value = article[field.key];
    if (value === undefined || value === null || value === '') add('field_missing', 'metadata', `${field.label} is required.`, { field: field.key, repairable: field.default !== undefined });
  }

  const seo = project.repair.seo;
  if (!article.metaTitle?.trim()) add('seo_title_missing', 'metadata', 'SEO title is missing.', { field: 'seoTitle', repairable: seo && !!article.title });
  else if (article.metaTitle.length > q.metaTitleMax) add('seo_title_long', 'metadata', `SEO title is ${article.metaTitle.length} characters (max ${q.metaTitleMax}).`, { field: 'seoTitle', severity: 'warning' });
  const description = article.metaDescription?.trim() || '';
  if (!description) add('seo_description_missing', 'metadata', 'Meta description is missing.', { field: 'seoDescription', repairable: seo && !!words });
  else if (description.length < q.metaDescriptionMin) add('seo_description_short', 'metadata', `Meta description is only ${description.length} characters.`, { field: 'seoDescription', severity: 'warning' });
  else if (description.length > q.metaDescriptionMax) add('seo_description_long', 'metadata', `Meta description is ${description.length} characters (max ${q.metaDescriptionMax}).`, { field: 'seoDescription', severity: 'warning' });
  if (q.requireExcerpt && !article.excerpt?.trim()) add('excerpt_missing', 'metadata', 'Excerpt is missing.', { field: 'excerpt', repairable: seo && !!words });

  const media = project.media.enabled;
  const heroKey = article.mainImage?.asset?.r2Key;
  if (q.requireHero && !heroKey) add('hero_missing', 'media', 'Hero image is missing.', { field: 'heroImage', repairable: media });
  const images = inlineImages(body), { required } = inlineTargets(project, article);
  if (images.length < required) add('inline_images_missing', 'media', `${required - images.length} inline image${required - images.length > 1 ? 's' : ''} missing (${images.length}/${required}).`, { field: 'body', repairable: media });
  const noAlt = images.filter(b => !b.alt?.trim()).length + (heroKey && !article.mainImage?.alt?.trim() ? 1 : 0);
  if (noAlt) add('image_alt_missing', 'media', `${noAlt} image${noAlt > 1 ? 's have' : ' has'} no alt text.`, { severity: 'warning', repairable: true });
  const keys = [heroKey, ...images.map(b => b.asset?.r2Key)].filter((k): k is string => !!k);
  if (new Set(images.map(b => b.asset?.r2Key)).size !== images.length) add('image_duplicate', 'media', 'The same inline image is used more than once.', { severity: 'warning', field: 'body' });
  if (opts.verifyMedia && keys.length) {
    const storage = ctx.storage(project);
    if (storage) {
      const missing = (await Promise.all([...new Set(keys)].map(async key => (await storage.head(key).catch(() => null)) ? null : key))).filter(Boolean);
      if (missing.length) add('image_broken', 'media', `Image file${missing.length > 1 ? 's' : ''} missing from storage: ${missing.join(', ')}.`, { field: missing.includes(heroKey!) ? 'heroImage' : 'body' });
    }
  }

  if (q.checkInternalLinks) {
    const host = new URL(project.siteUrl).hostname.replace(/^www\./, '');
    const prefix = project.urls.article.split('{slug}')[0];
    const slugs = new Set<string>();
    for (const block of body) for (const def of block.markDefs || []) {
      try {
        const url = new URL(def.href || '', project.siteUrl);
        if (url.hostname.replace(/^www\./, '') === host && url.pathname.startsWith(prefix)) slugs.add(url.pathname.slice(prefix.length).replace(/\/$/, ''));
      } catch { add('link_invalid', 'content', `Link "${def.href}" is not a valid URL.`, { severity: 'warning', field: 'body' }); }
    }
    if (slugs.size) {
      const found = new Set((await c.articles.find({ slug: { $in: [...slugs] }, publicationState: 'published' }, { projection: { slug: 1 } }).toArray()).map(a => a.slug));
      const broken = [...slugs].filter(s => !found.has(s));
      if (broken.length) add('internal_link_broken', 'content', `Internal link${broken.length > 1 ? 's point' : ' points'} to unpublished or missing articles: ${broken.join(', ')}.`, { severity: 'warning', field: 'body' });
    }
  }
  if (meta?.scheduledAt && !Number.isFinite(Date.parse(meta.scheduledAt))) add('schedule_invalid', 'schedule', 'Scheduled time is not a valid date.', { field: 'scheduledAt' });
  if (meta?.mediaReview && issues.some(i => i.group === 'media' && i.severity === 'error')) for (const issue of issues) if (issue.group === 'media' && issue.code !== 'image_alt_missing') { issue.repairable = false; issue.message += ` Needs manual media: ${meta.mediaReview.reason}`; }
  return issues;
}

export const blocking = (issues: Issue[]) => issues.filter(i => i.severity === 'error');
export const headingsOf = (body: PortableBlock[] = []) => body.map((b, index) => ({ b, index })).filter(({ b }) => b._type === 'block' && (b.style === 'h2' || b.style === 'h1')).map(({ b, index }) => ({ index, text: blockText(b) }));
