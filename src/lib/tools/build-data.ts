// Build-time snapshot of tool data. Like the article snapshot, it is read
// from MongoDB once per build and prerendered into static pages and JSON.
// Visitors never cause a MongoDB or provider request.

import { withDatabaseRetry } from '../content/mongodb';
import type { ArticleCard } from '../content/types';
import { isPublishable } from './curated.ts';
import { compareRelease, sumWatchTime, watchableTime } from './franchise.ts';
import { compactKey } from './normalize.ts';
import { buildSearchKey } from './search.ts';
import { canonicalFranchiseSlug } from './landings.ts';
import type { AnimeIndexEntry, FranchiseIndexEntry, FranchiseRole, ToolAnimeDocument, ToolFranchiseDocument, ToolWatchOrderDocument, WatchOrderKind } from './types.ts';

declare const process: { env: Record<string, string | undefined> };

const INDEXED_FORMATS = new Set(['tv', 'movie', 'ova', 'ona', 'special', 'tv-special']);

export interface FranchiseEntryView {
  slug: string;
  title: string;
  titleRomaji?: string;
  format: ToolAnimeDocument['format'];
  status: ToolAnimeDocument['status'];
  year: number | null;
  airedFrom: string | null;
  episodes: number | null;
  episodesAired: number | null;
  durationMinutes: number | null;
  watchEpisodes: number | null;
  watchMinutes: number | null;
  poster?: string;
  sourceUrl?: string;
  role: FranchiseRole;
}

export interface CuratedOrderView {
  kind: WatchOrderKind;
  summary?: string;
  entries: Array<FranchiseEntryView & { optional: boolean; note?: string; episodeRange?: string }>;
  sources: ToolWatchOrderDocument['sources'];
  verifiedAt?: string;
  verifiedBy?: string;
}

export interface FranchiseView {
  slug: string;
  title: string;
  releaseOrder: FranchiseEntryView[];
  curated: CuratedOrderView[];
  truncated: boolean;
  totals: { all: ReturnType<typeof sumWatchTime>; main: ReturnType<typeof sumWatchTime> };
  popularity: number | null;
  poster?: string;
  indexable: boolean;
  updatedAt: string;
  fetchedAt: string;
  titleKeys: Set<string>;
}

export type AnimeSnapshot = Pick<ToolAnimeDocument, 'slug' | 'title' | 'titleEnglish' | 'titleRomaji' | 'synonyms' | 'format' | 'status' | 'episodes' | 'episodesAired' | 'durationMinutes' | 'airedFrom' | 'year' | 'images' | 'popularity' | 'franchiseSlug' | 'legacy' | 'provenance' | 'genres' | 'externalIds'
  | 'themes' | 'demographics' | 'studios' | 'score' | 'sourceWorks' | 'season' | 'broadcast' | 'sourceMaterial' | 'ageRating'> & { recommendations?: Array<{ mal: number; votes: number }> };

async function loadToolsData() {
  const uri = process.env.MONGODB_URI;
  if (!uri) throw new Error('MONGODB_URI is required for public prerendering');
  return withDatabaseRetry(uri, async db => {
    const [anime, franchises, orders, lastRun] = await Promise.all([
      db.collection<ToolAnimeDocument>('toolAnime').find({}, { projection: {
        _id: 0, slug: 1, title: 1, titleEnglish: 1, titleRomaji: 1, synonyms: 1, format: 1, status: 1, episodes: 1, episodesAired: 1,
        durationMinutes: 1, airedFrom: 1, year: 1, images: 1, popularity: 1, franchiseSlug: 1, legacy: 1, provenance: 1, genres: 1, externalIds: 1,
        themes: 1, demographics: 1, studios: 1, score: 1, sourceWorks: 1, season: 1, broadcast: 1, sourceMaterial: 1, ageRating: 1, recommendations: 1,
      } }).toArray() as Promise<AnimeSnapshot[]>,
      db.collection<ToolFranchiseDocument & { active?: boolean }>('toolFranchises').find({ active: true }, { projection: { _id: 0 } }).toArray(),
      db.collection<ToolWatchOrderDocument>('toolWatchOrders').find({}, { projection: { _id: 0 } }).toArray(),
      db.collection('toolSyncRuns').find({ status: { $in: ['success', 'partial'] }, dryRun: { $ne: true } }, { projection: { _id: 0, finishedAt: 1, status: 1 } })
        .sort({ startedAt: -1 }).limit(1).toArray(),
    ]);
    const bySlug = new Map(anime.map(item => [item.slug, item]));
    const view = (item: AnimeSnapshot, role: FranchiseRole): FranchiseEntryView => {
      const time = watchableTime(item);
      return {
        slug: item.slug, title: item.title, titleRomaji: item.titleRomaji !== item.title ? item.titleRomaji : undefined,
        format: item.format, status: item.status, year: item.year, airedFrom: item.airedFrom,
        episodes: item.episodes, episodesAired: item.episodesAired ?? null, durationMinutes: item.durationMinutes,
        watchEpisodes: time.episodes, watchMinutes: time.minutes,
        poster: item.images?.poster || item.images?.posterSmall, sourceUrl: item.provenance?.sourceUrl, role,
      };
    };
    const publishable = orders.filter(isPublishable);
    const franchiseViews: FranchiseView[] = franchises.map(franchise => {
      const publicSlug = canonicalFranchiseSlug(franchise.slug);
      const members = franchise.members
        .map(member => ({ member, item: bySlug.get(member.slug) }))
        .filter((pair): pair is { member: typeof pair.member; item: AnimeSnapshot } => Boolean(pair.item));
      const releaseOrder = members
        .sort((a, b) => compareRelease(
          { airedFrom: a.item.airedFrom, format: a.item.format, malId: a.item.externalIds?.mal || 0 },
          { airedFrom: b.item.airedFrom, format: b.item.format, malId: b.item.externalIds?.mal || 0 },
        ))
        .map(({ member, item }) => view(item, member.role));
      const roleBySlug = new Map(releaseOrder.map(entry => [entry.slug, entry.role]));
      const curated = publishable.filter(order => canonicalFranchiseSlug(order.franchiseSlug) === publicSlug).map(order => ({
        kind: order.kind,
        summary: order.summary,
        sources: order.sources,
        verifiedAt: order.verification.verifiedAt,
        verifiedBy: order.verification.verifiedBy,
        entries: order.entries.flatMap(entry => {
          const item = bySlug.get(entry.slug);
          return item ? [{ ...view(item, roleBySlug.get(entry.slug) || 'side'), optional: Boolean(entry.optional), note: entry.note, episodeRange: entry.episodes }] : [];
        }),
      })).sort((a, b) => a.kind.localeCompare(b.kind));
      const memberItems = members.map(pair => pair.item);
      const popularity = memberItems.reduce<number | null>((best, item) => item.popularity && (!best || item.popularity < best) ? item.popularity : best, null);
      const titleKeys = new Set(memberItems.flatMap(item => [item.title, item.titleEnglish, item.titleRomaji, ...(item.synonyms || []), ...(item.legacy?.articleAnimeNames || [])])
        .filter((value): value is string => Boolean(value)).map(compactKey).filter(key => key.length > 2));
      titleKeys.add(compactKey(franchise.titleOverride || franchise.title));
      return {
        slug: publicSlug,
        title: franchise.titleOverride || franchise.title,
        releaseOrder,
        curated,
        truncated: franchise.truncated,
        totals: { all: sumWatchTime(releaseOrder), main: sumWatchTime(releaseOrder.filter(entry => entry.role === 'main')) },
        popularity,
        poster: releaseOrder.find(entry => entry.role === 'main' && entry.poster)?.poster,
        // Every generated franchise page has at least three linked entries
        // and is public content intended to be searchable.
        indexable: true,
        updatedAt: franchise.updatedAt,
        fetchedAt: franchise.provenance?.fetchedAt || franchise.updatedAt,
        titleKeys,
      };
    }).filter(franchise => franchise.releaseOrder.length >= 3)
      .sort((a, b) => (a.popularity || Infinity) - (b.popularity || Infinity) || a.title.localeCompare(b.title));

    const franchiseTitle = new Map(franchiseViews.map(franchise => [franchise.slug, franchise]));
    const animeIndex: AnimeIndexEntry[] = anime
      .filter(item => INDEXED_FORMATS.has(item.format))
      .sort((a, b) => (a.popularity || Infinity) - (b.popularity || Infinity))
      .map(item => ({
        s: item.slug,
        t: item.title,
        o: item.titleRomaji && item.titleRomaji !== item.title ? item.titleRomaji : undefined,
        k: buildSearchKey([item.title, item.titleEnglish, item.titleRomaji, ...(item.synonyms || [])]),
        f: item.format,
        st: item.status,
        y: item.year || undefined,
        e: item.episodes || undefined,
        ea: item.episodesAired ?? undefined,
        d: item.durationMinutes || undefined,
        p: item.images?.posterSmall || item.images?.poster,
        r: item.popularity || undefined,
        fr: item.franchiseSlug && franchiseTitle.has(canonicalFranchiseSlug(item.franchiseSlug))
          ? canonicalFranchiseSlug(item.franchiseSlug)
          : undefined,
        m: item.externalIds?.mal,
      }));
    const franchiseIndex: FranchiseIndexEntry[] = franchiseViews.map(franchise => ({
      s: franchise.slug,
      t: franchise.title,
      k: buildSearchKey([franchise.title, ...franchise.releaseOrder.flatMap(entry => [entry.title, entry.titleRomaji])]),
      n: franchise.releaseOrder.length,
      p: franchise.poster,
      r: franchise.popularity || undefined,
    }));
    const finished = lastRun[0]?.finishedAt as Date | string | undefined;
    console.log(`[tools] ${anime.length} anime, ${franchiseViews.length} franchises, ${publishable.length} verified curated orders`);
    return { anime, bySlug, animeIndex, franchiseIndex, franchises: franchiseViews, lastSyncedAt: finished ? new Date(finished).toISOString() : null };
  });
}

let snapshot: ReturnType<typeof loadToolsData> | undefined;
export function getToolsBuildData() {
  return snapshot ??= loadToolsData();
}

/** Newest English articles about any of the given title keys. */
export function relatedArticles(articles: ArticleCard[], titleKeys: Set<string>, limit = 6): ArticleCard[] {
  if (!titleKeys.size) return [];
  return articles.filter(article => {
    if (article.animeName && titleKeys.has(compactKey(article.animeName))) return true;
    return (article.tags || []).some(tag => titleKeys.has(compactKey(tag)));
  }).slice(0, limit);
}
