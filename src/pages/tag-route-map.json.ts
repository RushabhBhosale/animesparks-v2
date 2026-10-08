import type { APIRoute } from 'astro';
import { getBuildData } from '../lib/content/build-data';

export const prerender = true;
export const GET: APIRoute = async () => {
  const { tagVariants } = await getBuildData();
  return new Response(JSON.stringify(Object.fromEntries(tagVariants.map(({ id, tag }) => [tag, `/tag-variants/${id}/`]))), {
    headers: { 'Content-Type': 'application/json; charset=utf-8', 'X-Robots-Tag': 'noindex, nofollow' },
  });
};
