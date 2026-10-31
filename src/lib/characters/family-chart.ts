// One connected family chart for a whole series. Pure and deterministic: the
// page prerenders it, and the browser reruns it when a spoiler level changes.
// Real kinship is drawn between people. Everyone else hangs from a label for
// what they actually belong to (clan, team, rank, kind of creature), and those
// lines are drawn differently so they never read as family.

import type { ChartRules, RosterEdge } from './roster.ts';

export interface ChartData {
  clans: Array<{ name: string; count: number }>;
  n: unknown[][];
  e: RosterEdge[];
  locked: Record<string, number>;
  personLock: Record<string, number>;
  bloodlines: Array<[string, string, number]>;
  male: string[];
  rules: ChartRules;
  checkpoints: number;
}
export type BoxKind = 'person' | 'echo' | 'root' | 'branch' | 'clan' | 'team' | 'dot';
export interface Box { id: string; label: string; kind: BoxKind; x: number; y: number; w: number; h: number; parent?: string; profile?: string; target?: string; major?: boolean; bounds?: [number, number, number, number] }
export type LineKind = 'trunk' | 'branch' | 'blood' | 'adoptive' | 'created' | 'lineage' | 'partner' | 'cross';
export interface Line { d: string; kind: LineKind; to: string }
export interface Chart { width: number; height: number; boxes: Box[]; lines: Line[]; people: number }

interface Person { id: string; name: string; clans: string[]; affiliation: string[]; profile?: string; teams: string[]; ranks: string[]; species: string; classes: string[] }
type Via = 'blood' | 'adoptive' | 'created' | 'lineage';
interface Unit { id: string; host?: Person; partners: Person[]; echoes: Person[]; children: Unit[]; via: Via; extra: ClanBranch[] }
interface ClanBranch { name: string; id: string; kids: Unit[]; loose: Person[] }
interface Point { x: number; y: number; id: string; kind: LineKind; busY?: number }
interface Block { w: number; h: number; ax: number; draw(x: number, y: number, from?: Point): void }

const JUNCTION = '~';
const H = 34;
const GAP = 16;
const BRANCH_MIN = 12;
const SUB_BRANCH_MIN = 3;
const MAJOR_CLAN = 8;

const textWidth = (text: string, size: number) => text.length * size * 0.56;
const personWidth = (name: string) => Math.max(66, Math.ceil(textWidth(name, 13)) + 26);
const round = (value: number) => Math.round(value * 10) / 10;
const byName = (a: Person, b: Person) => a.name.localeCompare(b.name);

function readPeople(data: ChartData) {
  const people = new Map<string, Person>();
  for (const row of data.n) {
    const profile = row[7] as [string, string, string] | 0;
    people.set(row[0] as string, { id: row[0] as string, name: row[1] as string, clans: (row[2] as number[]).map(index => data.clans[index].name.replace(/'s$/, "'s clan")), affiliation: row[4] as string[], profile: profile ? profile[0] : undefined, teams: (row[8] as string[]) ?? [], ranks: (row[9] as string[]) ?? [], species: (row[10] as string) ?? '', classes: (row[11] as string[]) ?? [] });
  }
  return people;
}

/** The ties visible at a spoiler level. A tie stays hidden while either person, or the pair, is locked. */
export function visibleEdges(data: ChartData, level: number) {
  return data.e.filter(([a, b]) => Math.max(data.locked[[a, b].sort().join('|')] ?? -1, data.personLock[a] ?? -1, data.personLock[b] ?? -1) <= level);
}

export function buildChart(data: ChartData, level: number, title: string, options: { familiesOnly?: boolean } = {}): Chart {
  const people = readPeople(data);
  const { rules } = data;
  const notSurname = new Set(rules.notSurname);
  // "Xeno Goku", "EX Gogeta", "Future Bardock": alternate versions are not members of the family they are named after.
  const variant = /^(?:Xeno|EX|Future|Cloned?|Evil|Alternate|Time|Heroes?)$/;
  const preferHome = rules.preferHome ? new RegExp(rules.preferHome) : null;
  const male = new Set(data.male);
  const edges = visibleEdges(data, level);

  // ── 1. One tree parent per person ──
  const candidates = new Map<string, Array<{ id: string; rank: number; via: Via; generations: number }>>();
  const candidate = (child: string, id: string, rank: number, via: Via, generations = 1) => {
    if (!candidates.has(child)) candidates.set(child, []);
    candidates.get(child)!.push({ id, rank, via, generations });
  };
  for (const [a, b, kind, generations, flag] of edges) {
    if (kind === 'parent') candidate(b, a, flag === 'created' ? 3 : flag ? 1 : 0, flag === 'created' ? 'created' : flag ? 'adoptive' : 'blood');
    if (kind === 'lineage' && !flag) candidate(b, a, 2, 'lineage', generations ?? 2);
  }
  const parent = new Map<string, string>();
  const via = new Map<string, Via>();
  const climbsTo = (from: string, target: string) => { for (let id: string | undefined = from, n = 0; id && n < 40; id = parent.get(id), n++) if (id === target) return true; return false; };
  const setParent = (child: string, id: string, how: Via) => {
    if (id === child || climbsTo(id, child)) return false;
    parent.set(child, id); via.set(child, how); return true;
  };
  for (const child of [...candidates.keys()].sort()) {
    const options = candidates.get(child)!.sort((a, b) => a.rank - b.rank || a.generations - b.generations || Number(male.has(b.id)) - Number(male.has(a.id)) || a.id.localeCompare(b.id));
    options.some(option => setParent(child, option.id, option.via));
  }

  // ── 2. Siblings share a parent, or a bare junction when no parent is recorded ──
  const groups = new Map<string, string>();
  const find = (id: string): string => { const up = groups.get(id); if (!up || up === id) return id; const top = find(up); groups.set(id, top); return top; };
  for (const [a, b, kind] of edges) if (kind === 'sibling') groups.set(find(a), find(b));
  const sets = new Map<string, string[]>();
  for (const [a, b, kind] of edges) if (kind === 'sibling') for (const id of [a, b]) { const top = find(id); if (!sets.has(top)) sets.set(top, []); if (!sets.get(top)!.includes(id)) sets.get(top)!.push(id); }
  const junctions = new Set<string>();
  for (const members of sets.values()) {
    members.sort();
    const votes = new Map<string, number>();
    for (const id of members) if (parent.has(id)) votes.set(parent.get(id)!, (votes.get(parent.get(id)!) ?? 0) + 1);
    const best = [...votes].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))[0]?.[0];
    if (best) { const how = via.get(members.find(id => parent.get(id) === best)!)!; for (const id of members) if (!parent.has(id)) setParent(id, best, how); continue; }
    const junction = `${JUNCTION}${members[0]}`;
    junctions.add(junction);
    for (const id of members) setParent(id, junction, 'blood');
  }

  // ── 3. Partners share a box row; a partner with a family of their own shows as an echo ──
  const childCount = new Map<string, number>();
  for (const id of parent.values()) childCount.set(id, (childCount.get(id) ?? 0) + 1);
  const sharedChildren = (a: string, b: string) => [...candidates.values()].filter(list => list.some(item => item.id === a) && list.some(item => item.id === b)).length;
  const couples = edges.filter(edge => edge[2] === 'spouse' && people.has(edge[0]) && people.has(edge[1])).map(edge => ({ a: edge[0], b: edge[1], shared: sharedChildren(edge[0], edge[1]) })).sort((x, y) => y.shared - x.shared || x.a.localeCompare(y.a));
  const hostOf = new Map<string, string>();
  const partnersOf = new Map<string, string[]>();
  const echoesOf = new Map<string, string[]>();
  const crossPairs: Array<[string, string, LineKind]> = [];
  for (const { a, b } of couples) {
    const lead = (childCount.get(a) ?? 0) - (childCount.get(b) ?? 0);
    const preferA = (Math.abs(lead) >= 3 ? lead : 0) || Number(male.has(a)) - Number(male.has(b)) || Number(parent.has(a)) - Number(parent.has(b)) || (childCount.get(a) ?? 0) - (childCount.get(b) ?? 0);
    const [host, guest] = preferA >= 0 ? [a, b] : [b, a];
    if (hostOf.has(host) || parent.has(guest) || hostOf.has(guest) || partnersOf.has(guest)) {
      // Both already have a place: keep both, join them with an echo and a line.
      const [keeper, other] = hostOf.has(host) ? [guest, host] : [host, guest];
      if (hostOf.has(keeper)) { crossPairs.push([keeper, other, 'partner']); continue; }
      if (!echoesOf.has(keeper)) echoesOf.set(keeper, []);
      echoesOf.get(keeper)!.push(other);
      continue;
    }
    hostOf.set(guest, host);
    if (!partnersOf.has(host)) partnersOf.set(host, []);
    partnersOf.get(host)!.push(guest);
  }
  const unitHost = (id: string) => hostOf.get(id) ?? id;

  // ── 4. Units and their children ──
  const units = new Map<string, Unit>();
  const unitFor = (id: string): Unit => {
    let unit = units.get(id);
    if (!unit) {
      const host = people.get(id);
      unit = { id, host, partners: (partnersOf.get(id) || []).map(other => people.get(other)!).filter(Boolean), echoes: (echoesOf.get(id) || []).map(other => people.get(other)!).filter(Boolean), children: [], via: via.get(id) ?? 'blood', extra: [] };
      units.set(id, unit);
    }
    return unit;
  };
  for (const id of people.keys()) if (!hostOf.has(id)) unitFor(id);
  const attached = new Set<string>();
  const inSubtree = (unit: Unit, id: string, seen = new Set<string>()): boolean => { if (unit.id === id) return true; if (seen.has(unit.id)) return false; seen.add(unit.id); return unit.children.some(child => inSubtree(child, id, seen)); };
  for (const id of [...units.keys()].sort()) {
    const unit = units.get(id)!;
    const above = parent.get(id);
    if (!above) continue;
    const holder = unitFor(unitHost(above));
    if (inSubtree(unit, holder.id)) continue;
    holder.children.push(unit);
    attached.add(id);
  }
  // In a unit whose children are not all shared, children hang from the host alone and the other parent gets a line.
  const sharesAll = (unit: Unit, partner: string) => unit.children.every(child => candidates.get(child.id)?.some(item => item.id === partner));
  for (const unit of units.values()) for (const partner of [...unit.partners, ...unit.echoes]) {
    if (!sharesAll(unit, partner.id)) for (const child of unit.children) if (candidates.get(child.id)?.some(item => item.id === partner.id)) crossPairs.push([partner.id, child.id, 'cross']);
  }
  // A partner's own parent still needs to reach them.
  for (const [guest, host] of hostOf) if (parent.has(guest) && !attached.has(host)) crossPairs.push([parent.get(guest)!, guest, 'cross']);

  // Second parents, and adoptive ties that lost out to a birth family, are drawn as extra lines.
  const treeNeighbour = (a: string, b: string) => parent.get(a) === b || parent.get(b) === a || unitHost(a) === unitHost(b) || unitHost(parent.get(b) ?? '') === unitHost(a) || unitHost(parent.get(a) ?? '') === unitHost(b);
  const reachable = (from: string, to: string) => climbsTo(from, to);
  for (const [a, b, kind, , flag] of edges) {
    if (!people.has(a) || !people.has(b) || treeNeighbour(a, b)) continue;
    if (kind === 'parent' && flag !== 'created') crossPairs.push([a, b, 'cross']);
    if (kind === 'lineage' && !flag && !reachable(b, a)) crossPairs.push([a, b, 'cross']);
    if (kind === 'sibling' && !flag && parent.get(a) !== parent.get(b) && !(parent.get(a) && parent.get(a) === parent.get(parent.get(b) ?? ''))) crossPairs.push([a, b, 'cross']);
  }

  // ── 5. Branches: clan → village → series ──
  const home = (person: Person) => { const list = person.affiliation.filter(name => !rules.notHome.includes(name)); return (preferHome && list.find(name => preferHome.test(name))) ?? list[0] ?? ''; };
  const roots = [...units.values()].filter(unit => !attached.has(unit.id) && (unit.host || unit.children.length)).sort((a, b) => a.id.localeCompare(b.id));
  const members = (unit: Unit, seen = new Set<string>()): Person[] => {
    if (seen.has(unit.id)) return [];
    seen.add(unit.id);
    return [...(unit.host ? [unit.host] : []), ...unit.children.flatMap(child => members(child, seen))];
  };
  const mostCommon = (names: string[]) => { const count = new Map<string, number>(); names.filter(Boolean).forEach(name => count.set(name, (count.get(name) ?? 0) + 1)); return [...count].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))[0]?.[0] ?? ''; };

  const clanBranches = new Map<string, ClanBranch>();
  const clanBranch = (name: string) => { if (!clanBranches.has(name)) clanBranches.set(name, { name, id: `c:${name}`, kids: [], loose: [] }); return clanBranches.get(name)!; };
  const homeless: Array<[string, Unit | Person]> = [];
  // A family name shared by people with no clan on record is still a real thing they have in common.
  const surnameOf = (person: Person) => { const words = person.name.replace(/\(.*?\)/g, '').trim().split(/\s+/); if (variant.test(words[0] ?? '')) return '';
    const name = rules.surnameAt === 'first' ? words[0] : words[1]; return (rules.surnameAt === 'first' ? words.length >= 2 : words.length === 2) && /^\p{Lu}[\p{L}'’.-]{2,}$/u.test(name ?? '') && !notSurname.has(name) && !person.clans.length ? name : ''; };
  const surnames = new Map<string, number>();
  for (const person of people.values()) { const name = surnameOf(person); if (name) surnames.set(name, (surnames.get(name) ?? 0) + 1); }
  for (const unit of roots) {
    const everyone = members(unit);
    const solo = everyone.length === 1 && !unit.partners.length && !unit.echoes.length && !unit.children.length;
    if (solo && options.familiesOnly) continue;
    const clan = mostCommon(everyone.flatMap(person => person.clans)) || mostCommon(everyone.map(surnameOf).filter(name => (surnames.get(name) ?? 0) >= 2));
    if (clan) { if (solo) clanBranch(clan).loose.push(unit.host!); else clanBranch(clan).kids.push(unit); continue; }
    const place = mostCommon(everyone.map(home));
    homeless.push([place, solo ? unit.host! : unit]);
  }

  // Founding clans hang from their ancestor; the rest from the village most of their members call home.
  const rooted = new Set<string>();
  for (const [name, ancestor, lock] of data.bloodlines) {
    const holder = units.get(unitHost(ancestor));
    if (lock > level || !holder || !clanBranches.has(name) || !people.has(ancestor)) continue;
    holder.extra.push(clanBranch(name));
    rooted.add(name);
  }
  const sourceClans = new Set(data.bloodlines.map(([, ancestor]) => people.get(ancestor)?.clans[0] ?? ''));
  const places = new Map<string, { clans: ClanBranch[]; kids: Unit[]; loose: Person[]; size: number }>();
  const place = (name: string) => { if (!places.has(name)) places.set(name, { clans: [], kids: [], loose: [], size: 0 }); return places.get(name)!; };
  const standalone: ClanBranch[] = [];
  for (const branch of clanBranches.values()) {
    if (rooted.has(branch.name)) continue;
    if (sourceClans.has(branch.name)) { standalone.push(branch); continue; }
    const everyone = [...branch.loose, ...branch.kids.flatMap(unit => members(unit))];
    const name = rules.clanHomes?.[branch.name] ?? mostCommon(everyone.map(home));
    place(name).clans.push(branch);
    place(name).size += everyone.length;
  }
  for (const [name, item] of homeless) {
    const bucket = place(name);
    if ('children' in item) { bucket.kids.push(item); bucket.size += members(item).length; } else { bucket.loose.push(item); bucket.size += 1; }
  }

  // ── 6. Layout ──
  const boxes: Box[] = [];
  const lines: Line[] = [];
  const placed = new Map<string, Box>();
  const addBox = (box: Box) => { box.x = round(box.x); box.y = round(box.y); boxes.push(box); if (box.kind !== 'echo') placed.set(box.id, box); return box; };
  const link = (from: Point | undefined, toX: number, toY: number, to: string, kind?: LineKind) => {
    if (!from) return;
    const busY = from.busY ?? from.y + (toY - from.y) / 2;
    lines.push({ d: `M${round(from.x)},${round(from.y)}V${round(busY)}H${round(toX)}V${round(toY)}`, kind: kind ?? from.kind, to });
  };

  const row = (blocks: Block[], below = 20): Block => {
    const gap = GAP + 8;
    const w = blocks.reduce((total, block) => total + block.w, 0) + gap * (blocks.length - 1);
    const anchors: number[] = [];
    blocks.reduce((left, block) => { anchors.push(left + block.ax); return left + block.w + gap; }, 0);
    const ax = (anchors[0] + anchors[anchors.length - 1]) / 2;
    return { w, h: below + Math.max(...blocks.map(block => block.h)), ax, draw(x, y, from) {
      let left = x;
      for (const block of blocks) { block.draw(left, y + below, from && { ...from, busY: y }); left += block.w + gap; }
    } };
  };
  // A central trunk. Each side fills its own shelves, tallest first, so neither side waits for the other.
  const tiers = (blocks: Block[], maxWidth: number): Block => {
    const channel = 56; const half = maxWidth / 2; const gap = GAP + 8; const shelfGap = 66;
    interface Shelf { blocks: Block[]; w: number; h: number; y: number }
    const sides: [Shelf[], Shelf[]] = [[], []];
    const depth = (side: Shelf[]) => { const last = side[side.length - 1]; return last ? last.y + last.h + shelfGap : 0; };
    for (const block of [...blocks].sort((a, b) => b.h - a.h)) {
      const side = sides[depth(sides[0]) <= depth(sides[1]) ? 0 : 1];
      const open = sides.flat().filter(shelf => shelf.w + block.w <= half && block.h <= shelf.h).sort((a, b) => a.y - b.y)[0];
      if (open) { open.blocks.push(block); open.w += block.w + gap; continue; }
      side.push({ blocks: [block], w: block.w + gap, h: block.h, y: depth(side) });
    }
    const maxLeft = Math.max(0, ...sides[0].map(shelf => shelf.w));
    const maxRight = Math.max(0, ...sides[1].map(shelf => shelf.w));
    const ax = maxLeft + channel / 2;
    const h = Math.max(depth(sides[0]), depth(sides[1])) - shelfGap + 26;
    return { w: maxLeft + channel + maxRight, h, ax, draw(x, y, from) {
      const trunk = x + ax;
      sides.forEach((side, index) => {
        for (const shelf of side) {
          const branch = from && { ...from, x: trunk, busY: y + shelf.y };
          let edge = index === 0 ? trunk - channel / 2 : trunk + channel / 2;
          for (const block of shelf.blocks) {
            if (index === 0) edge -= block.w;
            block.draw(edge, y + shelf.y + 26, branch);
            edge += index === 0 ? -gap : block.w + gap;
          }
        }
      });
    } };
  };
  const arrange = (blocks: Block[], limit: number): Block => {
    const total = blocks.reduce((sum, block) => sum + block.w + 24, 0);
    return total <= limit || blocks.length <= 2 ? row(blocks) : tiers(blocks, limit);
  };
  const widthFor = (blocks: Block[], ratio = 1.5) => Math.max(Math.sqrt(blocks.reduce((sum, block) => sum + block.w * (block.h + 40), 0) * ratio), ...blocks.map(block => block.w * 1.1), 520);

  const stack = (header: { w: number; h: number; ax: number; drop: number; draw(x: number, y: number, from?: Point): Point }, below?: Block, space = 24): Block => {
    if (!below) return { w: header.w, h: header.h, ax: header.ax, draw: (x, y, from) => { header.draw(x, y, from); } };
    const headerLeft = below.ax - header.drop;
    const shift = Math.max(0, -headerLeft);
    const left = headerLeft + shift;
    const w = Math.max(left + header.w, shift + below.w);
    return { w, h: header.h + space + below.h, ax: left + header.ax, draw(x, y, from) {
      const point = header.draw(x + left, y, from);
      below.draw(x + shift, y + header.h + space, point);
    } };
  };

  const personBox = (person: Person, kind: BoxKind, x: number, y: number, parentId?: string) => addBox({ id: kind === 'echo' ? `e:${person.id}:${parentId}` : person.id, label: person.name, kind, x, y, w: personWidth(person.name), h: H, parent: parentId, profile: person.profile, target: kind === 'echo' ? person.id : undefined });

  // Hanging list: a spine with a name on each side, wrapped into several spines when long.
  const spines = (list: Person[], kind: BoxKind = 'person'): Block => {
    const sorted = [...list].sort(byName);
    const rows = Math.max(3, Math.min(30, Math.round(Math.sqrt(sorted.length * 2.6))));
    const perSpine = rows * 2;
    const columns: Person[][] = [];
    for (let i = 0; i < sorted.length; i += perSpine) columns.push(sorted.slice(i, i + perSpine));
    const stubs = 14;
    const sizes = columns.map(column => ({
      left: Math.max(0, ...column.filter((_, i) => i % 2 === 0).map(person => personWidth(person.name))),
      right: Math.max(0, ...column.filter((_, i) => i % 2 === 1).map(person => personWidth(person.name))),
    }));
    const widths = sizes.map(size => size.left + size.right + stubs * 2);
    const gap = 26;
    const w = widths.reduce((total, value) => total + value, 0) + gap * (columns.length - 1);
    const offsets: number[] = [];
    widths.reduce((left, value, index) => { offsets[index] = left + sizes[index].left + stubs; return left + value + gap; }, 0);
    const ax = (offsets[0] + offsets[offsets.length - 1]) / 2;
    const rowHeight = H + 10;
    const h = 20 + Math.max(...columns.map(column => Math.ceil(column.length / 2))) * rowHeight;
    return { w, h, ax, draw(x, y, from) {
      columns.forEach((column, index) => {
        const spine = x + offsets[index];
        column.forEach((person, i) => {
          const top = y + 20 + Math.floor(i / 2) * rowHeight;
          const width = personWidth(person.name);
          const onLeft = i % 2 === 0;
          const boxX = onLeft ? spine - stubs - width : spine + stubs;
          const box = personBox(person, kind, boxX, top, from?.id);
          if (from) lines.push({ d: `M${round(from.x)},${round(from.y)}V${round(from.busY ?? y)}H${round(x + ax)}V${round(y + 8)}H${round(spine)}V${round(top + H / 2)}H${round(onLeft ? spine - stubs : spine + stubs)}`, kind: from.kind, to: box.id });
        });
      });
    } };
  };

  const unitHeader = (unit: Unit) => {
    if (!unit.host) {
      return { w: 12, h: 12, ax: 6, drop: 6, draw(x: number, y: number, from?: Point): Point {
        addBox({ id: unit.id, label: '', kind: 'dot', x, y, w: 12, h: 12, parent: from?.id });
        link(from, x + 6, y, unit.id, unit.via);
        return { x: x + 6, y: y + 12, id: unit.id, kind: 'blood' };
      } };
    }
    const host = unit.host;
    const others = [...unit.partners.map(person => ({ person, kind: 'person' as BoxKind })), ...unit.echoes.map(person => ({ person, kind: 'echo' as BoxKind }))];
    const hostW = personWidth(host.name);
    const w = hostW + others.reduce((total, item) => total + 22 + personWidth(item.person.name), 0);
    const drop = others.length && unit.children.length && others.some(item => sharesAll(unit, item.person.id)) ? hostW + 11 : hostW / 2;
    return { w, h: H, ax: hostW / 2, drop, draw(x: number, y: number, from?: Point): Point {
      personBox(host, 'person', x, y, from?.id);
      link(from, x + hostW / 2, y, host.id, from && (from.kind === 'branch' || from.kind === 'trunk') ? from.kind : unit.via);
      let left = x + hostW + 22;
      for (const item of others) {
        const box = personBox(item.person, item.kind, left, y, host.id);
        lines.push({ d: `M${round(left - 22)},${round(y + H / 2)}H${round(left)}`, kind: 'partner', to: box.id });
        left += personWidth(item.person.name) + 22;
      }
      return { x: x + drop, y: y + H, id: host.id, kind: 'blood' };
    } };
  };

  // People with no family on record go under what they do belong to: a team, then a rank, role or species.
  const groupLoose = (list: Person[], scope: string): Block[] => {
    if (list.length <= 4) return list.length ? [spines(list)] : [];
    const teamSize = new Map<string, number>();
    for (const person of list) for (const team of person.teams) teamSize.set(team, (teamSize.get(team) ?? 0) + 1);
    const label = (person: Person) => {
      const team = person.teams.filter(name => (teamSize.get(name) ?? 0) >= 2).sort((a, b) => teamSize.get(a)! - teamSize.get(b)! || a.localeCompare(b))[0];
      if (team) return team;
      const species = person.species && !/^Human/.test(person.species) ? person.species : '';
      return rules.ranks.find(rank => person.ranks.includes(rank)) ?? rules.roles.find(role => person.classes.includes(role)) ?? (person.classes.includes('Summon') ? species || 'Summon' : species);
    };
    const groups = new Map<string, Person[]>();
    for (const person of list) { const name = label(person); if (!groups.has(name)) groups.set(name, []); groups.get(name)!.push(person); }
    const rest = [...(groups.get('') ?? [])];
    groups.delete('');
    for (const [name, group] of groups) if (group.length < 2) { rest.push(...group); groups.delete(name); }
    const order = (name: string) => { const rank = rules.ranks.indexOf(name); return rank >= 0 ? rank + 100 : rules.roles.includes(name) ? 200 + rules.roles.indexOf(name) : 0; };
    const blocks = [...groups].sort((a, b) => order(a[0]) - order(b[0]) || a[0].localeCompare(b[0], undefined, { numeric: true })).map(([name, group]) => branchBlock({ id: `t:${scope}:${name}`, name, kind: 'team', kids: [], loose: group, line: 'branch' }));
    return rest.length ? [...blocks, spines(rest)] : blocks;
  };

  const branchBlock = (branch: { id: string; name: string; kind: BoxKind; kids: Block[]; loose: Person[]; line: LineKind; parentKind?: LineKind; major?: boolean; grouped?: boolean }): Block => {
    const size = branch.kind === 'branch' ? 24 : branch.kind === 'team' ? 14 : 15;
    const h = branch.kind === 'branch' ? 54 : branch.kind === 'team' ? 32 : 38;
    const w = Math.ceil(textWidth(branch.name, size) * 1.04) + 40;
    const header = { w, h, ax: w / 2, drop: w / 2, draw(x: number, y: number, from?: Point): Point {
      addBox({ id: branch.id, label: branch.name, kind: branch.kind, x, y, w, h, parent: from?.id, major: branch.major });
      link(from, x + w / 2, y, branch.id, branch.parentKind ?? from?.kind);
      return { x: x + w / 2, y: y + h, id: branch.id, kind: branch.line };
    } };
    const blocks = [...branch.kids, ...(branch.grouped ? groupLoose(branch.loose, branch.id) : branch.loose.length ? [spines(branch.loose)] : [])];
    return blocks.length ? stack(header, arrange(blocks, widthFor(blocks))) : stack(header);
  };

  const clanSize = (branch: ClanBranch) => branch.loose.length + branch.kids.reduce((total, unit) => total + members(unit).length, 0);
  const clanBlock = (branch: ClanBranch, kind: BoxKind = 'clan', parentKind?: LineKind): Block => branchBlock({ id: branch.id, name: branch.name, kind, kids: [...branch.kids].sort((a, b) => members(b).length - members(a).length).map(unitBlock), loose: branch.loose, line: 'branch', parentKind, major: clanSize(branch) >= MAJOR_CLAN });
  function unitBlock(unit: Unit): Block {
    const blocks = [...unit.children].sort((a, b) => (a.host?.name ?? a.id).localeCompare(b.host?.name ?? b.id)).map(unitBlock);
    const clans = unit.extra.map(branch => clanBlock(branch, 'clan', 'lineage'));
    const all = [...blocks, ...clans];
    return stack(unitHeader(unit), all.length ? arrange(all, Math.max(1100, widthFor(all))) : undefined);
  }

  const topBlocks: Array<{ block: Block; size: number; id?: string }> = [];
  for (const branch of standalone) topBlocks.push({ block: clanBlock(branch, 'branch'), size: Infinity });
  const small: Array<[string, { clans: ClanBranch[]; kids: Unit[]; loose: Person[]; size: number }]> = [];
  for (const [name, bucket] of places) {
    if (rules.featured?.includes(name)) continue;
    if (!name || bucket.size >= BRANCH_MIN) {
      const label = name || 'No recorded home';
      topBlocks.push({ block: branchBlock({ id: `g:${label}`, name: label, kind: 'branch', kids: [...bucket.clans].sort((a, b) => clanSize(b) - clanSize(a)).map(branch => clanBlock(branch)).concat([...bucket.kids].sort((a, b) => members(b).length - members(a).length).map(unitBlock)), loose: bucket.loose, line: 'branch', grouped: true }), size: bucket.size });
    } else small.push([name, bucket]);
  }
  if (small.length) {
    const label = 'Other lands and groups';
    const single: Person[] = [];
    const kids: Block[] = [];
    let size = 0;
    for (const [name, bucket] of small.sort((a, b) => b[1].size - a[1].size)) {
      size += bucket.size;
      if (bucket.size >= SUB_BRANCH_MIN) kids.push(branchBlock({ id: `g:${name}`, name, kind: 'clan', kids: [...bucket.clans.map(branch => clanBlock(branch)), ...bucket.kids.map(unitBlock)], loose: bucket.loose, line: 'branch', grouped: true }));
      else { single.push(...bucket.loose); kids.push(...bucket.clans.map(branch => clanBlock(branch)), ...bucket.kids.map(unitBlock)); }
    }
    topBlocks.push({ block: branchBlock({ id: `g:${label}`, name: label, kind: 'branch', kids, loose: single, line: 'branch', grouped: true }), size });
  }
  // A featured group keeps its full line-up: members whose family lives elsewhere show as echoes.
  for (const name of rules.featured ?? []) {
    const bucket = places.get(name);
    if (!bucket) continue;
    const label = name;
    const away = [...people.values()].filter(person => home(person) === name && !bucket.loose.includes(person) && !bucket.kids.some(unit => members(unit).includes(person)) && !bucket.clans.some(branch => branch.loose.includes(person) || branch.kids.some(unit => members(unit).includes(person))));
    const index = topBlocks.findIndex(item => item.id === `g:${label}`);
    const block = branchBlock({ id: `g:${label}`, name: label, kind: 'branch', kids: [...bucket.clans.map(branch => clanBlock(branch)), ...bucket.kids.map(unitBlock), ...(away.length ? [spines(away, 'echo')] : [])], loose: bucket.loose, line: 'branch', grouped: true });
    if (index >= 0) topBlocks.splice(index, 1);
    topBlocks.push({ block, size: Number.POSITIVE_INFINITY, id: `g:${label}` });
  }
  const ordered = topBlocks.sort((a, b) => b.size - a.size).map(item => item.block);

  // Try a few trunk widths and keep the one closest to a wide screen.
  const ROOT_H = 92; const ROOT_W = Math.ceil(textWidth(title, 40)) + 120;
  const pick = (width: number) => tiers(ordered, width);
  let best = pick(4000); let bestScore = Infinity;
  for (let width = 2000; width <= 26000; width += 500) {
    const candidate_ = pick(width);
    const ratio = candidate_.w / (candidate_.h + ROOT_H + 80);
    const score = Math.abs(Math.log(ratio / 1.75));
    if (score < bestScore) { bestScore = score; best = candidate_; }
  }
  const pad = 60;
  const rootId = 'root';
  const rootX = pad + best.ax - ROOT_W / 2;
  addBox({ id: rootId, label: title, kind: 'root', x: rootX, y: pad, w: ROOT_W, h: ROOT_H });
  best.draw(pad, pad + ROOT_H + 44, { x: rootX + ROOT_W / 2, y: pad + ROOT_H, id: rootId, kind: 'trunk' });

  // ── 7. Lines that cross between families ──
  for (const box of boxes) {
    if (box.kind !== 'echo') continue;
    const real = placed.get(box.target!);
    if (real) crossLine(real, box);
  }
  const seenCross = new Set<string>();
  for (const [a, b] of crossPairs) {
    const key = [a, b].sort().join('|');
    if (seenCross.has(key)) continue;
    seenCross.add(key);
    const from = placed.get(a); const to = placed.get(b);
    if (from && to) crossLine(from, to);
  }
  function crossLine(from: Box, to: Box) {
    const [top, bottom] = from.y <= to.y ? [from, to] : [to, from];
    const x1 = top.x + top.w / 2; const y1 = top.y + top.h; const x2 = bottom.x + bottom.w / 2; const y2 = bottom.y;
    const bend = Math.max(40, Math.abs(y2 - y1) / 2);
    lines.push({ d: `M${round(x1)},${round(y1)}C${round(x1)},${round(y1 + bend)} ${round(x2)},${round(y2 - bend)} ${round(x2)},${round(y2)}`, kind: 'cross', to: `${from.id}|${to.id}` });
  }

  // Each label remembers the area of everything under it, so a click can frame that branch.
  const byId = new Map(boxes.map(box => [box.id, box]));
  for (const box of boxes) {
    if (box.kind === 'dot') continue;
    for (let up: Box | undefined = box; up; up = up.parent ? byId.get(up.parent) : undefined) {
      if (up.kind === 'person' || up.kind === 'echo' || up.kind === 'dot') continue;
      const old = up.bounds ?? [box.x, box.y, box.x + box.w, box.y + box.h];
      up.bounds = [Math.min(old[0], box.x), Math.min(old[1], box.y), Math.max(old[2], box.x + box.w), Math.max(old[3], box.y + box.h)];
    }
  }

  return { width: Math.ceil(pad * 2 + best.w), height: Math.ceil(pad * 2 + ROOT_H + 44 + best.h), boxes, lines, people: boxes.filter(box => box.kind === 'person').length };
}

const esc = (value: string) => value.replace(/[&<>"]/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[char]!));

/** The chart as an SVG string, so the page and the browser draw the same thing. */
export function chartSvg(chart: Chart, label: string) {
  const lines = chart.lines.map(line => `<path class="fc-l fc-l--${line.kind}" d="${line.d}" data-to="${esc(line.to)}"/>`).join('');
  const boxes = chart.boxes.map(box => {
    const attrs = `data-id="${esc(box.id)}"${box.label ? ` data-name="${esc(box.label)}"` : ''}${box.parent ? ` data-up="${esc(box.parent)}"` : ''}${box.target ? ` data-target="${esc(box.target)}"` : ''}`;
    if (box.kind === 'dot') return `<circle class="fc-dot" ${attrs} cx="${box.x + box.w / 2}" cy="${box.y + box.h / 2}" r="6"/>`;
    if (box.bounds) {
      const [left, top, right, bottom] = box.bounds;
      return `<g class="fc-n fc-n--${box.kind}${box.major ? ' fc-n--major' : ''}" ${attrs} data-b="${left},${top},${round(right - left)},${round(bottom - top)}" transform="translate(${round(box.x + box.w / 2)} ${round(box.y + box.h / 2)})"><g class="fc-lab"><rect x="${-box.w / 2}" y="${-box.h / 2}" width="${box.w}" height="${box.h}" rx="${box.h / 2}"/><text>${esc(box.label)}</text></g></g>`;
    }
    const shape = `<rect width="${box.w}" height="${box.h}" rx="11"/><text x="${box.w / 2}" y="${box.h / 2}">${esc(box.label)}</text>`;
    const body = box.profile && box.kind === 'person' ? `<a href="/characters/${esc(box.profile)}">${shape}</a>` : shape;
    return `<g class="fc-n fc-n--${box.kind}${box.profile ? ' fc-n--profile' : ''}" ${attrs} transform="translate(${box.x} ${box.y})">${body}</g>`;
  }).join('');
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${chart.width}" height="${chart.height}" viewBox="0 0 ${chart.width} ${chart.height}" role="group" aria-label="${esc(label)}" data-chart-svg><g>${lines}</g><g>${boxes}</g></svg>`;
}
