import type { APIRoute } from 'astro';
import { env } from 'cloudflare:workers';
import type { SourceEntry } from '../../../lib/tools/build-extras';
import { jsonResponse, loadToolData } from '../../../lib/tools/runtime-index';

// GET /api/tools/source?slug=... → source manga, verified chapter mapping and arcs
export const GET: APIRoute = async ({ request }) => {
  const slug = (new URL(request.url).searchParams.get('slug') || '').slice(0, 120);
  try {
    const index = await loadToolData<Record<string, SourceEntry>>(env.ASSETS, request.url, '/tools-data/source-index.json');
    const entry = Object.hasOwn(index, slug) ? index[slug] : null;
    // A missing entry is a normal answer ("no data yet"), not an error.
    return jsonResponse({ result: entry });
  } catch {
    return jsonResponse({ error: 'Source data is temporarily unavailable' }, 503);
  }
};
