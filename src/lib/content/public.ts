import type { Db } from 'mongodb';
import Fuse from 'fuse.js';
import { getPublishedArticles, isLive } from './articles';
import type { AnimeEntryDocument, ArticleCard, ArticleDocument, CategoryDocument, CategoryWithArticles } from './types';

export async function getCategories(db: Db): Promise<CategoryDocument[]> {
  return db.collection<CategoryDocument>('categories').find(
    { publicationState: 'published' },
    { projection: { _id: 0, sanityId: 1, title: 1, slug: 1, description: 1 } },
  ).sort({ title: 1 }).toArray();
}

export async function getCategoriesWithArticles(db: Db): Promise<CategoryWithArticles[]> {
  const [categories, articles] = await Promise.all([getCategories(db), getPublishedArticles(db)]);
  return categories.map(category => {
    const matching = articles.filter(article => article.categorySanityIds?.includes(category.sanityId));
    return { ...category, count: matching.length, cover: matching.find(article => article.mainImage?.asset?.r2Key) };
  });
}

export async function getCategoryPage(db: Db, slug: string): Promise<{ category: CategoryDocument; articles: ArticleCard[] } | null> {
  const category = await db.collection<CategoryDocument>('categories').findOne(
    { slug, publicationState: 'published' },
    { projection: { _id: 0, sanityId: 1, title: 1, slug: 1, description: 1 } },
  );
  if (!category) return null;
  const articles = (await getPublishedArticles(db)).filter(article => article.categorySanityIds?.includes(category.sanityId));
  return { category, articles };
}

export async function getTagPage(db: Db, tag: string): Promise<ArticleCard[]> {
  return (await getPublishedArticles(db)).filter(article => article.tags?.some(value => value.toLowerCase() === tag.toLowerCase()));
}

export async function getAnimeEntries(db: Db): Promise<AnimeEntryDocument[]> {
  return db.collection<AnimeEntryDocument>('animeEntries').find(
    { publicationState: 'published' },
    { projection: { _id: 0, sanityId: 1, title: 1, score: 1, coverImage: 1, bannerImage: 1, genres: 1, year: 1 } },
  ).sort({ title: 1 }).toArray();
}

const synonyms: Record<string, string> = { jjk: 'jujutsukaisen', aot: 'attackontitan', op: 'onepiece', kdramas: 'kdrama', 'k-drama': 'kdrama' };
const normalize = (value: string) => (synonyms[value.toLowerCase()] || value).toLowerCase().replace(/[^a-z0-9]/g, '');
export async function searchArticles(db: Db, query: string, limit = 32, poolSize = 180): Promise<ArticleCard[]> {
  const normalizedQuery = normalize(query.trim());
  if (normalizedQuery.length < 2) return [];
  const cards = (await getPublishedArticles(db)).slice(0, poolSize);
  const docs = cards.map(article => ({
    article, title: article.title, metaDescription: article.metaDescription || article.excerpt || '',
    normalized: [article.title, article.metaDescription || article.excerpt || ''].map(normalize),
  }));
  const index = new Fuse(docs, {
    includeScore: true, shouldSort: true, threshold: 0.32, distance: 80, ignoreLocation: true,
    keys: [{ name: 'title', weight: 0.5 }, { name: 'metaDescription', weight: 0.3 }, { name: 'normalized', weight: 0.7 }],
  });
  return index.search(normalizedQuery).slice(0, limit).map(hit => hit.item.article);
}

export async function getSitemapArticles(db: Db): Promise<ArticleDocument[]> {
  const docs = await db.collection<ArticleDocument>('articles').find(
    { publicationState: 'published', language: { $in: ['en', 'es'] } },
    { projection: { _id: 0, sanityId: 1, translationOfSanityId: 1, language: 1, publicationState: 1, title: 1, slug: 1, publishedAt: 1, updatedAt: 1, sourceUpdatedAt: 1 } },
  ).toArray();
  return docs.filter(article => article.slug && isLive(article));
}
