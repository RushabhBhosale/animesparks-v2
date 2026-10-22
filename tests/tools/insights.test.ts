import assert from 'node:assert/strict';
import { test } from 'node:test';
import { arcInsights, episodeRuns, fillerInsights, mangaInsights, movieInsights, orderInsights } from '../../src/lib/tools/insights.ts';

const episodes = (types: string) => [...types].map((char, index) => ({ n: index + 1, type: char === 'F' ? 'filler' : char === 'R' ? 'recap' : 'canon' }));
const view = (types: string, extra = {}) => {
  const eps = episodes(types);
  const skippable = eps.filter(episode => episode.type !== 'canon').length;
  return {
    slug: 'x', title: 'Sample', status: 'finished', durationMinutes: 24, basis: 'provider' as const, episodes: eps,
    summary: { total: eps.length, skippable, fillerPercent: Math.round((skippable / eps.length) * 1000) / 10, counts: { filler: eps.filter(e => e.type === 'filler').length, recap: eps.filter(e => e.type === 'recap').length, mixed: 0 } as Record<string, number> },
    arcs: [], ...extra,
  };
};

test('episodeRuns merges contiguous matches only', () => {
  const runs = episodeRuns(episodes('CFFCFCC'), type => type === 'filler');
  assert.deepEqual(runs.map(run => [run.start, run.end, run.length]), [[2, 3, 2], [5, 5, 1]]);
});

test('filler insights report where the first filler appears and the longest run', () => {
  const insights = fillerInsights(view('CCCCCCCCCCCCFFFCCCCCCCCCCCCCCCCCCCFFFFFF'), [], { title: 'Sample' });
  const text = insights.paragraphs.join(' ');
  assert.match(text, /first skippable episode is 13/);
  assert.match(text, /episodes 1–12 can be watched straight through/);
  assert.match(text, /longest is 35–40/);
  assert.ok(insights.rows.some(([label, value]) => label === 'First filler or recap' && value === 'Episode 13'));
  assert.ok(insights.faq.some(item => /first filler episode/.test(item.question) && /Episode 13/.test(item.answer)));
});

test('filler insights say so plainly when there is none', () => {
  const insights = fillerInsights(view('CCCCCCCCCCCCCC'), [], { title: 'Sample' });
  assert.match(insights.paragraphs[0], /has no filler/);
  assert.equal(insights.faq.length, 0);
});

test('filler rank only appears with enough comparable lists', () => {
  const small = fillerInsights(view('CCCCCCCCCCCCFFF'), [{ slug: 'x', fillerPercent: 20, skippable: 3, total: 15 }], { title: 'Sample' });
  assert.ok(!small.rows.some(([label]) => label === 'Filler share rank'));
  const cohort = Array.from({ length: 12 }, (_, index) => ({ slug: index === 0 ? 'x' : `s${index}`, fillerPercent: 20 - index, skippable: 3, total: 15 }));
  const ranked = fillerInsights(view('CCCCCCCCCCCCFFF'), cohort, { title: 'Sample' });
  assert.ok(ranked.rows.some(([label, value]) => label === 'Filler share rank' && value === '1st of 12 lists with filler'));
});

test('two different filler lists produce different text', () => {
  const a = fillerInsights(view('CCCCCCCCCCCCFFFCCCCCCCCCC'), [], { title: 'A' }).paragraphs.join('|');
  const b = fillerInsights(view('FFCCCCCCCCCCCCCCCCCCRRCCC'), [], { title: 'B' }).paragraphs.join('|');
  assert.notEqual(a.replace(/A/g, 'X'), b.replace(/B/g, 'X'));
});

const entry = (title: string, role: string, year: number, minutes: number | null, format = 'tv') => ({
  title, role, format, status: 'finished', year, airedFrom: `${year}-01-01`, episodes: 12, watchEpisodes: 12, watchMinutes: minutes, durationMinutes: 24,
});

test('order insights compute span, main share and days', () => {
  const order = {
    title: 'Sample', releaseOrder: [entry('One', 'main', 2000, 288), entry('Two', 'main', 2004, 288), entry('Movie', 'side', 2010, 120, 'movie')],
    totals: { all: { minutes: 696, episodes: 25 }, main: { minutes: 576, episodes: 24 } },
  };
  const insights = orderInsights(order, [], undefined);
  assert.ok(insights.rows.some(([label, value]) => label === 'Release span' && value === '2000–2010 (10 years)'));
  assert.ok(insights.rows.some(([label, value]) => label === 'Main story share of watch time' && value === '83%'));
  assert.match(insights.paragraphs.join(' '), /Start with One \(2000\)/);
  assert.ok(insights.faq.some(item => /side stories and recaps/.test(item.question)));
});

test('movie insights find the longest gap, runtimes and best score', () => {
  const movie = (title: string, year: number, minutes: number, score: number, role = 'side') => ({ title, role, status: 'finished', year, airedFrom: `${year}-06-01`, durationMinutes: minutes, score });
  const insights = movieInsights('Sample', [movie('A', 2001, 90, 7.1), movie('B', 2003, 100, 8.2, 'main'), movie('C', 2010, 80, 6.5)]);
  const text = insights.paragraphs.join(' ');
  assert.match(text, /longest wait between films was 7 years, from B \(2003\) to C \(2010\)/);
  assert.match(text, /highest MyAnimeList score of the group \(8\.20\)/);
  assert.ok(insights.faq.some(item => /best Sample movie/.test(item.question) && /B \(8\.20\)/.test(item.answer)));
});

test('manga insights compute coverage and chapters left', () => {
  const rows = [{ title: 'S1', episodes: 12, first: 1, last: 36 }, { title: 'S2', episodes: 12, first: 37, last: 100 }];
  const insights = mangaInsights('Sample', rows, { status: 'finished', chapters: 200, volumes: 20, authors: ['Doe, Jane'], serializations: ['Mag'], publishedFrom: '2010-01-01', publishedTo: '2016-01-01' }, 101);
  const text = insights.paragraphs.join(' ');
  assert.match(text, /chapters 1–100/);
  assert.match(text, /leaves 100 chapters/);
  assert.match(text, /Jane Doe/);
  assert.ok(insights.rows.some(([label, value]) => label === 'Adapted so far' && value === '50% of the manga'));
});

test('arc insights describe filler arcs and spread', () => {
  const arc = (name: string, length: number, start: number, isFiller = false) => ({ name, length, filler: isFiller ? length : 0, chapters: null, overallStart: start, overallEnd: start + length - 1, isFiller });
  const insights = arcInsights('Sample', [arc('A Arc', 24, 1), arc('B Arc', 4, 25, true), arc('C Arc', 12, 29)], 1);
  const text = insights.paragraphs.join(' ');
  assert.match(text, /A Arc runs 24 episodes/);
  assert.match(text, /entirely filler, 4 episodes or 10% of the series/);
  assert.ok(insights.faq.some(item => /filler arcs/.test(item.question)));
});
