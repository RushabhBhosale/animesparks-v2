import type { APIRoute } from 'astro';
import { env } from 'cloudflare:workers';
import { getGa4PageViews, sortByGaViews } from '../../lib/content/ga4-rankings';
import { r2ImageUrl } from '../../lib/content/images';
import type { ArticleCard } from '../../lib/content/types';

type RankedCard = {
  title: string;
  href: string;
  image?: string;
  alt?: string;
  publishedAt?: string;
  category?: string;
  categoryHref?: string;
  author?: string;
};

const toCard = (article: ArticleCard): RankedCard => {
  const category = article.categories?.[0];
  const locale = article.language === 'es' ? '/es' : '';
  return {
    title: article.title,
    href: `${locale}/blog/${article.slug}`,
    image: r2ImageUrl(article.mainImage),
    alt: article.mainImage?.alt || article.title,
    publishedAt: article.publishedAt,
    category: category?.title,
    categoryHref: category ? `/categories/${category.slug}` : undefined,
    author: article.author?.name,
  };
};

export const GET: APIRoute = async ({ request }) => {
  if (!env.ASSETS) return new Response('Static assets unavailable', { status: 503 });
  const response = await env.ASSETS.fetch(new URL('/listing-data.json', request.url).toString());
  if (!response.ok) return new Response('Ranking data unavailable', { status: 503 });
  const { english } = await response.json() as { english: ArticleCard[] };
  const excluded = new Set(new URL(request.url).searchParams.get('exclude')?.split(',').filter(Boolean) || []);
  const [weeklyViews, monthlyViews] = await Promise.all([
    getGa4PageViews(env, 'week'),
    getGa4PageViews(env, 'month'),
  ]);
  const idFor = (article: ArticleCard) => article.translationOfSanityId || article.sanityId;
  const ranked = (window: Map<string, number> | null, picked: Set<string>) => sortByGaViews(
    english.filter(article => !picked.has(idFor(article)) && (window?.get(`/blog/${article.slug}`) || 0) > 0),
    window,
  );
  const popularArticles = ranked(weeklyViews, excluded).slice(0, 2);
  const picked = new Set([...excluded, ...popularArticles.map(idFor)]);
  const trendingArticles = ranked(monthlyViews, picked)
    .filter(article => article.mainImage?.asset?.r2Key).slice(0, 6);
  return new Response(JSON.stringify({
    popular: popularArticles.map(toCard), trending: trendingArticles.map(toCard),
    source: weeklyViews || monthlyViews ? 'ga4' : 'unavailable',
  }), {
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'public, max-age=300, stale-while-revalidate=60',
      'X-Robots-Tag': 'noindex, nofollow',
    },
  });
};
