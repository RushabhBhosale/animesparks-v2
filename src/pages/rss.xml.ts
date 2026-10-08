import type { APIRoute } from 'astro';
import { getBuildData } from '../lib/content/build-data';
import { SITE } from '../lib/content/seo';
import { escapeXml } from '../lib/content/xml';

export const prerender = true;
export const GET: APIRoute = async () => {
  const articles = (await getBuildData()).english;
  const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<rss version="2.0" xmlns:dc="http://purl.org/dc/elements/1.1/">\n<channel>\n<title>AnimeSparks</title>\n<link>${SITE}</link>\n<description>Editorial anime analysis on storytelling, character arcs, and dark shonen.</description>\n<language>en-IN</language>\n<lastBuildDate>${new Date().toUTCString()}</lastBuildDate>\n${articles.map(article => {
    const link = `${SITE}/blog/${article.slug}`;
    const description = (article.excerpt || '').replace(/\s+/g, ' ').trim().slice(0, 240);
    const published = article.publishedAt ? new Date(article.publishedAt).toUTCString() : '';
    const modified = article.updatedAt || article.sourceUpdatedAt || article.publishedAt;
    return `<item><title>${escapeXml(article.title)}</title><link>${escapeXml(link)}</link><guid>${escapeXml(link)}</guid>${published ? `<pubDate>${published}</pubDate>` : ''}${modified ? `<dc:date>${new Date(modified).toUTCString()}</dc:date>` : ''}<description>${escapeXml(description)}</description></item>`;
  }).join('\n')}\n</channel>\n</rss>\n`;
  return new Response(xml, { headers: { 'Content-Type': 'application/rss+xml; charset=utf-8', 'X-Robots-Tag': 'noindex, nofollow' } });
};
