// Live fallback for anime search. When a query matches nothing in the
// build-time catalogue, the Worker asks the provider, returns matching
// titles to the visitor straight away, and saves them to MongoDB in the
// background. The next rebuild adds them to the static index.
//
// Safety: minimum query length, per-isolate rate limit, edge caching of
// lookups, adult titles excluded, and inserts only (existing records are
// never modified).

import type { AnyBulkWriteOperation, Db } from 'mongodb';
import { slugify } from './normalize.ts';
import { TenraiClient, isSafeForCatalog, mapJikanAnime, type JikanAnime } from './providers/tenrai.ts';
import { buildSearchKey } from './search.ts';
import type { AnimeIndexEntry, ProviderAnime } from './types.ts';

export const LIVE_MIN_QUERY = 3;
export const LIVE_MAX_QUERY = 60;
const LIVE_FORMATS = new Set(['tv', 'movie', 'ova', 'ona', 'special', 'tv-special']);

/** Sliding-window limiter, per Worker isolate. */
export function createRateLimiter(limit: number, windowMs: number, now: () => number = Date.now) {
  const hits: number[] = [];
  return () => {
    const cutoff = now() - windowMs;
    while (hits.length && hits[0] <= cutoff) hits.shift();
    if (hits.length >= limit) return false;
    hits.push(now());
    return true;
  };
}

export function normalizeLiveQuery(query: string): string | null {
  const value = query.normalize('NFKC').replace(/\s+/g, ' ').trim().slice(0, LIVE_MAX_QUERY);
  return value.replace(/[^\p{L}\p{N}]/gu, '').length >= LIVE_MIN_QUERY ? value : null;
}

/**
 * Slug for a live-added title. Plain title slug unless another title already
 * uses it, in which case the provider id keeps it unique and stable.
 */
export function liveSlug(anime: ProviderAnime, takenBy: (slug: string) => number | undefined): string {
  const base = slugify(anime.title) || slugify(anime.titleRomaji || '') || 'anime';
  const owner = takenBy(base);
  return owner === undefined || owner === anime.externalIds.mal ? base : `${base}-${anime.externalIds.mal}`;
}

export function toIndexEntry(anime: ProviderAnime, slug: string): AnimeIndexEntry {
  return {
    s: slug,
    t: anime.title,
    o: anime.titleRomaji && anime.titleRomaji !== anime.title ? anime.titleRomaji : undefined,
    k: buildSearchKey([anime.title, anime.titleEnglish, anime.titleRomaji, ...anime.synonyms]),
    f: anime.format,
    st: anime.status,
    y: anime.year || undefined,
    e: anime.episodes || undefined,
    d: anime.durationMinutes || undefined,
    p: anime.images.posterSmall || anime.images.poster,
    r: anime.popularity || undefined,
    m: anime.externalIds.mal,
  };
}

/** Provider search, filtered to safe, watchable titles. */
export async function searchProvider(query: string, client: TenraiClient, limit = 6): Promise<ProviderAnime[]> {
  const body = await client.get<{ data?: JikanAnime[] }>('/anime', { q: query, limit: 10, sfw: true, order_by: 'members', sort: 'desc' });
  const fetchedAt = new Date().toISOString();
  return (body?.data || [])
    .filter(isSafeForCatalog)
    .map(raw => mapJikanAnime(raw, fetchedAt))
    .filter(anime => LIVE_FORMATS.has(anime.format) && anime.externalIds.mal)
    .slice(0, limit);
}

/** Insert-only persistence. Returns the slugs actually stored. */
export async function persistLiveResults(
  db: Db,
  items: Array<{ anime: ProviderAnime; slug: string }>,
  now = new Date().toISOString(),
): Promise<void> {
  if (!items.length) return;
  const collection = db.collection('toolAnime');
  const existing = await collection.find(
    { $or: [{ 'externalIds.mal': { $in: items.map(item => item.anime.externalIds.mal) } }, { slug: { $in: items.map(item => item.slug) } }] },
    { projection: { _id: 0, slug: 1, 'externalIds.mal': 1 } },
  ).toArray();
  const knownIds = new Set(existing.map(doc => (doc.externalIds as { mal?: number } | undefined)?.mal));
  const slugOwner = new Map(existing.map(doc => [doc.slug as string, (doc.externalIds as { mal?: number } | undefined)?.mal]));
  const operations = items
    .filter(item => !knownIds.has(item.anime.externalIds.mal))
    .map(({ anime, slug }) => {
      const owner = slugOwner.get(slug);
      const finalSlug = owner !== undefined && owner !== anime.externalIds.mal ? `${slug}-${anime.externalIds.mal}` : slug;
      const { relations: _relations, sourceWorks: _sourceWorks, ...fields } = anime;
      const document: Record<string, unknown> = Object.fromEntries(Object.entries({ ...fields, slug: finalSlug, createdAt: now, updatedAt: now, liveAddedAt: now }).filter(([, value]) => value !== undefined));
      document.provenance = { ...anime.provenance, addedBy: 'live-lookup' };
      return { updateOne: { filter: { 'externalIds.mal': anime.externalIds.mal }, update: { $setOnInsert: document }, upsert: true } } as AnyBulkWriteOperation;
    });
  if (operations.length) await collection.bulkWrite(operations, { ordered: false });
}
