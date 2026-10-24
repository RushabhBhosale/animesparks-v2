// Episode classification (Filler Checker), chapter lookup (Manga Finder) and
// arc helpers (Arc Explorer). Classifications come only from provider flags
// or verified curated lists; anything else is "unknown".

import type { CanonType, EpisodeFlag, ToolArcListDocument, ToolFillerListDocument, ToolMangaMappingDocument } from './types.ts';

export interface ClassifiedEpisode {
  n: number;
  t?: string;
  a?: string;
  type: CanonType;
}

export const CANON_LABELS: Record<CanonType, string> = {
  'manga-canon': 'Manga canon',
  'anime-canon': 'Anime canon',
  mixed: 'Mixed canon/filler',
  filler: 'Filler',
  recap: 'Recap',
  canon: 'Canon',
  unknown: 'Unknown',
};

/** What each label means, in general terms. Used to explain the labels on filler pages. */
export const CANON_DEFINITIONS: Record<CanonType, string> = {
  'manga-canon': 'Adapts the source material (manga or novel) closely.',
  'anime-canon': 'Anime-original story that the source’s creator approved or supervised, so it counts toward the main plot.',
  mixed: 'Combines scenes from the source material with anime-original scenes.',
  filler: 'Anime-original story outside the main plot. Skipping it does not affect the main story.',
  recap: 'Retells earlier episodes. Skipping it loses nothing you have not already seen.',
  canon: 'Not flagged as filler or recap, so treated as part of the main run.',
  unknown: 'No classification is available for this episode.',
};

/** Types a viewer can skip without missing source-material story. */
export const SKIPPABLE: ReadonlySet<CanonType> = new Set(['filler', 'recap']);

/**
 * Curated, verified ranges take precedence. Otherwise provider flags are used:
 * flagged filler → filler, flagged recap → recap, everything else listed by
 * the provider → canon (not flagged). Episodes beyond the list are unknown.
 */
export function classifyEpisodes(episodes: EpisodeFlag[], totalEpisodes: number | null, curated?: Pick<ToolFillerListDocument, 'ranges'> | null): ClassifiedEpisode[] {
  const byNumber = new Map(episodes.map(episode => [episode.n, episode]));
  const highest = Math.max(totalEpisodes || 0, ...episodes.map(episode => episode.n), ...(curated?.ranges || []).map(range => range.end));
  const result: ClassifiedEpisode[] = [];
  for (let n = 1; n <= highest; n++) {
    const episode = byNumber.get(n);
    const range = curated?.ranges.find(item => n >= item.start && n <= item.end);
    let type: CanonType = 'unknown';
    if (range) type = range.type;
    else if (!curated && episode) type = episode.f ? 'filler' : episode.r ? 'recap' : 'canon';
    result.push({ n, t: episode?.t, a: episode?.a, type });
  }
  return result;
}

export function summarize(episodes: ClassifiedEpisode[]) {
  const counts = Object.fromEntries(Object.keys(CANON_LABELS).map(key => [key, 0])) as Record<CanonType, number>;
  for (const episode of episodes) counts[episode.type]++;
  const known = episodes.length - counts.unknown;
  const skippable = counts.filler + counts.recap;
  return {
    counts,
    total: episodes.length,
    skippable,
    fillerPercent: known ? Math.round((skippable / known) * 1000) / 10 : 0,
  };
}

/** Compresses sorted episode numbers into ranges: [1,2,3,7] → "1-3, 7". */
export function toRanges(numbers: number[]): Array<[number, number]> {
  const sorted = [...new Set(numbers)].sort((a, b) => a - b);
  const ranges: Array<[number, number]> = [];
  for (const n of sorted) {
    const last = ranges.at(-1);
    if (last && n === last[1] + 1) last[1] = n;
    else ranges.push([n, n]);
  }
  return ranges;
}

export function formatRanges(ranges: Array<[number, number]>): string {
  return ranges.map(([start, end]) => start === end ? String(start) : `${start}-${end}`).join(', ');
}

/** Episodes to watch when skipping filler and recaps (unknown episodes are kept). */
export function fillerFreeEpisodes(episodes: ClassifiedEpisode[]): number[] {
  return episodes.filter(episode => !SKIPPABLE.has(episode.type)).map(episode => episode.n);
}

/** Consecutive runs of the same type, for the episode range overview. */
export function typeRuns(episodes: ClassifiedEpisode[]): Array<{ type: CanonType; start: number; end: number }> {
  const runs: Array<{ type: CanonType; start: number; end: number }> = [];
  for (const episode of episodes) {
    const last = runs.at(-1);
    if (last && last.type === episode.type && episode.n === last.end + 1) last.end = episode.n;
    else runs.push({ type: episode.type, start: episode.n, end: episode.n });
  }
  return runs;
}

// ── Manga mapping ─────────────────────────────────────────────────────────

export type ChapterLookup =
  | { kind: 'found'; chapterStart: number; chapterEnd: number; note?: string; nextChapter: number }
  | { kind: 'after-anime'; continueFromChapter?: number; note?: string }
  | { kind: 'not-covered' };

export function chapterForEpisode(mapping: Pick<ToolMangaMappingDocument, 'ranges' | 'continueFromChapter' | 'continueNote'>, episode: number): ChapterLookup {
  const range = mapping.ranges.find(item => episode >= item.episodeStart && episode <= item.episodeEnd);
  if (range) return { kind: 'found', chapterStart: range.chapterStart, chapterEnd: range.chapterEnd, note: range.note, nextChapter: range.chapterEnd + 1 };
  const lastEpisode = Math.max(0, ...mapping.ranges.map(item => item.episodeEnd));
  if (episode > lastEpisode && lastEpisode > 0) return { kind: 'after-anime', continueFromChapter: mapping.continueFromChapter, note: mapping.continueNote };
  return { kind: 'not-covered' };
}

// ── Arcs ──────────────────────────────────────────────────────────────────

export function arcEpisodeCount(arc: { episodeStart: number; episodeEnd: number }): number {
  return arc.episodeEnd - arc.episodeStart + 1;
}

export function arcForEpisode(list: Pick<ToolArcListDocument, 'arcs'>, episode: number) {
  return list.arcs.find(arc => episode >= arc.episodeStart && episode <= arc.episodeEnd) || null;
}
