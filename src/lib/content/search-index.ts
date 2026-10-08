import Fuse from 'fuse.js';
import type { ArticleCard } from './types';

export type SearchEntry = Pick<ArticleCard, 'sanityId' | 'title' | 'slug' | 'metaDescription' | 'excerpt' | 'publishedAt' | 'language' | 'tags' | 'categories'>;

export async function loadSearchEntries(assets: { fetch(request: Request | string): Promise<Response> } | undefined, requestUrl: string): Promise<SearchEntry[]> {
  if (!assets) throw new Error('Static assets binding is unavailable');
  const response = await assets.fetch(new URL('/search-index.json', requestUrl).toString());
  if (!response.ok) throw new Error(`Search index unavailable: ${response.status}`);
  return response.json() as Promise<SearchEntry[]>;
}

const synonyms: Record<string, string> = { jjk: 'jujutsukaisen', aot: 'attackontitan', op: 'onepiece', kdramas: 'kdrama', 'k-drama': 'kdrama' };
const normalize = (value: string) => (synonyms[value.toLowerCase()] || value).toLowerCase().replace(/[^a-z0-9]/g, '');

export function searchEntries(cards: SearchEntry[], query: string, limit = 32, poolSize = 180): SearchEntry[] {
  const normalizedQuery = normalize(query.trim());
  if (normalizedQuery.length < 2) return [];
  const docs = cards.slice(0, poolSize).map(article => ({
    article, title: article.title, metaDescription: article.metaDescription || article.excerpt || '',
    normalized: [article.title, article.metaDescription || article.excerpt || ''].map(normalize),
  }));
  const index = new Fuse(docs, {
    includeScore: true, shouldSort: true, threshold: 0.32, distance: 80, ignoreLocation: true,
    keys: [{ name: 'title', weight: 0.5 }, { name: 'metaDescription', weight: 0.3 }, { name: 'normalized', weight: 0.7 }],
  });
  return index.search(normalizedQuery).slice(0, limit).map(hit => hit.item.article);
}
