// Deterministic layouts computed at build time, so the diagrams are real SVG
// in the HTML and need no layout library in the browser.

import type { CastMember, Relationship } from './types.ts';

export interface GraphNode { id: string; name: string; profile?: string; x: number; y: number; focus: boolean }
export interface GraphEdge { relationship: Relationship; from: GraphNode; to: GraphNode }
export interface Graph { width: number; height: number; nodes: GraphNode[]; edges: GraphEdge[] }

const castById = (cast: CastMember[]) => new Map(cast.map(member => [member.id, member]));

/** Ego graph: the focus character in the centre, direct connections around them. */
export function egoGraph(focusId: string, cast: CastMember[], relationships: Relationship[], limit = 12): Graph {
  const byId = castById(cast);
  const edges = relationships.filter(item => item.a === focusId || item.b === focusId);
  const others = [...new Set(edges.map(item => (item.a === focusId ? item.b : item.a)))].filter(id => byId.has(id));
  // Linked profiles first, then by number of connections shown.
  const weight = (id: string) => (byId.get(id)?.profile ? 100 : 0) + edges.filter(item => item.a === id || item.b === id).length;
  const picked = others.sort((a, b) => weight(b) - weight(a) || a.localeCompare(b)).slice(0, limit);
  const width = 760;
  const height = picked.length > 8 ? 600 : 440;
  const cx = width / 2;
  const cy = height / 2;
  const radiusX = width / 2 - 92;
  const radiusY = height / 2 - 46;
  const nodes: GraphNode[] = [{ id: focusId, name: byId.get(focusId)?.name || focusId, profile: byId.get(focusId)?.profile, x: cx, y: cy, focus: true }];
  picked.forEach((id, index) => {
    const angle = -Math.PI / 2 + (index / picked.length) * Math.PI * 2;
    nodes.push({ id, name: byId.get(id)!.name, profile: byId.get(id)!.profile, x: round(cx + radiusX * Math.cos(angle)), y: round(cy + radiusY * Math.sin(angle)), focus: false });
  });
  return finish(width, height, nodes, edges.filter(item => picked.includes(item.a === focusId ? item.b : item.a)));
}

/** Whole-cast graph on a ring; used on series hubs. Only characters with at least one connection appear. */
export function castGraph(cast: CastMember[], relationships: Relationship[]): Graph {
  const connected = new Set(relationships.flatMap(item => [item.a, item.b]));
  const members = cast.filter(member => connected.has(member.id));
  // Profiles sit together at the top so the linked cast is easy to find.
  members.sort((a, b) => Number(Boolean(b.profile)) - Number(Boolean(a.profile)) || a.name.localeCompare(b.name));
  // Enough circumference that 128px-wide labels never overlap.
  const radiusX = Math.max(300, (members.length * 156) / (Math.PI * 2));
  const radiusY = radiusX * 0.8;
  const width = Math.round(radiusX * 2 + 200);
  const height = Math.round(radiusY * 2 + 90);
  const cx = width / 2;
  const cy = height / 2;
  const nodes = members.map((member, index): GraphNode => {
    const angle = -Math.PI / 2 + (index / members.length) * Math.PI * 2;
    return { id: member.id, name: member.name, profile: member.profile, x: round(cx + radiusX * Math.cos(angle)), y: round(cy + radiusY * Math.sin(angle)), focus: false };
  });
  return finish(width, height, nodes, relationships);
}

function finish(width: number, height: number, nodes: GraphNode[], relationships: Relationship[]): Graph {
  const byId = new Map(nodes.map(node => [node.id, node]));
  const edges = relationships.flatMap(relationship => {
    const from = byId.get(relationship.a);
    const to = byId.get(relationship.b);
    return from && to ? [{ relationship, from, to }] : [];
  });
  return { width, height, nodes, edges };
}

const round = (value: number) => Math.round(value * 10) / 10;

// ── Family tree ──────────────────────────────────────────────────────────

export interface TreeNode { id: string; name: string; profile?: string; generation: number; x: number; y: number; focus: boolean }
export interface TreeLink { kind: 'parent' | 'lineage' | 'spouse' | 'sibling' | 'other'; from: TreeNode; to: TreeNode; relationship: Relationship }
export interface FamilyTree { width: number; height: number; nodes: TreeNode[]; links: TreeLink[]; generations: number }

const PARENTS = new Set(['parent', 'adoptive-parent', 'guardian']);

/**
 * Layered family tree around `focusId`. Generations come from parent edges
 * (parent = one level up). Spouses and siblings share a level. Returns null
 * when the character has fewer than two family connections.
 */
export function familyTree(focusId: string, cast: CastMember[], relationships: Relationship[], options: { highlight?: boolean; minEdges?: number } = {}): FamilyTree | null {
  const { highlight = true, minEdges = 2 } = options;
  const family = relationships.filter(item => item.type === 'family' && item.kin);
  const byId = castById(cast);
  // Connected component of family edges around the focus.
  const members = new Set([focusId]);
  let grew = true;
  while (grew) {
    grew = false;
    for (const item of family) {
      if (members.has(item.a) !== members.has(item.b)) { members.add(item.a); members.add(item.b); grew = true; }
    }
  }
  const edges = family.filter(item => members.has(item.a) && members.has(item.b));
  if (edges.length < minEdges) return null;

  // Assign levels: parent edges fix the difference, others copy the level.
  const level = new Map<string, number>([[focusId, 0]]);
  for (let pass = 0; pass < members.size + 2; pass++) {
    for (const item of edges) {
      const delta = PARENTS.has(item.kin!) ? 1 : item.kin === 'ancestor' ? item.generations ?? 2 : 0;
      if (level.has(item.b) && !level.has(item.a)) level.set(item.a, level.get(item.b)! - delta);
      else if (level.has(item.a) && !level.has(item.b)) level.set(item.b, level.get(item.a)! + delta);
    }
  }
  const ids = [...members].filter(id => level.has(id) && byId.has(id));
  const minLevel = Math.min(...ids.map(id => level.get(id)!));
  const maxLevel = Math.max(...ids.map(id => level.get(id)!));
  const rows = new Map<number, string[]>();
  for (const id of ids) {
    const generation = level.get(id)! - minLevel;
    rows.set(generation, [...(rows.get(generation) || []), id]);
  }
  // Keep partners adjacent and the focus near the middle of its row.
  const widest = Math.max(...[...rows.values()].map(row => row.length));
  const columnWidth = 168;
  const rowHeight = 112;
  const width = Math.max(520, widest * columnWidth + 40);
  const height = (maxLevel - minLevel + 1) * rowHeight + 40;
  const nodes: TreeNode[] = [];
  for (const [generation, row] of rows) {
    const ordered = row.sort((a, b) => spouseKey(a, edges) - spouseKey(b, edges) || a.localeCompare(b));
    ordered.forEach((id, index) => {
      const x = (width - (ordered.length - 1) * columnWidth) / 2 + index * columnWidth;
      nodes.push({ id, name: byId.get(id)!.name, profile: byId.get(id)!.profile, generation, x: round(x), y: 44 + generation * rowHeight, focus: highlight && id === focusId });
    });
  }
  const nodeById = new Map(nodes.map(node => [node.id, node]));
  const links = edges.flatMap((relationship): TreeLink[] => {
    const a = nodeById.get(relationship.a);
    const b = nodeById.get(relationship.b);
    if (!a || !b) return [];
    const kind = PARENTS.has(relationship.kin!) ? 'parent' : relationship.kin === 'ancestor' ? 'lineage' : relationship.kin === 'spouse' ? 'spouse' : relationship.kin === 'sibling' ? 'sibling' : 'other';
    return [{ kind, from: a, to: b, relationship }];
  });
  return { width, height, nodes, links, generations: maxLevel - minLevel + 1 };
}

function spouseKey(id: string, edges: Relationship[]): number {
  // Spouses sort next to each other by sharing the smaller id's rank.
  const partner = edges.find(item => item.kin === 'spouse' && (item.a === id || item.b === id));
  return partner ? Math.min(hash(partner.a), hash(partner.b)) : hash(id);
}
const hash = (value: string) => [...value].reduce((total, char) => (total * 31 + char.charCodeAt(0)) % 100000, 7);

/**
 * Every family in the series: one tree per connected group of family
 * relationships, including characters who have no profile. Largest first.
 */
export function familyForest(cast: CastMember[], relationships: Relationship[]): FamilyTree[] {
  const family = relationships.filter(item => item.type === 'family' && item.kin);
  const seen = new Set<string>();
  const trees: FamilyTree[] = [];
  for (const item of family) {
    if (seen.has(item.a)) continue;
    const tree = familyTree(item.a, cast, family, { highlight: false, minEdges: 1 });
    if (!tree) continue;
    tree.nodes.forEach(node => seen.add(node.id));
    trees.push(tree);
  }
  return trees.sort((a, b) => b.nodes.length - a.nodes.length);
}
