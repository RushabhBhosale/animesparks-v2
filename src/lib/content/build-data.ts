import { withDatabase } from './mongodb';
import { getHomepage } from './homepage';
import { getPublishedArticles, hydrateCards, isLive } from './articles';
import { getAnimeEntries, getCategories, getCategoriesWithArticles, getSitemapArticles } from './public';
import type { ArticleCard, ArticleDocument, ArticlePageData } from './types';
import { applyFreshnessOverride } from './freshness-overrides';

declare const process: { env: Record<string, string | undefined> };

function buildUri(): string {
  const uri = process.env.MONGODB_URI;
  if (!uri) throw new Error('MONGODB_URI is required for public prerendering');
  return uri;
}

async function loadBuildData() {
  return withDatabase(buildUri(), async db => {
    const [fullDocuments, rawEnglish, rawSpanish, categories, categorySummaries, anime, rawHome, rawSitemapArticles] = await Promise.all([
      db.collection<ArticleDocument & { sourceDocument?: { publishedAt?: string; updatedAt?: string } }>('articles').find(
        { publicationState: 'published', language: { $in: ['en', 'es'] } },
        { projection: { _id: 0, sourceUnknownFields: 0 } },
      ).toArray(),
      getPublishedArticles(db, 'en'),
      getPublishedArticles(db, 'es'),
      getCategories(db),
      getCategoriesWithArticles(db),
      getAnimeEntries(db),
      getHomepage(db),
      getSitemapArticles(db),
    ]);
    const liveDocuments = fullDocuments.map(({ sourceDocument, ...article }) => {
      const publishedAt = sourceDocument?.publishedAt && Number.isFinite(Date.parse(sourceDocument.publishedAt))
        ? sourceDocument.publishedAt : article.publishedAt;
      const sourceEdit = sourceDocument?.updatedAt;
      const sourceLag = Date.parse(article.sourceUpdatedAt || '') - Date.parse(publishedAt || '');
      const offsetPublication = /[+-]\d{2}:\d{2}$/.test(sourceDocument?.publishedAt || '');
      return applyFreshnessOverride({
        ...article,
        publishedAt,
        // Keep explicit editorial dates. For imported records without one,
        // Sanity's update timestamp records the last source edit.
        updatedAt: sourceDocument
          ? sourceEdit || (sourceLag < -1000 || (offsetPublication && sourceLag < 2 * 60 * 60 * 1000)
            ? publishedAt : article.sourceUpdatedAt)
          : article.updatedAt,
      });
    }).filter(article => article.slug && isLive(article));
    const normalizedById = new Map(liveDocuments.map(article => [article.sanityId, article]));
    const normalizeCard = (card: ArticleCard) => {
      const normalized = normalizedById.get(card.sanityId);
      return applyFreshnessOverride(normalized
        ? { ...card, publishedAt: normalized.publishedAt, updatedAt: normalized.updatedAt }
        : card);
    };
    const english = rawEnglish.map(normalizeCard).filter(isLive).sort((a, b) => Date.parse(b.publishedAt || '') - Date.parse(a.publishedAt || ''));
    const spanish = rawSpanish.map(normalizeCard).filter(isLive).sort((a, b) => Date.parse(b.publishedAt || '') - Date.parse(a.publishedAt || ''));
    const home = {
      ...rawHome,
      featured: rawHome.featured ? normalizeCard(rawHome.featured) : null,
      editorsPicks: rawHome.editorsPicks.map(normalizeCard), latest: rawHome.latest.map(normalizeCard),
      popular: rawHome.popular.map(normalizeCard), trending: rawHome.trending.map(normalizeCard),
      spanish: rawHome.spanish.map(normalizeCard),
    };
    const sitemapArticles = rawSitemapArticles.filter(article => normalizedById.has(article.sanityId)).map(article => ({
      ...article,
      publishedAt: normalizedById.get(article.sanityId)?.publishedAt,
      updatedAt: normalizedById.get(article.sanityId)?.updatedAt,
    }));
    const hydrated = await hydrateCards(db, liveDocuments);
    const englishById = new Map(hydrated.filter(a => a.language === 'en').map(a => [a.sanityId, a]));
    const spanishBySourceId = new Map(hydrated.filter(a => a.language === 'es').map(a => [a.translationOfSanityId, a]));
    const articlePages: ArticlePageData[] = hydrated.map(article => {
      const original = article.language === 'es' ? englishById.get(article.translationOfSanityId || '') : undefined;
      return applyFreshnessOverride({
        ...article,
        sources: article.sources?.length ? article.sources : original?.sources,
        alternateSlug: article.language === 'en'
          ? spanishBySourceId.get(article.sanityId)?.slug
          : original?.slug,
      });
    });
    const related = (article: ArticleCard): ArticleCard[] => {
      const cards = article.language === 'es' ? spanish : english;
      const source = article.language === 'es' ? englishById.get(article.translationOfSanityId || '') : undefined;
      const categoryIds = article.categorySanityIds?.length ? article.categorySanityIds : source?.categorySanityIds || [];
      const tags = article.tags?.length ? article.tags : source?.tags || [];
      const byDate = (a: ArticleCard, b: ArticleCard) => Date.parse(b.publishedAt || '') - Date.parse(a.publishedAt || '');
      const candidates = cards.filter(item => item.slug !== article.slug);
      const franchise = article.animeName
        ? candidates.filter(item => item.animeName === article.animeName).sort(byDate).slice(0, 5)
        : [];
      const topical = candidates.map(item => {
        const original = item.language === 'es' ? englishById.get(item.translationOfSanityId || '') : undefined;
        const itemCategories = item.categorySanityIds?.length ? item.categorySanityIds : original?.categorySanityIds || [];
        const itemTags = item.tags?.length ? item.tags : original?.tags || [];
        const score = itemCategories.filter(id => categoryIds?.includes(id)).length * 3 +
          itemTags.filter(tag => tags?.includes(tag)).length;
        return { item, score };
      }).filter(entry => entry.score > 0)
        .sort((a, b) => b.score - a.score || byDate(a.item, b.item))
        .slice(0, 8).map(entry => entry.item);
      return [...new Map([...franchise, ...topical].map(item => [item.sanityId, item])).values()];
    };
    const allCards = [...english, ...spanish];
    const tags = [...new Set(allCards.flatMap(article => article.tags || []))]
      .filter(tag => tag && allCards.some(article => article.tags?.some(value => value.toLowerCase() === tag.toLowerCase())));
    const firstTagForCase = new Set<string>();
    const primaryTags: string[] = [];
    const tagVariants: Array<{ id: string; tag: string }> = [];
    for (const tag of tags) {
      const folded = tag.toLocaleLowerCase('en');
      if (firstTagForCase.has(folded)) tagVariants.push({ id: String(tagVariants.length), tag });
      else { firstTagForCase.add(folded); primaryTags.push(tag); }
    }
    console.log(`[stage3] Published: ${english.length} EN, ${spanish.length} ES; ${categories.length} categories; ${tags.length} tags; ${anime.length} anime`);
    return { english, spanish, categories, categorySummaries, anime, home, sitemapArticles, articlePages, related, tags, primaryTags, tagVariants };
  });
}

let snapshot: ReturnType<typeof loadBuildData> | undefined;
export function getBuildData() {
  return snapshot ??= loadBuildData();
}
