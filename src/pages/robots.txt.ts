import type { APIRoute } from 'astro';
export const GET: APIRoute = ({ request }) => new Response(
  new URL(request.url).hostname === 'www.animesparks.blog'
    ? 'User-agent: *\nAllow: /\n'
    : 'User-agent: *\nDisallow: /\n',
  { headers: { 'Content-Type': 'text/plain; charset=utf-8', 'X-Robots-Tag': 'noindex, nofollow' } },
);
