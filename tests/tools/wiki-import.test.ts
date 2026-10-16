import { test } from 'node:test';
import assert from 'node:assert/strict';
import { arcName, buildDatasets, chapterNumbers, episodeNumber, parseOnePieceArcs } from '../../scripts/tools/import-wiki.mjs';

test('episode numbers come from infobox fields or the page title, never from specials', () => {
  assert.equal(episodeNumber({ 'ep number': '14' }), 14);
  assert.equal(episodeNumber({ episode: '13.5' }), null, 'recap specials are skipped');
  assert.equal(episodeNumber({}, 'Episode 27'), 27);
  assert.equal(episodeNumber({}, 'Episode 13.5'), null);
  assert.equal(episodeNumber({}, 'Homecoming (episode)'), null);
});

test('chapter fields parse links and plain ranges, but not side stories', () => {
  assert.deepEqual(chapterNumbers({ 'adapted from': '[[Chapter 2]] (p. 2 - 3)<br>[[Chapter 1]]' }), [1, 2]);
  assert.deepEqual(chapterNumbers({ chapters: '[[Chapter 1|1]]' }), [1]);
  assert.deepEqual(chapterNumbers({ manga: '[[Chapter 1|Chapters 1]], [[Chapter 2|2]] (partially)' }), [1, 2]);
  assert.deepEqual(chapterNumbers({ chapters: '1-3' }), [1, 2, 3]);
  assert.deepEqual(chapterNumbers({ chapters: '[[Extra Mission 1]]' }), [], 'linked non-chapters are ignored');
  assert.deepEqual(chapterNumbers({ arc: 'Chapter 5 arc' }), [], 'only chapter fields are read');
});

test('arc names lose wiki markup', () => {
  assert.equal(arcName({ arc: '[[Arc 1|Magic Knights Entrance Arc]]' }), 'Magic Knights Entrance Arc');
  assert.equal(arcName({ arc: '[[Introduction arc]]' }), 'Introduction Arc');
  assert.equal(arcName({}), null);
});

test('per-episode records become mapping ranges, arcs and a continue point', () => {
  const data = buildDatasets([
    { n: 1, chapters: [1, 2], arc: 'A' }, { n: 2, chapters: [], arc: 'A' }, { n: 3, chapters: [3], arc: 'B' },
  ]);
  assert.deepEqual(data.ranges, [{ episodeStart: 1, episodeEnd: 1, chapterStart: 1, chapterEnd: 2 }, { episodeStart: 3, episodeEnd: 3, chapterStart: 3, chapterEnd: 3 }]);
  assert.deepEqual(data.arcs, [{ name: 'A', episodeStart: 1, episodeEnd: 2 }, { name: 'B', episodeStart: 3, episodeEnd: 3 }]);
  assert.equal(data.continueFromChapter, 4);
});

test('One Piece arcs: nested headings, multi-segment ranges and filler arcs', () => {
  const text = `===[[East Blue Saga]]===
====[[Romance Dawn Arc]]====
*[[:Category:Romance Dawn Arc Chapters|Chapters]]: 7 (1-7)
*[[:Category:Romance Dawn Arc Episodes|Episodes]]: 4 (1-4)
====[[Orange Town Arc]]====
*[[:Category:Orange Town Arc Chapters|Chapters]]: 14 (8-21)
*[[:Category:Orange Town Arc Episodes|Episodes]]: 5 (4-8)
====[[Loguetown Arc]]====
*[[:Category:Loguetown Arc Chapters|Chapters]]: 5 (96-100)
*[[:Category:Loguetown Arc Episodes|Episodes]]: 7 (45, 48-53); Episodes 50 and 51 are fillers.
===[[Arabasta Saga]]===
====[[Elbaph Arc]]====
Future arc with no episodes yet.
==Non-Canon Arcs==
====[[Warship Island Arc]]====
*[[:Category:Warship Island Arc Episodes|Episodes]]: 8 (54-61)`;
  assert.deepEqual(parseOnePieceArcs(text), [
    { name: 'Romance Dawn Arc', episodeStart: 1, episodeEnd: 4, chapterStart: 1, chapterEnd: 7 },
    { name: 'Orange Town Arc', episodeStart: 5, episodeEnd: 8, chapterStart: 8, chapterEnd: 21 },
    { name: 'Loguetown Arc', episodeStart: 45, episodeEnd: 45, chapterStart: 96, chapterEnd: 100 },
    { name: 'Loguetown Arc', episodeStart: 48, episodeEnd: 53, chapterStart: 96, chapterEnd: 100 },
    { name: 'Warship Island Arc', episodeStart: 54, episodeEnd: 61, chapterStart: null, chapterEnd: null },
  ]);
});

test('arc names decode HTML entities and normalise "(Arc)"', () => {
  assert.equal(arcName({ arc: 'Prologue &mdash; Land of Waves' }), 'Prologue — Land of Waves');
  assert.equal(arcName({ arc: 'Chūnin Exams (Arc)' }), 'Chūnin Exams Arc');
});
