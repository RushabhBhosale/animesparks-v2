// Family-tree helpers: group the curated family ties into connected families.

import type { CastMember, Relationship } from './types.ts';

const castById = (cast: CastMember[]) => new Map(cast.map(member => [member.id, member]));

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
