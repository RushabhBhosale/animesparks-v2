import type { APIRoute } from 'astro';
import { getToolsBuildData } from '../../lib/tools/build-data';

export const prerender = true;
export const GET: APIRoute = async () => {
  const { franchiseIndex } = await getToolsBuildData();
  return new Response(JSON.stringify(franchiseIndex), { headers: { 'Content-Type': 'application/json; charset=utf-8' } });
};
