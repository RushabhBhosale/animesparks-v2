// Tenrai (https://api.tenrai.org) adapter. Tenrai mirrors MyAnimeList using
// the Jikan v4 schema. This is the only module that knows that schema; it is
// used by the scheduled sync job, never by pages or visitors.
//
// Limits verified 2026-10-16: 120 requests/minute and 4/second per IP;
// 429 responses carry Retry-After; persistent overuse returns 403.

import { parseDurationMinutes } from '../normalize.ts';
import type { AnimeFormat, AnimeRelationRef, AnimeStatus, EpisodeFlag, MangaStatus, ProviderAnime, RelationKind, ToolMangaDocument } from '../types.ts';

export const TENRAI_BASE_URL = 'https://api.tenrai.org/v1';

export interface TenraiClientOptions {
  baseUrl?: string;
  /** Minimum gap between requests. 600 ms stays under 120 rpm with headroom. */
  minIntervalMs?: number;
  maxRetries?: number;
  timeoutMs?: number;
  serverKey?: string;
  fetchImpl?: typeof fetch;
  sleep?: (ms: number) => Promise<void>;
  now?: () => number;
  random?: () => number;
  log?: (message: string) => void;
}

export class TenraiBlockedError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'TenraiBlockedError';
  }
}

export class TenraiRequestError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.name = 'TenraiRequestError';
    this.status = status;
  }
}

export interface TenraiPage<T> {
  data: T[];
  hasNextPage: boolean;
  lastPage: number;
}

/** Exponential backoff with full jitter, capped at 60 s. */
export function backoffDelay(attempt: number, random: () => number = Math.random, baseMs = 1000): number {
  const ceiling = Math.min(60000, baseMs * 2 ** attempt);
  return Math.round(ceiling / 2 + random() * (ceiling / 2));
}

export function parseRetryAfter(value: string | null, now: number): number | null {
  if (!value) return null;
  const seconds = Number(value);
  if (Number.isFinite(seconds) && seconds >= 0) return Math.min(seconds * 1000, 120000);
  const date = Date.parse(value);
  return Number.isFinite(date) ? Math.min(Math.max(date - now, 0), 120000) : null;
}

export class TenraiClient {
  private readonly options: Required<Omit<TenraiClientOptions, 'serverKey'>> & { serverKey?: string };
  private lastRequestAt = 0;
  requestCount = 0;

  constructor(options: TenraiClientOptions = {}) {
    this.options = {
      baseUrl: options.baseUrl || TENRAI_BASE_URL,
      minIntervalMs: options.minIntervalMs ?? 600,
      maxRetries: options.maxRetries ?? 5,
      timeoutMs: options.timeoutMs ?? 20000,
      serverKey: options.serverKey,
      // Workers reject a detached `fetch` ("Illegal invocation"), so keep it bound.
      fetchImpl: options.fetchImpl || ((input, init) => fetch(input, init)),
      sleep: options.sleep || (ms => new Promise(resolve => setTimeout(resolve, ms))),
      now: options.now || Date.now,
      random: options.random || Math.random,
      log: options.log || (() => {}),
    };
  }

  /** GET a Tenrai path. Returns null for 404. Throws TenraiBlockedError on 403. */
  async get<T>(path: string, params: Record<string, string | number | boolean | undefined> = {}): Promise<T | null> {
    const url = new URL(`${this.options.baseUrl}${path}`);
    for (const [key, value] of Object.entries(params)) {
      if (value !== undefined && value !== false) url.searchParams.set(key, value === true ? '' : String(value));
    }
    const headers: Record<string, string> = { Accept: 'application/json', 'User-Agent': 'AnimeSparksToolsSync/1.0 (+https://www.animesparks.blog/tools)' };
    if (this.options.serverKey) headers['X-Server-Key'] = this.options.serverKey;

    for (let attempt = 0; ; attempt++) {
      await this.throttle();
      let response: Response;
      try {
        this.requestCount++;
        response = await this.options.fetchImpl(url.toString(), { headers, signal: AbortSignal.timeout(this.options.timeoutMs) });
      } catch (error) {
        if (attempt >= this.options.maxRetries) throw new TenraiRequestError(`Network failure for ${url.pathname}: ${(error as Error).message}`, 0);
        const delay = backoffDelay(attempt, this.options.random);
        this.options.log(`[tenrai] ${url.pathname}: network error, retrying in ${delay} ms`);
        await this.options.sleep(delay);
        continue;
      }
      if (response.ok) return await response.json() as T;
      if (response.status === 404) return null;
      if (response.status === 403) throw new TenraiBlockedError('Tenrai returned 403 (anti-abuse block). Stopping the sync to avoid extending the block.');
      const retryable = response.status === 429 || response.status >= 500;
      if (!retryable || attempt >= this.options.maxRetries) {
        throw new TenraiRequestError(`Tenrai ${response.status} for ${url.pathname}${url.search}`, response.status);
      }
      const retryAfter = parseRetryAfter(response.headers.get('Retry-After'), this.options.now());
      const delay = Math.max(retryAfter ?? 0, backoffDelay(attempt, this.options.random));
      this.options.log(`[tenrai] ${url.pathname}: HTTP ${response.status}, retrying in ${delay} ms`);
      await this.options.sleep(delay);
    }
  }

  private async throttle() {
    const wait = this.lastRequestAt + this.options.minIntervalMs - this.options.now();
    if (wait > 0) await this.options.sleep(wait);
    this.lastRequestAt = this.options.now();
  }

  async page(path: string, params: Record<string, string | number | boolean | undefined>): Promise<TenraiPage<JikanAnime>> {
    const body = await this.get<{ data?: JikanAnime[]; pagination?: { has_next_page?: boolean; last_visible_page?: number } }>(path, params);
    return {
      data: body?.data || [],
      hasNextPage: Boolean(body?.pagination?.has_next_page),
      lastPage: body?.pagination?.last_visible_page || 1,
    };
  }

  async topByPopularity(page: number, limit = 100) {
    return this.page('/top/anime', { filter: 'bypopularity', page, limit, sfw: true });
  }

  async currentSeason(page: number, limit = 100) {
    return this.page('/seasons/now', { page, limit, sfw: true });
  }

  async search(query: string, limit = 10) {
    return this.page('/anime', { q: query, limit, sfw: true, order_by: 'members', sort: 'desc' });
  }

  async full(malId: number): Promise<JikanAnime | null> {
    const body = await this.get<{ data?: JikanAnime }>(`/anime/${malId}/full`);
    return body?.data || null;
  }

  /** Counts episodes whose air date is on or before `now`. */
  async airedEpisodeCount(malId: number, now = new Date()): Promise<number | null> {
    const first = await this.get<JikanEpisodesPage>(`/anime/${malId}/episodes`, { page: 1 });
    if (!first) return null;
    const lastPage = first.pagination?.last_visible_page || 1;
    const last = lastPage > 1 ? await this.get<JikanEpisodesPage>(`/anime/${malId}/episodes`, { page: lastPage }) : first;
    if (!last) return null;
    const cutoff = now.getTime();
    const airedOnLastPage = (last.data || []).filter(episode => {
      const aired = Date.parse(episode.aired || '');
      return Number.isFinite(aired) && aired <= cutoff;
    }).length;
    // Earlier pages are full (100 episodes) and in the past by definition
    // when the final page has any aired episode.
    if (airedOnLastPage === 0 && lastPage > 1) return null;
    return (lastPage - 1) * 100 + airedOnLastPage;
  }
}

// ── Jikan v4 shapes (subset actually read) ────────────────────────────────

interface JikanNamed { mal_id: number; name: string; type?: string }
interface JikanImageSet { image_url?: string; small_image_url?: string; large_image_url?: string }
interface JikanEpisodesPage {
  pagination?: { last_visible_page?: number; has_next_page?: boolean };
  data?: Array<{ mal_id: number; aired?: string | null; filler?: boolean; recap?: boolean }>;
}

export interface JikanAnime {
  mal_id: number;
  url?: string;
  images?: { jpg?: JikanImageSet; webp?: JikanImageSet };
  approved?: boolean;
  title: string;
  title_english?: string | null;
  title_japanese?: string | null;
  title_synonyms?: string[];
  titles?: Array<{ type: string; title: string }>;
  type?: string | null;
  source?: string | null;
  episodes?: number | null;
  status?: string | null;
  airing?: boolean;
  aired?: { from?: string | null; to?: string | null };
  duration?: string | null;
  rating?: string | null;
  score?: number | null;
  popularity?: number | null;
  members?: number | null;
  synopsis?: string | null;
  season?: string | null;
  year?: number | null;
  broadcast?: { day?: string | null; time?: string | null; timezone?: string | null };
  studios?: JikanNamed[];
  genres?: JikanNamed[];
  explicit_genres?: JikanNamed[];
  themes?: JikanNamed[];
  demographics?: JikanNamed[];
  relations?: Array<{ relation: string; entry: Array<{ mal_id: number; type: string; name: string }> }>;
}

const FORMATS: Record<string, AnimeFormat> = {
  tv: 'tv', movie: 'movie', ova: 'ova', ona: 'ona', special: 'special', 'tv special': 'tv-special', music: 'music',
};

const STATUSES: Record<string, AnimeStatus> = {
  'finished airing': 'finished', 'currently airing': 'airing', 'not yet aired': 'upcoming',
};

const RELATIONS: Record<string, RelationKind> = {
  sequel: 'sequel', prequel: 'prequel', 'side story': 'side-story', 'parent story': 'parent-story',
  summary: 'summary', 'full story': 'full-story', 'alternative version': 'alternative-version',
  'alternative setting': 'alternative-setting', 'spin-off': 'spin-off', character: 'character', adaptation: 'adaptation',
};

function cleanImage(url: string | undefined): string | undefined {
  // MAL serves a placeholder for titles without art; treat it as missing.
  return url && url.startsWith('https://') && !/\/qm_50\.gif|apple-touch-icon/.test(url) ? url : undefined;
}

function isoOrNull(value: string | null | undefined): string | null {
  const time = Date.parse(value || '');
  return Number.isFinite(time) ? new Date(time).toISOString() : null;
}

/** Maps one Jikan-shaped anime to the neutral ProviderAnime model. */
export function mapJikanAnime(raw: JikanAnime, fetchedAt: string): ProviderAnime {
  const jpg = raw.images?.jpg || {};
  const english = raw.title_english?.trim() || raw.titles?.find(title => title.type === 'English')?.title?.trim();
  const relations: AnimeRelationRef[] | undefined = raw.relations
    ? raw.relations.flatMap(group => group.entry
      .filter(entry => entry.type === 'anime')
      .map(entry => ({ kind: RELATIONS[group.relation.toLowerCase()] || 'other', externalIds: { mal: entry.mal_id } })))
    : undefined;
  return {
    externalIds: { mal: raw.mal_id },
    title: english || raw.title,
    titleEnglish: english || undefined,
    titleRomaji: raw.title,
    titleJapanese: raw.title_japanese || undefined,
    synonyms: (raw.title_synonyms || []).filter(Boolean).slice(0, 8),
    format: FORMATS[(raw.type || '').toLowerCase()] || 'other',
    status: STATUSES[(raw.status || '').toLowerCase()] || 'unknown',
    episodes: typeof raw.episodes === 'number' && raw.episodes > 0 ? raw.episodes : null,
    durationMinutes: parseDurationMinutes(raw.duration),
    airedFrom: isoOrNull(raw.aired?.from),
    airedTo: isoOrNull(raw.aired?.to),
    season: raw.season || undefined,
    year: raw.year || (raw.aired?.from ? new Date(raw.aired.from).getUTCFullYear() : null) || null,
    sourceMaterial: raw.source || undefined,
    ageRating: raw.rating || undefined,
    genres: (raw.genres || []).map(genre => genre.name),
    themes: (raw.themes || []).map(theme => theme.name),
    demographics: (raw.demographics || []).map(item => item.name),
    studios: (raw.studios || []).map(studio => studio.name),
    synopsis: raw.synopsis?.replace(/\s*\[Written by MAL Rewrite\]\s*$/i, '').trim() || undefined,
    images: hidesArtwork(raw) ? {} : {
      poster: cleanImage(jpg.image_url),
      posterSmall: cleanImage(jpg.small_image_url) || cleanImage(jpg.image_url),
      posterLarge: cleanImage(jpg.large_image_url),
    },
    broadcast: raw.broadcast?.day || raw.broadcast?.time
      ? { day: raw.broadcast.day || undefined, time: raw.broadcast.time || undefined, timezone: raw.broadcast.timezone || undefined }
      : undefined,
    score: typeof raw.score === 'number' ? raw.score : null,
    popularity: typeof raw.popularity === 'number' && raw.popularity > 0 ? raw.popularity : null,
    members: typeof raw.members === 'number' ? raw.members : null,
    relations,
    sourceWorks: raw.relations
      ? raw.relations.filter(group => group.relation.toLowerCase() === 'adaptation')
        .flatMap(group => group.entry.filter(entry => entry.type === 'manga').map(entry => ({ malManga: entry.mal_id })))
      : undefined,
    provenance: {
      provider: 'tenrai',
      source: 'MyAnimeList',
      sourceUrl: raw.url || `https://myanimelist.net/anime/${raw.mal_id}`,
      fetchedAt,
    },
  };
}

/**
 * Excludes adult-only titles (Rx, explicit genres). R+ titles stay so that
 * mainstream franchises are not broken, but their artwork is dropped.
 */
export function isSafeForCatalog(raw: JikanAnime): boolean {
  if ((raw.explicit_genres || []).length) return false;
  if (/^rx/i.test(raw.rating || '')) return false;
  return !(raw.genres || []).some(genre => /hentai|erotica/i.test(genre.name));
}

export function hidesArtwork(raw: Pick<JikanAnime, 'rating'>): boolean {
  return /^r\+/i.test(raw.rating || '');
}

// ── Manga, episodes, characters, recommendations ─────────────────────────

export interface JikanManga {
  mal_id: number;
  url?: string;
  title: string;
  title_english?: string | null;
  type?: string | null;
  chapters?: number | null;
  volumes?: number | null;
  status?: string | null;
  published?: { from?: string | null; to?: string | null };
  authors?: JikanNamed[];
  serializations?: JikanNamed[];
}

const MANGA_STATUSES: Record<string, MangaStatus> = {
  publishing: 'publishing', finished: 'finished', 'on hiatus': 'hiatus', discontinued: 'discontinued', 'not yet published': 'upcoming',
};

/** "Yamada, Kanehito" → "Kanehito Yamada". */
export function personName(name: string): string {
  const [family, given] = name.split(',').map(part => part.trim());
  return given ? `${given} ${family}` : family;
}

export function mapJikanManga(raw: JikanManga, fetchedAt: string): Omit<ToolMangaDocument, 'updatedAt'> {
  return {
    externalIds: { malManga: raw.mal_id },
    title: raw.title_english?.trim() || raw.title,
    titleEnglish: raw.title_english?.trim() || undefined,
    type: raw.type || 'Manga',
    status: MANGA_STATUSES[(raw.status || '').toLowerCase()] || 'unknown',
    chapters: typeof raw.chapters === 'number' && raw.chapters > 0 ? raw.chapters : null,
    volumes: typeof raw.volumes === 'number' && raw.volumes > 0 ? raw.volumes : null,
    publishedFrom: isoOrNull(raw.published?.from),
    publishedTo: isoOrNull(raw.published?.to),
    authors: (raw.authors || []).map(author => personName(author.name)),
    serializations: (raw.serializations || []).map(item => item.name),
    provenance: { provider: 'tenrai', source: 'MyAnimeList', sourceUrl: raw.url || `https://myanimelist.net/manga/${raw.mal_id}`, fetchedAt },
  };
}

interface JikanEpisode { mal_id: number; title?: string | null; title_romanji?: string | null; aired?: string | null; filler?: boolean; recap?: boolean }

export function mapEpisodes(raw: JikanEpisode[]): EpisodeFlag[] {
  return raw.map(episode => {
    const flag: EpisodeFlag = { n: episode.mal_id };
    const title = episode.title?.trim() || episode.title_romanji?.trim();
    if (title) flag.t = title;
    const aired = isoOrNull(episode.aired);
    if (aired) flag.a = aired.slice(0, 10);
    if (episode.filler) flag.f = 1;
    if (episode.recap) flag.r = 1;
    return flag;
  });
}

/** Fetches every episode page (100 per page). */
export async function fetchAllEpisodes(client: TenraiClient, malId: number, maxPages = 15): Promise<EpisodeFlag[] | null> {
  const all: JikanEpisode[] = [];
  for (let page = 1; page <= maxPages; page++) {
    const body = await client.get<{ data?: JikanEpisode[]; pagination?: { has_next_page?: boolean } }>(`/anime/${malId}/episodes`, { page });
    if (!body) return page === 1 ? null : mapEpisodes(all);
    all.push(...(body.data || []));
    if (!body.pagination?.has_next_page) break;
  }
  return mapEpisodes(all);
}

export async function fetchManga(client: TenraiClient, malMangaId: number): Promise<JikanManga | null> {
  const body = await client.get<{ data?: JikanManga }>(`/manga/${malMangaId}`);
  return body?.data || null;
}

export async function fetchMainCharacters(client: TenraiClient, malId: number): Promise<string[]> {
  const body = await client.get<{ data?: Array<{ role?: string; favorites?: number; character?: { name?: string } }> }>(`/anime/${malId}/characters`);
  return (body?.data || [])
    .filter(item => item.role === 'Main' && item.character?.name)
    .sort((a, b) => (b.favorites || 0) - (a.favorites || 0))
    .slice(0, 3)
    .map(item => personName(item.character!.name!));
}

export async function fetchRecommendations(client: TenraiClient, malId: number): Promise<Array<{ mal: number; votes: number }>> {
  const body = await client.get<{ data?: Array<{ entry?: { mal_id?: number }; votes?: number }> }>(`/anime/${malId}/recommendations`);
  return (body?.data || [])
    .filter(item => item.entry?.mal_id)
    .slice(0, 12)
    .map(item => ({ mal: item.entry!.mal_id!, votes: item.votes || 0 }));
}

export async function schedulePage(client: TenraiClient, page: number, limit = 100) {
  return client.page('/schedules', { page, limit, sfw: true, kids: 'false' });
}
