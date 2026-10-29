import { familyForest } from './graph.ts';
import { getRegistry } from './registry.ts';
import type { ResolvedSeries } from './types.ts';

/** Series whose explorer is published. Others have data but wait for roster research. */
export const PUBLISHED_FAMILY_SERIES = ['naruto'];

export const familyPath = (series: string) => `/family-trees/${series}`;

/** Series that have enough verified family data and a guide to earn an explorer page. */
export function familySeries(): ResolvedSeries[] {
  return getRegistry().series.filter(series => PUBLISHED_FAMILY_SERIES.includes(series.slug) && series.familyGuide && familyForest(series.cast, series.relationships).length > 0);
}

export function familyCounts(series: ResolvedSeries) {
  const family = series.relationships.filter(item => item.type === 'family');
  const people = new Set(family.flatMap(item => [item.a, item.b]));
  return { ties: family.length, people: people.size, clans: series.clans?.length ?? 0 };
}
