import type { APIRoute } from 'astro';
export const GET: APIRoute = ({ params, request }) => {
  const source = new URL(request.url);
  const target = `/es/blog/${encodeURIComponent(params.slug || '')}${source.search}`;
  return new Response(null, { status: 301, headers: { Location: target, 'X-Robots-Tag': 'noindex, nofollow' } });
};
