import type { APIRoute } from 'astro';
import { getBuildData } from '../../lib/content/build-data';
import { getToolsBuildData } from '../../lib/tools/build-data';
import { getToolsExtras } from '../../lib/tools/build-extras';
import { encodeLines } from '../../lib/tools/line-index';

// Same entries as anime-index.json, one text line each (plain text despite the
// .json name, like the rest of tools-data; it is read with text()), for parse-free search in
// /api/tools/anime-search. Not public: the production Worker 404s /tools-data/.
export const prerender = true;
export const GET: APIRoute = async () => {
  const { animeIndex } = await getToolsBuildData();
  const { fillerSkip } = await getToolsExtras((await getBuildData()).english);
  const entries = animeIndex.map(entry => fillerSkip.get(entry.s) ? { ...entry, fl: fillerSkip.get(entry.s) } : entry);
  return new Response(encodeLines(entries), { headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
};
