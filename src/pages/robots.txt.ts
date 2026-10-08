import type { APIRoute } from 'astro';
export const GET: APIRoute = ({ request }) => {
  const testHost = new URL(request.url).hostname !== 'www.animesparks.blog';
  return new Response(testHost
    ? 'User-agent: *\nDisallow: /\n'
    : 'User-agent: *\nAllow: /\nDisallow: /api/\nDisallow: /studio/\nSitemap: https://www.animesparks.blog/sitemap.xml\n',
    { headers: { 'Content-Type': 'text/plain; charset=utf-8', ...(testHost ? { 'X-Robots-Tag': 'noindex, nofollow' } : {}) } });
};
