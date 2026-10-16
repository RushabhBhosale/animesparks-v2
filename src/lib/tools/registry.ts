// Tool directory used by the /tools hub, navigation and the sitemap. A tool
// is listed as live only once it works end to end; planned tools appear in
// the hub without a link.

export type ToolCategory = 'watch-smarter' | 'discover' | 'track' | 'create-play';

export interface ToolDefinition {
  slug: string;
  name: string;
  short: string;
  description: string;
  category: ToolCategory;
  live: boolean;
  /** Set when a live tool depends on curated data that does not exist yet. */
  awaitingData?: boolean;
  keywords: string[];
  glyph: string;
}

export const TOOL_CATEGORIES: Array<{ id: ToolCategory; label: string; blurb: string }> = [
  { id: 'watch-smarter', label: 'Watch smarter', blurb: 'Plan what to watch, in what order, and how long it takes.' },
  { id: 'discover', label: 'Discover', blurb: 'Find the next series worth your evenings.' },
  { id: 'track', label: 'Track', blurb: 'Keep up with airing shows and your own progress.' },
  { id: 'create-play', label: 'Create & play', blurb: 'Rank, share and test what you know.' },
];

export const TOOLS: ToolDefinition[] = [
  {
    slug: 'anime-binge-calculator', name: 'Anime Binge Calculator', short: 'Binge Calculator',
    description: 'How long it takes to finish any series at your pace, and the date you will be done.',
    category: 'watch-smarter', live: true, glyph: '⏱', keywords: ['time', 'hours', 'how long', 'binge', 'episodes', 'finish'],
  },
  {
    slug: 'anime-watch-order', name: 'Anime Watch Order Guide', short: 'Watch Order',
    description: 'Every season, movie, OVA and special in a franchise, in release order, with total watch time.',
    category: 'watch-smarter', live: true, glyph: '⇢', keywords: ['order', 'seasons', 'movies', 'ova', 'franchise', 'chronological'],
  },
  {
    slug: 'anime-filler-checker', name: 'Anime Filler Checker', short: 'Filler Checker',
    description: 'Filler and recap episodes for long series, filler percentages and a filler-free watch order.',
    category: 'watch-smarter', live: true, glyph: '◐', keywords: ['filler', 'canon', 'skip', 'episodes'],
  },
  {
    slug: 'anime-manga-chapter-finder', name: 'Episode-to-Manga Finder', short: 'Manga Finder',
    description: 'The manga behind an anime, its status and chapters, and where to continue reading.',
    category: 'watch-smarter', live: true, glyph: '❏', keywords: ['manga', 'chapter', 'continue', 'read'],
  },
  {
    slug: 'anime-arc-explorer', name: 'Anime Arc Explorer', short: 'Arc Explorer',
    description: 'Story arcs in order with episode ranges, arc length and progress tracking.',
    category: 'watch-smarter', live: true, glyph: '⌒', keywords: ['arcs', 'story', 'saga', 'episodes'],
  },
  {
    slug: 'anime-recommendations', name: 'Anime Recommendation Finder', short: 'Recommendations',
    description: 'Filter by mood, genre and length, or find series similar to ones you love.',
    category: 'discover', live: true, glyph: '✧', keywords: ['recommend', 'similar', 'genre', 'mood', 'random'],
  },
  {
    slug: 'anime-release-calendar', name: 'Anime Release Calendar', short: 'Release Calendar',
    description: 'This week’s Japanese broadcast slots in your timezone, with countdowns.',
    category: 'track', live: true, glyph: '▦', keywords: ['schedule', 'calendar', 'airing', 'countdown', 'release'],
  },
  {
    slug: 'anime-watchlist', name: 'Anime Watchlist & Progress Tracker', short: 'Watchlist',
    description: 'Track episodes, statuses and total watch time. Stored on your device.',
    category: 'track', live: true, glyph: '☰', keywords: ['watchlist', 'tracker', 'progress', 'list'],
  },
  {
    slug: 'anime-tier-list', name: 'Anime Tier List Maker', short: 'Tier List',
    description: 'Drag series into tiers, rename and recolour them, and export a shareable image.',
    category: 'create-play', live: true, glyph: '▤', keywords: ['tier', 'rank', 'ranking', 'list'],
  },
  {
    slug: 'daily-anime-game', name: 'Daily Anime Guessing Game', short: 'Daily Game',
    description: 'One anime a day, revealed clue by clue. Keep your streak going.',
    category: 'create-play', live: true, glyph: '?', keywords: ['game', 'guess', 'daily', 'quiz', 'wordle'],
  },
];

export const LIVE_TOOLS = TOOLS.filter(tool => tool.live);

export function toolPath(tool: Pick<ToolDefinition, 'slug'>): string {
  return `/tools/${tool.slug}`;
}
