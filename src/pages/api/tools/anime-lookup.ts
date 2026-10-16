import type { APIRoute } from 'astro';
import { env } from 'cloudflare:workers';
import { withDatabase } from '../../../lib/content/mongodb';
import { createRateLimiter, liveSlug, normalizeLiveQuery, persistLiveResults, searchProvider, toIndexEntry } from '../../../lib/tools/live-lookup';
import { TenraiClient } from '../../../lib/tools/providers/tenrai';
import { jsonResponse, loadToolIndex, publicEntry } from '../../../lib/tools/runtime-index';
import type { AnimeIndexEntry } from '../../../lib/tools/types';

// GET /api/tools/anime-lookup?q=... — called by the search box only when the
// catalogue has no match. Results are returned immediately and saved to
// MongoDB in the background (waitUntil). Disabled unless TOOLS_LIVE_LOOKUP=true.

const allow = createRateLimiter(30, 60_000);
const CACHE_SECONDS = 6 * 3600;

export const GET: APIRoute = async ({ request, locals }) => {
  const settings = env as typeof env & { TOOLS_LIVE_LOOKUP?: string; TENRAI_SERVER_KEY?: string };
  if (settings.TOOLS_LIVE_LOOKUP !== 'true') return jsonResponse({ results: [], live: false });
  const query = normalizeLiveQuery(new URL(request.url).searchParams.get('q') || '');
  if (!query) return jsonResponse({ results: [] });

  // Identical lookups within a few hours are served from the edge cache.
  const cacheKey = new Request(`https://tools-cache.animesparks.internal/lookup?q=${encodeURIComponent(query.toLowerCase())}`);
  const cache = (globalThis as unknown as { caches?: { default?: Cache } }).caches?.default;
  try {
    const cached = await cache?.match(cacheKey);
    if (cached) return cached;
  } catch { /* Cache API unavailable (e.g. astro dev). */ }

  if (!allow()) return jsonResponse({ results: [], error: 'Too many lookups right now. Please try again in a minute.' }, 429);

  let found;
  try {
    found = await searchProvider(query, new TenraiClient({ maxRetries: 0, timeoutMs: 4000, minIntervalMs: 0, serverKey: settings.TENRAI_SERVER_KEY }));
  } catch (error) {
    // Provider outage: the visitor simply sees "no results".
    console.error(`[tools] live lookup failed: ${(error as Error).message}`);
    return jsonResponse({ results: [], error: 'MyAnimeList lookup is unavailable right now.' }, 503);
  }

  // Avoid slug clashes with titles already in the catalogue.
  let index: AnimeIndexEntry[] = [];
  try { index = await loadToolIndex<AnimeIndexEntry>(env.ASSETS, request.url, '/tools-data/anime-index.json'); } catch { /* best effort */ }
  const bySlug = new Map(index.map(entry => [entry.s, entry]));
  const byId = new Map(index.filter(entry => entry.m).map(entry => [entry.m, entry]));
  // Titles we already have (matched by provider id) are returned as-is.
  const known = found.map(anime => byId.get(anime.externalIds.mal)).filter((entry): entry is AnimeIndexEntry => Boolean(entry));
  const items = found.filter(anime => !byId.has(anime.externalIds.mal)).map(anime => ({
    anime, slug: liveSlug(anime, value => bySlug.has(value) ? bySlug.get(value)!.m ?? -1 : undefined),
  }));
  const results = [...known.map(publicEntry), ...items.map(({ anime, slug }) => publicEntry({ ...toIndexEntry(anime, slug), live: true }))];

  if (items.length && !env.MONGODB_URI) console.warn('[tools] live lookup: MONGODB_URI missing, results not saved');
  if (items.length && env.MONGODB_URI) {
    const save = withDatabase(env.MONGODB_URI, db => persistLiveResults(db, items)).catch(error => {
      console.error(`[tools] live lookup save failed: ${(error as Error).message}`);
    });
    const context = (locals as { cfContext?: { waitUntil(promise: Promise<unknown>): void } }).cfContext;
    if (context) context.waitUntil(save); else await save;
  }

  const response = jsonResponse({ results, live: true }, 200, 300);
  try { await cache?.put(cacheKey, new Response(response.clone().body, { headers: { 'Content-Type': 'application/json', 'Cache-Control': `public, max-age=${CACHE_SECONDS}` } })); } catch { /* ignore */ }
  return response;
};
