// Watchlist data model. Stored locally today; every entry carries a stable
// id, provider-neutral slug and updatedAt so it can be merged with an
// account-backed copy later (last-writer-wins per entry).

export const WATCH_STATUSES = ['planning', 'watching', 'completed', 'on-hold', 'dropped'] as const;
export type WatchStatus = typeof WATCH_STATUSES[number];

export const STATUS_LABELS: Record<WatchStatus, string> = {
  planning: 'Planning', watching: 'Watching', completed: 'Completed', 'on-hold': 'On hold', dropped: 'Dropped',
};

export interface WatchlistEntry {
  slug: string;
  title: string;
  poster?: string;
  format?: string;
  year?: number;
  /** Known total episodes (null when unknown or ongoing without a total). */
  episodes: number | null;
  minutesPerEpisode: number | null;
  status: WatchStatus;
  watched: number;
  score?: number;
  addedAt: string;
  updatedAt: string;
}

export interface WatchlistFile {
  schema: 'animesparks.watchlist';
  version: 1;
  exportedAt: string;
  entries: WatchlistEntry[];
}

export function clampWatched(entry: Pick<WatchlistEntry, 'episodes'>, watched: number): number {
  const value = Math.max(0, Math.floor(Number.isFinite(watched) ? watched : 0));
  return entry.episodes ? Math.min(value, entry.episodes) : value;
}

export function completion(entry: Pick<WatchlistEntry, 'episodes' | 'watched' | 'status'>): number | null {
  if (entry.status === 'completed') return 100;
  if (!entry.episodes) return null;
  return Math.round((Math.min(entry.watched, entry.episodes) / entry.episodes) * 100);
}

/** Applies a status change with sensible episode bookkeeping. */
export function withStatus(entry: WatchlistEntry, status: WatchStatus, now: string): WatchlistEntry {
  const watched = status === 'completed' && entry.episodes ? entry.episodes : entry.watched;
  return { ...entry, status, watched, updatedAt: now };
}

export function stats(entries: WatchlistEntry[]) {
  const byStatus = Object.fromEntries(WATCH_STATUSES.map(status => [status, 0])) as Record<WatchStatus, number>;
  let watchedEpisodes = 0;
  let watchedMinutes = 0;
  let remainingMinutes = 0;
  let unknownRuntime = 0;
  let scoreSum = 0;
  let scored = 0;
  for (const entry of entries) {
    byStatus[entry.status]++;
    watchedEpisodes += entry.watched;
    if (entry.minutesPerEpisode) {
      watchedMinutes += entry.watched * entry.minutesPerEpisode;
      if (entry.episodes && ['planning', 'watching', 'on-hold'].includes(entry.status)) {
        remainingMinutes += Math.max(0, entry.episodes - entry.watched) * entry.minutesPerEpisode;
      }
    } else if (entry.watched) {
      unknownRuntime++;
    }
    if (entry.score) { scoreSum += entry.score; scored++; }
  }
  return {
    total: entries.length, byStatus, watchedEpisodes,
    watchedMinutes: Math.round(watchedMinutes), remainingMinutes: Math.round(remainingMinutes),
    unknownRuntime, meanScore: scored ? Math.round((scoreSum / scored) * 10) / 10 : null,
  };
}

export type SortKey = 'updated' | 'title' | 'progress' | 'added' | 'score';

export function sortEntries(entries: WatchlistEntry[], key: SortKey): WatchlistEntry[] {
  const copy = [...entries];
  const by: Record<SortKey, (a: WatchlistEntry, b: WatchlistEntry) => number> = {
    updated: (a, b) => b.updatedAt.localeCompare(a.updatedAt),
    added: (a, b) => b.addedAt.localeCompare(a.addedAt),
    title: (a, b) => a.title.localeCompare(b.title),
    progress: (a, b) => (completion(b) ?? -1) - (completion(a) ?? -1),
    score: (a, b) => (b.score || 0) - (a.score || 0),
  };
  return copy.sort((a, b) => by[key](a, b) || a.title.localeCompare(b.title));
}

export function exportFile(entries: WatchlistEntry[], now: string): WatchlistFile {
  return { schema: 'animesparks.watchlist', version: 1, exportedAt: now, entries };
}

/** Validates an imported file. Invalid entries are skipped and reported. */
export function parseImport(input: unknown): { entries: WatchlistEntry[]; skipped: number; error?: string } {
  const file = input as Partial<WatchlistFile>;
  if (!file || file.schema !== 'animesparks.watchlist' || file.version !== 1 || !Array.isArray(file.entries)) {
    return { entries: [], skipped: 0, error: 'This is not an AnimeSparks watchlist export.' };
  }
  const entries: WatchlistEntry[] = [];
  let skipped = 0;
  for (const raw of file.entries.slice(0, 5000)) {
    const valid = raw && typeof raw.slug === 'string' && /^[a-z0-9-]{1,120}$/.test(raw.slug) && typeof raw.title === 'string'
      && WATCH_STATUSES.includes(raw.status) && Number.isFinite(raw.watched) && raw.watched >= 0;
    if (!valid) { skipped++; continue; }
    const now = new Date().toISOString();
    entries.push({
      slug: raw.slug,
      title: raw.title.slice(0, 200),
      poster: typeof raw.poster === 'string' && raw.poster.startsWith('https://cdn.myanimelist.net/') ? raw.poster : undefined,
      format: typeof raw.format === 'string' ? raw.format.slice(0, 20) : undefined,
      year: Number.isInteger(raw.year) ? raw.year : undefined,
      episodes: Number.isInteger(raw.episodes) && raw.episodes! > 0 ? raw.episodes : null,
      minutesPerEpisode: Number.isFinite(raw.minutesPerEpisode) && raw.minutesPerEpisode! > 0 ? raw.minutesPerEpisode : null,
      status: raw.status,
      watched: Math.floor(raw.watched),
      score: Number.isInteger(raw.score) && raw.score! >= 1 && raw.score! <= 10 ? raw.score : undefined,
      addedAt: typeof raw.addedAt === 'string' ? raw.addedAt : now,
      updatedAt: typeof raw.updatedAt === 'string' ? raw.updatedAt : now,
    });
  }
  return { entries, skipped };
}

/** Merges two lists; for the same slug the most recently updated entry wins. */
export function mergeEntries(current: WatchlistEntry[], incoming: WatchlistEntry[]): WatchlistEntry[] {
  const merged = new Map(current.map(entry => [entry.slug, entry]));
  for (const entry of incoming) {
    const existing = merged.get(entry.slug);
    if (!existing || entry.updatedAt > existing.updatedAt) merged.set(entry.slug, entry);
  }
  return [...merged.values()];
}
