// The tree as plain, crawlable text: every character listed under the group
// it hangs from, with the family tie that places them ("child of Fugaku
// Uchiha"). Built from the same chart the diagram draws, so the two always
// agree. Also the facts the page's FAQ states.

import type { Box, Chart } from './family-chart.ts';

export interface IndexPerson { id: string; name: string; profile?: string; note?: string }
export interface IndexGroup { id: string; label: string; people: IndexPerson[] }
export interface IndexBranch { id: string; label: string; count: number; groups: IndexGroup[] }
export interface FamilyIndex { branches: IndexBranch[]; people: number; groups: number; withRelatives: number; largest: Array<{ label: string; count: number }> }

const LABELS = new Set(['branch', 'clan', 'team']);
const HIDDEN_GROUPS = /^(?:Other lands and groups|No recorded home)$/;

export function buildFamilyIndex(chart: Chart): FamilyIndex {
  const byId = new Map(chart.boxes.map(box => [box.id, box]));
  const partners = new Set(chart.lines.filter(line => line.kind === 'partner').map(line => line.to));
  const via = new Map<string, string>();
  for (const line of chart.lines) if (line.kind !== 'partner' && !via.has(line.to)) via.set(line.to, line.kind);

  const nearest = (box: Box, wanted: (candidate: Box) => boolean) => {
    for (let up = box.parent ? byId.get(box.parent) : undefined; up; up = up.parent ? byId.get(up.parent) : undefined) if (wanted(up)) return up;
    return undefined;
  };
  const note = (box: Box): string | undefined => {
    const parent = box.parent ? byId.get(box.parent) : undefined;
    if (!parent || parent.kind !== 'person') return undefined;
    if (partners.has(box.id)) return `partner of ${parent.label}`;
    const how = via.get(box.id);
    if (how === 'adoptive') return `adopted child of ${parent.label}`;
    if (how === 'created') return `created by ${parent.label}`;
    if (how === 'lineage') return `descendant of ${parent.label}`;
    return `child of ${parent.label}`;
  };

  const branches = new Map<string, IndexBranch>();
  const groups = new Map<string, IndexGroup>();
  let withRelatives = 0;
  for (const box of chart.boxes) {
    if (box.kind !== 'person') continue;
    const group = nearest(box, candidate => LABELS.has(candidate.kind));
    if (!group) continue;
    const top = group.kind === 'branch' ? group : nearest(group, candidate => candidate.kind === 'branch') ?? group;
    if (!branches.has(top.id)) branches.set(top.id, { id: top.id, label: top.label, count: 0, groups: [] });
    if (!groups.has(group.id)) { const entry = { id: group.id, label: group.label, people: [] }; groups.set(group.id, entry); branches.get(top.id)!.groups.push(entry); }
    const text = note(box);
    if (text) withRelatives++;
    groups.get(group.id)!.people.push({ id: box.id, name: box.label, profile: box.profile, note: text });
    branches.get(top.id)!.count++;
  }
  const alphabetical = (a: { name: string }, b: { name: string }) => a.name.localeCompare(b.name);
  const ordered = [...branches.values()].sort((a, b) => b.count - a.count || a.label.localeCompare(b.label));
  for (const branch of ordered) {
    branch.groups.sort((a, b) => Number(HIDDEN_GROUPS.test(a.label)) - Number(HIDDEN_GROUPS.test(b.label)) || b.people.length - a.people.length || a.label.localeCompare(b.label));
    for (const group of branch.groups) group.people.sort(alphabetical);
  }
  const largest = [...groups.values()].filter(group => !HIDDEN_GROUPS.test(group.label)).sort((a, b) => b.people.length - a.people.length).slice(0, 5).map(group => ({ label: group.label, count: group.people.length }));
  return { branches: ordered, people: chart.people, groups: groups.size, withRelatives, largest };
}
