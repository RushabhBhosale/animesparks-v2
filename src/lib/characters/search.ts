import type { CharacterProfile, ResolvedSeries } from './types.ts';

/** Lowercased text the directory filter matches against. */
export function searchText(profile: CharacterProfile, series: Pick<ResolvedSeries, 'title' | 'short'>): string {
  return [profile.name, profile.native, ...profile.aliases, series.title, series.short, profile.role, ...profile.affiliations, ...profile.abilityTags]
    .filter(Boolean).join(' | ').toLowerCase();
}

export function initials(name: string): string {
  const words = name.replace(/[^\p{L}\s]/gu, ' ').split(/\s+/).filter(Boolean);
  return (words.length > 1 ? words[0][0] + words.at(-1)![0] : words[0]?.slice(0, 2) || '?').toUpperCase();
}
