// Pagination pages (?page=N, N >= 2) are prerendered at build time. The
// production Worker maps `<path>?page=N` onto them instead of rendering the
// listing on demand; see scripts/guarded-worker.mjs.

import { PAGE_SIZE } from './listing';
import type { ListingSource } from './listing-view';
import type { ArticleCard, CategoryDocument } from './types';

type ListingBuildData = {
  english: ArticleCard[];
  spanish: ArticleCard[];
  categories: CategoryDocument[];
  tags: string[];
  tagPosts: Map<string, ArticleCard[]>;
  tagStatus: Map<string, boolean>;
};

const pageCount = (total: number) => Math.max(1, Math.ceil(total / PAGE_SIZE));

/** Primary tags whose archive is indexable (computed once, at build time). */
export function indexableTags(data: Pick<ListingBuildData, 'tagStatus'>): string[] {
  return [...data.tagStatus].filter(([, indexable]) => indexable).map(([tag]) => tag);
}

export function listingSource(data: ListingBuildData): ListingSource {
  return { english: data.english, spanish: data.spanish, categories: data.categories, indexableTags: indexableTags(data) };
}

/** Every `path|page` key that has a prerendered page, with a stable numeric id. */
export function listingPageRoutes(data: ListingBuildData) {
  const targets: Array<{ target: string; pages: number }> = [
    { target: '/blogs', pages: pageCount(data.english.length) },
    { target: '/blogs/es', pages: pageCount(data.spanish.length) },
    ...data.categories.map(category => ({
      target: `/categories/${category.slug}`,
      pages: pageCount(data.english.filter(article => article.categorySanityIds?.includes(category.sanityId)).length),
    })),
    ...data.tags.map(tag => ({ target: `/tags/${tag}`, pages: pageCount(data.tagPosts.get(tag.toLowerCase())?.length || 0) })),
  ];
  const routes: Array<{ id: string; target: string; page: number }> = [];
  for (const { target, pages } of targets) {
    for (let page = 2; page <= pages; page++) routes.push({ id: String(routes.length), target, page });
  }
  return routes;
}
