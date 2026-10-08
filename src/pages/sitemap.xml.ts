import type { APIRoute } from 'astro';
import { getBuildData } from '../lib/content/build-data';
import { SITE } from '../lib/content/seo';
import { escapeXml, xmlDate } from '../lib/content/xml';
import { tagIndexability } from '../lib/content/tag-seo';

const staticPaths = ['/', '/blogs', '/blogs/es', '/my-anime-list', '/categories', '/trending', '/contact', '/about', '/privacy', '/sitemap'];
export const prerender = true;
export const GET: APIRoute = async () => {
  const { sitemapArticles: articles, categories, primaryTags, english: englishCards, spanish: spanishCards } = await getBuildData();
  const cards = [...englishCards, ...spanishCards];
  const tagStatus = tagIndexability(primaryTags, cards);
  const tags = primaryTags.filter(tag => tagStatus.get(tag));
  const english = new Map(articles.filter(article => article.language === 'en').map(article => [article.sanityId, article]));
  const spanish = new Map(articles.filter(article => article.language === 'es').map(article => [article.translationOfSanityId, article]));
  const rows: Array<{ url: string; modified?: string; alternates?: Array<[string, string]> }> = [
    ...staticPaths.map(path => ({ url: `${SITE}${path}` })),
    ...categories.map(category => ({ url: `${SITE}/categories/${category.slug}` })),
    ...tags.map(tag => ({ url: `${SITE}/tags/${encodeURIComponent(tag)}` })),
    ...articles.map(article => {
      const url = `${SITE}${article.language === 'es' ? '/es' : ''}/blog/${article.slug}`;
      const peer = article.language === 'en' ? spanish.get(article.sanityId) : english.get(article.translationOfSanityId || '');
      const en = article.language === 'en' ? url : peer && `${SITE}/blog/${peer.slug}`;
      const es = article.language === 'es' ? url : peer && `${SITE}/es/blog/${peer.slug}`;
      const alternates: Array<[string, string]> = [];
      if (en) alternates.push(['en', en]);
      if (es) alternates.push(['es', es]);
      alternates.push(['x-default', en || url]);
      return { url, modified: xmlDate(article.updatedAt || article.sourceUpdatedAt || article.publishedAt), alternates };
    }),
  ];
  const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">\n${rows.map(row => `  <url>\n    <loc>${escapeXml(row.url)}</loc>${row.modified ? `\n    <lastmod>${row.modified}</lastmod>` : ''}${row.alternates?.length ? `\n${row.alternates.map(([lang, href]) => `    <xhtml:link rel="alternate" hreflang="${lang}" href="${escapeXml(href)}" />`).join('\n')}` : ''}\n  </url>`).join('\n')}\n</urlset>\n`;
  return new Response(xml, { headers: { 'Content-Type': 'application/xml; charset=utf-8', 'X-Robots-Tag': 'noindex, nofollow' } });
};
