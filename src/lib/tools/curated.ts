// Validation for curated datasets. Curated facts are only published when
// they carry sources and an explicit "verified" status from a named editor.

import type { CuratedSource, ToolArcListDocument, ToolFillerListDocument, ToolMangaMappingDocument, ToolWatchOrderDocument, Verification, WatchOrderKind } from './types.ts';

const KINDS: WatchOrderKind[] = ['chronological', 'beginner'];
const STATUSES = ['verified', 'needs-review', 'unverified'];

export interface CuratedWatchOrderFile {
  franchise: string;
  orders: Partial<Record<WatchOrderKind, {
    summary?: string;
    entries: Array<{ anime: string; optional?: boolean; episodes?: string; note?: string }>;
  }>>;
  sources: CuratedSource[];
  verification: Verification;
}

function isHttpsUrl(value: unknown): boolean {
  try {
    return typeof value === 'string' && new URL(value).protocol === 'https:';
  } catch {
    return false;
  }
}

/**
 * Validates one curated watch-order file. `knownAnime` and `knownFranchises`
 * are slug sets from MongoDB; references outside them are rejected.
 */
export function validateWatchOrderFile(input: unknown, knownFranchises: Set<string>, knownAnime: Set<string>, now = new Date()): { errors: string[]; documents: ToolWatchOrderDocument[] } {
  const errors: string[] = [];
  const file = input as CuratedWatchOrderFile;
  if (!file || typeof file !== 'object') return { errors: ['File must contain a JSON object.'], documents: [] };
  if (typeof file.franchise !== 'string' || !knownFranchises.has(file.franchise)) errors.push(`Unknown franchise slug: ${String(file.franchise)}`);
  if (!Array.isArray(file.sources) || !file.sources.length) errors.push('At least one source is required.');
  for (const source of file.sources || []) {
    if (!source?.name?.trim() || !isHttpsUrl(source.url)) errors.push(`Each source needs a name and an https URL: ${JSON.stringify(source)}`);
  }
  const verification = file.verification;
  if (!verification || !STATUSES.includes(verification.status)) errors.push('verification.status must be verified, needs-review or unverified.');
  if (verification?.status === 'verified') {
    if (!verification.verifiedBy?.trim()) errors.push('Verified data needs verification.verifiedBy.');
    if (!/^\d{4}-\d{2}-\d{2}$/.test(verification.verifiedAt || '')) errors.push('Verified data needs verification.verifiedAt (YYYY-MM-DD).');
  }
  const kinds = Object.keys(file.orders || {}) as WatchOrderKind[];
  if (!kinds.length) errors.push('orders must contain chronological and/or beginner.');
  const documents: ToolWatchOrderDocument[] = [];
  for (const kind of kinds) {
    if (!KINDS.includes(kind)) { errors.push(`Unsupported order kind: ${kind}`); continue; }
    const order = file.orders[kind]!;
    if (!Array.isArray(order?.entries) || order.entries.length < 2) { errors.push(`${kind}: at least two entries are required.`); continue; }
    order.entries.forEach((entry, index) => {
      if (!knownAnime.has(entry?.anime)) errors.push(`${kind}[${index}]: unknown anime slug ${String(entry?.anime)}`);
      if (entry?.episodes !== undefined && !/^\d+(-\d+)?$/.test(entry.episodes)) errors.push(`${kind}[${index}]: episodes must look like "1-12" or "5".`);
    });
    documents.push({
      franchiseSlug: file.franchise,
      kind,
      summary: order.summary?.trim() || undefined,
      entries: order.entries.map(entry => ({ slug: entry.anime, optional: Boolean(entry.optional), episodes: entry.episodes, note: entry.note?.trim() || undefined })),
      sources: file.sources,
      verification: file.verification,
      updatedAt: now.toISOString(),
    });
  }
  return { errors, documents: errors.length ? [] : documents };
}

export function isPublishable(order: Pick<ToolWatchOrderDocument, 'verification' | 'sources'>): boolean {
  return order.verification?.status === 'verified' && Boolean(order.sources?.length);
}

// ── Shared checks for the other curated datasets ─────────────────────────

function checkMeta(file: { sources?: CuratedSource[]; verification?: Verification }, errors: string[]) {
  if (!Array.isArray(file.sources) || !file.sources.length) errors.push('At least one source is required.');
  for (const source of file.sources || []) {
    if (!source?.name?.trim() || !isHttpsUrl(source.url)) errors.push(`Each source needs a name and an https URL: ${JSON.stringify(source)}`);
  }
  const verification = file.verification;
  if (!verification || !STATUSES.includes(verification.status)) errors.push('verification.status must be verified, needs-review or unverified.');
  if (verification?.status === 'verified') {
    if (!verification.verifiedBy?.trim()) errors.push('Verified data needs verification.verifiedBy.');
    if (!/^\d{4}-\d{2}-\d{2}$/.test(verification.verifiedAt || '')) errors.push('Verified data needs verification.verifiedAt (YYYY-MM-DD).');
  }
}

const isEpisode = (value: unknown) => Number.isInteger(value) && (value as number) >= 1 && (value as number) <= 5000;
const FILLER_TYPES = ['manga-canon', 'anime-canon', 'mixed', 'filler', 'recap'];

/** Ranges must be valid, in order and non-overlapping. */
function checkRanges(ranges: Array<{ start: number; end: number }>, label: string, errors: string[]) {
  let previousEnd = 0;
  ranges.forEach((range, index) => {
    if (!isEpisode(range.start) || !isEpisode(range.end) || range.end < range.start) errors.push(`${label}[${index}]: invalid episode range.`);
    else if (range.start <= previousEnd) errors.push(`${label}[${index}]: overlaps or is out of order.`);
    previousEnd = Math.max(previousEnd, range.end || 0);
  });
}

export function validateFillerFile(input: unknown, knownAnime: Set<string>, now = new Date()) {
  const errors: string[] = [];
  const file = input as Omit<ToolFillerListDocument, 'updatedAt'>;
  if (!file || !knownAnime.has(file.slug)) errors.push(`Unknown anime slug: ${String(file?.slug)}`);
  if (!Array.isArray(file?.ranges) || !file.ranges.length) errors.push('ranges is required.');
  else {
    checkRanges(file.ranges, 'ranges', errors);
    file.ranges.forEach((range, index) => { if (!FILLER_TYPES.includes(range.type)) errors.push(`ranges[${index}]: type must be one of ${FILLER_TYPES.join(', ')}.`); });
  }
  checkMeta(file || {}, errors);
  return { errors, document: errors.length ? null : { slug: file.slug, ranges: file.ranges, sources: file.sources, verification: file.verification, updatedAt: now.toISOString() } as ToolFillerListDocument };
}

export function validateMappingFile(input: unknown, knownAnime: Set<string>, now = new Date()) {
  const errors: string[] = [];
  const file = input as Omit<ToolMangaMappingDocument, 'updatedAt'>;
  if (!file || !knownAnime.has(file.slug)) errors.push(`Unknown anime slug: ${String(file?.slug)}`);
  if (!Array.isArray(file?.ranges) || !file.ranges.length) errors.push('ranges is required.');
  else {
    checkRanges(file.ranges.map(range => ({ start: range.episodeStart, end: range.episodeEnd })), 'ranges', errors);
    file.ranges.forEach((range, index) => {
      if (!isEpisode(range.chapterStart) || !isEpisode(range.chapterEnd) || range.chapterEnd < range.chapterStart) errors.push(`ranges[${index}]: invalid chapter range.`);
    });
  }
  if (file?.continueFromChapter !== undefined && !isEpisode(file.continueFromChapter)) errors.push('continueFromChapter must be a chapter number.');
  checkMeta(file || {}, errors);
  return { errors, document: errors.length ? null : { ...file, updatedAt: now.toISOString() } as ToolMangaMappingDocument };
}

export function validateArcFile(input: unknown, knownAnime: Set<string>, now = new Date()) {
  const errors: string[] = [];
  const file = input as Omit<ToolArcListDocument, 'updatedAt'>;
  if (!file || !knownAnime.has(file.slug)) errors.push(`Unknown anime slug: ${String(file?.slug)}`);
  if (!Array.isArray(file?.arcs) || !file.arcs.length) errors.push('arcs is required.');
  else {
    checkRanges(file.arcs.map(arc => ({ start: arc.episodeStart, end: arc.episodeEnd })), 'arcs', errors);
    file.arcs.forEach((arc, index) => {
      if (!arc.name?.trim()) errors.push(`arcs[${index}]: name is required.`);
      if (arc.classification && !['canon', 'filler', 'mixed'].includes(arc.classification)) errors.push(`arcs[${index}]: classification must be canon, filler or mixed.`);
      if (arc.summary && arc.summary.length > 400) errors.push(`arcs[${index}]: keep summaries under 400 characters and spoiler-free.`);
    });
  }
  checkMeta(file || {}, errors);
  return { errors, document: errors.length ? null : { ...file, updatedAt: now.toISOString() } as ToolArcListDocument };
}

export interface ScheduleNotice {
  slug: string;
  date: string;
  text: string;
  sources: CuratedSource[];
  verification: Verification;
}

export function validateNoticeFile(input: unknown, knownAnime: Set<string>) {
  const errors: string[] = [];
  const file = input as ScheduleNotice;
  if (!file || !knownAnime.has(file.slug)) errors.push(`Unknown anime slug: ${String(file?.slug)}`);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(file?.date || '')) errors.push('date must be YYYY-MM-DD.');
  if (!file?.text?.trim() || file.text.length > 160) errors.push('text is required (max 160 characters).');
  checkMeta(file || {}, errors);
  return { errors, document: errors.length ? null : file };
}
