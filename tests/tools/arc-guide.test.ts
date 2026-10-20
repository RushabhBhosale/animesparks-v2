import { test } from 'node:test';
import assert from 'node:assert/strict';
import { arcLabel, buildArcGuide, isFillerArc } from '../../src/lib/tools/arc-guide.ts';

test('arcs from several seasons share one timeline and continuing arcs merge', () => {
  const rows = buildArcGuide([
    { slug: 's1', title: 'Season 1', episodes: 24, arcs: [{ name: 'Fearsome Womb', episodeStart: 1, episodeEnd: 21 }, { name: 'Death Painting', episodeStart: 22, episodeEnd: 24 }],
      ranges: [{ episodeStart: 22, episodeEnd: 22, chapterStart: 54, chapterEnd: 55 }, { episodeStart: 24, episodeEnd: 24, chapterStart: 62, chapterEnd: 63 }] },
    { slug: 's2', title: 'Season 2', episodes: 23, arcs: [{ name: 'Death Painting Arc', episodeStart: 1, episodeEnd: 1 }, { name: 'Shibuya Incident Arc', episodeStart: 2, episodeEnd: 23 }],
      ranges: [{ episodeStart: 1, episodeEnd: 1, chapterStart: 64, chapterEnd: 64 }] },
  ]);
  assert.deepEqual(rows.map(row => [row.name, row.overallStart, row.overallEnd, row.length, row.seasons.length]), [
    ['Fearsome Womb Arc', 1, 21, 21, 1],
    ['Death Painting Arc', 22, 25, 4, 2],
    ['Shibuya Incident Arc', 26, 47, 22, 1],
  ]);
  assert.deepEqual(rows[1].chapters, [54, 64]);
  assert.equal(rows[0].chapters, null);
});

test('filler counts come from episode types and decide filler arcs', () => {
  const types = new Map<number, 'filler' | 'canon' | 'recap'>([[1, 'canon'], [2, 'filler'], [3, 'filler'], [4, 'recap']]);
  const rows = buildArcGuide([{ slug: 'a', title: 'A', episodes: 4, episodeTypes: types, arcs: [{ name: 'Main Arc', episodeStart: 1, episodeEnd: 2 }, { name: 'Side Arc', episodeStart: 3, episodeEnd: 4 }] }]);
  assert.deepEqual(rows.map(row => [row.filler, isFillerArc(row)]), [[1, false], [2, true]]);
});

test('arc labels get a consistent suffix', () => {
  assert.equal(arcLabel('U.S.J.'), 'U.S.J. Arc');
  assert.equal(arcLabel('Romance Dawn Arc'), 'Romance Dawn Arc');
  assert.equal(arcLabel('Prologue — Land of Waves'), 'Prologue — Land of Waves');
});
