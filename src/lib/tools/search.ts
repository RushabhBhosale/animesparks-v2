// Lightweight ranked search over the build-time tool indexes. It is a linear
// scan with string comparisons so it stays well inside Worker CPU limits.

import { compactKey, expandQuery, searchTokens } from './normalize.ts';

export interface SearchableEntry {
  t: string;
  k: string;
  r?: number;
}

/** Builds the stored search key: compact forms of every title, joined by "|". */
export function buildSearchKey(titles: Array<string | null | undefined>): string {
  return [...new Set(titles.filter(Boolean).map(title => compactKey(title!)).filter(Boolean))].join('|');
}

function score(entry: SearchableEntry, query: string, tokens: string[]): number {
  const keys = entry.k.split('|');
  let best = 0;
  for (const key of keys) {
    if (key === query) best = Math.max(best, 1000);
    else if (key.startsWith(query)) best = Math.max(best, 700 - Math.min(key.length - query.length, 200));
    else if (key.includes(query)) best = Math.max(best, 400 - Math.min(key.length - query.length, 200));
  }
  if (!best && tokens.length > 1) {
    // Every query word appears somewhere in the titles, in any order.
    const titleWords = searchTokens(entry.t).join(' ');
    if (tokens.every(token => entry.k.includes(token) || titleWords.includes(token))) best = 150;
  }
  if (!best) return 0;
  // Popularity breaks ties: rank 1 adds ~100, rank 10,000 adds ~0.
  const popularity = entry.r ? Math.max(0, 100 - Math.log10(entry.r) * 25) : 0;
  return best + popularity;
}

export function searchIndex<T extends SearchableEntry>(entries: T[], rawQuery: string, limit = 8): T[] {
  const query = expandQuery(rawQuery.slice(0, 100));
  if (query.length < 2) return [];
  const tokens = searchTokens(rawQuery.slice(0, 100)).map(compactKey).filter(token => token.length > 1);
  const hits: Array<{ entry: T; score: number }> = [];
  for (const entry of entries) {
    const value = score(entry, query, tokens);
    if (value > 0) hits.push({ entry, score: value });
  }
  return hits.sort((a, b) => b.score - a.score || a.entry.t.localeCompare(b.entry.t)).slice(0, limit).map(hit => hit.entry);
}
