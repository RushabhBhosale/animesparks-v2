import type { APIRoute } from 'astro';
import { getBuildData } from '../lib/content/build-data';
import type { SearchEntry } from '../lib/content/search-index';

export const prerender = true;
export const GET: APIRoute = async () => {
  const { english } = await getBuildData();
  const entries: SearchEntry[] = english.map(article => ({
    sanityId: article.sanityId, title: article.title, slug: article.slug,
    metaDescription: article.metaDescription, excerpt: article.excerpt,
    publishedAt: article.publishedAt, language: article.language, tags: article.tags,
    categories: article.categories.map(category => ({ sanityId: category.sanityId, title: category.title, slug: category.slug })),
  }));
  return new Response(JSON.stringify(entries), { headers: { 'Content-Type': 'application/json; charset=utf-8', 'X-Robots-Tag': 'noindex, nofollow' } });
};
