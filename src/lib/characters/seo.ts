import { SITE } from '../content/seo';
import { characterPath, hubPath } from './registry.ts';
import type { CharacterProfile, ResolvedSeries } from './types.ts';

export const CHARACTERS_IMAGE = `${SITE}/anime-poster.jpg`;

export function crumbList(items: Array<[string, string]>) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [['Home', '/'], ...items].map(([name, path], index) => ({ '@type': 'ListItem', position: index + 1, name, item: `${SITE}${path}` })),
  };
}

const publisher = { '@type': 'Organization', name: 'AnimeSparks', url: SITE, '@id': `${SITE}/#organization` };

export function profileJsonLd(profile: CharacterProfile, series: ResolvedSeries, hasHub: boolean) {
  const url = `${SITE}${characterPath(profile.slug)}`;
  // FAQ structured data only carries answers that are visible without unfolding a spoiler.
  const faq = profile.faq.filter(item => !item.spoiler);
  return [
    crumbList([['Characters', '/characters'], ...(hasHub ? [[`${series.short} characters`, hubPath(series.slug)] as [string, string]] : []), [profile.name, characterPath(profile.slug)]]),
    {
      '@context': 'https://schema.org',
      '@type': 'Article',
      '@id': `${url}#article`,
      mainEntityOfPage: url,
      headline: profile.seo.title,
      description: profile.seo.description,
      about: { '@type': 'Thing', name: profile.name, alternateName: profile.aliases, description: profile.overview, subjectOf: { '@type': 'TVSeries', name: series.title } },
      datePublished: profile.meta.publishedAt,
      dateModified: profile.meta.verifiedAt,
      author: publisher,
      publisher,
      image: CHARACTERS_IMAGE,
      inLanguage: 'en',
    },
    ...(faq.length ? [{
      '@context': 'https://schema.org',
      '@type': 'FAQPage',
      mainEntity: faq.map(item => ({ '@type': 'Question', name: item.question, acceptedAnswer: { '@type': 'Answer', text: item.answer } })),
    }] : []),
  ];
}
