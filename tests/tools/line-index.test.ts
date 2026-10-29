import { test } from 'node:test';
import assert from 'node:assert/strict';
import { LineIndex, encodeLines } from '../../src/lib/tools/line-index.ts';
import { buildSearchKey, searchIndex } from '../../src/lib/tools/search.ts';

type Entry = { s: string; t: string; k: string; r?: number; f: string };
const make = (slug: string, title: string, alt: string[] = [], r?: number): Entry => ({ s: slug, t: title, k: buildSearchKey([title, ...alt]), r, f: 'tv' });

const titles: Entry[] = [
  make('one-piece', 'One Piece', [], 20),
  make('one-piece-film-red', 'One Piece Film: Red', [], 400),
  make('attack-on-titan', 'Attack on Titan', ['Shingeki no Kyojin'], 1),
  make('one-punch-man', 'One Punch Man', [], 8),
  make('pokemon', 'Pokémon', ['Pocket Monsters'], 300),
  make('re-zero', 'Re:ZERO -Starting Life in Another World-', ['Re:Zero kara Hajimeru Isekai Seikatsu'], 15),
  make('jjk', 'Jujutsu Kaisen', [], 5),
  make('tv-show', 'The TV Show Movie', [], undefined),
  make('naruto', 'Naruto', [], 2),
  make('naruto-shippuden', 'Naruto: Shippuden', [], 3),
  make('boruto', 'Boruto: Naruto Next Generations', [], 90),
];
const lines = new LineIndex<Entry>(encodeLines(titles));
// The API serialises to JSON, which drops undefined fields; compare in that form.
const withoutKey = ({ k: _k, ...rest }: Entry) => JSON.parse(JSON.stringify(rest));

test('line index returns the same hits, in the same order, as the object index', () => {
  const queries = ['one piece', 'one', 'op', 'aot', 'JJK', 'shingeki', 'titan attack', 'attack titan', 'pokemon', 'Pokémon', 'pocket',
    'rezero', 're zero', 'starting life', 'life starting', 'naruto', 'naruto next', 'next generations naruto', 'tv', 'movie', 'film red', 'zzzz', 'a', '', 'the'];
  for (const query of queries) {
    for (const limit of [1, 3, 8]) {
      assert.deepEqual(lines.search(query, limit), searchIndex(titles, query, limit).map(withoutKey), `query "${query}" limit ${limit}`);
    }
  }
});

test('line index matches the object index on a larger generated catalogue', () => {
  const words = ['dragon', 'star', 'night', 'blade', 'hero', 'academia', 'sword', 'art', 'online', 'magic', 'knight', 'school', 'love', 'is', 'war', 'moon'];
  let seed = 7;
  const next = () => (seed = (seed * 1103515245 + 12345) & 0x7fffffff);
  const catalogue = Array.from({ length: 400 }, (_, index) => {
    const title = Array.from({ length: 1 + (next() % 4) }, () => words[next() % words.length]).join(' ');
    return make(`entry-${index}`, title, next() % 3 ? [] : [words[next() % words.length] + ' alt'], next() % 5 ? 1 + (next() % 5000) : undefined);
  });
  const index = new LineIndex<Entry>(encodeLines(catalogue));
  for (let i = 0; i < 300; i++) {
    const query = Array.from({ length: 1 + (next() % 3) }, () => words[next() % words.length].slice(0, 2 + (next() % 5))).join(' ');
    assert.deepEqual(index.search(query, 8), searchIndex(catalogue, query, 8).map(withoutKey), `query "${query}"`);
  }
});

test('matches inside the JSON body never count as hits', () => {
  assert.deepEqual(lines.search('"f"'), []);
  assert.deepEqual(lines.search('tvshow').map(entry => entry.s), ['tv-show']);
});

test('slug lookup finds the first, middle and last entries and rejects misses', () => {
  assert.equal(lines.bySlug('one-piece')?.t, 'One Piece');
  assert.equal(lines.bySlug('jjk')?.t, 'Jujutsu Kaisen');
  assert.equal(lines.bySlug('boruto')?.t, 'Boruto: Naruto Next Generations');
  assert.equal(lines.bySlug('piece'), undefined);
  assert.equal(lines.bySlug('naruto-'), undefined);
  assert.equal(lines.bySlug('x¦y'), undefined);
  assert.equal(lines.bySlug(''), undefined);
  assert.equal(lines.bySlug('one-piece')?.hasOwnProperty('k'), false, 'search key is not exposed');
});
