import type { APIRoute } from 'astro';
export const GET: APIRoute = () => new Response(null, { status: 308, headers: { Location: '/', 'X-Robots-Tag': 'noindex, nofollow' } });
