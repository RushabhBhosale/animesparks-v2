import type { APIRoute } from 'astro';
import { getBuildData } from '../../lib/content/build-data';
import { getToolsBuildData } from '../../lib/tools/build-data';
import { getToolsExtras } from '../../lib/tools/build-extras';

// Build-time index read by /api/tools/anime-search through the ASSETS
// binding. The production Worker does not serve /tools-data/ publicly.
export const prerender = true;
export const GET: APIRoute = async () => {
  const { animeIndex } = await getToolsBuildData();
  const { fillerSkip } = await getToolsExtras((await getBuildData()).english);
  const entries = animeIndex.map(entry => fillerSkip.get(entry.s) ? { ...entry, fl: fillerSkip.get(entry.s) } : entry);
  return new Response(JSON.stringify(entries), { headers: { 'Content-Type': 'application/json; charset=utf-8' } });
};
