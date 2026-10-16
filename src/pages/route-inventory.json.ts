import type { APIRoute } from 'astro';
import { getBuildData } from '../lib/content/build-data';
import { getToolsBuildData } from '../lib/tools/build-data';
import { getToolsExtras } from '../lib/tools/build-extras';
import { LIVE_TOOLS, toolPath } from '../lib/tools/registry';

export const prerender = true;
export const GET: APIRoute = async () => {
  const [{ articlePages, categories, tags, english }, { franchises }] = await Promise.all([getBuildData(), getToolsBuildData()]);
  const { filler } = await getToolsExtras(english);
  const paths = [
    '/', '/blogs', '/blogs/es', '/my-anime-list', '/categories', '/trending',
    '/contact', '/about', '/privacy', '/sitemap',
    ...categories.map(category => `/categories/${category.slug}`),
    ...articlePages.map(article => `${article.language === 'es' ? '/es' : ''}/blog/${article.slug}`),
    ...tags.map(tag => `/tags/${encodeURIComponent(tag)}`),
    '/tools', ...LIVE_TOOLS.map(toolPath),
    ...franchises.map(franchise => `/tools/anime-watch-order/${franchise.slug}`),
    ...filler.map(view => `/tools/anime-filler-checker/${view.slug}`),
  ];
  return new Response(JSON.stringify(paths), {
    headers: { 'Content-Type': 'application/json; charset=utf-8', 'X-Robots-Tag': 'noindex, nofollow' },
  });
};
