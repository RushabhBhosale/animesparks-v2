// What the tree says, in words: the biggest families, who their parents and
// children are, and who is notable in each. Built from the same chart the
// diagram draws, so the two always agree. The diagram already holds every
// name; this is the short, readable layer for people and search engines.

import type { Box, Chart } from './family-chart.ts';

export interface IndexPerson { id: string; name: string; profile?: string }
export interface FamilyUnit { parents: IndexPerson[]; children: IndexPerson[]; adopted: IndexPerson[] }
export interface Family { id: string; label: string; members: number; withTies: number; units: FamilyUnit[]; notable: IndexPerson[] }
export interface FamilyIndex {
  families: Family[];
  /** Homes and lands the cast is filed under, largest first. */
  places: Array<{ label: string; count: number }>;
  people: number;
  groups: number;
  largest: Array<{ label: string; count: number }>;
}

const LABELS = new Set(['branch', 'clan', 'team']);
const NOT_A_GROUP = /^(?:Other lands and groups|No recorded home|Everyone else)$/;
// Wiki placeholders ("Unnamed Kuchiki", "Miscellaneous Shinigami", "Hinata's Mother") are not worth naming in a sentence.
const PLACEHOLDER = /\b(?:unnamed|miscellaneous|unidentified|unknown)\b|['’]s\s/i;

export function buildFamilyIndex(chart: Chart, options: { families?: number; units?: number; notable?: number } = {}): FamilyIndex {
  const { families: limit = 10, units: unitLimit = 3, notable: notableLimit = 6 } = options;
  const byId = new Map(chart.boxes.map(box => [box.id, box]));
  const partners = new Set(chart.lines.filter(line => line.kind === 'partner').map(line => line.to));
  const person = (box: Box): IndexPerson => ({ id: box.id, name: box.label, profile: box.profile });
  const named = (boxes: Box[] | undefined) => (boxes ?? []).filter(box => !PLACEHOLDER.test(box.label));

  // Who is a child of whom, and who is whose partner, straight from the layout. A creation or a
  // distant descendant is not a child, so only birth and adoptive lines make a parent.
  const via = new Map<string, string>();
  for (const line of chart.lines) if (line.kind !== 'partner' && !via.has(line.to)) via.set(line.to, line.kind);
  const children = new Map<string, Box[]>(); const adopted = new Map<string, Box[]>(); const spouses = new Map<string, Box[]>();
  for (const box of chart.boxes) {
    if (box.kind !== 'person' || !box.parent) continue;
    const parent = byId.get(box.parent);
    if (parent?.kind !== 'person') continue;
    const how = partners.has(box.id) ? 'partner' : via.get(box.id) ?? 'blood';
    const table = how === 'partner' ? spouses : how === 'adoptive' ? adopted : how === 'blood' ? children : undefined;
    if (table) table.set(parent.id, [...(table.get(parent.id) ?? []), box]);
  }
  const kids = (id: string) => (children.get(id)?.length ?? 0) + (adopted.get(id)?.length ?? 0);
  const degree = (box: Box) => kids(box.id) + (spouses.get(box.id)?.length ?? 0) + (box.parent && byId.get(box.parent)?.kind === 'person' && via.get(box.id) !== 'created' && via.get(box.id) !== 'lineage' ? 1 : 0);

  const groupOf = (box: Box) => { for (let up = box.parent ? byId.get(box.parent) : undefined; up; up = up.parent ? byId.get(up.parent) : undefined) if (LABELS.has(up.kind)) return up; return undefined; };
  const members = new Map<string, Box[]>(); const groups = new Map<string, Box>();
  for (const box of chart.boxes) {
    if (box.kind !== 'person') continue;
    const group = groupOf(box);
    if (!group) continue;
    groups.set(group.id, group);
    members.set(group.id, [...(members.get(group.id) ?? []), box]);
  }

  const built: Family[] = [];
  for (const [id, list] of members) {
    const group = groups.get(id)!;
    if (NOT_A_GROUP.test(group.label)) continue;
    const withTies = list.filter(box => degree(box) > 0).length;
    const hosts = list.filter(box => kids(box.id) > 0)
      .sort((a, b) => kids(b.id) - kids(a.id) || a.label.localeCompare(b.label));
    built.push({
      id, label: group.label, members: list.length, withTies,
      units: hosts.filter(host => !PLACEHOLDER.test(host.label)).map(host => ({ parents: [person(host), ...named(spouses.get(host.id)).map(person)], children: named(children.get(host.id)).slice(0, 8).map(person), adopted: named(adopted.get(host.id)).slice(0, 4).map(person) })).filter(unit => unit.children.length + unit.adopted.length > 0).slice(0, unitLimit),
      notable: named(list).filter(box => degree(box) > 0).sort((a, b) => Number(Boolean(b.profile)) - Number(Boolean(a.profile)) || degree(b) - degree(a) || a.label.localeCompare(b.label)).slice(0, notableLimit).map(person),
    });
  }
  // Families are the clan and family-name groups; homes, teams and ranks are not families.
  const families = built.filter(family => family.id.startsWith('c:') && family.withTies >= 4 && family.units.length > 0)
    .sort((a, b) => b.withTies - a.withTies || b.members - a.members || a.label.localeCompare(b.label)).slice(0, limit);
  const places = [...groups.values()].filter(group => group.id.startsWith('g:') && !NOT_A_GROUP.test(group.label))
    .map(group => ({ label: group.label, count: members.get(group.id)?.length ?? 0 })).sort((a, b) => b.count - a.count).slice(0, 8);
  const largest = built.sort((a, b) => b.members - a.members).slice(0, 5).map(family => ({ label: family.label, count: family.members }));
  return { families, places, people: chart.people, groups: groups.size, largest };
}
