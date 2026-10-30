// Series-wide roster: every character recorded for a series (names, clan,
// status, affiliation, family links), merged with the curated encyclopedia.
// Built at prerender time into one compact JSON asset that the "complete
// family tree" page loads lazily. Nothing here runs per request.

import naruto from '../../../data/characters/rosters/naruto.json' with { type: 'json' };
import { getRegistry } from './registry.ts';
import { checkpointIndex } from './format.ts';

interface RawCharacter {
  id: string; name: string; clan: string[]; status?: string; affiliation: string[]; kekkei: string[];
  family: Array<{ id: string; name: string; relation: string }>;
  team?: string[]; rank?: string[]; species?: string; classes?: string[];
}
interface RawRoster { source: string; importedAt: string; total: number; characters: RawCharacter[] }

export type EdgeKind = 'parent' | 'spouse' | 'sibling' | 'lineage';
/** How a parent or sibling tie came about, when it is not by birth. */
export type EdgeFlag = 'adoptive' | 'created';
export type RosterEdge = [string, string, EdgeKind, number?, EdgeFlag?];
const RAW: Record<string, RawRoster> = { naruto: naruto as RawRoster };

/** Clan founders, sourced from each clan's Narutopedia article: [clan, ancestor, spoiler checkpoint]. */
const BLOODLINES: Record<string, Array<[string, string, string]>> = {
  naruto: [['Uchiha', 'indra-otsutsuki', 'finale'], ['Senju', 'asura-otsutsuki', 'finale'], ['Uzumaki', 'asura-otsutsuki', 'finale'], ['Hyūga', 'hamura-otsutsuki', 'finale']],
};

// The wiki's family boxes name some people differently from their own pages.
const ALIASES: Record<string, Record<string, string>> = {
  naruto: { 'hinata-uzumaki': 'hinata-hyuga', 'sakura-uchiha': 'sakura-haruno', 'temari-nara': 'temari', 'karui-akimichi': 'karui', 'sai-yamanaka': 'sai', 'fire-daimyo': 'fire-daimyo-part-i-ii', enma: 'monkey-king-enma', 'yuki': 'yuki-hawk', 'ashura-otsutsuki': 'asura-otsutsuki' },
};
const resolveRelative = (series: string, ownerId: string, id: string, relation: string) => {
  if (series === 'naruto' && id === 'a') return /son|brother|cousin/i.test(relation) ? 'a-fourth-raikage' : 'a-third-raikage';
  if (series === 'naruto' && ownerId === 'aoi-game' && id === 'tsubaki') return 'tsubaki-game';
  if (series === 'naruto' && ownerId === 'tsubaki-game' && id === 'aoi') return 'aoi-game';
  return ALIASES[series]?.[id] ?? id;
};

export const slugName = (name: string) => name.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

// Boxes list some relatives as "Tenji (Lover)" under the relation "Anime only".
function readRelative(entry: { id: string; name: string; relation: string }, known: Set<string>) {
  const split = /\bonly$/i.test(entry.relation) && !known.has(entry.id) ? entry.name.match(/^(.*?)\s*\(([^()]+)\)$/) : null;
  return split ? { id: slugName(split[1]), name: split[1], relation: split[2] } : entry;
}

/** What "X (Relation)" listed on a character's family box means, as an edge from the listed person to the character. */
function interpret(relation: string): { kind: EdgeKind; listedIsA: boolean; generations?: number; flag?: EdgeFlag } | null {
  const r = relation.toLowerCase();
  const has = (...words: string[]) => words.some(word => new RegExp(`\\b${word}\\b`).test(r));
  if (has('creator', 'progenitor', 'genetic template', 'genetic source')) return { kind: 'parent', listedIsA: true, flag: 'created' };
  if (has('creation', 'creations', 'clone', 'altered clone')) return { kind: 'parent', listedIsA: false, flag: 'created' };
  if (has('ramet')) return { kind: 'sibling', listedIsA: true, flag: 'created' };
  const flag: EdgeFlag | undefined = /adoptive|foster|step/.test(r) ? 'adoptive' : undefined;
  if (has('in-law', 'godfather', 'godson', 'godmother', 'cousin', 'uncle', 'aunt', 'nephew', 'niece', 'granduncle', 'grandnephew', 'grandniece')) return null;
  if (r.includes('great-great')) return { kind: 'lineage', listedIsA: r.includes('father') || r.includes('mother'), generations: 4, flag };
  if (has('great-grandfather', 'great-grandmother', 'great grandfather', 'great grandmother')) return { kind: 'lineage', listedIsA: true, generations: 3, flag };
  if (has('great-grandson', 'great-granddaughter', 'great grandson', 'great granddaughter')) return { kind: 'lineage', listedIsA: false, generations: 3, flag };
  if (has('grandfather', 'grandmother', 'grandparent', 'ancestor')) return { kind: 'lineage', listedIsA: true, generations: 2, flag };
  if (has('grandson', 'granddaughter', 'grandchild', 'descendant')) return { kind: 'lineage', listedIsA: false, generations: 2, flag };
  if (/father|mother|parent/.test(r)) return { kind: 'parent', listedIsA: true, flag };
  if (/(\b|-|step)(son|daughter|child)\b/.test(r)) return { kind: 'parent', listedIsA: false, flag };
  if (has('brother', 'sister', 'sibling')) return { kind: 'sibling', listedIsA: true, flag };
  if (has('husband', 'wife', 'spouse', 'partner', 'lover') || /fianc/.test(r)) return { kind: 'spouse', listedIsA: true };
  return null;
}
const isMale = (relation: string) => /\b(father|husband|brother|son|grandfather|grandson|great-grandfather|great-grandson)\b|fiancé$/i.test(relation) && !/in-law/i.test(relation);

export interface RosterNode {
  id: string; name: string; clan: number[]; status?: string; affiliation: string[]; kekkei: string[];
  /** Curated encyclopedia entry, when there is one. */
  profile?: { slug: string; role: string; overview: string };
  /** Relations that are not structural (uncle, cousin, in-law…), as text. */
  other: Array<{ id: string; name: string; relation: string }>;
  team: string[]; rank: string[]; species: string; classes: string[];
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
    if (!node) { node = { id, name, clan: [], affiliation: [], kekkei: [], other: [], team: [], rank: [], species: '', classes: [] }; nodes.set(id, node); }
    return node;
  };
  for (const item of raw.characters) {
    const node = ensure(item.id, item.name);
    node.clan = item.clan.map(clanIndex); node.status = item.status; node.affiliation = item.affiliation; node.kekkei = item.kekkei;
    node.team = item.team ?? []; node.rank = item.rank ?? []; node.species = item.species ?? ''; node.classes = item.classes ?? [];
  }
  const edges = new Map<string, RosterEdge>();
  const addEdge = (a: string, b: string, kind: EdgeKind, generations?: number, flag?: EdgeFlag) => {
    if (a === b) return;
    const key = kind === 'parent' || kind === 'lineage' ? `${kind}|${a}|${b}` : `${kind}|${[a, b].sort().join('|')}`;
    const existing = edges.get(key);
    // A tie by birth outranks the same pair listed as adoptive.
    if (!existing || (existing[4] && !flag)) edges.set(key, [a, b, kind, generations, flag]);
  };
  const male = new Set<string>();
  const known = new Set(raw.characters.map(item => item.id));
  for (const item of raw.characters) {
    for (const entry of item.family) {
      const read = readRelative(entry, known);
      const f = { ...read, id: resolveRelative(seriesSlug, item.id, read.id, read.relation) };
      if (f.id === 'tailed-beasts') continue;
      ensure(f.id, f.name);
      if (isMale(f.relation)) male.add(f.id);
      const meaning = interpret(f.relation);
      if (!meaning) { nodes.get(item.id)!.other.push({ id: f.id, name: nodes.get(f.id)!.name, relation: f.relation }); continue; }
      const [a, b] = meaning.listedIsA ? [f.id, item.id] : [item.id, f.id];
      addEdge(a, b, meaning.kind, meaning.generations, meaning.flag);
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
  const castName = new Map(series.cast.map(member => [member.id, ALIASES[seriesSlug]?.[slugName(member.name)] ?? slugName(member.name)]));
  const locked: Record<string, number> = {};
  // Someone whose every curated tie is a spoiler stays out of every family until the first one unlocks.
  const personTies = new Map<string, number[]>();
  for (const rel of series.relationships) {
    const idx = checkpointIndex(series, rel.spoiler);
    const a = castName.get(rel.a); const b = castName.get(rel.b);
    if (!a || !b) continue;
    if (idx >= 0) locked[[a, b].sort().join('|')] = idx;
    if (rel.type !== 'family') continue;
    for (const id of [a, b]) personTies.set(id, [...(personTies.get(id) || []), idx]);
  }
  const personLock: Record<string, number> = {};
  for (const [id, ties] of personTies) if (ties.every(idx => idx >= 0)) personLock[id] = Math.min(...ties);
  const bloodlines = (BLOODLINES[seriesSlug] || []).map(([clan, id, spoiler]) => [clan, id, checkpointIndex(series, spoiler)] as [string, string, number]);
  // Only keep nodes that matter: everything in the roster, plus relatives named in a family box.
  const list = [...nodes.values()].sort((a, b) => a.name.localeCompare(b.name));
  return {
    source: raw.source, importedAt: raw.importedAt,
    clans: [...clans.keys()],
    nodes: list, edges: [...edges.values()], locked, personLock, bloodlines, male: [...male],
    checkpoints: series.checkpoints.length, rosterTotal: raw.total,
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
    n: roster.nodes.map(node => [node.id, node.name, node.clan, node.status || '', node.affiliation, node.kekkei, node.other.map(o => [o.id, o.name, o.relation]), node.profile ? [node.profile.slug, node.profile.role, node.profile.overview] : 0, node.team, node.rank, node.species, node.classes]),
    e: roster.edges, locked: roster.locked, personLock: roster.personLock, bloodlines: roster.bloodlines, male: roster.male, checkpoints: roster.checkpoints,
  };
}

export function rosterStats(seriesSlug: string) {
  const roster = getRoster(seriesSlug);
  if (!roster) return null;
  const connected = new Set(roster.edges.flatMap(edge => [edge[0], edge[1]]));
  return { characters: roster.nodes.length, rosterTotal: roster.rosterTotal, clans: roster.clans.length, connected: connected.size, ties: roster.edges.length };
}
