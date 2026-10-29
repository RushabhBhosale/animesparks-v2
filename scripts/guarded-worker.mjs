import astro from './entry.mjs';
import tagRouteMap from './tag-route-map.mjs';
import listingPageMap from './listing-page-map.mjs';

const adminHost = 'admin.animesparks.blog';
const productionHost = 'www.animesparks.blog';
const apexHost = 'animesparks.blog';

const pagePattern = /^[1-9]\d*$/;

// Path of the prerendered archive page for a `?page=N` listing URL, '' when the
// listing has to be rendered on demand. Tag archives ignore every parameter but
// `page` (their HTML never depends on q/sort/range), so any query string maps
// onto the same prerendered page. Blog and category archives are prerendered
// for plain pagination only; q/sort/range orderings stay on demand.
function prerenderedListing(url) {
  const pageValue = url.searchParams.get('page');
  if (pageValue !== null && !pagePattern.test(pageValue)) return '';
  const page = pageValue === null ? 1 : Number(pageValue);
  if (page < 2) return '';
  let target = url.pathname;
  if (target.startsWith('/tags/')) {
    try { target = `/tags/${decodeURIComponent(target.slice('/tags/'.length).replace(/\/$/, ''))}`; } catch { return ''; }
  } else if ([...url.searchParams.keys()].some(key => key !== 'page')) {
    return '';
  }
  return listingPageMap[`${target}|${page}`] || '';
}

// Location of a tag archive's first page in the static assets: case variants
// are prerendered under /tag-variants/ and tags containing '/' do not match
// Astro's [tag] route; everything else is served by Astro's own asset lookup.
function tagArchiveAsset(url) {
  let tag = '';
  try { tag = decodeURIComponent(url.pathname.slice('/tags/'.length).replace(/\/$/, '')); } catch { /* Astro returns 404 below. */ }
  return tagRouteMap[tag] || (tag.includes('/') ? `/tags/${tag}/` : '');
}

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

    // /tools-data/ holds build-time indexes read through env.ASSETS by /api/tools/*; they are not public files.
    if (url.pathname.startsWith('/tag-variants/') || url.pathname.startsWith('/listing-pages/') ||
        url.pathname === '/listing-variant' || url.pathname.startsWith('/tools-data/')) {
      return new Response('Not found', { status: 404, headers: { 'X-Robots-Tag': 'noindex, nofollow' } });
    }
    let response;
    // Browsers and crawlers probe this on every visit; the icon lives at a fixed path.
    if (url.pathname === '/favicon.ico') {
      response = new Response(null, { status: 301, headers: { Location: '/favicon-48x48.png', 'Cache-Control': 'public, max-age=86400' } });
    }
    const listingPath = url.pathname === '/blogs' || url.pathname === '/blogs/es' || url.pathname === '/trending' ||
      url.pathname.startsWith('/categories/') || url.pathname.startsWith('/tags/');
    const variantQuery = ['q', 'sort', 'range', 'page'].some(key => url.searchParams.has(key));
    const tagArchive = url.pathname.startsWith('/tags/');
    if (listingPath && (variantQuery || url.pathname === '/trending')) {
      const prerendered = prerenderedListing(url);
      if (prerendered) {
        const asset = await env.ASSETS.fetch(new URL(prerendered, url).toString());
        if (asset.ok) response = asset;
      } else if (tagArchive && [null, '1'].includes(url.searchParams.get('page'))) {
        // First page of a tag archive: identical to the plain archive whatever else is in the query.
        const assetPath = tagArchiveAsset(url);
        if (assetPath) {
          response = await env.ASSETS.fetch(new URL(assetPath, url).toString());
        } else {
          const plain = new URL(url);
          plain.search = '';
          response = await astro.fetch(new Request(plain, request), env, context);
        }
      }
      if (!response) {
        const rewrite = new URL('/listing-variant', url);
        rewrite.searchParams.set('target', url.pathname);
        for (const [key, value] of url.searchParams) rewrite.searchParams.append(key, value);
        response = await astro.fetch(new Request(rewrite, request), env, context);
      }
    } else if (tagArchive) {
      const assetPath = tagArchiveAsset(url);
      if (assetPath) response = await env.ASSETS.fetch(new URL(assetPath, url).toString());
    }
    response ??= await astro.fetch(request, env, context);
    if (url.hostname === productionHost) return response;
    const headers = new Headers(response.headers);
    headers.set('X-Robots-Tag', 'noindex, nofollow');
    let guardedResponse = new Response(response.body, { status: response.status, statusText: response.statusText, headers });
    if ((headers.get('content-type') || '').toLowerCase().includes('text/html')) {
      guardedResponse = new HTMLRewriter()
        .on('script[src*="pagead2.googlesyndication.com/pagead/js/adsbygoogle.js"]', { element(element) {
          element.remove();
        } })
        // The deferred loader that injects the same AdSense library on production.
        .on('script[data-adsense-loader]', { element(element) {
          element.remove();
        } })
        .on('.ad-placement', { element(element) {
          element.remove();
        } })
        .on('meta[name="robots"]', { element(element) {
          element.setAttribute('content', 'noindex, nofollow');
        } })
        .transform(guardedResponse);
    }
    return guardedResponse;
  },
};
