import type { APIRoute } from 'astro';
import { env } from 'cloudflare:workers';
import { loadSearchEntries, searchEntries } from '../../lib/content/search-index';

export const GET: APIRoute = async ({ request }) => {
  const url = new URL(request.url);
  const query = (url.searchParams.get('q') || '').trim();
  const rawLimit = Number(url.searchParams.get('limit'));
  const limit = Number.isFinite(rawLimit) && rawLimit > 0 ? Math.min(Math.floor(rawLimit), 32) : 7;
  const poolSize = Math.min(Math.max(limit * 8, 80), 300);
  const articles = query.length >= 2 ? searchEntries(await loadSearchEntries(env.ASSETS, request.url), query, limit, poolSize) : [];
  return new Response(JSON.stringify({ results: articles.map(article => ({
    id: article.sanityId, title: article.title, slug: article.slug,
    typeLabel: article.categories[0]?.title || 'Article', kind: 'article',
    metaDescription: article.metaDescription || article.excerpt,
  })) }), { headers: { 'Content-Type': 'application/json; charset=utf-8', 'X-Robots-Tag': 'noindex, nofollow' } });
};
