// Builds the "arcs in order" view for an arc landing page: every season's
// arcs on one timeline, with manga chapters and filler counts per arc.

import type { CanonType } from './types.ts';

export interface ArcGuideSeason {
  slug: string;
  title: string;
  /** Episodes in this entry (aired so far when airing). */
  episodes: number | null;
  arcs: Array<{ name: string; episodeStart: number; episodeEnd: number; classification?: 'canon' | 'filler' | 'mixed' }>;
  ranges?: Array<{ episodeStart: number; episodeEnd: number; chapterStart: number; chapterEnd: number }>;
  /** Per-episode type from the Filler Checker, when the entry has one. */
  episodeTypes?: Map<number, CanonType>;
}

export interface ArcGuideRow {
  name: string;
  /** Seasons the arc runs through, in order. */
  seasons: Array<{ slug: string; title: string; episodeStart: number; episodeEnd: number }>;
  /** Episode numbers across the whole series. */
  overallStart: number;
  overallEnd: number;
  length: number;
  chapters: [number, number] | null;
  filler: number;
  classification?: 'canon' | 'filler' | 'mixed';
}

/** "Shibuya Incident" and "Shibuya Incident Arc" are one arc. */
export const arcKey = (name: string) => cleanArcName(name).toLowerCase().replace(/\s+arc$/, '').trim();

/** Label for wiki entries that list episodes without naming an arc. */
export const UNNAMED_ARC = 'Episodes outside a named arc';

/**
 * Repairs wiki-import artefacts in arc names: stray trailing commas, "(Arc)"
 * markers, two names run together without a space, and the literal "None" the
 * wiki uses for episodes that belong to no arc. It never invents a name.
 */
export function cleanArcName(name: string): string {
  let clean = name.replace(/\s+/g, ' ').trim();
  if (!clean || /^(none|n\/a|-|—)$/i.test(clean)) return UNNAMED_ARC;
  clean = clean.replace(/\s*\(\s*arc\s*\)/gi, ' Arc').replace(/,(?=\S)/g, ' & ');
  clean = clean.replace(/^[\s,;:]+|[\s,;:]+$/g, '');
  return clean || UNNAMED_ARC;
}

/** Arc names with a consistent "Arc" suffix ("Fearsome Womb" → "Fearsome Womb Arc"). */
export function arcLabel(name: string): string {
  const clean = cleanArcName(name);
  // Unnamed groups and subtitled titles ("Book: Light and Darkness") read wrongly with "Arc" appended.
  if (clean === UNNAMED_ARC || /[:,&]/.test(clean)) return clean;
  return /\b(arc|saga|prologue|epilogue)\b/i.test(clean) ? clean : `${clean} Arc`;
}

export function buildArcGuide(seasons: ArcGuideSeason[]): ArcGuideRow[] {
  const rows: ArcGuideRow[] = [];
  let offset = 0;
  for (const season of seasons) {
    for (const arc of season.arcs) {
      const types = [...Array(arc.episodeEnd - arc.episodeStart + 1)].map((_, index) => season.episodeTypes?.get(arc.episodeStart + index));
      const filler = types.filter(type => type === 'filler' || type === 'recap').length;
      const inArc = (season.ranges || []).filter(range => range.episodeStart >= arc.episodeStart && range.episodeEnd <= arc.episodeEnd);
      const chapters: [number, number] | null = inArc.length
        ? [Math.min(...inArc.map(range => range.chapterStart)), Math.max(...inArc.map(range => range.chapterEnd))]
        : null;
      const part = { slug: season.slug, title: season.title, episodeStart: arc.episodeStart, episodeEnd: arc.episodeEnd };
      const last = rows.at(-1);
      // An arc that carries on into the next season stays one row.
      if (last && arcKey(last.name) === arcKey(arc.name) && last.overallEnd + 1 === offset + arc.episodeStart) {
        last.seasons.push(part);
        last.overallEnd = offset + arc.episodeEnd;
        last.length += arc.episodeEnd - arc.episodeStart + 1;
        last.filler += filler;
        if (chapters) last.chapters = last.chapters ? [Math.min(last.chapters[0], chapters[0]), Math.max(last.chapters[1], chapters[1])] : chapters;
        if (/ Arc$/.test(arc.name)) last.name = arc.name;
        continue;
      }
      rows.push({
        name: arc.name,
        seasons: [part],
        overallStart: offset + arc.episodeStart,
        overallEnd: offset + arc.episodeEnd,
        length: arc.episodeEnd - arc.episodeStart + 1,
        chapters,
        filler,
        classification: arc.classification,
      });
    }
    offset += season.episodes || season.arcs.at(-1)?.episodeEnd || 0;
  }
  return rows.map(row => ({ ...row, name: arcLabel(row.name) }));
}

/** Filler arcs: labelled filler, or every episode flagged filler/recap. */
export function isFillerArc(row: ArcGuideRow): boolean {
  return row.classification === 'filler' || (row.classification !== 'canon' && row.length > 0 && row.filler === row.length);
}
