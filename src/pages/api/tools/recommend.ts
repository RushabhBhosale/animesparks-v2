import type { APIRoute } from 'astro';
import { env } from 'cloudflare:workers';
import { digest, edgeCached } from '../../../lib/edge-cache';
import { randomPick, recommend, type RecEntry, type RecFilters } from '../../../lib/tools/recommend';
import { jsonResponse, loadToolIndex } from '../../../lib/tools/runtime-index';

const slugList = (value: unknown, max: number) => (Array.isArray(value) ? value : [])
  .filter((item): item is string => typeof item === 'string' && /^[a-z0-9-]{1,120}$/.test(item)).slice(0, max);
const int = (value: unknown, min: number, max: number) => Number.isInteger(value) && (value as number) >= min && (value as number) <= max ? value as number : undefined;

// POST /api/tools/recommend { seeds, filters, exclude, random } → ranked results with reasons
// The client never reads a result's MyAnimeList recommendation list, so it is not sent.
const forClient = ({ rc: _rc, ...entry }: RecEntry) => entry;

export const POST: APIRoute = async ({ request, locals }) => {
  let body: Record<string, unknown>;
  try {
    const text = await request.text();
    if (text.length > 64000) return jsonResponse({ error: 'Request too large' }, 413);
    body = JSON.parse(text);
  } catch {
    return jsonResponse({ error: 'Invalid JSON' }, 400);
  }
  const raw = (body.filters || {}) as Record<string, unknown>;
  const filters: RecFilters = {
    genres: (Array.isArray(raw.genres) ? raw.genres : []).filter((genre): genre is string => typeof genre === 'string' && genre.length < 40).slice(0, 5),
    mood: typeof raw.mood === 'string' ? raw.mood.slice(0, 20) : undefined,
    minEpisodes: int(raw.minEpisodes, 1, 5000), maxEpisodes: int(raw.maxEpisodes, 1, 5000),
    fromYear: int(raw.fromYear, 1900, 2100), toYear: int(raw.toYear, 1900, 2100),
    status: raw.status === 'finished' || raw.status === 'airing' ? raw.status : undefined,
    popularity: raw.popularity === 'mainstream' || raw.popularity === 'popular' || raw.popularity === 'hidden' ? raw.popularity : undefined,
    formats: (Array.isArray(raw.formats) ? raw.formats : []).filter((format): format is string => ['tv', 'movie', 'ona', 'ova'].includes(format as string)),
  };
  const exclude = slugList(body.exclude, 3000);
  const seeds = slugList(body.seeds, 3);
  const answer = async () => {
    const index = await loadToolIndex<RecEntry>(env.ASSETS, request.url, '/tools-data/rec-index.json');
    const results = recommend(index, { seeds, filters, exclude, limit: 24 });
    return jsonResponse({ results: results.map(({ entry, reasons }) => ({ entry: forClient(entry), reasons })) }, 200, 300);
  };
  try {
    if (body.random) {
      const index = await loadToolIndex<RecEntry>(env.ASSETS, request.url, '/tools-data/rec-index.json');
      const pick = randomPick(index, filters, exclude, `${typeof body.random === 'string' ? body.random.slice(0, 40) : Date.now()}`);
      return jsonResponse({ results: pick ? [{ entry: forClient(pick), reasons: ['A random pick that matches your filters'] }] : [] }, 200, 0);
    }
    // Identical requests (same seeds, filters and watched list) get the same answer.
    const context = (locals as { cfContext?: { waitUntil(promise: Promise<unknown>): void } }).cfContext;
    return await edgeCached(`recommend/${await digest(JSON.stringify([seeds, filters, [...exclude].sort()]))}`, answer, context);
  } catch {
    return jsonResponse({ error: 'Recommendations are temporarily unavailable' }, 503);
  }
};
