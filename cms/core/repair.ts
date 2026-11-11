import type { Article, ArticleMeta, Ctx, Project } from './types';
import { conflict } from './types';
import { applyUpdate, articleId, ensureMeta, self } from './articles';
import { cms, collections } from './projects';
import { log } from './jobs';
import { evaluate } from './quality';
import { articleUrl, blockText, bodyText, now, slugify, truncate, validSlug } from './util';

const firstParagraphs = (article: Article) => (article.body || []).filter(b => b._type === 'block' && (!b.style || b.style === 'normal') && !b.listItem).map(blockText).filter(t => t.trim().length > 40).slice(0, 2).join(' ');
function shortTitle(title: string, max: number) {
  if (title.length <= max) return title;
  const cut = title.slice(0, max + 1).replace(/\s+\S*$/, '').replace(/[\s,:;|–-]+$/, '');
  return cut.length >= max * 0.5 ? cut : title.slice(0, max);
}

/** Deterministic category choice from the project's keyword rules; AI only as an optional tie-breaker. */
async function chooseCategory(ctx: Ctx, project: Project, article: Article): Promise<{ id: string; how: string } | null> {
  const title = ` ${(article.title || '').toLowerCase()} `, rest = ` ${[...(article.tags || []), article.excerpt || ''].join(' ').toLowerCase()} `;
  const scored = project.categoryRules.map(rule => ({
    id: rule.categoryId,
    score: (article.articleType && rule.articleTypes?.includes(article.articleType) ? 4 : 0) + rule.keywords.reduce((n, k) => n + (title.includes(k.toLowerCase()) ? 2 : 0) + (rest.includes(k.toLowerCase()) ? 1 : 0), 0),
  })).filter(r => r.score > 0).sort((a, b) => b.score - a.score);
  const valid = new Map((await collections(ctx, project).categories.find({}, { projection: { sanityId: 1, title: 1, description: 1 } }).toArray()).map(c => [c.sanityId, c]));
  const best = scored.find(s => valid.has(s.id));
  if (best && (scored.length === 1 || best.score > (scored[1]?.score || 0))) return { id: best.id, how: 'matched category rules' };
  if (project.repair.useAi && ctx.ai?.text && valid.size) {
    try {
      const options = [...valid.values()].map(c => `${c.sanityId} | ${c.title}${c.description ? ` — ${c.description}` : ''}`).join('\n');
      const answer = await ctx.ai.text(`Pick the single best category for this article. Reply with only the category ID.\n\nCategories:\n${options}\n\nTitle: ${article.title}\nType: ${article.articleType || 'n/a'}\nTags: ${(article.tags || []).join(', ')}\nExcerpt: ${article.excerpt || firstParagraphs(article).slice(0, 400)}`, 1500);
      const id = [...valid.keys()].find(key => answer.includes(key));
      if (id) return { id, how: 'classified by AI' };
    } catch (error) { await log(ctx, { projectId: project._id, articleId: articleId(article), type: 'repair.ai_failed', level: 'warning', message: `AI category classification failed: ${(error as Error).message}` }); }
  }
  if (best) return { id: best.id, how: 'matched category rules' };
  if (project.defaults.categoryId && valid.has(project.defaults.categoryId)) return { id: project.defaults.categoryId, how: 'project default category' };
  return null;
}

async function relatedArticles(ctx: Ctx, project: Project, article: Article) {
  const { articles } = collections(ctx, project);
  const or: object[] = [];
  if (article.animeName && !/multiple|various/i.test(article.animeName)) or.push({ animeName: article.animeName });
  if (article.tags?.length) or.push({ tags: { $in: article.tags.slice(0, 8) } });
  if (!or.length) return [];
  const rows = await articles.find({ publicationState: 'published', sanityId: { $ne: article.sanityId }, ...(article.language ? { language: article.language } : {}), $or: or },
    { projection: { sanityId: 1, title: 1, slug: 1, language: 1, animeName: 1, tags: 1 } }).sort({ publishedAt: -1 }).limit(40).toArray();
  const tags = new Set(article.tags || []);
  return rows.map(r => ({ r, score: (r.animeName && r.animeName === article.animeName ? 3 : 0) + (r.tags || []).filter(t => tags.has(t)).length }))
    .sort((a, b) => b.score - a.score).slice(0, project.repair.maxInternalLinks).map(x => x.r);
}

/**
 * Fills in missing or invalid metadata only. Valid values are never rewritten, the body is never
 * touched, and published articles are skipped unless the caller explicitly opts in.
 */
export async function repairMetadata(ctx: Ctx, project: Project, article: Article, opts: { includePublished?: boolean } = {}) {
  if (article.publicationState === 'published' && !opts.includePublished) throw conflict('Published articles are not auto-repaired. Pass includePublished to repair one explicitly.');
  const meta = await ensureMeta(ctx, project, article);
  const c = collections(ctx, project), set: Partial<Article> = {}, notes: Record<string, string> = {}, unresolved: string[] = [];
  const r = project.repair;

  if (r.slug && !validSlug(article.slug) && article.title) { set.slug = slugify(article.title); notes.slug = 'derived from title'; }
  if (r.slug && article.publicationState !== 'published') {
    const slug = set.slug || article.slug;
    if (slug && await c.articles.findOne({ slug, ...(article.language ? { language: article.language } : {}), sanityId: { $ne: article.sanityId } }, { projection: { _id: 1 } })) {
      set.slug = `${slug}-${crypto.randomUUID().slice(0, 6)}`; notes.slug = 'made unique (slug was already in use)';
    }
  }
  for (const field of project.customFields) if (field.required && field.default !== undefined && (article[field.key] === undefined || article[field.key] === '')) { (set as Record<string, unknown>)[field.key] = field.default; notes[field.key] = 'project default'; }

  if (r.author) {
    const valid = article.authorSanityId && await c.authors.findOne({ sanityId: article.authorSanityId }, { projection: { _id: 1 } });
    if (!valid) {
      // Only an author that already exists is ever assigned; none is invented.
      if (project.defaults.authorId && await c.authors.findOne({ sanityId: project.defaults.authorId }, { projection: { _id: 1 } })) { set.authorSanityId = project.defaults.authorId; notes.authorSanityId = 'project default author'; }
      else unresolved.push('author: no default author is configured for this project');
    }
  }
  if (r.category) {
    const ids = article.categorySanityIds || [];
    const existing = ids.length ? (await c.categories.find({ sanityId: { $in: ids } }, { projection: { sanityId: 1 } }).toArray()).map(x => x.sanityId) : [];
    if (!existing.length) {
      const choice = await chooseCategory(ctx, project, article);
      if (choice) { set.categorySanityIds = [choice.id]; notes.categorySanityIds = choice.how; } else unresolved.push('category: no rule matched and no default category is configured');
    } else if (existing.length !== new Set(ids).size) { set.categorySanityIds = ids.filter(id => existing.includes(id)); notes.categorySanityIds = 'removed references to categories that no longer exist'; }
  }
  if (r.seo) {
    const lead = firstParagraphs(article);
    if (!article.excerpt?.trim() && lead) { set.excerpt = truncate(lead, 200); notes.excerpt = 'from opening paragraph'; }
    if (!article.metaTitle?.trim() && article.title) { set.metaTitle = shortTitle(article.title, project.quality.metaTitleMax); notes.metaTitle = 'from title'; }
    if (!article.metaDescription?.trim()) {
      const excerpt = (set.excerpt || article.excerpt || '').trim();
      let description = excerpt.length >= project.quality.metaDescriptionMin ? truncate(excerpt, project.quality.metaDescriptionMax - 5) : lead ? truncate(lead, project.quality.metaDescriptionMax - 5) : '';
      let how = 'from excerpt/opening paragraph';
      if (r.useAi && ctx.ai?.text && bodyText(article.body).length > 200) {
        try {
          const ai = (await ctx.ai.text(`Write one meta description (${project.quality.metaDescriptionMin}-${project.quality.metaDescriptionMax - 5} characters, plain text, no quotes, factual, no clickbait) for this article. Reply with only the description.\n\nTitle: ${article.title}\n\n${bodyText(article.body).slice(0, 3000)}`, 1500)).replace(/^["']|["']$/g, '').trim();
          if (ai.length >= project.quality.metaDescriptionMin && ai.length <= project.quality.metaDescriptionMax) { description = ai; how = 'written by AI'; }
        } catch { /* deterministic description stands */ }
      }
      if (description) { set.metaDescription = description; notes.metaDescription = how; }
    }
  }
  for (const [where, image] of [['hero', article.mainImage] as const]) if (image?.asset?.r2Key && !image.alt?.trim() && article.title) { set.mainImage = { ...image, alt: article.animeName && !/multiple/i.test(article.animeName) ? `${article.animeName} — ${article.title}` : article.title }; notes.mainImage = `${where} alt text from title`; }
  let relatedIds: string[] | undefined;
  if (r.internalLinks && r.maxInternalLinks > 0 && !(article.internalLinks as unknown[] | undefined)?.length) {
    const related = await relatedArticles(ctx, project, article);
    if (related.length) {
      if (!meta.relatedIds?.length) relatedIds = related.map(a => a.sanityId);
      set.internalLinks = related.map((a, i) => ({ _key: `i${i + 1}`, _type: 'internalLink', text: a.title, url: articleUrl(project, a) }));
      notes.internalLinks = `suggested ${related.length} related published article${related.length > 1 ? 's' : ''}`;
    }
  }

  const next = { ...article, ...set } as Article;
  const canonical = validSlug(next.slug) ? articleUrl(project, next) : undefined;
  const seo = canonical && (!meta.seo?.canonicalUrl || (set.slug && meta.seo.canonicalUrl === articleUrl(project, article))) ? { canonicalUrl: canonical } : undefined;
  const result = await applyUpdate(ctx, project, article, { set, seo, relatedIds }, { reason: 'metadata repair', skipQueue: true });
  const changed = result.changed;
  if (changed.length) {
    const at = now();
    await cms(ctx).meta.updateOne({ _id: meta._id }, { $push: { repaired: { $each: changed.map(field => ({ field, at, by: ctx.actor.id, note: notes[field] })), $slice: -60 } } });
    await log(ctx, { projectId: project._id, articleId: articleId(article), title: article.title, type: 'metadata.repaired', level: 'success', message: `Repaired ${changed.map(f => `${f} (${notes[f] || 'fixed'})`).join('; ')}`, data: { fields: changed } });
  }
  const fresh = (await collections(ctx, project).articles.findOne(self(article)))!;
  const freshMeta = (await cms(ctx).meta.findOne({ _id: meta._id })) as ArticleMeta;
  const issues = await evaluate(ctx, project, fresh, freshMeta);
  await cms(ctx).meta.updateOne({ _id: meta._id }, { $set: { issues } });
  return { article: fresh, meta: { ...freshMeta, issues }, repaired: changed.map(field => ({ field, note: notes[field] })), unresolved, issues };
}
