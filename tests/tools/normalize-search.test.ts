import { test } from 'node:test';
import assert from 'node:assert/strict';
import { compactKey, formatDuration, parseDurationMinutes, slugify } from '../../src/lib/tools/normalize.ts';
import { buildSearchKey, searchIndex } from '../../src/lib/tools/search.ts';

test('provider duration strings parse to minutes', () => {
  assert.equal(parseDurationMinutes('24 min per ep'), 24);
  assert.equal(parseDurationMinutes('1 hr 55 min'), 115);
  assert.equal(parseDurationMinutes('2 hr'), 120);
  assert.equal(parseDurationMinutes('45 sec per ep'), 0.75);
  assert.equal(parseDurationMinutes('Unknown'), null);
  assert.equal(parseDurationMinutes(null), null);
});

test('slugs are stable, ascii and url-safe', () => {
  assert.equal(slugify("Frieren: Beyond Journey's End"), 'frieren-beyond-journeys-end');
  assert.equal(slugify('Mahou Shoujo Madoka☆Magica'), 'mahou-shoujo-madoka-magica');
  assert.equal(slugify('Pokémon'), 'pokemon');
  assert.equal(slugify('[Oshi no Ko]'), 'oshi-no-ko');
  assert.equal(compactKey('Re:ZERO -Starting Life in Another World-'), 'rezerostartinglifeinanotherworld');
});

test('durations format compactly', () => {
  assert.equal(formatDuration(0), '0 min');
  assert.equal(formatDuration(59), '59 min');
  assert.equal(formatDuration(61), '1 h 1 min');
  assert.equal(formatDuration(1440 * 2 + 60), '2 d 1 h');
});

const index = [
  { s: 'one-piece', t: 'One Piece', k: buildSearchKey(['One Piece']), r: 20 },
  { s: 'one-piece-film-red', t: 'One Piece Film: Red', k: buildSearchKey(['One Piece Film: Red']), r: 400 },
  { s: 'attack-on-titan', t: 'Attack on Titan', k: buildSearchKey(['Attack on Titan', 'Shingeki no Kyojin']), r: 1 },
  { s: 'one-punch-man', t: 'One Punch Man', k: buildSearchKey(['One Punch Man']), r: 8 },
];

test('exact title beats prefix beats substring', () => {
  assert.deepEqual(searchIndex(index, 'one piece').map(entry => entry.s), ['one-piece', 'one-piece-film-red']);
  assert.equal(searchIndex(index, 'film red')[0].s, 'one-piece-film-red');
});

test('alternative titles and fan abbreviations match', () => {
  assert.equal(searchIndex(index, 'shingeki')[0].s, 'attack-on-titan');
  assert.equal(searchIndex(index, 'AOT')[0].s, 'attack-on-titan');
  assert.equal(searchIndex(index, 'op')[0].s, 'one-piece');
});

test('word-order-insensitive matching and empty queries', () => {
  assert.equal(searchIndex(index, 'titan attack')[0].s, 'attack-on-titan');
  assert.deepEqual(searchIndex(index, 'a'), []);
  assert.deepEqual(searchIndex(index, 'zzzz'), []);
  assert.equal(searchIndex(index, 'one', 2).length, 2);
});
