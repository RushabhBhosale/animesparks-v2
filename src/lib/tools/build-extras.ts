// Build-time data for the Phase 2–4 tools: filler pages, source manga,
// curated mappings and arcs, recommendations, the calendar and the daily
// game. Read once per build from MongoDB, like the rest of the site.

import { withDatabase } from '../content/mongodb';
import type { ArticleCard } from '../content/types';
import { getToolsBuildData, relatedArticles, type AnimeSnapshot } from './build-data';
import { isPublishable } from './curated.ts';
import { classifyEpisodes, summarize, type ClassifiedEpisode } from './episodes.ts';
import { compactKey } from './normalize.ts';
import type { RecEntry } from './recommend.ts';
import { buildSearchKey } from './search.ts';
import type {
  ToolArcListDocument, ToolDailyGameDocument, ToolEpisodeListDocument, ToolFillerListDocument, ToolMangaDocument, ToolMangaMappingDocument,
} from './types.ts';

declare const process: { env: Record<string, string | undefined> };

export interface FillerView {
  slug: string;
  title: string;
  titleRomaji?: string;
  poster?: string;
  format: string;
  status: string;
  year: number | null;
  durationMinutes: number | null;
  episodes: ClassifiedEpisode[];
  summary: ReturnType<typeof summarize>;
  /** "curated" when a verified list is used, otherwise provider flags. */
  basis: 'curated' | 'provider';
  sources: Array<{ name: string; url: string }>;
  verifiedAt?: string;
  fetchedAt: string;
  popularity: number | null;
  franchiseSlug?: string;
  indexable: boolean;
  titleKeys: Set<string>;
}

export interface SourceEntry {
  slug: string;
  title: string;
  sourceMaterial?: string;
  manga?: Pick<ToolMangaDocument, 'title' | 'type' | 'status' | 'chapters' | 'volumes' | 'publishedFrom' | 'publishedTo' | 'authors' | 'serializations'> & { url?: string };
  mapping?: Pick<ToolMangaMappingDocument, 'ranges' | 'continueFromChapter' | 'continueNote' | 'sources'> & { verifiedAt?: string; imported?: boolean };
  arcs?: Pick<ToolArcListDocument, 'arcs' | 'sources'> & { verifiedAt?: string; imported?: boolean };
  episodes: number | null;
  status: string;
  articles: Array<{ title: string; slug: string }>;
  franchiseSlug?: string;
}

export interface CalendarEntry {
  s: string;
  t: string;
  p?: string;
  day: string;
  time: string;
  ea?: number;
  e?: number;
  r?: number;
  g: string[];
  notice?: { text: string; source: string; url: string; date: string };
}

export interface PremiereEntry {
  s: string;
  t: string;
  p?: string;
  date: string;
  f: string;
  r?: number;
}

const titleKeysOf = (item: AnimeSnapshot) => new Set([item.title, item.titleEnglish, item.titleRomaji, ...(item.synonyms || []), ...(item.legacy?.articleAnimeNames || [])]
  .filter((value): value is string => Boolean(value)).map(compactKey).filter(key => key.length > 2));

async function loadExtras(english: ArticleCard[]) {
  const uri = process.env.MONGODB_URI;
  if (!uri) throw new Error('MONGODB_URI is required for public prerendering');
  const base = await getToolsBuildData();
  const now = Date.now();
  const raw = await withDatabase(uri, async db => {
    const fromDate = new Date(now - 2 * 86400000).toISOString().slice(0, 10);
    const [episodeLists, fillerLists, manga, mappings, arcs, notices, games] = await Promise.all([
      db.collection<ToolEpisodeListDocument>('toolEpisodeLists').find({}, { projection: { _id: 0 } }).toArray(),
      db.collection<ToolFillerListDocument>('toolFillerLists').find({}, { projection: { _id: 0 } }).toArray(),
      db.collection<ToolMangaDocument>('toolManga').find({}, { projection: { _id: 0 } }).toArray(),
      db.collection<ToolMangaMappingDocument>('toolMangaMappings').find({}, { projection: { _id: 0 } }).toArray(),
      db.collection<ToolArcListDocument>('toolArcs').find({}, { projection: { _id: 0 } }).toArray(),
      db.collection<{ slug: string; date: string; text: string; sources: Array<{ name: string; url: string }>; verification: { status: string } }>('toolScheduleNotices')
        .find({ 'verification.status': 'verified', date: { $gte: fromDate } }, { projection: { _id: 0 } }).toArray(),
      db.collection<ToolDailyGameDocument>('toolDailyGame').find({ date: { $gte: fromDate } }, { projection: { _id: 0 } }).sort({ date: 1 }).limit(45).toArray(),
    ]);
    return { episodeLists, fillerLists, manga, mappings, arcs, notices, games };
  });

  const verifiedFiller = new Map(raw.fillerLists.filter(isPublishable).map(list => [list.slug, list]));
  const verifiedMappings = new Map(raw.mappings.filter(isPublishable).map(item => [item.slug, item]));
  const verifiedArcs = new Map(raw.arcs.filter(isPublishable).map(item => [item.slug, item]));
  const mangaById = new Map(raw.manga.map(item => [item.externalIds.malManga, item]));

  // ── Filler Checker pages ────────────────────────────────────────────────
  const listsBySlug = new Map(raw.episodeLists.map(list => [list.slug, list]));
  const fillerSlugs = new Set([...listsBySlug.keys(), ...verifiedFiller.keys()]);
  const filler: FillerView[] = [];
  for (const slug of fillerSlugs) {
    const item = base.bySlug.get(slug);
    if (!item) continue;
    const list = listsBySlug.get(slug);
    const curated = verifiedFiller.get(slug);
    // Ongoing series: classify only what has aired.
    const limit = item.status === 'airing' ? item.episodesAired ?? null : item.episodes;
    const flags = (list?.episodes || []).filter(episode => !limit || episode.n <= limit);
    const episodes = classifyEpisodes(flags, limit, curated);
    if (episodes.length < 12) continue;
    const summary = summarize(episodes);
    filler.push({
      slug, title: item.title, titleRomaji: item.titleRomaji !== item.title ? item.titleRomaji : undefined,
      poster: item.images?.poster, format: item.format, status: item.status, year: item.year, durationMinutes: item.durationMinutes,
      episodes, summary, basis: curated ? 'curated' : 'provider',
      sources: curated ? curated.sources : [{ name: 'MyAnimeList episode list', url: list?.provenance.sourceUrl || 'https://myanimelist.net' }],
      verifiedAt: curated?.verification.verifiedAt,
      fetchedAt: list?.updatedAt || curated?.updatedAt || new Date(now).toISOString(),
      popularity: item.popularity, franchiseSlug: item.franchiseSlug,
      // Index only pages that say something: a verified list, or flagged filler/recaps.
      indexable: Boolean(curated) || summary.skippable > 0,
      titleKeys: titleKeysOf(item),
    });
  }
  filler.sort((a, b) => (a.popularity || Infinity) - (b.popularity || Infinity));
  const fillerSkip = new Map(filler.map(view => [view.slug, view.summary.skippable]));

  // ── Source manga, mappings and arcs (Manga Finder, Arc Explorer) ─────────
  const source: Record<string, SourceEntry> = {};
  for (const item of base.anime) {
    const work = item.sourceWorks?.map(ref => mangaById.get(ref.malManga)).find(Boolean);
    const mapping = verifiedMappings.get(item.slug);
    const arcList = verifiedArcs.get(item.slug);
    if (!work && !mapping && !arcList) continue;
    source[item.slug] = {
      slug: item.slug, title: item.title, sourceMaterial: item.sourceMaterial, episodes: item.episodes ?? item.episodesAired ?? null, status: item.status,
      franchiseSlug: item.franchiseSlug,
      manga: work ? {
        title: work.title, type: work.type, status: work.status, chapters: work.chapters, volumes: work.volumes,
        publishedFrom: work.publishedFrom, publishedTo: work.publishedTo, authors: work.authors, serializations: work.serializations, url: work.provenance.sourceUrl,
      } : undefined,
      mapping: mapping ? { ranges: mapping.ranges, continueFromChapter: mapping.continueFromChapter, continueNote: mapping.continueNote, sources: mapping.sources, verifiedAt: mapping.verification.verifiedAt, imported: mapping.verification.method === 'wiki-import' } : undefined,
      arcs: arcList ? { arcs: arcList.arcs, sources: arcList.sources, verifiedAt: arcList.verification.verifiedAt, imported: arcList.verification.method === 'wiki-import' } : undefined,
      articles: relatedArticles(english, titleKeysOf(item), 3).map(article => ({ title: article.title, slug: article.slug })),
    };
  }

  // ── Recommendation index ────────────────────────────────────────────────
  const slugByMal = new Map(base.anime.map(item => [item.externalIds?.mal, item.slug]));
  const recIndex: RecEntry[] = base.anime
    .filter(item => ['tv', 'movie', 'ona', 'ova'].includes(item.format) && item.popularity && item.popularity <= 4000 && item.status !== 'upcoming' && (item.genres?.length || item.themes?.length))
    .sort((a, b) => (a.popularity || Infinity) - (b.popularity || Infinity))
    .map(item => ({
      s: item.slug, t: item.title, f: item.format, st: item.status, y: item.year || undefined,
      e: item.episodes || item.episodesAired || undefined, d: item.durationMinutes || undefined,
      p: item.images?.posterSmall || item.images?.poster, r: item.popularity || undefined, sc: item.score || undefined,
      g: item.genres || [], th: item.themes || [], dm: item.demographics || [], so: (item.studios || []).slice(0, 2),
      rc: (item.recommendations || []).map(rec => slugByMal.get(rec.mal)).filter((slug): slug is string => Boolean(slug)).slice(0, 10),
    }));
  const recGenres = [...new Set(recIndex.flatMap(entry => [...entry.g, ...entry.th]))].sort();

  // ── Release calendar ────────────────────────────────────────────────────
  const noticeBySlug = new Map(raw.notices.map(notice => [notice.slug, notice]));
  const calendar: CalendarEntry[] = base.anime
    .filter(item => item.status === 'airing' && item.broadcast?.day && item.broadcast?.time && item.broadcast.timezone === 'Asia/Tokyo')
    .sort((a, b) => (a.popularity || Infinity) - (b.popularity || Infinity))
    .map(item => {
      const notice = noticeBySlug.get(item.slug);
      return {
        s: item.slug, t: item.title, p: item.images?.posterSmall || item.images?.poster,
        day: item.broadcast!.day!, time: item.broadcast!.time!, ea: item.episodesAired ?? undefined, e: item.episodes || undefined,
        r: item.popularity || undefined, g: (item.genres || []).slice(0, 3),
        notice: notice ? { text: notice.text, source: notice.sources[0]?.name, url: notice.sources[0]?.url, date: notice.date } : undefined,
      };
    });
  const horizon = now + 120 * 86400000;
  const premieres: PremiereEntry[] = base.anime
    .filter(item => item.status === 'upcoming' && item.airedFrom && Date.parse(item.airedFrom) >= now - 86400000 && Date.parse(item.airedFrom) <= horizon && ['tv', 'ona', 'movie'].includes(item.format))
    .sort((a, b) => Date.parse(a.airedFrom!) - Date.parse(b.airedFrom!))
    .slice(0, 60)
    .map(item => ({ s: item.slug, t: item.title, p: item.images?.posterSmall || item.images?.poster, date: item.airedFrom!.slice(0, 10), f: item.format, r: item.popularity || undefined }));

  // ── Daily game (answers lightly encoded so they are not plain text) ──────
  const games = raw.games.map(game => {
    const item = base.bySlug.get(game.slug);
    const payload = { slug: game.slug, title: game.answer.title, alternatives: game.answer.alternatives, poster: item?.images?.poster, franchise: item?.franchiseSlug };
    return { date: game.date, clues: game.clues, a: Buffer.from(JSON.stringify(payload), 'utf8').toString('base64') };
  });

  const fillerIndex = filler.map(view => ({ s: view.slug, t: view.title, k: buildSearchKey([view.title, view.titleRomaji]), p: base.bySlug.get(view.slug)?.images?.posterSmall, r: view.popularity || undefined, n: view.summary.skippable }));
  console.log(`[tools] extras: ${filler.length} filler lists (${filler.filter(view => view.indexable).length} indexable), ${Object.keys(source).length} source entries, ${recIndex.length} rec entries, ${calendar.length} airing, ${games.length} daily puzzles`);
  return { filler, fillerIndex, fillerSkip, source, recIndex, recGenres, calendar, premieres, games, verifiedArcCount: verifiedArcs.size, verifiedMappingCount: verifiedMappings.size, verifiedFillerCount: verifiedFiller.size };
}

declare const Buffer: { from(value: string, encoding: string): { toString(encoding: string): string } };

let snapshot: ReturnType<typeof loadExtras> | undefined;
export function getToolsExtras(english: ArticleCard[]) {
  return snapshot ??= loadExtras(english);
}
