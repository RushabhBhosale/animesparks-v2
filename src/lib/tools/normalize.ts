// Pure text helpers shared by the sync job, the build and the search API.

export function foldText(value: string): string {
  return value.normalize('NFKD').replace(/[̀-ͯ]/g, '').toLowerCase();
}

export function slugify(value: string): string {
  return foldText(value)
    .replace(/['’]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80)
    .replace(/-+$/g, '');
}

/** Alphanumeric-only key used for title equality and substring search. */
export function compactKey(value: string): string {
  return foldText(value).replace(/[^a-z0-9]/g, '');
}

/** Space-separated tokens, used for word-prefix search. */
export function searchTokens(value: string): string[] {
  return foldText(value).replace(/[^a-z0-9]+/g, ' ').trim().split(' ').filter(Boolean);
}

/**
 * Parses provider duration strings such as "24 min per ep", "1 hr 55 min",
 * "2 hr" or "45 sec per ep". Returns minutes, or null when unknown.
 */
export function parseDurationMinutes(value: string | null | undefined): number | null {
  if (!value) return null;
  const text = value.toLowerCase();
  const hours = Number(text.match(/(\d+(?:\.\d+)?)\s*(?:hr|hour)/)?.[1] || 0);
  const minutes = Number(text.match(/(\d+(?:\.\d+)?)\s*min/)?.[1] || 0);
  const seconds = Number(text.match(/(\d+(?:\.\d+)?)\s*sec/)?.[1] || 0);
  const total = hours * 60 + minutes + seconds / 60;
  return total > 0 ? Math.round(total * 100) / 100 : null;
}

/** Common fan abbreviations mapped to a compact title key. */
export const SEARCH_ALIASES: Record<string, string> = {
  aot: 'attackontitan',
  snk: 'shingekinokyojin',
  jjk: 'jujutsukaisen',
  op: 'onepiece',
  mha: 'myheroacademia',
  bnha: 'bokunoheroacademia',
  hxh: 'hunterxhunter',
  fmab: 'fullmetalalchemistbrotherhood',
  fma: 'fullmetalalchemist',
  kny: 'demonslayer',
  csm: 'chainsawman',
  rezero: 'rezero',
  sao: 'swordartonline',
  opm: 'onepunchman',
  mp100: 'mobpsycho100',
  tpn: 'thepromisedneverland',
  dbz: 'dragonballz',
  dbs: 'dragonballsuper',
  jojo: 'jojosbizarreadventure',
};

export function expandQuery(query: string): string {
  const key = compactKey(query);
  return SEARCH_ALIASES[key] || key;
}

const FORMAT_LABELS: Record<string, string> = {
  tv: 'TV', movie: 'Movie', ova: 'OVA', ona: 'ONA', special: 'Special', 'tv-special': 'TV Special', music: 'Music', other: 'Other',
};

export function formatLabel(format: string): string {
  return FORMAT_LABELS[format] || 'Other';
}

const STATUS_LABELS: Record<string, string> = {
  finished: 'Finished', airing: 'Airing', upcoming: 'Not yet aired', unknown: 'Unknown status',
};

export function statusLabel(status: string): string {
  return STATUS_LABELS[status] || 'Unknown status';
}

/** Formats a minute count as "3 d 4 h 12 min" style text. */
export function formatDuration(totalMinutes: number): string {
  if (!Number.isFinite(totalMinutes) || totalMinutes <= 0) return '0 min';
  const rounded = Math.round(totalMinutes);
  const days = Math.floor(rounded / 1440);
  const hours = Math.floor((rounded % 1440) / 60);
  const minutes = rounded % 60;
  const parts: string[] = [];
  if (days) parts.push(`${days} d`);
  if (hours) parts.push(`${hours} h`);
  if (minutes || !parts.length) parts.push(`${minutes} min`);
  return parts.join(' ');
}

/** Formats a minute count as whole hours with one decimal, e.g. "412.5 hours". */
export function formatHours(totalMinutes: number): string {
  const hours = totalMinutes / 60;
  return `${hours >= 100 ? Math.round(hours).toLocaleString('en-US') : (Math.round(hours * 10) / 10).toLocaleString('en-US')} hours`;
}
