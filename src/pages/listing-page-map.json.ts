import type { APIRoute } from 'astro';
import { getBuildData } from '../lib/content/build-data';
import { listingPageRoutes } from '../lib/content/listing-pages';

// `<decoded path>|<page>` -> prerendered page. Consumed by the guarded Worker.
export const prerender = true;
export const GET: APIRoute = async () => {
  const routes = listingPageRoutes(await getBuildData());
  return new Response(JSON.stringify(Object.fromEntries(routes.map(({ id, target, page }) => [`${target}|${page}`, `/listing-pages/${id}/`]))), {
    headers: { 'Content-Type': 'application/json; charset=utf-8', 'X-Robots-Tag': 'noindex, nofollow' },
  });
};
