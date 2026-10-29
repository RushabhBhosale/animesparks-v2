import { test } from 'node:test';
import assert from 'node:assert/strict';
import { topK } from '../../src/lib/tools/top-k.ts';

test('topK equals a stable sort followed by slice, ties included', () => {
  let state = 5;
  const rand = (n: number) => (state = (state * 1103515245 + 12345) & 0x7fffffff) % n;
  for (let round = 0; round < 300; round++) {
    const items = Array.from({ length: rand(120) }, (_, index) => ({ index, score: rand(6), name: `n${rand(4)}` }));
    const compare = (a: typeof items[number], b: typeof items[number]) => b.score - a.score || a.name.localeCompare(b.name);
    for (const limit of [0, 1, 5, 24, 500]) {
      assert.deepEqual(topK(items, limit, compare), [...items].sort(compare).slice(0, limit), `round ${round} limit ${limit}`);
    }
  }
});
