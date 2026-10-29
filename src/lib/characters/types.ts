// Data model for the character encyclopedia. Everything here is curated,
// in-repo data that is validated at build time and prerendered; visitors never
// cause a database or provider request.
//
// Conventions
// - Episode numbers are the series-wide ("absolute") numbers fan wikis use, so
//   JJK season 2 episode 4 is episode 28. Series with separate numbering
//   (Naruto Shippuden) use `ed`, an entry of `SeriesData.editions`.
// - Spoiler levels are checkpoints. An item with `spoiler: 'shibuya'` is shown
//   once the reader says they have finished the 'shibuya' checkpoint, and is
//   folded away by default. Items without `spoiler` are always visible.

export type CheckpointId = string;

/** Where a fact comes from. Episode and chapter are both optional because many facts live in only one medium. */
export interface Ref {
  /** Series-wide anime episode number. */
  ep?: number;
  /** Only needed when the series has several numbering schemes (see SeriesData.editions). */
  ed?: string;
  /** Manga chapter number. Fractions are written as strings, e.g. "0-4". */
  ch?: number | string;
  /** Free text for sources that are neither, e.g. "Official Fanbook" or "Volume 1 profile". */
  other?: string;
}

/** Confirmed = stated by the author/official material. Estimate = derived or approximate. Disputed = anime and manga differ. */
export type Confidence = 'confirmed' | 'estimate' | 'disputed' | 'unknown';

export interface Fact {
  label: string;
  value: string;
  confidence: Confidence;
  /** Why this confidence, shown in the fact's tooltip/expansion. */
  note?: string;
  ref?: Ref;
  spoiler?: CheckpointId;
}

/** A paragraph of prose. Spoiler paragraphs are folded away by default. */
export interface Block {
  text: string;
  heading?: string;
  spoiler?: CheckpointId;
  ref?: Ref;
}

export type AbilityKind = 'innate' | 'technique' | 'domain' | 'transformation' | 'weapon' | 'skill' | 'power-up';

export interface Ability {
  id: string;
  name: string;
  native?: string;
  kind: AbilityKind;
  /** Id of an entry in SeriesData.powerSystems. */
  system?: string;
  summary: string;
  strengths: string[];
  limits: string[];
  introduced: Ref;
  /** How the ability changed over the story. */
  evolution?: string;
  /** Ids of Battle entries on the same profile where it mattered. */
  battles?: string[];
  /** Transformations/power-ups are ordered by this number on the page. */
  order?: number;
  confidence: Confidence;
  spoiler?: CheckpointId;
}

export interface Battle {
  id: string;
  title: string;
  opponents: string[];
  /** Neutral result description, no ranking. */
  outcome: string;
  summary: string;
  ref: Ref;
  /** Id of a timeline event in the series file when the battle is on the timeline. */
  event?: string;
  spoiler?: CheckpointId;
}

export type LifeState = 'alive' | 'deceased' | 'unknown' | 'other';
export type StatusEventKind = 'death' | 'revival' | 'seal' | 'release' | 'near-death' | 'body-swap' | 'transformation' | 'alternate-timeline';

export interface StatusEvent {
  id: string;
  kind: StatusEventKind;
  title: string;
  cause?: string;
  circumstances: string;
  significance: string;
  anime?: Ref;
  manga?: Ref;
  spoiler: CheckpointId;
  /** How the anime and manga differ for this event, when they do. */
  adaptation?: string;
}

export interface MediumStatus {
  state: LifeState;
  /** Short label such as "Deceased" or "Sealed in the Prison Realm". */
  label: string;
}

export interface StatusRecord {
  /** Where the story leaves the character at the end of the currently published material. */
  manga: MediumStatus;
  anime: MediumStatus;
  summary: string;
  /** Checkpoint after which the status may be shown. Alive characters with no twist can omit it. */
  spoiler?: CheckpointId;
  events: StatusEvent[];
}

export interface AdaptationNote {
  topic: string;
  anime: string;
  manga: string;
  spoiler?: CheckpointId;
}

export interface Source {
  name: string;
  url?: string;
  /** What this source was used to confirm. */
  covers: string;
}

export interface Appearance {
  medium: 'anime' | 'manga' | 'film' | 'game' | 'novel' | 'other';
  title: string;
  detail: string;
  /** Present when the title is an existing AnimeSparks catalogue entry. */
  animeSlug?: string;
}

export interface Faq {
  question: string;
  answer: string;
  spoiler?: CheckpointId;
}

export interface CharacterProfile {
  slug: string;
  /** Id used by relationships and timeline events within the series file. */
  id: string;
  series: string;
  name: string;
  native?: string;
  aliases: string[];
  /** One-line role shown on cards, e.g. "Special Grade sorcerer and teacher". */
  role: string;
  affiliations: string[];
  /** Short ability labels used by the directory filter. Names only, never rankings. */
  abilityTags: string[];
  /** Spoiler-free summary, 2-3 sentences. */
  overview: string;
  facts: Fact[];
  biography: Block[];
  personality: Block[];
  /** How the character was designed and how their arc developed. */
  development: Block[];
  motivations: string[];
  abilities: Ability[];
  battles: Battle[];
  status: StatusRecord;
  adaptation: AdaptationNote[];
  appearances: Appearance[];
  /** Things the story has not settled. Never fan theories dressed as canon. */
  unconfirmed: string[];
  faq: Faq[];
  /** Other profile slugs worth reading next, most relevant first. */
  related: string[];
  /** Article matching beyond the name: extra tag/title phrases. */
  articleKeys?: string[];
  seo: { title: string; description: string };
  meta: {
    publishedAt: string;
    verifiedAt: string;
    /** What material this profile covers, shown on the page. */
    coverage: string;
    sources: Source[];
  };
}

// ── Series-level data ────────────────────────────────────────────────────

export interface Checkpoint {
  id: CheckpointId;
  /** Label in the spoiler selector, e.g. "Season 2 (Shibuya Incident)". */
  label: string;
  /** What you know once you pass it. Shown under the selector. */
  covers: string;
}

export interface Arc {
  id: string;
  name: string;
  anime?: { start: number; end: number; ed?: string };
  manga?: { start: number; end: number };
  summary: string;
  spoiler?: CheckpointId;
}

export interface PowerSystem {
  id: string;
  name: string;
  summary: string;
  rules: string[];
  limits: string[];
  introduced: Ref;
}

export interface CastMember {
  id: string;
  name: string;
  /** Present when this character has a published profile. */
  profile?: string;
}

export type RelationType = 'family' | 'friend' | 'rival' | 'mentor' | 'romance' | 'ally' | 'enemy';
/** `a` is the first-named role relative to `b`: parent = a is b's parent. */
export type Kinship = 'parent' | 'sibling' | 'spouse' | 'ancestor' | 'relative' | 'adoptive-parent' | 'guardian';

export interface RelationshipEvolution {
  stage: string;
  text: string;
  spoiler?: CheckpointId;
  ref?: Ref;
}

export interface Relationship {
  id: string;
  a: string;
  b: string;
  type: RelationType;
  kin?: Kinship;
  /** For kin 'ancestor': how many generations apart (default 2). Draws a dashed lineage line. */
  generations?: number;
  /** Role labels from each side's view, e.g. a: "teacher", b: "student". */
  roles?: { a: string; b: string };
  summary: string;
  evolution: RelationshipEvolution[];
  /** Edge hidden until the checkpoint is reached. */
  spoiler?: CheckpointId;
}

export type EventKind = 'arc' | 'battle' | 'death' | 'transformation' | 'reveal' | 'milestone';

export interface TimelineEvent {
  id: string;
  title: string;
  summary: string;
  kind: EventKind;
  characters: string[];
  /** In-world time as the story states it ("Oct 31, 2018"). */
  when: string;
  /** Sort key for story-chronological order. */
  storyOrder: number;
  anime?: Ref;
  manga?: Ref;
  arc?: string;
  spoiler?: CheckpointId;
}

export interface SeriesData {
  slug: string;
  title: string;
  /** Short name used in link text. */
  short: string;
  /** Names used to match AnimeSparks articles (animeName or tags). */
  articleNames: string[];
  /** Tool landing/catalogue slugs: used both to link tools and to show characters on those tool pages. */
  toolKeys: { franchise?: string; manga?: string; arc?: string; anime: string[] };
  editions?: Array<{ id: string; label: string; offset: number }>;
  intro: string;
  /** What the published manga/anime covered when this file was last verified. */
  coverage: { manga: string; anime: string; asOf: string };
  checkpoints: Checkpoint[];
  arcs: Arc[];
  powerSystems: PowerSystem[];
  cast: CastMember[];
  relationships: Relationship[];
  timeline: TimelineEvent[];
  faq: Faq[];
}

// ── Derived (render-time) types ──────────────────────────────────────────

export interface ResolvedSeries extends SeriesData {
  profiles: CharacterProfile[];
}
