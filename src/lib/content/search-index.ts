import Fuse from 'fuse.js';
import type { ArticleCard } from './types';

export type SearchEntry = Pick<ArticleCard, 'sanityId' | 'title' | 'slug' | 'metaDescription' | 'excerpt' | 'publishedAt' | 'language' | 'tags' | 'categories'>;

// The index is immutable for a deployment, so it is parsed once per isolate.
let pendingEntries: Promise<SearchEntry[]> | undefined;

export function loadSearchEntries(assets: { fetch(request: Request | string): Promise<Response> } | undefined, requestUrl: string): Promise<SearchEntry[]> {
  if (!pendingEntries) {
    pendingEntries = (async () => {
      if (!assets) throw new Error('Static assets binding is unavailable');
      const response = await assets.fetch(new URL('/search-index.json', requestUrl).toString());
      if (!response.ok) throw new Error(`Search index unavailable: ${response.status}`);
      return response.json() as Promise<SearchEntry[]>;
    })();
    // A failed load must not poison later requests.
    pendingEntries.catch(() => { pendingEntries = undefined; });
  }
  return pendingEntries;
}

const synonyms: Record<string, string> = { jjk: 'jujutsukaisen', aot: 'attackontitan', op: 'onepiece', kdramas: 'kdrama', 'k-drama': 'kdrama' };
const normalize = (value: string) => (synonyms[value.toLowerCase()] || value).toLowerCase().replace(/[^a-z0-9]/g, '');

type SearchDoc = { article: SearchEntry; title: string; metaDescription: string; normalized: string[] };

// Normalising every article and building the Fuse index is the bulk of a
// search's CPU, so it is done once per entries array and pool size.
const indexes = new WeakMap<SearchEntry[], Map<number, Fuse<SearchDoc>>>();

function indexFor(cards: SearchEntry[], poolSize: number) {
  let bySize = indexes.get(cards);
  if (!bySize) indexes.set(cards, bySize = new Map());
  let index = bySize.get(poolSize);
  if (!index) {
    const docs = cards.slice(0, poolSize).map(article => ({
      article, title: article.title, metaDescription: article.metaDescription || article.excerpt || '',
      normalized: [article.title, article.metaDescription || article.excerpt || ''].map(normalize),
    }));
    index = new Fuse(docs, {
      includeScore: true, shouldSort: true, threshold: 0.32, distance: 80, ignoreLocation: true,
      keys: [{ name: 'title', weight: 0.5 }, { name: 'metaDescription', weight: 0.3 }, { name: 'normalized', weight: 0.7 }],
    });
    bySize.set(poolSize, index);
  }
  return index;
}

export function searchEntries(cards: SearchEntry[], query: string, limit = 32, poolSize = 180): SearchEntry[] {
  const normalizedQuery = normalize(query.trim());
  if (normalizedQuery.length < 2) return [];
  return indexFor(cards, poolSize).search(normalizedQuery).slice(0, limit).map(hit => hit.item.article);
}
