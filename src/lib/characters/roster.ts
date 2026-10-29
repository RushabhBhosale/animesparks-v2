// Series-wide roster: every character recorded for a series (names, clan,
// status, affiliation, family links), merged with the curated encyclopedia.
// Built at prerender time into one compact JSON asset that the "complete
// family tree" page loads lazily. Nothing here runs per request.

import naruto from '../../../data/characters/rosters/naruto.json';
import { getRegistry } from './registry.ts';
import { checkpointIndex } from './format.ts';

interface RawCharacter {
  id: string; name: string; clan: string[]; status?: string; affiliation: string[]; kekkei: string[];
  family: Array<{ id: string; name: string; relation: string }>;
}
interface RawRoster { source: string; importedAt: string; total: number; characters: RawCharacter[] }

export type EdgeKind = 'parent' | 'spouse' | 'sibling' | 'lineage';
const RAW: Record<string, RawRoster> = { naruto: naruto as RawRoster };

export const slugName = (name: string) => name.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

/** What "X (Relation)" listed on a character's family box means, as an edge from the listed person to the character. */
function interpret(relation: string): { kind: EdgeKind; listedIsA: boolean; generations?: number } | null {
  const r = relation.toLowerCase().replace(/\b(adoptive|step|half|foster|biological|paternal|maternal|older|younger|elder|eldest|youngest|twin|former|ex-|late|distant|great-great)\b-?\s*/g, '$1 ').trim();
  const has = (...words: string[]) => words.some(word => new RegExp(`\\b${word}\\b`).test(r));
  if (has('great-grandfather', 'great-grandmother', 'great grandfather', 'great grandmother')) return { kind: 'lineage', listedIsA: true, generations: 3 };
  if (has('great-grandson', 'great-granddaughter', 'great grandson', 'great granddaughter')) return { kind: 'lineage', listedIsA: false, generations: 3 };
  if (has('grandfather', 'grandmother', 'grandparent')) return { kind: 'lineage', listedIsA: true, generations: 2 };
  if (has('grandson', 'granddaughter', 'grandchild')) return { kind: 'lineage', listedIsA: false, generations: 2 };
  if (has('father', 'mother', 'parent') && !has('in-law')) return { kind: 'parent', listedIsA: true };
  if (has('son', 'daughter', 'child') && !has('in-law', 'grandson', 'granddaughter')) return { kind: 'parent', listedIsA: false };
  if (has('brother', 'sister', 'sibling') && !has('in-law')) return { kind: 'sibling', listedIsA: true };
  if (has('husband', 'wife', 'spouse', 'partner') && !has('in-law')) return { kind: 'spouse', listedIsA: true };
  return null;
}

export interface RosterNode {
  id: string; name: string; clan: number[]; status?: string; affiliation: string[]; kekkei: string[];
  /** Curated encyclopedia entry, when there is one. */
  profile?: { slug: string; role: string; overview: string };
  /** Relations that are not structural (uncle, cousin, in-law…), as text. */
  other: Array<{ id: string; name: string; relation: string }>;
}

export function getRoster(seriesSlug: string) {
  const raw = RAW[seriesSlug];
  if (!raw) return null;
  const registry = getRegistry();
  const series = registry.seriesBySlug.get(seriesSlug)!;
  const clans = new Map<string, number>();
  const nodes = new Map<string, RosterNode>();
  const clanIndex = (name: string) => { if (!clans.has(name)) clans.set(name, clans.size); return clans.get(name)!; };
  const ensure = (id: string, name: string): RosterNode => {
    let node = nodes.get(id);
    if (!node) { node = { id, name, clan: [], affiliation: [], kekkei: [], other: [] }; nodes.set(id, node); }
    return node;
  };
  for (const item of raw.characters) {
    const node = ensure(item.id, item.name);
    node.clan = item.clan.map(clanIndex); node.status = item.status; node.affiliation = item.affiliation; node.kekkei = item.kekkei;
  }
  const edges = new Map<string, [string, string, EdgeKind, number?]>();
  const addEdge = (a: string, b: string, kind: EdgeKind, generations?: number) => {
    if (a === b) return;
    const key = kind === 'parent' || kind === 'lineage' ? `${kind}|${a}|${b}` : `${kind}|${[a, b].sort().join('|')}`;
    if (!edges.has(key)) edges.set(key, [a, b, kind, generations]);
  };
  for (const item of raw.characters) {
    for (const f of item.family) {
      const other = ensure(f.id, f.name);
      const meaning = interpret(f.relation);
      if (!meaning) { nodes.get(item.id)!.other.push({ id: f.id, name: f.name, relation: f.relation }); continue; }
      const [a, b] = meaning.listedIsA ? [f.id, item.id] : [item.id, f.id];
      addEdge(a, b, meaning.kind, meaning.generations);
      void other;
    }
  }
  // Curated profiles and spoiler-gated ties.
  const byName = new Map(series.cast.map(member => [slugName(member.name), member]));
  const profiles = new Map(registry.profiles.map(profile => [profile.slug, profile]));
  for (const node of nodes.values()) {
    const member = byName.get(node.id);
    const profile = member?.profile ? profiles.get(member.profile) : undefined;
    if (profile) node.profile = { slug: profile.slug, role: profile.role, overview: profile.overview };
  }
  const castName = new Map(series.cast.map(member => [member.id, slugName(member.name)]));
  const locked: Record<string, number> = {};
  for (const rel of series.relationships) {
    const idx = checkpointIndex(series, rel.spoiler);
    if (idx < 0) continue;
    const a = castName.get(rel.a); const b = castName.get(rel.b);
    if (a && b) locked[[a, b].sort().join('|')] = idx;
  }
  // Only keep nodes that matter: everything in the roster, plus relatives named in a family box.
  const list = [...nodes.values()].sort((a, b) => a.name.localeCompare(b.name));
  return {
    source: raw.source, importedAt: raw.importedAt,
    clans: [...clans.keys()],
    nodes: list, edges: [...edges.values()], locked,
    rosterTotal: raw.total,
  };
}

/** Compact JSON for the client: arrays instead of objects for the bulk. */
export function compactRoster(seriesSlug: string) {
  const roster = getRoster(seriesSlug);
  if (!roster) return null;
  const counts = new Array(roster.clans.length).fill(0);
  roster.nodes.forEach(node => node.clan.forEach(index => counts[index]++));
  return {
    importedAt: roster.importedAt, source: roster.source, total: roster.rosterTotal,
    clans: roster.clans.map((name, index) => ({ name, count: counts[index] })),
    n: roster.nodes.map(node => [node.id, node.name, node.clan, node.status || '', node.affiliation, node.kekkei, node.other.map(o => [o.id, o.name, o.relation]), node.profile ? [node.profile.slug, node.profile.role, node.profile.overview] : 0]),
    e: roster.edges, locked: roster.locked,
  };
}

export function rosterStats(seriesSlug: string) {
  const roster = getRoster(seriesSlug);
  if (!roster) return null;
  const connected = new Set(roster.edges.flatMap(edge => [edge[0], edge[1]]));
  return { characters: roster.nodes.length, rosterTotal: roster.rosterTotal, clans: roster.clans.length, connected: connected.size, ties: roster.edges.length };
}
