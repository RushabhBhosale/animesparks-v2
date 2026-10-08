import type { Db, Filter } from 'mongodb';
import type {
  ArticleDocument,
  CategoryDocument,
  AnimeEntryDocument,
  AuthorDocument,
  HomepageSettingsDocument
} from '../content/types';

export interface AdminStats {
  totalArticles: number;
  publishedArticles: number;
  draftArticles: number;
  enArticles: number;
  esArticles: number;
  totalAnime: number;
  totalCategories: number;
  recentDrafts: ArticleDocument[];
  recentUpdated: ArticleDocument[];
}

export interface AdminArticleListQuery {
  q?: string;
  status?: string;
  language?: string;
  category?: string;
  sort?: 'updated' | 'published' | 'title';
  page?: number;
  limit?: number;
}

export async function getAdminStats(db: Db): Promise<AdminStats> {
  const [
    totalArticles,
    publishedArticles,
    draftArticles,
    enArticles,
    esArticles,
    totalAnime,
    totalCategories,
    recentDrafts,
    recentUpdated,
  ] = await Promise.all([
    db.collection<ArticleDocument>('articles').countDocuments(),
    db.collection<ArticleDocument>('articles').countDocuments({ publicationState: 'published' }),
    db.collection<ArticleDocument>('articles').countDocuments({ publicationState: 'draft' }),
    db.collection<ArticleDocument>('articles').countDocuments({ language: 'en' }),
    db.collection<ArticleDocument>('articles').countDocuments({ language: 'es' }),
    db.collection<AnimeEntryDocument>('animeEntries').countDocuments(),
    db.collection<CategoryDocument>('categories').countDocuments(),
    db.collection<ArticleDocument>('articles')
      .find({ publicationState: 'draft' }, { projection: { _id: 0, sanityId: 1, title: 1, slug: 1, language: 1, updatedAt: 1, publishedAt: 1, publicationState: 1 } })
      .sort({ updatedAt: -1, _id: -1 })
      .limit(6)
      .toArray(),
    db.collection<ArticleDocument>('articles')
      .find({}, { projection: { _id: 0, sanityId: 1, title: 1, slug: 1, language: 1, updatedAt: 1, publishedAt: 1, publicationState: 1 } })
      .sort({ updatedAt: -1, publishedAt: -1 })
      .limit(8)
      .toArray(),
  ]);

  return {
    totalArticles,
    publishedArticles,
    draftArticles,
    enArticles,
    esArticles,
    totalAnime,
    totalCategories,
    recentDrafts,
    recentUpdated,
  };
}

export async function getAdminArticles(db: Db, options: AdminArticleListQuery = {}) {
  const page = Math.max(1, options.page || 1);
  const limit = Math.min(100, Math.max(1, options.limit || 20));
  const skip = (page - 1) * limit;

  const filter: Filter<ArticleDocument> = {};

  if (options.status && options.status !== 'all') {
    filter.publicationState = options.status;
  }
  if (options.language && options.language !== 'all') {
    filter.language = options.language as 'en' | 'es';
  }
  if (options.category && options.category !== 'all') {
    filter.categorySanityIds = options.category;
  }
  if (options.q && options.q.trim()) {
    const term = options.q.trim();
    filter.$or = [
      { title: { $regex: term, $options: 'i' } },
      { slug: { $regex: term, $options: 'i' } },
      { animeName: { $regex: term, $options: 'i' } },
    ];
  }

  const sortDoc: Record<string, 1 | -1> = {};
  if (options.sort === 'published') {
    sortDoc.publishedAt = -1;
  } else if (options.sort === 'title') {
    sortDoc.title = 1;
  } else {
    sortDoc.updatedAt = -1;
    sortDoc.sourceUpdatedAt = -1;
    sortDoc.publishedAt = -1;
  }

  const [articles, total] = await Promise.all([
    db.collection<ArticleDocument>('articles')
      .find(filter, {
        projection: {
          _id: 0,
          sanityId: 1,
          slug: 1,
          title: 1,
          language: 1,
          publicationState: 1,
          publishedAt: 1,
          updatedAt: 1,
          sourceUpdatedAt: 1,
          mainImage: 1,
          categorySanityIds: 1,
          authorSanityId: 1,
          animeName: 1,
          translationOfSanityId: 1,
        },
      })
      .sort(sortDoc)
      .skip(skip)
      .limit(limit)
      .toArray(),
    db.collection<ArticleDocument>('articles').countDocuments(filter),
  ]);

  // Hydrate category titles for quick listing
  const categoryIds = [...new Set(articles.flatMap(a => a.categorySanityIds || []))];
  const categories = categoryIds.length
    ? await db.collection<CategoryDocument>('categories')
        .find({ sanityId: { $in: categoryIds } }, { projection: { _id: 0, sanityId: 1, title: 1, slug: 1 } })
        .toArray()
    : [];
  const catMap = new Map(categories.map(c => [c.sanityId, c]));

  const items = articles.map(a => ({
    ...a,
    categories: (a.categorySanityIds || []).map(id => catMap.get(id)).filter(Boolean) as CategoryDocument[],
  }));

  return {
    items,
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit),
  };
}

export async function getAdminArticleById(db: Db, idOrSlug: string) {
  const article = await db.collection<ArticleDocument>('articles').findOne(
    { $or: [{ sanityId: idOrSlug }, { slug: idOrSlug }] },
    { projection: { _id: 0 } }
  );

  if (!article) return null;

  // Hydrate translation relation if exists
  let translationDoc: { sanityId: string; slug: string; title: string; language: string } | null = null;
  if (article.translationOfSanityId) {
    translationDoc = await db.collection<ArticleDocument>('articles').findOne(
      { sanityId: article.translationOfSanityId },
      { projection: { _id: 0, sanityId: 1, slug: 1, title: 1, language: 1 } }
    );
  } else if (article.language === 'en') {
    translationDoc = await db.collection<ArticleDocument>('articles').findOne(
      { translationOfSanityId: article.sanityId, language: 'es' },
      { projection: { _id: 0, sanityId: 1, slug: 1, title: 1, language: 1 } }
    );
  }

  // Hydrate authors and categories for the editor
  const [categories, authors] = await Promise.all([
    db.collection<CategoryDocument>('categories')
      .find({}, { projection: { _id: 0, sanityId: 1, title: 1, slug: 1 } })
      .sort({ title: 1 })
      .toArray(),
    db.collection<AuthorDocument>('authors')
      .find({}, { projection: { _id: 0, sanityId: 1, name: 1, slug: 1 } })
      .sort({ name: 1 })
      .toArray(),
  ]);

  return {
    article,
    translationDoc,
    allCategories: categories,
    allAuthors: authors,
  };
}

export async function getAdminCategories(db: Db) {
  return db.collection<CategoryDocument>('categories')
    .find({}, { projection: { _id: 0 } })
    .sort({ title: 1 })
    .toArray();
}

export async function getAdminAnimeEntries(db: Db, query?: string) {
  const filter: Filter<AnimeEntryDocument> = {};
  if (query && query.trim()) {
    filter.title = { $regex: query.trim(), $options: 'i' };
  }
  return db.collection<AnimeEntryDocument>('animeEntries')
    .find(filter, { projection: { _id: 0 } })
    .sort({ title: 1 })
    .limit(100)
    .toArray();
}

export async function getAdminHomepageData(db: Db) {
  const settings = await db.collection<HomepageSettingsDocument>('homepageSettings').findOne(
    {},
    { projection: { _id: 0 } }
  );

  const pickIds = (settings?.editorsPicks || []).map(p => p.sanityId).filter(Boolean);
  const moreIds = (settings?.moreBlogs || []).map(p => p.sanityId).filter(Boolean);
  const allIds = [...new Set([...pickIds, ...moreIds])];

  const referencedArticles = allIds.length
    ? await db.collection<ArticleDocument>('articles')
        .find({ sanityId: { $in: allIds } }, { projection: { _id: 0, sanityId: 1, title: 1, slug: 1, publicationState: 1 } })
        .toArray()
    : [];

  const artMap = new Map(referencedArticles.map(a => [a.sanityId, a]));

  return {
    settings,
    editorsPicks: pickIds.map(id => artMap.get(id) || { sanityId: id, title: 'Unknown story', slug: '' }),
    moreBlogs: moreIds.map(id => artMap.get(id) || { sanityId: id, title: 'Unknown story', slug: '' }),
  };
}
