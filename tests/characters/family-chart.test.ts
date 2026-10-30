import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { getRegistry } from '../../src/lib/characters/registry.ts';
import { compactRoster, getRoster } from '../../src/lib/characters/roster.ts';
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
