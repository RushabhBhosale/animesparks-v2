import { test } from 'node:test';
import assert from 'node:assert/strict';
import { MOODS, episodeCount, matchesFilters, recommend, similarity, type RecEntry, type RecFilters } from '../../src/lib/tools/recommend.ts';

// The allocation-free implementations must behave exactly like the original
// Set/filter based ones, which are kept here as the reference.
const POPULARITY_BANDS = { mainstream: [1, 300], popular: [301, 1200], hidden: [1201, Number.POSITIVE_INFINITY] } as const;
function referenceMatches(entry: RecEntry, filters: RecFilters): boolean {
  const tags = new Set([...entry.g, ...entry.th, ...entry.dm]);
  if (filters.genres?.length && !filters.genres.every(genre => tags.has(genre))) return false;
  if (filters.mood && MOODS[filters.mood] && !MOODS[filters.mood].tags.some(tag => tags.has(tag))) return false;
  const episodes = episodeCount(entry);
  if (filters.minEpisodes && (episodes === null || episodes < filters.minEpisodes)) return false;
  if (filters.maxEpisodes && (episodes === null || episodes > filters.maxEpisodes)) return false;
  if (filters.fromYear && (!entry.y || entry.y < filters.fromYear)) return false;
  if (filters.toYear && (!entry.y || entry.y > filters.toYear)) return false;
  if (filters.status && entry.st !== filters.status) return false;
  if (filters.formats?.length && !filters.formats.includes(entry.f)) return false;
  if (filters.popularity) {
    const [low, high] = POPULARITY_BANDS[filters.popularity];
    if (!entry.r || entry.r < low || entry.r > high) return false;
  }
  return true;
}
const overlap = (a: string[], b: string[]) => a.filter(value => b.includes(value));
function referenceSimilarity(candidate: RecEntry, seeds: RecEntry[]) {
  let score = 0;
  const reasons: string[] = [];
  for (const seed of seeds) {
    const rank = seed.rc?.indexOf(candidate.s) ?? -1;
    if (rank >= 0) {
      score += 6 - Math.min(rank, 5) * 0.5;
      reasons.push(`MyAnimeList users recommend it to fans of ${seed.t}`);
    }
    const genres = overlap(candidate.g, seed.g);
    const themes = overlap(candidate.th, seed.th);
    const shared = [...genres, ...themes];
    score += genres.length * 1.2 + themes.length * 1.5;
    if (shared.length >= 2) reasons.push(`Shares ${shared.slice(0, 3).join(', ')} with ${seed.t}`);
    if (overlap(candidate.dm, seed.dm).length) score += 0.6;
    const studio = overlap(candidate.so, seed.so)[0];
    if (studio) {
      score += 1;
      reasons.push(`Same studio as ${seed.t} (${studio})`);
    }
  }
  return { score, reasons: [...new Set(reasons)].slice(0, 3) };
}

let state = 99;
const rand = (n: number) => (state = (state * 1103515245 + 12345) & 0x7fffffff) % n;
const pick = <T>(items: T[], max: number) => Array.from({ length: rand(max + 1) }, () => items[rand(items.length)]);
const GENRES = ['Action', 'Comedy', 'Drama', 'Fantasy', 'Romance', 'Sports', 'Mystery', 'Sci-Fi'];
const THEMES = ['Isekai', 'Iyashikei', 'Psychological', 'Mythology', 'School', 'Time Travel', 'Survival'];
const DEMOS = ['Shounen', 'Seinen', 'Josei'];
const STUDIOS = ['MAPPA', 'Bones', 'Madhouse', 'Ufotable'];
const FORMATS = ['tv', 'movie', 'ona', 'ova'];
const catalogue: RecEntry[] = Array.from({ length: 500 }, (_, i) => ({
  s: `title-${i}`, t: `Title ${i % 37}`, f: FORMATS[rand(4)], st: ['finished', 'airing'][rand(2)],
  y: rand(6) ? 1990 + rand(36) : undefined, e: rand(5) ? 1 + rand(200) : undefined, d: 24,
  r: rand(4) ? 1 + rand(3000) : undefined, sc: rand(3) ? 5 + rand(40) / 10 : undefined,
  g: pick(GENRES, 4), th: pick(THEMES, 3), dm: pick(DEMOS, 2), so: pick(STUDIOS, 2),
  rc: rand(2) ? pick(Array.from({ length: 500 }, (_, j) => `title-${j}`), 8) : undefined,
}));
const randomFilters = (): RecFilters => ({
  genres: rand(2) ? pick(GENRES, 2) : undefined, mood: rand(3) === 0 ? Object.keys(MOODS)[rand(Object.keys(MOODS).length)] : undefined,
  minEpisodes: rand(4) === 0 ? 1 + rand(30) : undefined, maxEpisodes: rand(4) === 0 ? 10 + rand(200) : undefined,
  fromYear: rand(4) === 0 ? 1995 + rand(25) : undefined, toYear: rand(4) === 0 ? 2005 + rand(25) : undefined,
  status: rand(4) === 0 ? 'airing' : undefined, popularity: rand(4) === 0 ? (['mainstream', 'popular', 'hidden'] as const)[rand(3)] : undefined,
  formats: rand(3) === 0 ? pick(FORMATS, 3) : undefined,
});

test('matchesFilters agrees with the original implementation', () => {
  for (let i = 0; i < 3000; i++) {
    const filters = randomFilters();
    const entry = catalogue[rand(catalogue.length)];
    assert.equal(matchesFilters(entry, filters), referenceMatches(entry, filters), JSON.stringify({ entry, filters }));
  }
});

test('similarity agrees with the original implementation, including float scores and reasons', () => {
  for (let i = 0; i < 3000; i++) {
    const seeds = Array.from({ length: 1 + rand(3) }, () => catalogue[rand(catalogue.length)]);
    const candidate = catalogue[rand(catalogue.length)];
    assert.deepEqual(similarity(candidate, seeds), referenceSimilarity(candidate, seeds));
  }
});

test('recommend returns the same ranked results as before', () => {
  for (let i = 0; i < 200; i++) {
    const seeds = Array.from({ length: rand(4) }, () => catalogue[rand(catalogue.length)].s);
    const filters = randomFilters();
    const exclude = pick(catalogue.map(entry => entry.s), 20);
    const actual = recommend(catalogue, { seeds, filters, exclude, limit: 24 });
    // Re-derive the expected ranking from the reference helpers.
    const seedEntries = catalogue.filter(entry => seeds.includes(entry.s));
    const excluded = new Set([...exclude, ...seeds]);
    const expected = catalogue.flatMap(entry => {
      if (excluded.has(entry.s) || !referenceMatches(entry, filters)) return [];
      const quality = (entry.sc || 6.5) - 6.5 + (entry.r ? Math.max(0, 3 - Math.log10(entry.r)) : 0);
      if (!seedEntries.length) return [{ slug: entry.s, score: quality }];
      const similar = referenceSimilarity(entry, seedEntries);
      return similar.score < 2.5 ? [] : [{ slug: entry.s, score: similar.score + quality * 0.6, reasons: similar.reasons }];
    }).sort((a, b) => b.score - a.score || catalogue.find(e => e.s === a.slug)!.t.localeCompare(catalogue.find(e => e.s === b.slug)!.t)).slice(0, 24);
    assert.deepEqual(actual.map(result => [result.entry.s, result.score]), expected.map(result => [result.slug, result.score]));
    for (const [index, result] of actual.entries()) {
      if (expected[index].reasons?.length) assert.deepEqual(result.reasons, expected[index].reasons);
    }
  }
});
