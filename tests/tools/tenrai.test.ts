import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  TenraiBlockedError, TenraiClient, TenraiRequestError, backoffDelay, isSafeForCatalog, mapJikanAnime, parseRetryAfter, type JikanAnime,
} from '../../src/lib/tools/providers/tenrai.ts';

const fixture = JSON.parse(readFileSync(new URL('./fixtures/tenrai-anime-full.json', import.meta.url), 'utf8')) as JikanAnime;

test('maps a real Tenrai /anime/{id}/full response to the neutral model', () => {
  const anime = mapJikanAnime(fixture, '2026-10-16T00:00:00.000Z');
  assert.equal(anime.externalIds.mal, 52991);
  assert.equal(anime.title, "Frieren: Beyond Journey's End");
  assert.equal(anime.titleRomaji, 'Sousou no Frieren');
  assert.equal(anime.format, 'tv');
  assert.equal(anime.status, 'finished');
  assert.equal(anime.episodes, 28);
  assert.equal(anime.durationMinutes, 24);
  assert.equal(anime.airedFrom, '2023-09-29T00:00:00.000Z');
  assert.equal(anime.year, 2023);
  assert.deepEqual(anime.studios, ['Madhouse']);
  assert.equal(anime.broadcast?.timezone, 'Asia/Tokyo');
  assert.ok(anime.images.poster?.startsWith('https://cdn.myanimelist.net/'));
  assert.ok(!anime.synopsis?.includes('Written by MAL Rewrite'));
  assert.deepEqual(anime.provenance, { provider: 'tenrai', source: 'MyAnimeList', sourceUrl: fixture.url, fetchedAt: '2026-10-16T00:00:00.000Z' });
  const sequel = anime.relations?.find(relation => relation.kind === 'sequel');
  assert.equal(sequel?.externalIds.mal, 59978);
  assert.ok(anime.relations?.every(relation => relation.externalIds.mal), 'manga adaptations are excluded');
});

test('list responses without relations map to undefined relations', () => {
  const listShaped: JikanAnime = { ...fixture, relations: undefined };
  assert.equal(mapJikanAnime(listShaped, 'x').relations, undefined);
});

test('adult titles are excluded from the catalogue', () => {
  assert.equal(isSafeForCatalog(fixture), true);
  assert.equal(isSafeForCatalog({ ...fixture, rating: 'Rx - Hentai' }), false);
  assert.equal(isSafeForCatalog({ ...fixture, explicit_genres: [{ mal_id: 12, name: 'Hentai' }] }), false);
  const mild = { ...fixture, rating: 'R+ - Mild Nudity' };
  assert.equal(isSafeForCatalog(mild), true, 'R+ titles stay so franchises are not broken');
  assert.deepEqual(mapJikanAnime(mild, 'x').images, {}, 'but their artwork is not shown');
});

test('backoff grows exponentially with jitter and a cap', () => {
  assert.equal(backoffDelay(0, () => 0), 500);
  assert.equal(backoffDelay(0, () => 1), 1000);
  assert.equal(backoffDelay(3, () => 1), 8000);
  assert.equal(backoffDelay(20, () => 1), 60000);
});

test('Retry-After accepts seconds and HTTP dates', () => {
  assert.equal(parseRetryAfter('7', 0), 7000);
  assert.equal(parseRetryAfter(new Date(10000).toUTCString(), 4000), 6000);
  assert.equal(parseRetryAfter(null, 0), null);
  assert.equal(parseRetryAfter('9999', 0), 120000);
});

function mockClient(responses: Array<Response | Error>) {
  const sleeps: number[] = [];
  const urls: string[] = [];
  let now = 0;
  const client = new TenraiClient({
    minIntervalMs: 0,
    maxRetries: 3,
    random: () => 0,
    now: () => now,
    sleep: async ms => { sleeps.push(ms); now += ms; },
    fetchImpl: (async (url: string) => {
      urls.push(url);
      const next = responses.shift();
      if (!next) throw new Error('No more mock responses');
      if (next instanceof Error) throw next;
      return next;
    }) as typeof fetch,
  });
  return { client, sleeps, urls };
}

const json = (body: unknown, status = 200, headers: Record<string, string> = {}) => new Response(JSON.stringify(body), { status, headers });

test('429 waits for Retry-After, then succeeds', async () => {
  const { client, sleeps } = mockClient([json({}, 429, { 'Retry-After': '3' }), json({ data: { mal_id: 1 } })]);
  assert.deepEqual(await client.get('/anime/1'), { data: { mal_id: 1 } });
  assert.deepEqual(sleeps, [3000]);
});

test('5xx and network failures back off and eventually give up', async () => {
  const { client, sleeps } = mockClient([json({}, 502), new TypeError('fetch failed'), json({}, 503), json({}, 500)]);
  await assert.rejects(client.get('/anime/1'), TenraiRequestError);
  assert.deepEqual(sleeps, [500, 1000, 2000]);
});

test('404 returns null and 403 stops the sync', async () => {
  assert.equal(await mockClient([json({}, 404)]).client.get('/anime/0'), null);
  await assert.rejects(mockClient([json({}, 403)]).client.get('/anime/1'), TenraiBlockedError);
  await assert.rejects(mockClient([json({}, 400)]).client.get('/anime/1'), TenraiRequestError);
});

test('requests are spaced by the minimum interval', async () => {
  const sleeps: number[] = [];
  let now = 1000;
  const client = new TenraiClient({
    minIntervalMs: 600, now: () => now, sleep: async ms => { sleeps.push(ms); now += ms; },
    fetchImpl: (async () => json({ data: [] })) as typeof fetch,
  });
  await client.get('/a');
  now += 100;
  await client.get('/b');
  assert.deepEqual(sleeps, [500]);
  assert.equal(client.requestCount, 2);
});

test('aired episode count only counts past episodes', async () => {
  const page = (count: number, start: number, future = 0) => ({
    pagination: { last_visible_page: 2 },
    data: Array.from({ length: count }, (_, index) => ({ mal_id: start + index, aired: index >= count - future ? '2099-01-01T00:00:00+00:00' : '2020-01-01T00:00:00+00:00' })),
  });
  const { client, urls } = mockClient([json(page(100, 1)), json(page(14, 101, 2))]);
  assert.equal(await client.airedEpisodeCount(21, new Date('2026-10-16')), 112);
  assert.match(urls[1], /page=2/);
});

test('list requests always ask for safe-for-work results', async () => {
  const { client, urls } = mockClient([json({ data: [], pagination: { has_next_page: false } })]);
  await client.topByPopularity(1);
  const url = new URL(urls[0]);
  assert.equal(url.pathname, '/v1/top/anime');
  assert.ok(url.searchParams.has('sfw'));
  assert.equal(url.searchParams.get('filter'), 'bypopularity');
});
