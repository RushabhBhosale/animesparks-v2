import { test } from 'node:test';
import assert from 'node:assert/strict';
import { isPublishable, validateWatchOrderFile } from '../../src/lib/tools/curated.ts';
import { pickExactMatch } from '../../scripts/tools/sync-tenrai.mjs';

const franchises = new Set(['monogatari']);
const anime = new Set(['bakemonogatari', 'kizumonogatari-i', 'nisemonogatari']);
const valid = {
  franchise: 'monogatari',
  orders: { chronological: { entries: [{ anime: 'kizumonogatari-i' }, { anime: 'bakemonogatari', optional: false }, { anime: 'nisemonogatari', episodes: '1-11' }] } },
  sources: [{ name: 'Publisher reference', url: 'https://example.org/reference' }],
  verification: { status: 'verified', verifiedBy: 'Editor', verifiedAt: '2026-10-16' },
};

test('valid curated orders produce documents', () => {
  const { errors, documents } = validateWatchOrderFile(valid, franchises, anime, new Date('2026-10-16T00:00:00Z'));
  assert.deepEqual(errors, []);
  assert.equal(documents.length, 1);
  assert.equal(documents[0].kind, 'chronological');
  assert.equal(documents[0].entries[2].episodes, '1-11');
  assert.equal(isPublishable(documents[0]), true);
});

test('curated orders without sources, verifier or known slugs are rejected', () => {
  const cases = [
    { ...valid, sources: [] },
    { ...valid, sources: [{ name: 'Insecure', url: 'http://example.org' }] },
    { ...valid, verification: { status: 'verified' } },
    { ...valid, franchise: 'unknown' },
    { ...valid, orders: { chronological: { entries: [{ anime: 'bakemonogatari' }, { anime: 'made-up-title' }] } } },
    { ...valid, orders: { release: { entries: [{ anime: 'bakemonogatari' }, { anime: 'nisemonogatari' }] } } },
    { ...valid, orders: { chronological: { entries: [{ anime: 'bakemonogatari' }, { anime: 'nisemonogatari', episodes: 'ep 3' }] } } },
  ];
  for (const input of cases) {
    const result = validateWatchOrderFile(input, franchises, anime);
    assert.ok(result.errors.length > 0, JSON.stringify(input));
    assert.deepEqual(result.documents, []);
  }
});

test('unverified orders are never publishable', () => {
  const { documents } = validateWatchOrderFile({ ...valid, verification: { status: 'needs-review' } }, franchises, anime);
  assert.equal(isPublishable(documents[0]), false);
});

test('seed matching requires an exact title and a plausible year', () => {
  const candidates = [
    { mal_id: 1, title: 'Shingeki no Kyojin', title_english: 'Attack on Titan', type: 'TV', year: 2013, aired: { from: '2013-04-07' } },
    { mal_id: 2, title: 'Shingeki no Kyojin Season 2', title_english: 'Attack on Titan Season 2', type: 'TV', year: 2017, aired: { from: '2017-04-01' } },
    { mal_id: 3, title: 'Shingeki no Kyojin Movie', title_english: 'Attack on Titan', type: 'Movie', year: 2015, aired: { from: '2014-11-22' } },
  ];
  assert.equal(pickExactMatch(candidates, 'attackontitan', undefined)?.mal_id, 1, 'earliest exact TV/ONA/movie wins');
  assert.equal(pickExactMatch(candidates, 'attackontitan', 2015)?.mal_id, 3, 'year filter removes the 2013 series');
  assert.equal(pickExactMatch(candidates, 'attackontitan', 2020), null);
  assert.equal(pickExactMatch(candidates, 'attack', undefined), null, 'partial titles never match');
});

test('local storage helpers survive blocked or corrupt storage', async () => {
  const store = new Map<string, string>();
  const globals = globalThis as unknown as { window?: unknown };
  globals.window = { localStorage: { getItem: (key: string) => store.get(key) ?? null, setItem: (key: string, value: string) => { store.set(key, value); } } };
  const { readLocal, writeLocal } = await import('../../src/scripts/tools/storage.ts');
  assert.equal(writeLocal('watch-order:test', ['a', 'b']), true);
  assert.deepEqual(readLocal('watch-order:test', []), ['a', 'b']);
  const [[key, raw]] = [...store];
  assert.equal(key, 'animesparks:tools:v1:watch-order:test');
  assert.ok(JSON.parse(raw).updatedAt, 'records carry updatedAt for future sync');
  store.set(key, '{not json');
  assert.deepEqual(readLocal('watch-order:test', ['fallback']), ['fallback']);
  globals.window = { localStorage: { getItem() { throw new Error('SecurityError'); }, setItem() { throw new Error('QuotaExceededError'); } } };
  assert.deepEqual(readLocal('x', 1), 1);
  assert.equal(writeLocal('x', 2), false);
  delete globals.window;
});
