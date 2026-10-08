import type { APIRoute } from 'astro';
import { getBuildData } from '../lib/content/build-data';

export const prerender = true;
export const GET: APIRoute = async () => {
  const { english, spanish, categories } = await getBuildData();
  const compact = (articles: typeof english) => articles.map(article => ({
    sanityId: article.sanityId, translationOfSanityId: article.translationOfSanityId, language: article.language, slug: article.slug,
    title: article.title, metaDescription: article.metaDescription, excerpt: article.excerpt,
    publishedAt: article.publishedAt, mainImage: article.mainImage, author: article.author,
    categories: article.categories, categorySanityIds: article.categorySanityIds,
    tags: article.tags, viewCount: article.viewCount, animeName: article.animeName,
  }));
  return new Response(JSON.stringify({ english: compact(english), spanish: compact(spanish), categories }), {
    headers: { 'Content-Type': 'application/json; charset=utf-8', 'X-Robots-Tag': 'noindex, nofollow' },
  });
};
