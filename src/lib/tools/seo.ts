import { SITE } from '../content/seo';

export const TOOLS_IMAGE = `${SITE}/anime-poster.jpg`;

export function toolBreadcrumbs(items: Array<[string, string]>) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [['Home', '/'], ['Tools', '/tools'], ...items].map(([name, path], index) => ({
      '@type': 'ListItem', position: index + 1, name, item: `${SITE}${path}`,
    })),
  };
}

export function toolApplication(name: string, description: string, path: string) {
  return {
    '@context': 'https://schema.org',
    '@type': 'WebApplication',
    name,
    description,
    url: `${SITE}${path}`,
    applicationCategory: 'EntertainmentApplication',
    operatingSystem: 'Any',
    browserRequirements: 'Requires JavaScript',
    isAccessibleForFree: true,
    offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD' },
    publisher: { '@type': 'Organization', name: 'AnimeSparks', url: SITE, '@id': `${SITE}/#organization` },
  };
}
