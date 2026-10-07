import type { Db } from 'mongodb';
import type { ArticleCard, ArticleDocument, ArticlePageData, AuthorDocument, CategoryDocument } from './types';

const published = { language: 'en', publicationState: 'published' } as const;
const cardProjection = { sourceDocument: 0, sourceUnknownFields: 0, body: 0, faq: 0, sources: 0, internalLinks: 0 } as const;
const isLive = (article: ArticleDocument) => {
  const date = Date.parse(article.publishedAt || '');
  return Number.isFinite(date) && date <= Date.now();
};

export async function hydrateCards(db: Db, docs: ArticleDocument[]): Promise<ArticleCard[]> {
  const live = docs.filter(isLive);
  const categoryIds = [...new Set(live.flatMap(a => a.categorySanityIds || []))];
  const authorIds = [...new Set(live.map(a => a.authorSanityId).filter((id): id is string => !!id))];
  const [categories, authors] = await Promise.all([
    categoryIds.length ? db.collection<CategoryDocument>('categories').find({ sanityId: { $in: categoryIds } }, { projection: { _id: 0, sanityId: 1, title: 1, slug: 1, description: 1 } }).toArray() : [],
    authorIds.length ? db.collection<AuthorDocument>('authors').find({ sanityId: { $in: authorIds } }, { projection: { _id: 0, sanityId: 1, name: 1, slug: 1, image: 1, bio: 1 } }).toArray() : [],
  ]);
  const categoryById = new Map(categories.map(c => [c.sanityId, c]));
  const authorById = new Map(authors.map(a => [a.sanityId, a]));
  return live.map(a => ({
    ...a,
    categories: (a.categorySanityIds || []).map(id => categoryById.get(id)).filter(Boolean) as CategoryDocument[],
    author: a.authorSanityId ? authorById.get(a.authorSanityId) : undefined,
  }));
}

export async function getArticleBySlug(db: Db, slug: string): Promise<ArticlePageData | null> {
  const article = await db.collection<ArticleDocument>('articles').findOne(
    { ...published, slug },
    { projection: { _id: 0, sourceDocument: 0, sourceUnknownFields: 0 } },
  );
  if (!article || !isLive(article)) return null;
  const [hydrated, translation] = await Promise.all([
    hydrateCards(db, [article]),
    db.collection<ArticleDocument>('articles').findOne(
      { language: 'es', publicationState: 'published', translationOfSanityId: article.sanityId },
      { projection: { _id: 0, slug: 1, publishedAt: 1 } },
    ),
  ]);
  return { ...hydrated[0], alternateSlug: translation && isLive(translation) ? translation.slug : undefined };
}

export async function getLatestArticles(db: Db, limit = 18): Promise<ArticleDocument[]> {
  const docs = await db.collection<ArticleDocument>('articles').find(published, { projection: cardProjection }).sort({ publishedAt: -1 }).limit(limit + 12).toArray();
  return docs.filter(isLive).slice(0, limit);
}

export async function getArticlesByIds(db: Db, ids: string[]): Promise<ArticleDocument[]> {
  if (!ids.length) return [];
  const docs = await db.collection<ArticleDocument>('articles').find({ ...published, sanityId: { $in: ids } }, { projection: cardProjection }).toArray();
  const byId = new Map(docs.filter(isLive).map(doc => [doc.sanityId, doc]));
  return ids.map(id => byId.get(id)).filter(Boolean) as ArticleDocument[];
}
