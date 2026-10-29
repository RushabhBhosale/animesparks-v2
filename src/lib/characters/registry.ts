// Single entry point for the encyclopedia data: validated, filtered to
// publishable profiles, and indexed for the pages.

import { PROFILES, SERIES } from './data/index.ts';
import { completenessProblems, integrityErrors } from './validate.ts';
import type { CharacterProfile, ResolvedSeries, SeriesData } from './types.ts';

export const MIN_PROFILES_FOR_HUB = 2;

export interface Registry {
  series: ResolvedSeries[];
  profiles: CharacterProfile[];
  skipped: Array<{ slug: string; problems: string[] }>;
  bySlug: Map<string, CharacterProfile>;
  seriesBySlug: Map<string, ResolvedSeries>;
  /** Series that earn their own hub page. */
  hubs: ResolvedSeries[];
}

let cached: Registry | undefined;

export function buildRegistry(seriesList: SeriesData[] = SERIES, allProfiles: CharacterProfile[] = PROFILES): Registry {
  const errors = integrityErrors(seriesList, allProfiles);
  if (errors.length) throw new Error(`Character data is inconsistent:\n- ${errors.join('\n- ')}`);
  const seriesBySlug = new Map(seriesList.map(item => [item.slug, item]));
  const skipped: Registry['skipped'] = [];
  const profiles = allProfiles.filter(profile => {
    const problems = completenessProblems(profile, seriesBySlug.get(profile.series)!);
    if (problems.length) skipped.push({ slug: profile.slug, problems });
    return problems.length === 0;
  });
  const published = new Set(profiles.map(profile => profile.slug));
  const series = seriesList.map((item): ResolvedSeries => ({
    ...item,
    // A cast member only links to a profile that is actually published.
    cast: item.cast.map(member => (member.profile && !published.has(member.profile) ? { ...member, profile: undefined } : member)),
    profiles: profiles.filter(profile => profile.series === item.slug),
  })).filter(item => item.profiles.length > 0);
  return {
    series, profiles, skipped,
    bySlug: new Map(profiles.map(profile => [profile.slug, profile])),
    seriesBySlug: new Map(series.map(item => [item.slug, item])),
    hubs: series.filter(item => item.profiles.length >= MIN_PROFILES_FOR_HUB),
  };
}

export function getRegistry(): Registry {
  if (!cached) {
    cached = buildRegistry();
    for (const item of cached.skipped) console.warn(`[characters] ${item.slug} is not published: ${item.problems.join('; ')}`);
  }
  return cached;
}

export const characterPath = (slug: string) => `/characters/${slug}`;
export const hubPath = (series: string) => `/characters/anime/${series}`;

/** Newest verification date across the registry, for the hub's lastmod. */
export const latestVerified = (profiles: CharacterProfile[]) => profiles.map(item => item.meta.verifiedAt).sort().at(-1);
