import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRateLimiter, liveSlug, normalizeLiveQuery, persistLiveResults, toIndexEntry } from '../../src/lib/tools/live-lookup.ts';
import { mapJikanAnime, type JikanAnime } from '../../src/lib/tools/providers/tenrai.ts';

const fixture = JSON.parse(readFileSync(new URL('./fixtures/tenrai-anime-full.json', import.meta.url), 'utf8')) as JikanAnime;
const anime = mapJikanAnime(fixture, '2026-10-17T00:00:00.000Z');

test('live lookups need a meaningful query', () => {
  assert.equal(normalizeLiveQuery('ab'), null);
  assert.equal(normalizeLiveQuery('  !!  '), null);
  assert.equal(normalizeLiveQuery('  Sousou   no Frieren '), 'Sousou no Frieren');
  assert.equal(normalizeLiveQuery('葬送の'), '葬送の');
  assert.equal(normalizeLiveQuery('x'.repeat(200))!.length, 60);
});

test('the rate limiter caps lookups per window', () => {
  let now = 0;
  const allow = createRateLimiter(2, 1000, () => now);
  assert.equal(allow(), true);
  assert.equal(allow(), true);
  assert.equal(allow(), false);
  now = 1001;
  assert.equal(allow(), true);
});

test('live slugs avoid clashes with other titles', () => {
  assert.equal(liveSlug(anime, () => undefined), 'frieren-beyond-journeys-end');
  assert.equal(liveSlug(anime, () => 52991), 'frieren-beyond-journeys-end', 'same title keeps its slug');
  assert.equal(liveSlug(anime, () => 1), 'frieren-beyond-journeys-end-52991');
  const entry = toIndexEntry(anime, 'x');
  assert.equal(entry.m, 52991);
  assert.equal(entry.e, 28);
  assert.match(entry.k, /sousounofrieren/);
});

function fakeDb(existing: Array<Record<string, unknown>>) {
  const writes: unknown[] = [];
  return {
    writes,
    db: { collection: () => ({
      find: () => ({ toArray: async () => existing }),
      bulkWrite: async (operations: unknown[]) => { writes.push(...operations); },
    }) },
  };
}

test('persistence is insert-only and never overwrites existing records', async () => {
  const fresh = fakeDb([]);
  await persistLiveResults(fresh.db as never, [{ anime, slug: 'frieren-beyond-journeys-end' }], 'now');
  const operation = fresh.writes[0] as { updateOne: { update: Record<string, Record<string, unknown>>; upsert: boolean } };
  assert.deepEqual(Object.keys(operation.updateOne.update), ['$setOnInsert']);
  assert.equal(operation.updateOne.upsert, true);
  assert.equal((operation.updateOne.update.$setOnInsert.provenance as { addedBy: string }).addedBy, 'live-lookup');
  assert.equal(operation.updateOne.update.$setOnInsert.relations, undefined);

  const known = fakeDb([{ slug: 'frieren-beyond-journeys-end', externalIds: { mal: 52991 } }]);
  await persistLiveResults(known.db as never, [{ anime, slug: 'frieren-beyond-journeys-end' }], 'now');
  assert.equal(known.writes.length, 0, 'already stored titles are skipped');

  const clash = fakeDb([{ slug: 'frieren-beyond-journeys-end', externalIds: { mal: 1 } }]);
  await persistLiveResults(clash.db as never, [{ anime, slug: 'frieren-beyond-journeys-end' }], 'now');
  const clashOp = clash.writes[0] as { updateOne: { update: { $setOnInsert: { slug: string } } } };
  assert.equal(clashOp.updateOne.update.$setOnInsert.slug, 'frieren-beyond-journeys-end-52991');
});
