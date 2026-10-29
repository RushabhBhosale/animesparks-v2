import type { APIRoute } from 'astro';
import { PUBLISHED_FAMILY_SERIES } from '../../../lib/characters/family';
import { compactRoster } from '../../../lib/characters/roster';

export const prerender = true;
export function getStaticPaths() {
  return PUBLISHED_FAMILY_SERIES.filter(slug => compactRoster(slug)).map(slug => ({ params: { series: slug } }));
}
export const GET: APIRoute = ({ params }) => new Response(JSON.stringify(compactRoster(params.series!)), {
  headers: { 'Content-Type': 'application/json; charset=utf-8', 'X-Robots-Tag': 'noindex' },
});
