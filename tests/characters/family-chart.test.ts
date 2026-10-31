import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { getRegistry } from '../../src/lib/characters/registry.ts';
import { PUBLISHED_FAMILY_SERIES, familySeries } from '../../src/lib/characters/family.ts';
import { compactRoster, getRoster, rosterCredit, rosterStats } from '../../src/lib/characters/roster.ts';
import { buildChart, chartSvg, type ChartData } from '../../src/lib/characters/family-chart.ts';

const data = compactRoster('naruto') as unknown as ChartData;
const full = data.checkpoints - 1;

describe('family chart', () => {
  const chart = buildChart(data, full, 'Naruto');
  const people = chart.boxes.filter(box => box.kind === 'person');

  it('places every character exactly once', () => {
    const ids = people.map(box => box.id);
    assert.equal(new Set(ids).size, ids.length, 'someone appears twice');
    assert.deepEqual(data.n.map(row => row[0] as string).filter(id => !ids.includes(id)), []);
    assert.ok(people.length >= 1400);
  });

  it('is one tree: every box climbs to the root', () => {
    const byId = new Map(chart.boxes.map(box => [box.id, box]));
    for (const box of chart.boxes) {
      let current = box; let steps = 0;
      while (current.parent && steps++ < 80) { const up = byId.get(current.parent); assert.ok(up, `${box.id} has a missing parent ${current.parent}`); current = up; }
      assert.equal(current.id, 'root', `${box.id} does not reach the root`);
    }
  });

  it('never overlaps two boxes and stays inside the canvas', () => {
    const sorted = [...chart.boxes].sort((a, b) => a.x - b.x);
    for (let i = 0; i < sorted.length; i++) {
      const a = sorted[i];
      assert.ok(a.x >= 0 && a.y >= 0 && a.x + a.w <= chart.width && a.y + a.h <= chart.height, `${a.id} is outside the canvas`);
      for (let j = i + 1; j < sorted.length && sorted[j].x < a.x + a.w; j++) {
        const b = sorted[j];
        assert.ok(a.y + a.h <= b.y || b.y + b.h <= a.y, `${a.id} overlaps ${b.id}`);
      }
    }
  });

  it('draws real families with their real parents', () => {
    const up = (id: string) => chart.boxes.find(box => box.id === id)?.parent;
    assert.equal(up('sasuke-uchiha'), 'fugaku-uchiha');
    assert.equal(up('naruto-uzumaki'), 'minato-namikaze');
    assert.equal(up('boruto-uzumaki'), 'naruto-uzumaki');
    assert.equal(up('neji-hyuga'), 'hizashi-hyuga');
    assert.equal(up('kaguya-otsutsuki'), up('hagoromo-otsutsuki'));
    assert.equal(up('c:Uchiha'), 'indra-otsutsuki');
    assert.equal(up('c:Hyūga'), 'hamura-otsutsuki');
  });

  it('resolves relatives listed under another name', () => {
    const ids = new Set(getRoster('naruto')!.nodes.map(node => node.id));
    for (const alias of ['hinata-uzumaki', 'sakura-uchiha', 'temari-nara', 'a', 'tenji-lover', 'tailed-beasts']) assert.equal(ids.has(alias), false, alias);
  });

  it('keeps every spoiler-locked tie off the chart at the start of the story', () => {
    const safe = buildChart(data, -1, 'Naruto');
    const up = (id: string) => safe.boxes.find(box => box.id === id)?.parent;
    assert.notEqual(up('naruto-uzumaki'), 'minato-namikaze');
    assert.notEqual(up('boruto-uzumaki'), 'naruto-uzumaki');
    assert.equal(safe.boxes.filter(box => box.kind === 'person').length, people.length);
    assert.equal(safe.boxes.some(box => box.id === 'c:Uchiha' && box.parent === 'indra-otsutsuki'), false);
  });

  it('files people with no relatives under what they belong to, never as family', () => {
    const byId = new Map(chart.boxes.map(box => [box.id, box]));
    const anbu = chart.boxes.find(box => box.kind === 'team' && box.label === 'Anbu');
    assert.ok(anbu, 'rank branch is missing');
    assert.ok(chart.boxes.filter(box => box.parent === anbu!.id).every(box => box.kind === 'person'));
    assert.equal(byId.get('sasuke-uchiha')?.parent, 'fugaku-uchiha', 'a family still outranks a team');
    assert.ok(chart.lines.filter(line => line.to === anbu!.id).every(line => line.kind === 'branch'));
  });

  it('can show only the people with recorded family', () => {
    const families = buildChart(data, full, 'Naruto', { familiesOnly: true });
    const ids = new Set(families.boxes.map(box => box.id));
    assert.ok(families.people > 300 && families.people < people.length / 2 + 200, String(families.people));
    assert.ok(ids.has('naruto-uzumaki') && ids.has('sasuke-uchiha'));
    assert.equal(families.boxes.some(box => box.kind === 'team'), false);
  });

  it('gives every label the area of its branch', () => {
    for (const box of chart.boxes.filter(item => ['root', 'branch', 'clan', 'team'].includes(item.kind))) {
      assert.ok(box.bounds, box.id);
      assert.ok(box.bounds[0] <= box.x && box.bounds[2] >= box.x + box.w);
    }
  });

  it('renders to one SVG with every name in the markup', () => {
    const svg = chartSvg(chart, 'Naruto family tree');
    assert.equal(svg.match(/fc-n--person/g)?.length, people.length);
    assert.match(svg, /Sasuke Uchiha/);
    assert.equal(getRegistry().seriesBySlug.has('naruto'), true);
  });
});

describe('One Piece family chart', () => {
  const onePiece = compactRoster('one-piece') as unknown as ChartData;
  const chart = buildChart(onePiece, onePiece.checkpoints - 1, 'One Piece');
  const up = (id: string) => chart.boxes.find(box => box.id === id)?.parent;

  it('places every character once in one connected tree', () => {
    const people = chart.boxes.filter(box => box.kind === 'person');
    assert.equal(new Set(people.map(box => box.id)).size, people.length);
    assert.deepEqual(onePiece.n.map(row => row[0] as string).filter(id => !people.some(box => box.id === id)), []);
    assert.ok(people.length >= 1400);
    const byId = new Map(chart.boxes.map(box => [box.id, box]));
    for (const box of chart.boxes) {
      let current = box; let steps = 0;
      while (current.parent && steps++ < 80) current = byId.get(current.parent)!;
      assert.equal(current.id, 'root', `${box.id} does not reach the root`);
    }
  });

  it('never overlaps two boxes', () => {
    const sorted = [...chart.boxes].sort((a, b) => a.x - b.x);
    sorted.forEach((a, i) => {
      for (let j = i + 1; j < sorted.length && sorted[j].x < a.x + a.w; j++) assert.ok(a.y + a.h <= sorted[j].y || sorted[j].y + sorted[j].h <= a.y, `${a.id} overlaps ${sorted[j].id}`);
    });
  });

  it('reads the wiki charts and articles into real families', () => {
    assert.equal(up('monkey-d-dragon'), 'monkey-d-garp');
    assert.equal(up('monkey-d-luffy'), 'monkey-d-dragon');
    assert.equal(up('portgas-d-ace'), 'gol-d-roger');
    assert.equal(up('sanji'), 'vinsmoke-judge');
    assert.equal(up('charlotte-katakuri'), 'charlotte-linlin');
    assert.equal(up('roronoa-zoro'), 'roronoa-arashi');
    assert.equal(up('nefertari-vivi'), 'nefertari-cobra');
  });

  it('keeps adoptive ties apart from birth and drops claimed ones', () => {
    const edge = (a: string, b: string) => onePiece.e.find(item => item[0] === a && item[1] === b);
    assert.equal(edge('bell-mere', 'nami')?.[4], 'adoptive');
    assert.equal(edge('shanks', 'uta')?.[4], 'adoptive');
    assert.equal(edge('edward-newgate', 'edward-weevil'), undefined);
    assert.equal(edge('edward-newgate', 'polo-marco'), undefined);
  });
});

describe('every published series', () => {
  for (const slug of PUBLISHED_FAMILY_SERIES) {
    it(`${slug}: one connected tree with every character placed once`, () => {
      const roster = compactRoster(slug) as unknown as ChartData;
      assert.ok(roster, 'roster is missing');
      const chart = buildChart(roster, roster.checkpoints - 1, slug);
      const people = chart.boxes.filter(box => box.kind === 'person');
      assert.equal(new Set(people.map(box => box.id)).size, people.length, 'someone appears twice');
      assert.deepEqual(roster.n.map(row => row[0] as string).filter(id => !people.some(box => box.id === id)), []);
      assert.ok(people.length >= 60, `only ${people.length} characters`);
      const byId = new Map(chart.boxes.map(box => [box.id, box]));
      for (const box of chart.boxes) {
        let current = box; let steps = 0;
        while (current.parent && steps++ < 120) current = byId.get(current.parent)!;
        assert.equal(current.id, 'root', `${box.id} does not reach the root`);
      }
      const sorted = [...chart.boxes].sort((a, b) => a.x - b.x);
      sorted.forEach((a, i) => {
        for (let j = i + 1; j < sorted.length && sorted[j].x < a.x + a.w; j++) assert.ok(a.y + a.h <= sorted[j].y || sorted[j].y + sorted[j].h <= a.y, `${a.id} overlaps ${sorted[j].id}`);
      });
    });

    it(`${slug}: the data has no importer leftovers and credits its wiki`, () => {
      const roster = getRoster(slug)!;
      const text = (value: string) => /[|={}<>\[\]]/.test(value);
      for (const node of roster.nodes) {
        assert.ok(node.name.trim() && !text(node.name), `bad name: ${node.name}`);
        for (const value of [...node.affiliation, ...node.team, ...node.rank]) assert.equal(text(value), false, `${node.name}: ${value}`);
      }
      assert.ok(rosterCredit(slug)?.url.startsWith('https://'), 'no credit');
      assert.ok(familySeries().some(item => item.slug === slug));
    });
  }
});

describe('family data quality', () => {
  for (const slug of PUBLISHED_FAMILY_SERIES) {
    it(`${slug}: no sub-page names, contradictions or family loops`, () => {
      const roster = getRoster(slug)!;
      const name = new Map(roster.nodes.map(node => [node.id, node.name]));
      // Naruto and One Piece were reviewed by hand ("Vegapunk/Atlas" is a real character); the wiki imports must not carry sub-pages.
      if (!['naruto', 'one-piece'].includes(slug)) for (const node of roster.nodes) assert.ok(!/[/:]/.test(node.name), `not a single character: ${node.name}`);
      const key = (a: string, b: string) => [a, b].sort().join('|');
      const parent = new Set<string>(); const sibling = new Set<string>(); const spouse = new Set<string>(); const birth = new Map<string, string[]>();
      for (const [a, b, kind, , flag] of roster.edges) {
        if (kind === 'parent') { parent.add(key(a, b)); if (!flag) birth.set(b, [...(birth.get(b) ?? []), a]); }
        if (kind === 'sibling') sibling.add(key(a, b));
        if (kind === 'spouse') spouse.add(key(a, b));
      }
      for (const pair of parent) {
        assert.ok(!sibling.has(pair), `parent and sibling at once: ${pair.split('|').map(id => name.get(id)).join(' / ')}`);
        assert.ok(!spouse.has(pair), `parent and partner at once: ${pair.split('|').map(id => name.get(id)).join(' / ')}`);
      }
      for (const start of birth.keys()) {
        const seen = new Set<string>(); const stack = [start];
        while (stack.length) for (const up of birth.get(stack.pop()!) ?? []) { assert.notEqual(up, start, `family loop at ${name.get(start)}`); if (!seen.has(up)) { seen.add(up); stack.push(up); } }
      }
    });
  }
});

describe('family tree text', () => {
  it('describes the biggest families with their real parents and children', async () => {
    const { buildFamilyIndex } = await import('../../src/lib/characters/family-index.ts');
    const data = compactRoster('naruto') as unknown as ChartData;
    const index = buildFamilyIndex(buildChart(data, data.checkpoints - 1, 'Naruto'));
    assert.ok(index.families.length >= 5, 'too few families described');
    const uchiha = index.families.find(family => family.label === 'Uchiha');
    assert.ok(uchiha, 'the Uchiha are missing');
    const unit = uchiha!.units.find(item => item.parents.some(parent => parent.id === 'fugaku-uchiha'));
    assert.ok(unit?.children.some(child => child.id === 'sasuke-uchiha'), 'Fugaku’s children are missing');
    assert.ok(uchiha!.notable.some(member => member.profile), 'a notable member should link to a profile');
    assert.ok(index.places.length > 0 && index.largest.length > 0);
  });

  it('never calls a creation a child or a home a family', async () => {
    const { buildFamilyIndex } = await import('../../src/lib/characters/family-index.ts');
    const data = compactRoster('naruto') as unknown as ChartData;
    const index = buildFamilyIndex(buildChart(data, data.checkpoints - 1, 'Naruto'));
    const children = index.families.flatMap(family => family.units.filter(unit => unit.parents.some(parent => parent.id === 'orochimaru')).flatMap(unit => unit.children.map(child => child.id)));
    assert.ok(!children.includes('mitsuki'), 'Mitsuki is Orochimaru’s creation, not his child');
    assert.ok(!index.families.some(family => family.label === 'Konohagakure'), 'a village is not a family');
    const generic = buildFamilyIndex(buildChart(compactRoster('dragon-ball') as unknown as ChartData, -1, 'Dragon Ball'));
    assert.ok(!generic.families.some(family => /^\d+$/.test(family.label)), 'a number is not a family name');
  });

  it('keeps the family text short instead of repeating every name', async () => {
    const { buildFamilyIndex } = await import('../../src/lib/characters/family-index.ts');
    const data = compactRoster('one-piece') as unknown as ChartData;
    const index = buildFamilyIndex(buildChart(data, data.checkpoints - 1, 'One Piece'));
    const named = index.families.reduce((total, family) => total + family.notable.length + family.units.reduce((sum, unit) => sum + unit.parents.length + unit.children.length, 0), 0);
    assert.ok(named < 250, `${named} names repeated below the tree`);
  });
});

describe('one source for every character count', () => {
  for (const slug of PUBLISHED_FAMILY_SERIES) {
    it(`${slug}: the roster, the tree and the page statistics agree`, () => {
      const data = compactRoster(slug) as unknown as ChartData;
      const chart = buildChart(data, data.checkpoints - 1, slug);
      assert.equal(chart.people, data.n.length);
      assert.equal(rosterStats(slug)!.characters, data.n.length);
    });
  }
});
