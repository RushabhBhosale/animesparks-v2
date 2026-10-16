import type { APIRoute } from 'astro';
import { env } from 'cloudflare:workers';
import { withDatabase } from '../../../lib/content/mongodb';
import { toIndexEntry } from '../../../lib/tools/live-lookup';
import { jsonResponse, loadToolIndex, publicEntry } from '../../../lib/tools/runtime-index';
import type { ProviderAnime } from '../../../lib/tools/types';
import { searchIndex } from '../../../lib/tools/search';
import type { AnimeIndexEntry } from '../../../lib/tools/types';

// GET /api/tools/anime-search?q=frieren  → up to 8 matches
// GET /api/tools/anime-search?slug=...   → one exact record (shared links)
export const GET: APIRoute = async ({ request }) => {
  const url = new URL(request.url);
  const slug = (url.searchParams.get('slug') || '').slice(0, 120);
  const query = (url.searchParams.get('q') || '').trim().slice(0, 100);
  try {
    const index = await loadToolIndex<AnimeIndexEntry>(env.ASSETS, request.url, '/tools-data/anime-index.json');
    if (slug) {
      const match = index.find(entry => entry.s === slug);
      if (match) return jsonResponse({ result: publicEntry(match) });
      // Titles added by live lookup since the last build live only in MongoDB.
      if (/^[a-z0-9-]{1,120}$/.test(slug) && env.MONGODB_URI && (env as { TOOLS_LIVE_LOOKUP?: string }).TOOLS_LIVE_LOOKUP === 'true') {
        const doc = await withDatabase(env.MONGODB_URI, db => db.collection('toolAnime').findOne({ slug }, { projection: { _id: 0 } })).catch(() => null);
        if (doc) return jsonResponse({ result: publicEntry(toIndexEntry(doc as unknown as ProviderAnime, slug)) });
      }
      return jsonResponse({ error: 'Not found' }, 404);
    }
    return jsonResponse({ results: query.length >= 2 ? searchIndex(index, query, 8).map(publicEntry) : [] });
  } catch {
    return jsonResponse({ error: 'Search is temporarily unavailable' }, 503);
  }
};
