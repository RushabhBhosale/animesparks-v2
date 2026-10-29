import type { APIRoute } from 'astro';
import { env } from 'cloudflare:workers';
import { edgeCached } from '../../../lib/edge-cache';
import { withDatabase } from '../../../lib/content/mongodb';
import { toIndexEntry } from '../../../lib/tools/live-lookup';
import { LineIndex } from '../../../lib/tools/line-index';
import { jsonResponse, loadToolText, publicEntry } from '../../../lib/tools/runtime-index';
import type { ProviderAnime } from '../../../lib/tools/types';
import type { AnimeIndexEntry } from '../../../lib/tools/types';

async function answer(requestUrl: string, slug: string, query: string): Promise<Response> {
  try {
    const index = new LineIndex<AnimeIndexEntry>(await loadToolText(env.ASSETS, requestUrl, '/tools-data/anime-lines.json'));
    if (slug) {
      const match = index.bySlug(slug);
      if (match) return jsonResponse({ result: match });
      // Titles added by live lookup since the last build live only in MongoDB.
      if (/^[a-z0-9-]{1,120}$/.test(slug) && env.MONGODB_URI && (env as { TOOLS_LIVE_LOOKUP?: string }).TOOLS_LIVE_LOOKUP === 'true') {
        const doc = await withDatabase(env.MONGODB_URI, db => db.collection('toolAnime').findOne({ slug }, { projection: { _id: 0 } })).catch(() => null);
        if (doc) return jsonResponse({ result: publicEntry(toIndexEntry(doc as unknown as ProviderAnime, slug)) });
      }
      return jsonResponse({ error: 'Not found' }, 404);
    }
    return jsonResponse({ results: query.length >= 2 ? index.search(query, 8) : [] });
  } catch {
    return jsonResponse({ error: 'Search is temporarily unavailable' }, 503);
  }
}

// GET /api/tools/anime-search?q=frieren  → up to 8 matches
// GET /api/tools/anime-search?slug=...   → one exact record (shared links)
export const GET: APIRoute = async ({ request, locals }) => {
  const url = new URL(request.url);
  const slug = (url.searchParams.get('slug') || '').slice(0, 120);
  const query = (url.searchParams.get('q') || '').trim().slice(0, 100);
  // Slug lookups can read MongoDB for live-added titles, so only catalogue searches are shared.
  if (slug || query.length < 2) return answer(request.url, slug, query);
  const context = (locals as { cfContext?: { waitUntil(promise: Promise<unknown>): void } }).cfContext;
  return edgeCached(`anime-search/${encodeURIComponent(query.toLowerCase())}`, () => answer(request.url, slug, query), context);
};
