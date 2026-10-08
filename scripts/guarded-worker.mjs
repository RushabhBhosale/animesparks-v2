import astro from './entry.mjs';
import tagRouteMap from './tag-route-map.mjs';

const adminHost = 'admin.animesparks.blog';
const productionHost = 'www.animesparks.blog';
const apexHost = 'animesparks.blog';

export default {
  async fetch(request, env, context) {
    const url = new URL(request.url);
    if (url.hostname === apexHost) {
      const destination = new URL(url);
      destination.hostname = productionHost;
      return new Response(null, {
        status: 301,
        headers: { Location: destination.toString(), 'Cache-Control': 'public, max-age=3600' },
      });
    }
    if (url.hostname === adminHost) {
      if (url.pathname === '/') return Response.redirect(new URL('/admin', url), 302);
      if (url.pathname === '/robots.txt') {
        return new Response('User-agent: *\nDisallow: /\n', {
          headers: { 'Content-Type': 'text/plain; charset=utf-8', 'X-Robots-Tag': 'noindex, nofollow' },
        });
      }
      if (!url.pathname.startsWith('/admin') && !url.pathname.startsWith('/api/admin/') &&
          !url.pathname.startsWith('/_astro/') && url.pathname !== '/favicon-48x48.png') {
        return new Response('Not found', { status: 404, headers: { 'X-Robots-Tag': 'noindex, nofollow' } });
      }
    }

    if (url.pathname.startsWith('/tag-variants/') || url.pathname === '/listing-variant') {
      return new Response('Not found', { status: 404, headers: { 'X-Robots-Tag': 'noindex, nofollow' } });
    }
    let response;
    const listingPath = url.pathname === '/blogs' || url.pathname === '/blogs/es' || url.pathname === '/trending' ||
      url.pathname.startsWith('/categories/') || url.pathname.startsWith('/tags/');
    const variantQuery = ['q', 'sort', 'range', 'page'].some(key => url.searchParams.has(key));
    if (listingPath && variantQuery) {
      const rewrite = new URL('/listing-variant', url);
      rewrite.searchParams.set('target', url.pathname);
      for (const [key, value] of url.searchParams) rewrite.searchParams.append(key, value);
      response = await astro.fetch(new Request(rewrite, request), env, context);
    } else if (url.pathname.startsWith('/tags/')) {
      let tag = '';
      try { tag = decodeURIComponent(url.pathname.slice('/tags/'.length).replace(/\/$/, '')); } catch { /* Astro returns 404 below. */ }
      const assetPath = tagRouteMap[tag] || (tag.includes('/') ? `/tags/${tag}/` : '');
      if (assetPath) response = await env.ASSETS.fetch(new URL(assetPath, url).toString());
    }
    response ??= await astro.fetch(request, env, context);
    if (url.hostname === productionHost) return response;
    const headers = new Headers(response.headers);
    headers.set('X-Robots-Tag', 'noindex, nofollow');
    let guardedResponse = new Response(response.body, { status: response.status, statusText: response.statusText, headers });
    if ((headers.get('content-type') || '').toLowerCase().includes('text/html')) {
      guardedResponse = new HTMLRewriter()
        .on('meta[name="robots"]', { element(element) {
          element.setAttribute('content', 'noindex, nofollow');
        } })
        .transform(guardedResponse);
    }
    return guardedResponse;
  },
};
