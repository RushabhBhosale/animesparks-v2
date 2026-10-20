// Franchise grouping and watch-order helpers. Release order is derived from
// verified relation and air-date data; chronological and beginner orders
// come only from curated, verified documents.

import type { AnimeFormat, AnimeRelationRef, AnimeStatus, FranchiseRole, RelationKind } from './types.ts';

export interface FranchiseInputNode {
  malId: number;
  slug: string;
  title: string;
  format: AnimeFormat;
  airedFrom: string | null;
  popularity: number | null;
  relations?: AnimeRelationRef[];
}

export interface DerivedFranchise {
  anchorMalId: number;
  title: string;
  members: Array<{ malId: number; slug: string; role: FranchiseRole }>;
  truncated: boolean;
}

/** Relations that keep two entries in one viewing franchise. */
export const FRANCHISE_RELATIONS: ReadonlySet<RelationKind> = new Set(['sequel', 'prequel', 'side-story', 'parent-story', 'summary', 'full-story']);
const MAIN_LINE_RELATIONS: ReadonlySet<RelationKind> = new Set(['sequel', 'prequel']);
const WATCHABLE_FORMATS: ReadonlySet<AnimeFormat> = new Set(['tv', 'movie', 'ova', 'ona', 'special', 'tv-special']);
/** Anchor preference: the first TV series, else ONA, else movie. */
const ANCHOR_FORMATS: AnimeFormat[] = ['tv', 'ona', 'movie'];
const FORMAT_ORDER: AnimeFormat[] = ['tv', 'ona', 'movie', 'ova', 'tv-special', 'special', 'music', 'other'];

export const FRANCHISE_MIN_MEMBERS = 3;
export const FRANCHISE_MAX_MEMBERS = 200;
/**
 * Crossovers that would fuse two separate franchises into one (MAL IDs).
 * They are left out of every franchise rather than joining both.
 */
export const FRANCHISE_BRIDGES: ReadonlySet<number> = new Set([
  6115, // Lupin III vs. Detective Conan
  18429, // Lupin III vs. Detective Conan: The Movie
  1369, // Detective Conan OVA 01: Conan vs. Kid vs. Yaiba
]);

function airedTime(value: string | null): number {
  const time = Date.parse(value || '');
  return Number.isFinite(time) ? time : Number.POSITIVE_INFINITY;
}

export function compareRelease(a: { airedFrom: string | null; format: AnimeFormat; malId: number }, b: { airedFrom: string | null; format: AnimeFormat; malId: number }): number {
  return airedTime(a.airedFrom) - airedTime(b.airedFrom)
    || FORMAT_ORDER.indexOf(a.format) - FORMAT_ORDER.indexOf(b.format)
    || a.malId - b.malId;
}

/** Undirected adjacency over franchise relations, limited to known watchable nodes. */
function buildAdjacency(nodes: Map<number, FranchiseInputNode>) {
  const all = new Map<number, Set<number>>();
  const mainLine = new Map<number, Set<number>>();
  const recaps = new Set<number>();
  const link = (map: Map<number, Set<number>>, a: number, b: number) => {
    if (!map.has(a)) map.set(a, new Set());
    if (!map.has(b)) map.set(b, new Set());
    map.get(a)!.add(b);
    map.get(b)!.add(a);
  };
  for (const node of nodes.values()) {
    if (!WATCHABLE_FORMATS.has(node.format) || FRANCHISE_BRIDGES.has(node.malId)) continue;
    for (const relation of node.relations || []) {
      const target = relation.externalIds.mal;
      if (!target || target === node.malId || !FRANCHISE_RELATIONS.has(relation.kind) || FRANCHISE_BRIDGES.has(target)) continue;
      // "Full story" points from a recap to the original; "summary" points to the recap.
      if (relation.kind === 'full-story') recaps.add(node.malId);
      if (relation.kind === 'summary' && nodes.has(target)) recaps.add(target);
      const other = nodes.get(target);
      if (!other || !WATCHABLE_FORMATS.has(other.format)) continue;
      link(all, node.malId, target);
      if (MAIN_LINE_RELATIONS.has(relation.kind)) link(mainLine, node.malId, target);
    }
  }
  return { all, mainLine, recaps };
}

function reachable(start: number, adjacency: Map<number, Set<number>>): { members: number[] } {
  const seen = new Set([start]);
  const queue = [start];
  while (queue.length) {
    const current = queue.shift()!;
    for (const next of adjacency.get(current) || []) {
      if (seen.has(next)) continue;
      seen.add(next);
      queue.push(next);
    }
  }
  return { members: [...seen] };
}

export function franchiseTitle(title: string): string {
  return title
    .replace(/\s*[:\-–]?\s*(season\s*\d+|\d+(st|nd|rd|th)\s+season|part\s*\d+|cour\s*\d+)\s*$/i, '')
    .replace(/\s*\(TV\)\s*$/i, '')
    .trim() || title;
}

/**
 * Groups nodes into franchises. A franchise needs at least
 * FRANCHISE_MIN_MEMBERS watchable entries. The anchor is the earliest TV
 * entry (else ONA, else movie); the main line is everything reachable from it through
 * sequel/prequel links. Other members are side stories or recaps.
 */
export function deriveFranchises(nodes: Map<number, FranchiseInputNode>, maxMembers = FRANCHISE_MAX_MEMBERS): DerivedFranchise[] {
  const { all, mainLine, recaps } = buildAdjacency(nodes);
  const assigned = new Set<number>();
  const franchises: DerivedFranchise[] = [];
  const ordered = [...all.keys()].map(id => nodes.get(id)!).sort(compareRelease);
  for (const start of ordered) {
    if (assigned.has(start.malId)) continue;
    const component = reachable(start.malId, all).members;
    component.forEach(id => assigned.add(id));
    if (component.length < FRANCHISE_MIN_MEMBERS) continue;
    // Very large franchises keep their earliest entries; the page says so.
    const members = component.map(id => nodes.get(id)!).sort(compareRelease).slice(0, maxMembers);
    const anchor = ANCHOR_FORMATS.map(format => members.find(member => member.format === format)).find(Boolean) || members[0];
    const main = new Set(reachable(anchor.malId, mainLine).members);
    franchises.push({
      anchorMalId: anchor.malId,
      title: franchiseTitle(anchor.title),
      truncated: component.length > maxMembers,
      members: members.map(member => ({
        malId: member.malId,
        slug: member.slug,
        role: recaps.has(member.malId) ? 'recap' : main.has(member.malId) ? 'main' : 'side',
      })),
    });
  }
  return franchises;
}

export interface WatchEntryTiming {
  format: AnimeFormat;
  status: AnimeStatus;
  episodes: number | null;
  episodesAired?: number | null;
  durationMinutes: number | null;
}

/**
 * Episodes and minutes that can be watched today. Ongoing series use the
 * aired count; upcoming entries contribute nothing. Unknown values return null.
 */
export function watchableTime(entry: WatchEntryTiming): { episodes: number | null; minutes: number | null } {
  if (entry.status === 'upcoming') return { episodes: 0, minutes: 0 };
  const episodes = entry.status === 'airing'
    ? entry.episodesAired ?? null
    : entry.episodes ?? (entry.format === 'movie' ? 1 : null);
  if (episodes === null || !entry.durationMinutes) return { episodes, minutes: null };
  return { episodes, minutes: Math.round(episodes * entry.durationMinutes) };
}

export function sumWatchTime(entries: WatchEntryTiming[]): { minutes: number; unknownCount: number; episodes: number } {
  let minutes = 0;
  let episodes = 0;
  let unknownCount = 0;
  for (const entry of entries) {
    const time = watchableTime(entry);
    if (time.minutes === null) unknownCount++;
    else minutes += time.minutes;
    episodes += time.episodes || 0;
  }
  return { minutes, unknownCount, episodes };
}

export function uniqueSlug(base: string, taken: Set<string>, fallbacks: Array<string | number | null | undefined>): string {
  const root = base || 'anime';
  if (!taken.has(root)) return root;
  for (const suffix of fallbacks) {
    if (suffix === null || suffix === undefined || suffix === '') continue;
    const candidate = `${root}-${suffix}`;
    if (!taken.has(candidate)) return candidate;
  }
  for (let index = 2; ; index++) {
    const candidate = `${root}-${index}`;
    if (!taken.has(candidate)) return candidate;
  }
}
