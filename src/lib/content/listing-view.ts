// Builds the props for ListingPage from the prerendered listing snapshot.
// Shared by the prerendered pagination pages (src/pages/listing-pages) and the
// on-demand route (src/pages/listing-variant.astro) so both render identically.

import { sortByGaViews } from './ga4-rankings';
import { listingHref, paginate, sortArticles } from './listing';
import { SITE, tagSeo } from './seo';
import type { ArticleCard, CategoryDocument } from './types';

export interface ListingSource {
  english: ArticleCard[];
  spanish: ArticleCard[];
  categories: CategoryDocument[];
  /** Primary tags whose archive is indexable; computed once at build time. */
  indexableTags: string[];
}

export interface ListingRequest {
  target: string;
  page: number;
  query?: string;
  sort?: string;
  range?: string;
  views: Map<string, number> | null;
}

export type ListingView = { listing: any } | { status: number; message: string };

/** Only these listings are ordered by live GA4 page views. */
export function listingNeedsViews(target: string, sort: string) {
  return sort === 'popular' || (target === '/trending' && !sort);
}

const notFound = (message: string): ListingView => ({ status: 404, message });

export function buildListing(source: ListingSource, request: ListingRequest): ListingView {
  const { target, page, views } = request;
  const query = (request.query || '').trim();
  const sort = request.sort || '';
  const range = request.range || 'month';
  const { english, spanish, categories } = source;
  const orderArticles = (items: ArticleCard[]) =>
    sort === 'popular' ? sortByGaViews(items, views) : sortArticles(items, sort);

  if (target === '/blogs' || target === '/blogs/es') {
    const es = target === '/blogs/es';
    const normalized = query.toLowerCase();
    const articles = es ? spanish : english;
    const filtered = normalized ? articles.filter(article => [article.title, article.metaDescription, article.excerpt].some(value => value?.toLowerCase().includes(normalized))) : articles;
    const result = paginate(orderArticles(filtered), page);
    if (!result.valid) return notFound('Page not found');
    const tags = es ? [] : [...new Set(filtered.flatMap(article => article.tags || []))].slice(0, 16);
    return { listing: {
      eyebrow: es ? 'El archivo editorial' : 'The editorial archive',
      heading: es ? 'Blogs en español' : 'Blogs',
      description: es ? 'Análisis, personajes y las ideas detrás de tus series favoritas.' : 'Analysis, character studies, and the ideas behind the anime.',
      metaDescription: es ? 'Browse AnimeSparks articles in Spanish, including analysis, explanations, and editorial deep dives.' : 'Browse all anime articles on AnimeSparks — reviews, breakdowns, opinions, and deep dives into storytelling, characters, and themes.',
      title: `${es ? 'Anime Blogs in Spanish' : 'Anime Blogs & Analysis'}${page > 1 ? ` · Page ${page}` : ''} | AnimeSparks`,
      canonical: SITE + listingHref(target, { q: query || undefined, sort: sort || undefined }, page),
      posts: result.items, categories, tags, locale: es ? 'es' : 'en', path: target,
      query, sort, page, pageCount: result.pageCount, total: result.total, showSearch: true, showExcerpt: false,
    } };
  }

  if (target === '/trending') {
    const activeSort = sort || 'popular';
    const pool = english;
    const sorted = activeSort === 'visual' ? pool.filter(article => article.categories.some(category => /visual|art/i.test(category.title))) : activeSort === 'recent' ? [...pool].sort((a, b) => Date.parse(b.publishedAt || '') - Date.parse(a.publishedAt || '')) : sortByGaViews(pool, views);
    const result = paginate(sorted.length ? sorted : pool, page);
    if (!result.valid) return notFound('Page not found');
    const jsonLd = [
      { '@context': 'https://schema.org', '@type': 'BreadcrumbList', itemListElement: [
        { '@type': 'ListItem', position: 1, name: 'Home', item: `${SITE}/` },
        { '@type': 'ListItem', position: 2, name: 'Trending', item: `${SITE}/trending` },
      ] },
      { '@context': 'https://schema.org', '@type': 'ItemList', itemListElement: result.items.map((article, index) => ({
        '@type': 'ListItem', position: (page - 1) * 12 + index + 1,
        item: { '@type': 'BlogPosting', headline: article.title, datePublished: article.publishedAt, url: `${SITE}/blog/${article.slug}`, description: article.excerpt, author: { '@type': 'Person', name: article.author?.name || 'AnimeSparks' } },
      })) },
    ];
    return { listing: {
      eyebrow: 'In focus', heading: 'The stories drawing attention',
      description: 'Explore the articles readers are spending time with.',
      metaDescription: 'Discover the most read and talked-about anime articles on AnimeSparks, updated with what fans are engaging with right now.',
      title: `Trending Anime Articles Right Now${page > 1 ? ` · Page ${page}` : ''} | AnimeSparks`,
      canonical: SITE + listingHref('/trending', { sort: activeSort !== 'popular' ? activeSort : undefined, range: range !== 'month' ? range : undefined }, page),
      posts: result.items, categories, path: target, sort: activeSort, range,
      page, pageCount: result.pageCount, total: result.total, showRange: true, jsonLd,
    } };
  }

  if (target.startsWith('/categories/')) {
    const slug = decodeURIComponent(target.slice('/categories/'.length));
    const category = categories.find(item => item.slug === slug);
    if (!category) return notFound('Category not found');
    const articles = english.filter(article => article.categorySanityIds?.includes(category.sanityId));
    const result = paginate(orderArticles(articles), page);
    if (!result.valid) return notFound('Page not found');
    const presets: Record<string, [string, string]> = {
      'anime-reviews': ['Anime Reviews — Honest Takes on Popular & Underrated Series', 'In-depth anime reviews focused on story, characters, themes, and execution — covering both mainstream hits and overlooked series.'],
      'anime-opinions': ['Anime Opinions & Hot Takes That Go Deeper', 'Thought-provoking anime opinions exploring themes, character choices, power systems, and storytelling decisions across popular series.'],
      'anime-lists': ['Anime Lists — Recommendations, Rankings & Hidden Gems', 'Curated anime lists featuring recommendations, rankings, underrated picks, and must-watch series across multiple genres.'],
    };
    const [title, description] = presets[slug] || [`Category: ${category.title}`, category.description?.trim() || `Posts in ${category.title} on AnimeSparks.`];
    return { listing: {
      eyebrow: 'Editorial section', heading: category.title, description,
      title: `${title}${page > 1 ? ` · Page ${page}` : ''} | AnimeSparks`,
      canonical: SITE + listingHref(target, { sort: sort || undefined }, page),
      posts: result.items, categories, path: target, sort,
      page, pageCount: result.pageCount, total: result.total,
    } };
  }

  if (target.startsWith('/tags/')) {
    const tag = decodeURIComponent(target.slice('/tags/'.length));
    const wanted = tag.toLowerCase();
    const posts = [...english, ...spanish].filter(article => article.tags?.some(value => value.toLowerCase() === wanted));
    if (!posts.length) return notFound('Tag not found');
    const result = paginate(posts, page);
    if (!result.valid) return notFound('Page not found');
    const path = `/tags/${encodeURIComponent(tag)}`;
    const seo = tagSeo(tag, page);
    return { listing: {
      eyebrow: 'Topic index', heading: tag,
      description: seo.description, title: seo.title, socialTitle: seo.socialTitle,
      canonical: SITE + listingHref(path, {}, page),
      posts: result.items, categories, path,
      page, pageCount: result.pageCount, total: result.total,
      robotsNoindex: !source.indexableTags.includes(tag),
    } };
  }

  return notFound('Page not found');
}
