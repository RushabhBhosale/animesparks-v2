import type { APIRoute } from 'astro';
import { env } from 'cloudflare:workers';
import { jsonResponse, loadToolIndex, publicEntry } from '../../../lib/tools/runtime-index';
import { searchIndex } from '../../../lib/tools/search';
import type { FranchiseIndexEntry } from '../../../lib/tools/types';

// GET /api/tools/franchise-search?q=monogatari → up to 8 franchises
export const GET: APIRoute = async ({ request }) => {
  const query = (new URL(request.url).searchParams.get('q') || '').trim().slice(0, 100);
  try {
    const index = await loadToolIndex<FranchiseIndexEntry>(env.ASSETS, request.url, '/tools-data/franchise-index.json');
    return jsonResponse({ results: query.length >= 2 ? searchIndex(index, query, 8).map(publicEntry) : [] });
  } catch {
    return jsonResponse({ error: 'Search is temporarily unavailable' }, 503);
  }
};
