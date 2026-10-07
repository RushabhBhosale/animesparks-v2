import type { ArticlePageData } from './types';
import { r2ImageUrl } from './images';
export const SITE = 'https://www.animesparks.blog';
export const homeTitle = 'AnimeSparks — Deep Anime Analysis, Reviews & Recommendations';
export const homeDescription = 'Thoughtful anime analysis, sharp reviews, and honest opinions on popular and underrated series. Explore anime beyond surface-level hype.';
export const homeImage = `${SITE}/anime-poster.jpg`;
export function articleSeo(article: ArticlePageData) {
  const title = article.metaTitle?.trim() || article.title;
  const description = (article.metaDescription || article.excerpt || '').replace(/\s+/g, ' ').trim().slice(0, 160);
  const canonical = `${SITE}/blog/${article.slug}`;
  const image = r2ImageUrl(article.mainImage) || homeImage;
  const modified = article.updatedAt || article.sourceUpdatedAt || article.publishedAt;
  const faq = (article.faq || []).filter(x => x.question?.trim() && x.answer?.trim());
  const jsonLd = [
    {
      '@context': 'https://schema.org', '@type': 'Article', mainEntityOfPage: canonical,
      headline: title, description, image: [image], inLanguage: 'en',
      datePublished: article.publishedAt, dateModified: modified,
      author: { '@type': 'Person', name: article.author?.name || 'AnimeSparks Editorial', url: 'https://www.rushabh.in/home', image: r2ImageUrl(article.author?.image), sameAs: ['https://www.rushabh.in/home'] },
      articleSection: article.categories.map(c => c.title),
      about: article.animeName ? { '@type': 'Thing', name: article.animeName } : undefined,
      publisher: { '@type': 'Organization', name: 'AnimeSparks', url: SITE, '@id': `${SITE}/#organization`, logo: { '@type': 'ImageObject', url: `${SITE}/logo.png` } },
    },
    { '@context': 'https://schema.org', '@type': 'BreadcrumbList', itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Home', item: `${SITE}/` },
      { '@type': 'ListItem', position: 2, name: 'Blogs', item: `${SITE}/blogs` },
      { '@type': 'ListItem', position: 3, name: article.title, item: canonical },
    ] },
    ...(faq.length ? [{ '@context': 'https://schema.org', '@type': 'FAQPage', mainEntity: faq.map(x => ({ '@type': 'Question', name: x.question, acceptedAnswer: { '@type': 'Answer', text: x.answer } })) }] : []),
  ];
  return { title, description, canonical, image, modified, jsonLd };
}
