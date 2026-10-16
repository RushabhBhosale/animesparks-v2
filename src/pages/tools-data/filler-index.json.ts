import type { APIRoute } from 'astro';
import { getBuildData } from '../../lib/content/build-data';
import { getToolsExtras } from '../../lib/tools/build-extras';

export const prerender = true;
export const GET: APIRoute = async () => {
  const extras = await getToolsExtras((await getBuildData()).english);
  return new Response(JSON.stringify(extras.fillerIndex), { headers: { 'Content-Type': 'application/json; charset=utf-8' } });
};
