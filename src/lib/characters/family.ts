import config from '../../../data/characters/rosters/series.json' with { type: 'json' };
import { getRegistry } from './registry.ts';

export interface FamilySeries {
  slug: string; title: string; short: string;
  /** Hand-written page title and description, when the series has a curated guide. */
  seo?: { title: string; description: string };
  /** Spoiler stages from the encyclopedia; empty for series that are the wiki roster alone. */
  checkpoints: Array<{ id: string; label: string }>;
  verifiedAt?: string;
}

/** Series whose tree is published: every entry in the roster config. */
export const PUBLISHED_FAMILY_SERIES: string[] = (config as Array<{ slug: string }>).map(item => item.slug);

export const familyPath = (series: string) => `/family-trees/${series}`;

export function familySeries(): FamilySeries[] {
  const registry = getRegistry();
  return (config as Array<{ slug: string; title: string; short: string }>).map(item => {
    const curated = registry.seriesBySlug.get(item.slug);
    return {
      slug: item.slug, title: curated?.title ?? item.title, short: curated?.short ?? item.short,
      seo: curated?.familyGuide?.seo, checkpoints: curated?.checkpoints ?? [],
      verifiedAt: curated?.profiles.map(profile => profile.meta.verifiedAt).sort().at(-1),
    };
  });
}
