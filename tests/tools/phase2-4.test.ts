import { test } from 'node:test';
import assert from 'node:assert/strict';
import { chapterForEpisode, classifyEpisodes, fillerFreeEpisodes, formatRanges, summarize, toRanges, typeRuns } from '../../src/lib/tools/episodes.ts';
import { countdownParts, nextBroadcast, parseClock, weekdayIn, weekdayIndex } from '../../src/lib/tools/schedule.ts';
import { buildClues, emptyStats, hash32, isCorrectGuess, msUntilNextPuzzle, pickForDate, puzzleNumber, recordResult, shareGrid, utcDateKey } from '../../src/lib/tools/daily.ts';
import { matchesFilters, randomPick, recommend, type RecEntry } from '../../src/lib/tools/recommend.ts';
import { clampWatched, completion, mergeEntries, parseImport, stats, withStatus, type WatchlistEntry } from '../../src/lib/tools/watchlist.ts';
import { addItem, addTier, moveItem, moveTier, newTierList, removeItem, removeTier, restoreTierList } from '../../src/lib/tools/tierlist.ts';
import { validateArcFile, validateFillerFile, validateMappingFile, validateNoticeFile } from '../../src/lib/tools/curated.ts';

// ── Filler classification ────────────────────────────────────────────────

const flags = [{ n: 1, t: 'Start' }, { n: 2 }, { n: 3, f: 1 as const }, { n: 4, f: 1 as const }, { n: 5, r: 1 as const }, { n: 6 }];

test('provider flags classify filler, recap and unflagged canon; gaps are unknown', () => {
  const episodes = classifyEpisodes(flags, 8, null);
  assert.deepEqual(episodes.map(episode => episode.type), ['canon', 'canon', 'filler', 'filler', 'recap', 'canon', 'unknown', 'unknown']);
  const summary = summarize(episodes);
  assert.equal(summary.skippable, 3);
  assert.equal(summary.fillerPercent, 50); // 3 of 6 known episodes
  assert.deepEqual(fillerFreeEpisodes(episodes), [1, 2, 6, 7, 8]);
  assert.deepEqual(typeRuns(episodes).map(run => `${run.type}:${run.start}-${run.end}`), ['canon:1-2', 'filler:3-4', 'recap:5-5', 'canon:6-6', 'unknown:7-8']);
});

test('verified curated lists replace provider flags entirely', () => {
  const curated = { ranges: [{ start: 1, end: 2, type: 'manga-canon' as const }, { start: 3, end: 3, type: 'mixed' as const }, { start: 4, end: 6, type: 'anime-canon' as const }] };
  assert.deepEqual(classifyEpisodes(flags, 6, curated).map(episode => episode.type), ['manga-canon', 'manga-canon', 'mixed', 'anime-canon', 'anime-canon', 'anime-canon']);
});

test('ranges compress and format', () => {
  assert.deepEqual(toRanges([5, 1, 2, 3, 9, 10]), [[1, 3], [5, 5], [9, 10]]);
  assert.equal(formatRanges(toRanges([1, 2, 3, 5, 9, 10])), '1-3, 5, 9-10');
  assert.equal(formatRanges([]), '');
});

test('chapter lookup only answers from the verified mapping', () => {
  const mapping = { ranges: [{ episodeStart: 1, episodeEnd: 2, chapterStart: 1, chapterEnd: 5 }, { episodeStart: 3, episodeEnd: 3, chapterStart: 6, chapterEnd: 8 }], continueFromChapter: 9 };
  assert.deepEqual(chapterForEpisode(mapping, 2), { kind: 'found', chapterStart: 1, chapterEnd: 5, note: undefined, nextChapter: 6 });
  assert.deepEqual(chapterForEpisode(mapping, 7), { kind: 'after-anime', continueFromChapter: 9, note: undefined });
  assert.deepEqual(chapterForEpisode({ ranges: [{ episodeStart: 5, episodeEnd: 6, chapterStart: 10, chapterEnd: 12 }] }, 2), { kind: 'not-covered' });
});

// ── Broadcast schedule ───────────────────────────────────────────────────

test('weekly JST slots convert to the right UTC instant', () => {
  assert.equal(weekdayIndex('Fridays'), 5);
  assert.equal(weekdayIndex('Unknown'), null);
  assert.equal(parseClock('25:30'), 25 * 60 + 30);
  assert.equal(parseClock('bad'), null);
  // Thursday 2026-10-15 12:00 UTC = Thursday 21:00 JST.
  const now = Date.UTC(2026, 9, 15, 12, 0);
  // Friday 23:00 JST = Friday 14:00 UTC.
  assert.equal(new Date(nextBroadcast('Fridays', '23:00', now)!).toISOString(), '2026-10-16T14:00:00.000Z');
  // Thursday 20:00 JST already passed → next week.
  assert.equal(new Date(nextBroadcast('Thursdays', '20:00', now)!).toISOString(), '2026-10-22T11:00:00.000Z');
  // Saturday 25:30 JST = Sunday 01:30 JST = Saturday 16:30 UTC.
  assert.equal(new Date(nextBroadcast('Saturdays', '25:30', now)!).toISOString(), '2026-10-17T16:30:00.000Z');
  assert.equal(nextBroadcast(null, '23:00', now), null);
});

test('local weekday follows the viewer timezone, including date-line cases', () => {
  const slot = Date.parse('2026-10-16T14:00:00Z'); // Fri 23:00 JST
  assert.equal(weekdayIn(slot, 'Asia/Tokyo'), 5);
  assert.equal(weekdayIn(slot, 'America/Los_Angeles'), 5); // Fri 07:00
  assert.equal(weekdayIn(Date.parse('2026-10-16T16:00:00Z'), 'Pacific/Auckland'), 6); // Sat 05:00
  assert.deepEqual(countdownParts(90061000), { days: 1, hours: 1, minutes: 1, seconds: 1 });
  assert.deepEqual(countdownParts(-5), { days: 0, hours: 0, minutes: 0, seconds: 0 });
});

// ── Daily game ───────────────────────────────────────────────────────────

test('the daily puzzle depends only on the UTC date', () => {
  // 23:30 in New York on Oct 16 is already Oct 17 UTC; same puzzle as Tokyo.
  assert.equal(utcDateKey(Date.parse('2026-10-16T23:30:00-04:00')), '2026-10-17');
  assert.equal(utcDateKey(Date.parse('2026-10-17T12:30:00+09:00')), '2026-10-17');
  assert.equal(puzzleNumber('2026-10-15'), 1);
  assert.equal(puzzleNumber('2026-11-14'), 31);
  assert.equal(msUntilNextPuzzle(Date.parse('2026-10-17T23:59:00Z')), 60000);
});

test('scheduling is deterministic and avoids recent answers', () => {
  const pool = Array.from({ length: 50 }, (_, index) => ({ slug: `anime-${index}` }));
  const first = pickForDate(pool, '2026-10-20', new Set());
  assert.deepEqual(first, pickForDate(pool, '2026-10-20', new Set()));
  assert.notEqual(pickForDate(pool, '2026-10-20', new Set([first!.slug]))!.slug, first!.slug);
  assert.equal(hash32('abc'), hash32('abc'));
  assert.equal(pickForDate([], '2026-10-20', new Set()), null);
});

test('clues go from broad to specific and never contain the title', () => {
  const clues = buildClues({ format: 'tv', season: 'fall', year: 2023, genres: ['Adventure', 'Drama'], themes: [], demographics: ['Shounen'], studios: ['Madhouse'], episodes: 28, sourceMaterial: 'Manga', mainCharacters: ['Frieren', 'Fern', 'Stark'] });
  assert.equal(clues.length, 6);
  assert.match(clues[0], /Fall 2023/);
  assert.match(clues[2], /Madhouse/);
  assert.match(clues[3], /28 episodes/);
  assert.match(clues[5], /Fern and Stark/);
  assert.equal(buildClues({ format: 'movie', year: null, genres: [], themes: [], demographics: [], studios: [], episodes: null, mainCharacters: [] }).length, 6);
});

test('guesses match by slug or any known title', () => {
  const answer = { slug: 'frieren', title: "Frieren: Beyond Journey's End", alternatives: ['Sousou no Frieren'] };
  assert.equal(isCorrectGuess('frieren', 'x', answer), true);
  assert.equal(isCorrectGuess('other', 'sousou no frieren', answer), true);
  assert.equal(isCorrectGuess('other', 'Frieren 2', answer), false);
});

test('streaks count consecutive UTC days and replays change nothing', () => {
  let stats = recordResult(emptyStats(), '2026-10-17', true, 3);
  stats = recordResult(stats, '2026-10-18', true, 1);
  assert.equal(stats.currentStreak, 2);
  assert.equal(recordResult(stats, '2026-10-18', false, 6), stats);
  stats = recordResult(stats, '2026-10-20', true, 2);
  assert.equal(stats.currentStreak, 1, 'a missed day resets the streak');
  assert.equal(stats.maxStreak, 2);
  assert.deepEqual(stats.distribution, [1, 1, 1, 0, 0, 0]);
  stats = recordResult(stats, '2026-10-21', false, 6);
  assert.equal(stats.currentStreak, 0);
  assert.equal(stats.played, 4);
});

test('share text has no spoilers', () => {
  const text = shareGrid(12, [false, false, true], true);
  assert.equal(text, 'AnimeSparks Daily #12 3/6\n🟥🟥🟩');
  assert.match(shareGrid(12, Array(6).fill(false), false), /X\/6/);
});

// ── Recommendations ──────────────────────────────────────────────────────

const rec = (s: string, extra: Partial<RecEntry>): RecEntry => ({ s, t: s, f: 'tv', st: 'finished', g: [], th: [], dm: [], so: [], ...extra });
const index: RecEntry[] = [
  rec('frieren', { g: ['Adventure', 'Drama', 'Fantasy'], so: ['Madhouse'], rc: ['violet', 'mushishi'], y: 2023, e: 28, r: 96, sc: 9.3 }),
  rec('violet', { g: ['Drama', 'Fantasy'], so: ['Kyoto Animation'], y: 2018, e: 13, r: 80, sc: 8.7 }),
  rec('mushishi', { g: ['Adventure', 'Fantasy', 'Mystery'], th: ['Iyashikei'], y: 2005, e: 26, r: 900, sc: 8.6 }),
  rec('hxh', { g: ['Action', 'Adventure', 'Fantasy'], so: ['Madhouse'], y: 2011, e: 148, r: 10, sc: 9.0 }),
  rec('kon', { g: ['Comedy'], th: ['CGDCT'], y: 2009, e: 13, r: 300, sc: 7.9 }),
];

test('filters narrow by mood, length, year and popularity', () => {
  assert.equal(matchesFilters(index[4], { mood: 'cozy' }), true);
  assert.equal(matchesFilters(index[3], { mood: 'cozy' }), false);
  assert.equal(matchesFilters(index[3], { maxEpisodes: 26 }), false);
  assert.equal(matchesFilters(index[1], { fromYear: 2015, toYear: 2020 }), true);
  assert.equal(matchesFilters(index[2], { popularity: 'hidden' }), false);
  assert.equal(matchesFilters(index[2], { popularity: 'popular' }), true);
  assert.equal(matchesFilters(index[0], { genres: ['Drama', 'Fantasy'] }), true);
});

test('similar titles come with reasons; seeds and exclusions are removed', () => {
  const results = recommend(index, { seeds: ['frieren'], exclude: ['mushishi'] });
  const slugs = results.map(result => result.entry.s);
  assert.ok(!slugs.includes('frieren') && !slugs.includes('mushishi'));
  assert.equal(slugs[0], 'violet', 'MAL user recommendations rank first');
  assert.ok(results[0].reasons.some(reason => /MyAnimeList users recommend/.test(reason)));
  assert.ok(results.find(result => result.entry.s === 'hxh')!.reasons.some(reason => /Same studio/.test(reason)));
  assert.ok(!slugs.includes('kon'), 'unrelated titles are not padded in');
});

test('random picks are deterministic per seed and respect exclusions', () => {
  assert.deepEqual(randomPick(index, {}, [], 'a'), randomPick(index, {}, [], 'a'));
  assert.equal(randomPick(index, { mood: 'cozy' }, ['kon'], 'x')?.s, 'mushishi', 'Iyashikei counts as cozy');
  assert.equal(randomPick(index, { mood: 'cozy' }, ['kon', 'mushishi'], 'x'), null);
});

// ── Watchlist ────────────────────────────────────────────────────────────

const entry = (slug: string, extra: Partial<WatchlistEntry> = {}): WatchlistEntry => ({
  slug, title: slug, episodes: 24, minutesPerEpisode: 24, status: 'watching', watched: 12, addedAt: '2026-01-01T00:00:00Z', updatedAt: '2026-01-02T00:00:00Z', ...extra,
});

test('watchlist progress and stats', () => {
  assert.equal(completion(entry('a')), 50);
  assert.equal(completion(entry('a', { episodes: null })), null);
  assert.equal(clampWatched(entry('a'), 99), 24);
  assert.equal(clampWatched(entry('a', { episodes: null }), 99), 99);
  assert.equal(withStatus(entry('a'), 'completed', 'now').watched, 24);
  const summary = stats([entry('a'), entry('b', { status: 'completed', watched: 24, score: 9 }), entry('c', { status: 'planning', watched: 0, score: 7 })]);
  assert.equal(summary.watchedEpisodes, 36);
  assert.equal(summary.watchedMinutes, 36 * 24);
  assert.equal(summary.remainingMinutes, (12 + 24) * 24);
  assert.equal(summary.meanScore, 8);
});

test('imports are validated and merges keep the newest entry', () => {
  assert.ok(parseImport({ foo: 1 }).error);
  const result = parseImport({ schema: 'animesparks.watchlist', version: 1, entries: [entry('good'), { slug: 'BAD SLUG', title: 'x', status: 'watching', watched: 1 }, { ...entry('evil'), poster: 'https://evil.example/x.jpg' }] });
  assert.equal(result.entries.length, 2);
  assert.equal(result.skipped, 1);
  assert.equal(result.entries[1].poster, undefined, 'only MAL CDN posters are kept');
  const merged = mergeEntries([entry('a', { watched: 3, updatedAt: '2026-02-01' })], [entry('a', { watched: 9, updatedAt: '2026-03-01' }), entry('b')]);
  assert.equal(merged.length, 2);
  assert.equal(merged.find(item => item.slug === 'a')!.watched, 9);
});

// ── Tier list ────────────────────────────────────────────────────────────

test('tier list moves, reorders and returns removed tiers to the pool', () => {
  let list = newTierList('t0');
  list = addItem(list, { slug: 'a', title: 'A' }, 't1');
  list = addItem(list, { slug: 'b', title: 'B' }, 't1');
  assert.equal(addItem(list, { slug: 'a', title: 'A' }, 't1'), list, 'no duplicates');
  list = moveItem(list, 'a', 'tier-0', undefined, 't2');
  list = moveItem(list, 'b', 'tier-0', 0, 't3');
  assert.deepEqual(list.tiers[0].items, ['b', 'a']);
  assert.deepEqual(list.pool, []);
  list = moveTier(list, 'tier-0', 1, 't4');
  assert.equal(list.tiers[1].name, 'S');
  list = removeTier(list, 'tier-0', 't5');
  assert.deepEqual(list.pool, ['b', 'a']);
  list = addTier(list, 't6');
  assert.equal(list.tiers.length, 5);
  list = removeItem(list, 'a', 't7');
  assert.deepEqual(Object.keys(list.items), ['b']);
});

test('stored tier lists are sanitised on restore', () => {
  const restored = restoreTierList({ title: 'x', tiers: [{ id: 't', name: 'S', color: 'red; background:url(x)', items: ['a', 'a', 'ghost'] }], pool: [], items: { a: { title: 'A' }, b: { title: 'B' }, 'BAD SLUG': { title: 'no' } } }, 'now');
  assert.equal(restored.tiers[0].color, '#8d8d8d');
  assert.deepEqual(restored.tiers[0].items, ['a']);
  assert.deepEqual(restored.pool, ['b'], 'unplaced items return to the pool');
  assert.equal(restoreTierList('garbage', 'now').tiers.length, 5);
});

// ── Curated validators ───────────────────────────────────────────────────

const meta = { sources: [{ name: 'Ref', url: 'https://example.org' }], verification: { status: 'verified' as const, verifiedBy: 'Ed', verifiedAt: '2026-10-17' } };
const anime = new Set(['naruto']);

test('curated filler, mapping, arc and notice files are validated', () => {
  assert.deepEqual(validateFillerFile({ slug: 'naruto', ranges: [{ start: 1, end: 5, type: 'manga-canon' }, { start: 6, end: 7, type: 'filler' }], ...meta }, anime).errors, []);
  assert.ok(validateFillerFile({ slug: 'naruto', ranges: [{ start: 1, end: 5, type: 'filler' }, { start: 4, end: 7, type: 'filler' }], ...meta }, anime).errors.some(error => /overlaps/.test(error)));
  assert.ok(validateFillerFile({ slug: 'naruto', ranges: [{ start: 1, end: 5, type: 'canon' }], ...meta }, anime).errors.length);
  assert.deepEqual(validateMappingFile({ slug: 'naruto', ranges: [{ episodeStart: 1, episodeEnd: 2, chapterStart: 1, chapterEnd: 4 }], continueFromChapter: 5, ...meta }, anime).errors, []);
  assert.ok(validateMappingFile({ slug: 'naruto', ranges: [{ episodeStart: 1, episodeEnd: 2, chapterStart: 9, chapterEnd: 4 }], ...meta }, anime).errors.length);
  assert.deepEqual(validateArcFile({ slug: 'naruto', arcs: [{ name: 'Land of Waves', episodeStart: 6, episodeEnd: 19, classification: 'canon' }], ...meta }, anime).errors, []);
  assert.ok(validateArcFile({ slug: 'unknown', arcs: [{ name: '', episodeStart: 1, episodeEnd: 2 }], sources: [] }, anime).errors.length >= 3);
  assert.deepEqual(validateNoticeFile({ slug: 'naruto', date: '2026-10-19', text: 'Break week', ...meta }, anime).errors, []);
  assert.ok(validateNoticeFile({ slug: 'naruto', date: 'soon', text: '', ...meta }, anime).errors.length >= 2);
});
