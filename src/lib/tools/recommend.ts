// Deterministic recommendation logic. No AI services: candidates are scored
// from shared genres, themes, demographics, studios and MyAnimeList user
// recommendations, and every result carries the reasons it was chosen.

import { hash32 } from './daily.ts';
import { topK } from './top-k.ts';

/** Compact record in the recommendation index. */
export interface RecEntry {
  s: string;
  t: string;
  f: string;
  st: string;
  y?: number;
  e?: number;
  d?: number;
  p?: string;
  r?: number;           // popularity rank
  sc?: number;          // MAL score
  g: string[];          // genres
  th: string[];         // themes
  dm: string[];         // demographics
  so: string[];         // studios
  rc?: string[];        // MAL user-recommended slugs, strongest first
}

export interface RecFilters {
  genres?: string[];
  mood?: string;
  minEpisodes?: number;
  maxEpisodes?: number;
  fromYear?: number;
  toYear?: number;
  status?: string;
  popularity?: 'mainstream' | 'popular' | 'hidden';
  formats?: string[];
}

/** Moods map to MAL genres/themes. A title matches a mood if it has any. */
export const MOODS: Record<string, { label: string; tags: string[] }> = {
  hype: { label: 'Hype & adrenaline', tags: ['Action', 'Sports', 'Martial Arts', 'Super Power', 'Racing'] },
  cozy: { label: 'Cozy & relaxing', tags: ['Slice of Life', 'Iyashikei', 'Gourmet', 'CGDCT'] },
  laugh: { label: 'Laugh out loud', tags: ['Comedy', 'Gag Humor', 'Parody'] },
  feels: { label: 'Emotional', tags: ['Drama', 'Romance', 'Love Polygon'] },
  dark: { label: 'Dark & intense', tags: ['Horror', 'Psychological', 'Suspense', 'Gore', 'Survival'] },
  mind: { label: 'Mind-bending', tags: ['Mystery', 'Sci-Fi', 'Time Travel', 'Psychological'] },
  adventure: { label: 'Epic adventure', tags: ['Adventure', 'Fantasy', 'Isekai', 'Mythology'] },
  heart: { label: 'Romance', tags: ['Romance', 'Love Polygon', 'Boys Love', 'Girls Love'] },
};

const POPULARITY_BANDS = { mainstream: [1, 300], popular: [301, 1200], hidden: [1201, Number.POSITIVE_INFINITY] } as const;

export function episodeCount(entry: Pick<RecEntry, 'e' | 'st' | 'f'>): number | null {
  if (entry.f === 'movie') return entry.e || 1;
  return entry.e || null;
}

// The filter, similarity and ranking loops below run over every title (~2,300)
// on each request, usually in a cold isolate where V8 is still interpreting, so
// they avoid per-entry allocations (Sets, filtered copies, spreads).
export function matchesFilters(entry: RecEntry, filters: RecFilters): boolean {
  if (filters.status && entry.st !== filters.status) return false;
  if (filters.formats?.length && !filters.formats.includes(entry.f)) return false;
  if (filters.fromYear && (!entry.y || entry.y < filters.fromYear)) return false;
  if (filters.toYear && (!entry.y || entry.y > filters.toYear)) return false;
  if (filters.minEpisodes || filters.maxEpisodes) {
    const episodes = episodeCount(entry);
    if (filters.minEpisodes && (episodes === null || episodes < filters.minEpisodes)) return false;
    if (filters.maxEpisodes && (episodes === null || episodes > filters.maxEpisodes)) return false;
  }
  if (filters.popularity) {
    const [low, high] = POPULARITY_BANDS[filters.popularity];
    if (!entry.r || entry.r < low || entry.r > high) return false;
  }
  const hasTag = (tag: string) => entry.g.includes(tag) || entry.th.includes(tag) || entry.dm.includes(tag);
  if (filters.genres?.length && !filters.genres.every(hasTag)) return false;
  if (filters.mood && MOODS[filters.mood] && !MOODS[filters.mood].tags.some(hasTag)) return false;
  return true;
}

export interface Recommendation {
  entry: RecEntry;
  score: number;
  reasons: string[];
}

const overlap = (a: string[], b: string[]) => a.filter(value => b.includes(value));
const overlapCount = (a: string[], b: string[]) => {
  let count = 0;
  for (const value of a) if (b.includes(value)) count++;
  return count;
};

/** Similarity of a candidate to the seed titles, with human-readable reasons. */
export function similarity(candidate: RecEntry, seeds: RecEntry[]): { score: number; reasons: string[] } {
  let score = 0;
  let reasons: string[] | undefined;
  for (const seed of seeds) {
    const rank = seed.rc?.indexOf(candidate.s) ?? -1;
    if (rank >= 0) {
      score += 6 - Math.min(rank, 5) * 0.5;
      (reasons ??= []).push(`MyAnimeList users recommend it to fans of ${seed.t}`);
    }
    const genres = overlapCount(candidate.g, seed.g);
    const themes = overlapCount(candidate.th, seed.th);
    score += genres * 1.2 + themes * 1.5;
    if (genres + themes >= 2) {
      const shared = [...overlap(candidate.g, seed.g), ...overlap(candidate.th, seed.th)];
      (reasons ??= []).push(`Shares ${shared.slice(0, 3).join(', ')} with ${seed.t}`);
    }
    if (candidate.dm.some(value => seed.dm.includes(value))) score += 0.6;
    const studio = candidate.so.find(value => seed.so.includes(value));
    if (studio) {
      score += 1;
      (reasons ??= []).push(`Same studio as ${seed.t} (${studio})`);
    }
  }
  return { score, reasons: reasons ? [...new Set(reasons)].slice(0, 3) : [] };
}

export function filterReasons(entry: RecEntry, filters: RecFilters): string[] {
  const reasons: string[] = [];
  const tags = [...entry.g, ...entry.th];
  if (filters.mood && MOODS[filters.mood]) {
    const hits = MOODS[filters.mood].tags.filter(tag => tags.includes(tag));
    if (hits.length) reasons.push(`Fits “${MOODS[filters.mood].label}”: ${hits.slice(0, 2).join(', ')}`);
  }
  if (filters.genres?.length) reasons.push(`Has ${filters.genres.join(' + ')}`);
  if (entry.sc && entry.sc >= 8) reasons.push(`Rated ${entry.sc.toFixed(2)} on MyAnimeList`);
  return reasons;
}

/**
 * Ranks candidates. With seeds, similarity leads; without, a blend of score
 * and popularity. `exclude` removes watched titles and the seeds themselves.
 */
export function recommend(index: RecEntry[], options: { seeds?: string[]; filters?: RecFilters; exclude?: string[]; limit?: number }): Recommendation[] {
  const seedSet = new Set(options.seeds || []);
  const seeds = index.filter(entry => seedSet.has(entry.s));
  const excluded = new Set([...(options.exclude || []), ...seedSet]);
  const filters = options.filters || {};
  const results: Recommendation[] = [];
  for (const entry of index) {
    if (excluded.has(entry.s) || !matchesFilters(entry, filters)) continue;
    if (seeds.length) {
      const similar = similarity(entry, seeds);
      if (similar.score < 2.5) continue;
      const quality = (entry.sc || 6.5) - 6.5 + (entry.r ? Math.max(0, 3 - Math.log10(entry.r)) : 0);
      results.push({ entry, score: similar.score + quality * 0.6, reasons: similar.reasons.length ? similar.reasons : filterReasons(entry, filters) });
    } else {
      const quality = (entry.sc || 6.5) - 6.5 + (entry.r ? Math.max(0, 3 - Math.log10(entry.r)) : 0);
      results.push({ entry, score: quality, reasons: filterReasons(entry, filters) });
    }
  }
  return topK(results, options.limit ?? 24, (a, b) => b.score - a.score || a.entry.t.localeCompare(b.entry.t));
}

/** Deterministic random pick for a seed string (e.g. a click counter). */
export function randomPick(index: RecEntry[], filters: RecFilters, exclude: string[], seed: string): RecEntry | null {
  const excluded = new Set(exclude);
  const pool = index.filter(entry => !excluded.has(entry.s) && matchesFilters(entry, filters));
  return pool.length ? pool[hash32(seed) % pool.length] : null;
}

/**
 * "Anime like X": recommendations for one seed, leaving out the seed's own
 * franchise, adult titles and further seasons of a show already listed.
 */
export function similarTo(index: RecEntry[], seed: string, franchiseOf: (slug: string) => string | undefined, limit = 20): Recommendation[] {
  const seedFranchise = franchiseOf(seed) || seed;
  const seen = new Set([seedFranchise]);
  // Remakes share a title but not always a franchise (Hunter x Hunter 1999 and 2011).
  const titleKey = (title: string) => title.toLowerCase().replace(/\s*\(\d{4}\)$/, '').trim();
  const seenTitles = new Set(index.filter(entry => entry.s === seed).map(entry => titleKey(entry.t)));
  return recommend(index, { seeds: [seed], filters: { formats: ['tv', 'ona', 'movie'] }, limit: 200 })
    .filter(result => !result.entry.g.some(genre => /^(hentai|erotica)$/i.test(genre)))
    .filter(result => {
      const group = franchiseOf(result.entry.s) || result.entry.s;
      const title = titleKey(result.entry.t);
      if (seen.has(group) || seenTitles.has(title)) return false;
      seen.add(group);
      seenTitles.add(title);
      return true;
    })
    .slice(0, limit);
}
