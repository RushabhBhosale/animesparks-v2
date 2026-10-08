import type { ArticlePageData } from './types';
import { r2ImageUrl } from './images';
export const SITE = 'https://www.animesparks.blog';
export const homeTitle = 'AnimeSparks — Deep Anime Analysis, Reviews & Recommendations';
export const homeDescription = 'Thoughtful anime analysis, sharp reviews, and honest opinions on popular and underrated series. Explore anime beyond surface-level hype.';
export const homeImage = `${SITE}/anime-poster.jpg`;
const tagPresets: Record<string, [string, string]> = {
  'anime news': ['Anime News, Release Dates & Updates', 'Latest anime news, release dates, episode schedules, and confirmed updates — clearly explained without rumors or filler.'],
  'anime reviews': ['Anime Reviews — Honest Takes on Popular & Underrated Series', 'In-depth anime reviews focused on story, characters, themes, and execution — covering both mainstream hits and overlooked series.'],
  'anime lists': ['Anime Lists — Recommendations, Rankings & Hidden Gems', 'Curated anime lists featuring recommendations, rankings, underrated picks, and must-watch series across multiple genres.'],
  'isekai': ['Isekai Anime — Power Fantasies, Parody & Deconstruction', 'Explore isekai anime ranging from dark power fantasies to genre-aware parody, with thoughtful breakdowns and comparisons.'],
  'isekai anime': ['Isekai Anime — Power Fantasies, Parody & Deconstruction', 'Explore isekai anime ranging from dark power fantasies to genre-aware parody, with thoughtful breakdowns and comparisons.'],
  'psychological anime': ['Dark & Psychological Anime — Themes That Hit Hard', 'Anime focused on psychological depth, moral conflict, isolation, and darker storytelling that stays with you long after watching.'],
};
export function tagSeo(tag: string, page: number) {
  const preset = tagPresets[tag.toLowerCase()];
  const socialTitle = preset?.[0] || `Anime Tag: ${tag} | AnimeSparks`;
  const description = preset?.[1] || `Explore anime articles tagged ${tag} — reviews, opinions, lists, and news from AnimeSparks.`;
  const title = preset
    ? `${socialTitle}${page > 1 ? ` · Page ${page}` : ''} | AnimeSparks`
    : `${socialTitle}${page > 1 ? ` · Page ${page}` : ''} | AnimeSparks`;
  return { title, socialTitle, description };
}
export function articleSeo(article: ArticlePageData) {
  const title = article.metaTitle?.trim() || article.title;
  const rawDescription = (article.metaDescription || article.excerpt || '').replace(/\s+/g, ' ').trim();
  const description = rawDescription.length > 160 ? `${rawDescription.slice(0, 157)}...` : rawDescription;
  const canonical = `${SITE}${article.language === 'es' ? '/es' : ''}/blog/${article.slug}`;
  const image = r2ImageUrl(article.mainImage) || homeImage;
  const modified = article.updatedAt || article.sourceUpdatedAt || article.publishedAt;
  const faq = (article.faq || []).filter(x => x.question?.trim() && x.answer?.trim());
  const jsonLd = [
    {
      '@context': 'https://schema.org', '@type': 'Article', mainEntityOfPage: canonical,
      headline: title, description, image: [image], inLanguage: article.language,
      datePublished: article.publishedAt, dateModified: modified,
      author: { '@type': 'Person', name: article.author?.name || 'AnimeSparks Editorial', url: 'https://www.rushabh.in/home', image: r2ImageUrl(article.author?.image), sameAs: ['https://www.rushabh.in/home'] },
      articleSection: article.categories.map(c => c.title),
      about: article.animeName ? { '@type': 'Thing', name: article.animeName } : undefined,
      publisher: { '@type': 'Organization', name: 'AnimeSparks', url: SITE, '@id': `${SITE}/#organization`, logo: { '@type': 'ImageObject', url: `${SITE}/logo.png` } },
    },
    { '@context': 'https://schema.org', '@type': 'BreadcrumbList', itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Home', item: `${SITE}/` },
      { '@type': 'ListItem', position: 2, name: 'Blogs', item: `${SITE}${article.language === 'es' ? '/blogs/es' : '/blogs'}` },
      { '@type': 'ListItem', position: 3, name: article.title, item: canonical },
    ] },
    ...(faq.length ? [{ '@context': 'https://schema.org', '@type': 'FAQPage', mainEntity: faq.map(x => ({ '@type': 'Question', name: x.question, acceptedAnswer: { '@type': 'Answer', text: x.answer } })) }] : []),
  ];
  return { title, description, canonical, image, modified, jsonLd };
}
