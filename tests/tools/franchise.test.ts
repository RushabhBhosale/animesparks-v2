import { test } from 'node:test';
import assert from 'node:assert/strict';
import { deriveFranchises, FRANCHISE_BRIDGES, franchiseTitle, sumWatchTime, uniqueSlug, watchableTime, type FranchiseInputNode } from '../../src/lib/tools/franchise.ts';
import type { AnimeFormat, RelationKind } from '../../src/lib/tools/types.ts';

function node(malId: number, format: AnimeFormat, airedFrom: string | null, relations: Array<[RelationKind, number]> = []): FranchiseInputNode {
  return {
    malId, slug: `anime-${malId}`, title: `Anime ${malId}`, format, airedFrom, popularity: malId,
    relations: relations.map(([kind, mal]) => ({ kind, externalIds: { mal } })),
  };
}

// 1 (TV) → 2 (TV sequel) → 3 (movie sequel); 4 side story of 1; 5 recap of 1;
// 9 is an alternative version of 1 and must stay separate.
const graph = new Map([
  [1, node(1, 'tv', '2013-04-07', [['sequel', 2], ['side-story', 4], ['summary', 5], ['alternative-version', 9]])],
  [2, node(2, 'tv', '2017-04-01', [['prequel', 1], ['sequel', 3]])],
  [3, node(3, 'movie', '2020-01-10', [['prequel', 2]])],
  [4, node(4, 'ova', '2013-12-09', [['parent-story', 1]])],
  [5, node(5, 'special', '2014-01-01', [['full-story', 1]])],
  [9, node(9, 'tv', '2009-01-01', [['alternative-version', 1]])],
  [10, node(10, 'music', '2015-01-01', [['side-story', 1]])],
]);

test('franchises follow sequel/side/summary links and assign roles', () => {
  const [franchise, ...rest] = deriveFranchises(graph);
  assert.equal(rest.length, 0);
  assert.equal(franchise.anchorMalId, 1);
  const roles = Object.fromEntries(franchise.members.map(member => [member.malId, member.role]));
  assert.deepEqual(roles, { 1: 'main', 2: 'main', 3: 'main', 4: 'side', 5: 'recap' });
  assert.equal(franchise.truncated, false);
});

test('alternative versions and music videos are not merged', () => {
  const ids = deriveFranchises(graph)[0].members.map(member => member.malId);
  assert.ok(!ids.includes(9));
  assert.ok(!ids.includes(10));
});

test('crossover bridges never fuse two franchises', () => {
  const bridge = [...FRANCHISE_BRIDGES][0];
  const triple = (base: number, extra: Array<[RelationKind, number]> = []) => [
    [base, node(base, 'tv', '2000-01-01', [['sequel', base + 1], ['side-story', base + 2], ...extra])],
    [base + 1, node(base + 1, 'tv', '2001-01-01', [['prequel', base]])],
    [base + 2, node(base + 2, 'movie', '2002-01-01', [['parent-story', base]])],
  ] as Array<[number, FranchiseInputNode]>;
  const nodes = new Map([
    ...triple(100, [['side-story', bridge]]),
    ...triple(200, [['side-story', bridge]]),
    [bridge, node(bridge, 'tv-special', '2009-03-27', [['parent-story', 100], ['parent-story', 200]])],
  ]);
  const franchises = deriveFranchises(nodes);
  assert.deepEqual(franchises.map(franchise => franchise.anchorMalId), [100, 200]);
  assert.ok(franchises.every(franchise => !franchise.members.some(member => member.malId === bridge)));
});

test('members are in release order and small groups are dropped', () => {
  assert.deepEqual(deriveFranchises(graph)[0].members.map(member => member.malId), [1, 4, 5, 2, 3]);
  const pair = new Map([[1, node(1, 'tv', '2020-01-01', [['sequel', 2]])], [2, node(2, 'tv', '2021-01-01', [['prequel', 1]])]]);
  assert.deepEqual(deriveFranchises(pair), []);
});

test('anchor prefers the first TV series over an earlier OVA or promo ONA', () => {
  const promo = new Map([
    [1, node(1, 'ona', '2014-01-28', [['side-story', 2]])],
    [2, node(2, 'tv', '2015-07-07', [['sequel', 3], ['side-story', 1]])],
    [3, node(3, 'tv', '2018-01-09', [['prequel', 2]])],
  ]);
  const [franchise] = deriveFranchises(promo);
  assert.equal(franchise.anchorMalId, 2);
  assert.deepEqual(Object.fromEntries(franchise.members.map(member => [member.malId, member.role])), { 1: 'side', 2: 'main', 3: 'main' });
});

test('anchor falls back past an earlier OVA', () => {
  const nodes = new Map([
    [7, node(7, 'ova', '2000-01-01', [['sequel', 8]])],
    [8, node(8, 'tv', '2001-01-01', [['prequel', 7], ['sequel', 11]])],
    [11, node(11, 'tv', '2002-01-01', [['prequel', 8]])],
  ]);
  assert.equal(deriveFranchises(nodes)[0].anchorMalId, 8);
});

test('large franchises are capped and flagged', () => {
  const chain = new Map<number, FranchiseInputNode>();
  for (let id = 1; id <= 6; id++) {
    chain.set(id, node(id, 'tv', `20${10 + id}-01-01`, [...(id > 1 ? [['prequel', id - 1] as [RelationKind, number]] : []), ...(id < 6 ? [['sequel', id + 1] as [RelationKind, number]] : [])]));
  }
  const [franchise] = deriveFranchises(chain, 4);
  assert.equal(franchise.members.length, 4);
  assert.equal(franchise.truncated, true);
});

test('watch time uses aired episodes for ongoing series and skips upcoming ones', () => {
  assert.deepEqual(watchableTime({ format: 'tv', status: 'finished', episodes: 12, durationMinutes: 24 }), { episodes: 12, minutes: 288 });
  assert.deepEqual(watchableTime({ format: 'tv', status: 'airing', episodes: 24, episodesAired: 5, durationMinutes: 24 }), { episodes: 5, minutes: 120 });
  assert.deepEqual(watchableTime({ format: 'tv', status: 'airing', episodes: null, episodesAired: null, durationMinutes: 24 }), { episodes: null, minutes: null });
  assert.deepEqual(watchableTime({ format: 'tv', status: 'upcoming', episodes: 12, durationMinutes: 24 }), { episodes: 0, minutes: 0 });
  assert.deepEqual(watchableTime({ format: 'movie', status: 'finished', episodes: null, durationMinutes: 105 }), { episodes: 1, minutes: 105 });
  const total = sumWatchTime([
    { format: 'tv', status: 'finished', episodes: 12, durationMinutes: 24 },
    { format: 'tv', status: 'finished', episodes: 12, durationMinutes: null },
  ]);
  assert.deepEqual(total, { minutes: 288, unknownCount: 1, episodes: 24 });
});

test('slugs and titles', () => {
  assert.equal(uniqueSlug('naruto', new Set(), [2002]), 'naruto');
  assert.equal(uniqueSlug('naruto', new Set(['naruto']), [2002, 20]), 'naruto-2002');
  assert.equal(uniqueSlug('naruto', new Set(['naruto', 'naruto-2002']), [2002, 20]), 'naruto-20');
  assert.equal(uniqueSlug('naruto', new Set(['naruto']), [null]), 'naruto-2');
  assert.equal(franchiseTitle('Attack on Titan Season 2'), 'Attack on Titan');
  assert.equal(franchiseTitle('Mob Psycho 100'), 'Mob Psycho 100');
});
