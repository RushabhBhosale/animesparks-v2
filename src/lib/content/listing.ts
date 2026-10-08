import type { ArticleCard } from './types';

export const PAGE_SIZE = 12;
export function getPage(value: string | null): number | null {
  if (!value) return 1;
  if (!/^[1-9]\d*$/.test(value)) return null;
  const page = Number(value);
  return Number.isSafeInteger(page) ? page : null;
}
export function paginate<T>(items: T[], page: number, pageSize = PAGE_SIZE) {
  const pageCount = Math.max(1, Math.ceil(items.length / pageSize));
  return { items: items.slice((page - 1) * pageSize, page * pageSize), pageCount, total: items.length, valid: page <= pageCount };
}
export function listingHref(path: string, params: Record<string, string | undefined>, page: number) {
  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) if (value) query.set(key, value);
  if (page > 1) query.set('page', String(page));
  return `${path}${query.size ? `?${query}` : ''}`;
}
export function sortArticles(items: ArticleCard[], sort: string) {
  if (sort !== 'popular') return items;
  const frequencies = new Map<string, number>();
  for (const item of items) for (const tag of item.tags || []) frequencies.set(tag, (frequencies.get(tag) || 0) + 1);
  const score = (item: ArticleCard) => item.viewCount || (item.tags || []).reduce((n, tag) => n + (frequencies.get(tag) || 0), 0);
  return [...items].sort((a, b) => score(b) - score(a) || Date.parse(b.publishedAt || '') - Date.parse(a.publishedAt || ''));
}
