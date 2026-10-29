import type { APIRoute } from 'astro';
import { getBuildData } from '../lib/content/build-data';
import { getToolsBuildData } from '../lib/tools/build-data';
import { getToolsExtras } from '../lib/tools/build-extras';
import { MANGA_LANDINGS } from '../lib/tools/landings';
import { LIVE_TOOLS, toolPath } from '../lib/tools/registry';
import { characterPath, getRegistry, hubPath } from '../lib/characters/registry';
import { familyPath, familySeries } from '../lib/characters/family';

export const prerender = true;
export const GET: APIRoute = async () => {
  const [{ articlePages, categories, tags, english }, { franchises }] = await Promise.all([getBuildData(), getToolsBuildData()]);
  const { filler, source } = await getToolsExtras(english);
  const paths = [
    '/', '/blogs', '/blogs/es', '/my-anime-list', '/categories', '/trending',
    '/contact', '/about', '/privacy', '/sitemap',
    ...categories.map(category => `/categories/${category.slug}`),
    ...articlePages.map(article => `${article.language === 'es' ? '/es' : ''}/blog/${article.slug}`),
    ...tags.map(tag => `/tags/${encodeURIComponent(tag)}`),
    '/family-trees', ...familySeries().flatMap(series => [familyPath(series.slug), `${familyPath(series.slug)}/complete`]),
    '/characters', ...getRegistry().hubs.map(series => hubPath(series.slug)), ...getRegistry().profiles.map(profile => characterPath(profile.slug)),
    '/tools', ...LIVE_TOOLS.map(toolPath),
    ...franchises.map(franchise => `/tools/anime-watch-order/${franchise.slug}`),
    ...filler.map(view => `/tools/anime-filler-checker/${view.slug}`),
    ...MANGA_LANDINGS.filter(landing => landing.entries.every(slug => source[slug]?.mapping)).map(landing => `/tools/anime-manga-chapter-finder/${landing.slug}`),
  ];
  return new Response(JSON.stringify(paths), {
    headers: { 'Content-Type': 'application/json; charset=utf-8', 'X-Robots-Tag': 'noindex, nofollow' },
  });
};
