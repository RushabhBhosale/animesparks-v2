// "Anime like X" landing pages that have enough picks to publish. Shared by
// the pages, the Recommendation Finder hub and both sitemaps.

import type { ArticleCard } from '../content/types';
import { getToolsBuildData } from './build-data.ts';
import { getToolsExtras } from './build-extras.ts';
import { REC_LANDINGS, canonicalFranchiseSlug, type RecLanding } from './landings.ts';
import { similarTo, type Recommendation } from './recommend.ts';

/** A page needs at least this many picks to be worth publishing. */
export const MIN_REC_PICKS = 8;

async function load(english: ArticleCard[]) {
  const [{ bySlug }, { recIndex }] = await Promise.all([getToolsBuildData(), getToolsExtras(english)]);
  const indexed = new Set(recIndex.map(entry => entry.s));
  const franchiseOf = (slug: string) => { const franchise = bySlug.get(slug)?.franchiseSlug; return franchise ? canonicalFranchiseSlug(franchise) : undefined; };
  const pages: Array<{ landing: RecLanding; picks: Recommendation[] }> = [];
  for (const landing of REC_LANDINGS) {
    if (!indexed.has(landing.anime)) continue;
    const picks = similarTo(recIndex, landing.anime, franchiseOf, 20);
    if (picks.length >= MIN_REC_PICKS) pages.push({ landing, picks });
  }
  return pages;
}

let snapshot: ReturnType<typeof load> | undefined;
export function getRecLandingPages(english: ArticleCard[]) {
  return snapshot ??= load(english);
}
