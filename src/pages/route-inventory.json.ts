import type { APIRoute } from 'astro';
import { getBuildData } from '../lib/content/build-data';

export const prerender = true;
export const GET: APIRoute = async () => {
  const { articlePages, categories, tags } = await getBuildData();
  const paths = [
    '/', '/blogs', '/blogs/es', '/my-anime-list', '/categories', '/trending',
    '/contact', '/about', '/privacy', '/sitemap',
    ...categories.map(category => `/categories/${category.slug}`),
    ...articlePages.map(article => `${article.language === 'es' ? '/es' : ''}/blog/${article.slug}`),
    ...tags.map(tag => `/tags/${encodeURIComponent(tag)}`),
  ];
  return new Response(JSON.stringify(paths), {
    headers: { 'Content-Type': 'application/json; charset=utf-8', 'X-Robots-Tag': 'noindex, nofollow' },
  });
};
