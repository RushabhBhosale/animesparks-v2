// Provider-neutral data model for AnimeSparks tools. Nothing in this file
// knows about Tenrai, Jikan or MyAnimeList response shapes; provider adapters
// map into these types so a provider can be replaced without touching tools.

export type AnimeFormat = 'tv' | 'movie' | 'ova' | 'ona' | 'special' | 'tv-special' | 'music' | 'other';
export type AnimeStatus = 'finished' | 'airing' | 'upcoming' | 'unknown';

export interface ExternalIds {
  mal?: number;
  anilist?: number;
  /** MyAnimeList manga/light-novel id (a separate id space from anime). */
  malManga?: number;
}

export interface Provenance {
  /** Data provider that delivered the record, e.g. "tenrai". */
  provider: string;
  /** Original data owner credited to readers, e.g. "MyAnimeList". */
  source: string;
  sourceUrl?: string;
  fetchedAt: string;
}

export interface AnimeRelationRef {
  /** Neutral relation kind, see RelationKind. */
  kind: RelationKind;
  externalIds: ExternalIds;
}

export type RelationKind =
  | 'sequel' | 'prequel' | 'side-story' | 'parent-story' | 'summary' | 'full-story'
  | 'alternative-version' | 'alternative-setting' | 'spin-off' | 'character' | 'adaptation' | 'other';

/** What a provider adapter returns for one anime. */
export interface ProviderAnime {
  externalIds: ExternalIds;
  title: string;
  titleEnglish?: string;
  titleRomaji?: string;
  titleJapanese?: string;
  synonyms: string[];
  format: AnimeFormat;
  status: AnimeStatus;
  episodes: number | null;
  durationMinutes: number | null;
  airedFrom: string | null;
  airedTo: string | null;
  season?: string;
  year: number | null;
  sourceMaterial?: string;
  ageRating?: string;
  genres: string[];
  themes: string[];
  demographics: string[];
  studios: string[];
  synopsis?: string;
  images: { poster?: string; posterSmall?: string; posterLarge?: string };
  broadcast?: { day?: string; time?: string; timezone?: string };
  score: number | null;
  popularity: number | null;
  members: number | null;
  /** Present only when the provider response included relations. */
  relations?: AnimeRelationRef[];
  /** Source works (manga, light novels) this anime adapts; with relations only. */
  sourceWorks?: ExternalIds[];
  provenance: Provenance;
}

/** Stored document in the `toolAnime` collection. */
export interface ToolAnimeDocument extends ProviderAnime {
  slug: string;
  /** Count of episodes that have aired, for ongoing series. */
  episodesAired?: number | null;
  episodesAiredCheckedAt?: string;
  relationsFetchedAt?: string;
  franchiseSlug?: string;
  /** Links to existing AnimeSparks content; existing collections are never modified. */
  legacy?: { animeEntrySanityIds?: string[]; articleAnimeNames?: string[] };
  createdAt: string;
  updatedAt: string;
}

export type FranchiseRole = 'main' | 'side' | 'recap';

export interface FranchiseMember {
  slug: string;
  role: FranchiseRole;
}

/** Stored document in the `toolFranchises` collection (derived, not curated). */
export interface ToolFranchiseDocument {
  slug: string;
  title: string;
  anchorMalId: number;
  members: FranchiseMember[];
  /** True when the relation crawl hit its node cap. */
  truncated: boolean;
  derivedFrom: 'relations';
  provenance: Provenance;
  createdAt: string;
  updatedAt: string;
}

export type VerificationStatus = 'verified' | 'needs-review' | 'unverified';

export interface CuratedSource {
  name: string;
  url: string;
}

export interface Verification {
  status: VerificationStatus;
  /** How the data was checked: editor review (default) or a source import. */
  method?: 'editor' | 'wiki-import';
  verifiedBy?: string;
  verifiedAt?: string;
  notes?: string;
}

export type WatchOrderKind = 'chronological' | 'beginner';

export interface CuratedWatchOrderEntry {
  slug: string;
  optional?: boolean;
  /** Optional sub-range when an order splits a series, e.g. "1-12". */
  episodes?: string;
  note?: string;
}

/** Stored document in the `toolWatchOrders` collection (curated). */
export interface ToolWatchOrderDocument {
  franchiseSlug: string;
  kind: WatchOrderKind;
  entries: CuratedWatchOrderEntry[];
  summary?: string;
  sources: CuratedSource[];
  verification: Verification;
  updatedAt: string;
}

/** Compact record shipped in the static anime search index. */
export interface AnimeIndexEntry {
  s: string;          // slug
  t: string;          // display title
  o?: string;         // original/romaji title when different
  k: string;          // normalized search key (all titles)
  f: AnimeFormat;
  st: AnimeStatus;
  y?: number;
  e?: number;         // planned/total episodes
  ea?: number;        // aired episodes for ongoing series
  d?: number;         // minutes per episode
  p?: string;         // small poster URL
  r?: number;         // popularity rank (lower is more popular)
  fr?: string;        // franchise slug
  fl?: number;        // skippable (filler + recap) episodes, when known
  m?: number;         // provider id, used to de-duplicate live lookups
}

export interface FranchiseIndexEntry {
  s: string;
  t: string;
  k: string;
  n: number;          // member count
  p?: string;
  r?: number;
}

// ── Phase 2–4 records ─────────────────────────────────────────────────────

export type MangaStatus = 'publishing' | 'finished' | 'hiatus' | 'discontinued' | 'upcoming' | 'unknown';

/** Stored document in `toolManga`. */
export interface ToolMangaDocument {
  externalIds: ExternalIds;
  title: string;
  titleEnglish?: string;
  type: string;
  status: MangaStatus;
  chapters: number | null;
  volumes: number | null;
  publishedFrom: string | null;
  publishedTo: string | null;
  authors: string[];
  serializations: string[];
  provenance: Provenance;
  updatedAt: string;
}

export interface EpisodeFlag {
  /** Episode number. */
  n: number;
  /** Title (English where available). */
  t?: string;
  /** Air date, YYYY-MM-DD. */
  a?: string;
  /** Provider flags: filler / recap. */
  f?: 1;
  r?: 1;
}

/** Stored document in `toolEpisodeLists` (one per anime). */
export interface ToolEpisodeListDocument {
  slug: string;
  episodes: EpisodeFlag[];
  provenance: Provenance;
  updatedAt: string;
}

export type CanonType = 'manga-canon' | 'anime-canon' | 'mixed' | 'filler' | 'recap' | 'canon' | 'unknown';

/** Curated per-episode classification (`toolFillerLists`). Supersedes provider flags when verified. */
export interface ToolFillerListDocument {
  slug: string;
  ranges: Array<{ start: number; end: number; type: Exclude<CanonType, 'canon' | 'unknown'> }>;
  sources: CuratedSource[];
  verification: Verification;
  updatedAt: string;
}

/** Curated episode → chapter mapping (`toolMangaMappings`). */
export interface ToolMangaMappingDocument {
  slug: string;
  mangaMal?: number;
  ranges: Array<{ episodeStart: number; episodeEnd: number; chapterStart: number; chapterEnd: number; note?: string }>;
  /** First chapter to read after the anime's final episode. */
  continueFromChapter?: number;
  continueNote?: string;
  sources: CuratedSource[];
  verification: Verification;
  updatedAt: string;
}

/** Curated story arcs (`toolArcs`). */
export interface ToolArcListDocument {
  slug: string;
  arcs: Array<{ name: string; episodeStart: number; episodeEnd: number; classification?: 'canon' | 'filler' | 'mixed'; summary?: string; articleSlug?: string }>;
  sources: CuratedSource[];
  verification: Verification;
  updatedAt: string;
}

/** Scheduled daily game puzzle (`toolDailyGame`), fixed once created. */
export interface ToolDailyGameDocument {
  date: string;
  slug: string;
  answer: { title: string; alternatives: string[] };
  clues: string[];
  source: 'metadata' | 'curated';
  createdAt: string;
}
