// Editorial list of anime-specific landing pages. Each one was checked to
// have real data behind it (MAL episode flags, MAL relations, or chapter
// data imported from the series' fan wiki). Pages outside these lists keep
// working but are only indexed when they meet their own data rules.

/** Filler Checker pages promoted as landing pages (always indexable when built). */
export const FILLER_LANDINGS = ['naruto', 'naruto-shippuden', 'bleach', 'one-piece', 'dragon-ball-z'];

/** Featured watch-order franchises shown on the tools hub. */
export const WATCH_ORDER_LANDINGS = [
  'one-piece', 'naruto', 'bleach', 'monogatari', 'attack-on-titan', 'jujutsu-kaisen', 'demon-slayer-kimetsu-no-yaiba', 'my-hero-academia',
];

/** Stable database slugs for franchises whose public URLs were renamed. */
const FRANCHISE_SLUG_ALIASES: Record<string, string> = {
  bakemonogatari: 'monogatari',
};

export function canonicalFranchiseSlug(slug: string): string {
  return FRANCHISE_SLUG_ALIASES[slug] || slug;
}

export interface MangaLanding {
  slug: string;
  name: string;
  /** Catalogue entries in viewing order; each needs an imported chapter map. */
  entries: string[];
}

/** Episode-to-manga guides, one page per series covering every season. */
export const MANGA_LANDINGS: MangaLanding[] = [
  { slug: 'jujutsu-kaisen', name: 'Jujutsu Kaisen', entries: ['jujutsu-kaisen', 'jujutsu-kaisen-season-2', 'jujutsu-kaisen-the-culling-game-part-1'] },
  { slug: 'demon-slayer', name: 'Demon Slayer', entries: ['demon-slayer-kimetsu-no-yaiba', 'demon-slayer-kimetsu-no-yaiba-mugen-train-arc', 'demon-slayer-kimetsu-no-yaiba-entertainment-district-arc', 'demon-slayer-kimetsu-no-yaiba-swordsmith-village-arc', 'demon-slayer-kimetsu-no-yaiba-hashira-training-arc'] },
  { slug: 'chainsaw-man', name: 'Chainsaw Man', entries: ['chainsaw-man'] },
  { slug: 'solo-leveling', name: 'Solo Leveling', entries: ['solo-leveling', 'solo-leveling-season-2-arise-from-the-shadow'] },
  { slug: 'frieren', name: 'Frieren: Beyond Journey’s End', entries: ['frieren-beyond-journeys-end', 'frieren-beyond-journeys-end-season-2'] },
  { slug: 'my-hero-academia', name: 'My Hero Academia', entries: ['my-hero-academia', 'my-hero-academia-season-2', 'my-hero-academia-season-3', 'my-hero-academia-season-4', 'my-hero-academia-season-5', 'my-hero-academia-season-6', 'my-hero-academia-season-7', 'my-hero-academia-final-season'] },
  { slug: 'spy-x-family', name: 'Spy × Family', entries: ['spy-x-family', 'spy-x-family-part-2', 'spy-x-family-season-2', 'spy-x-family-season-3'] },
  { slug: 'naruto', name: 'Naruto', entries: ['naruto', 'naruto-shippuden'] },
];

/** Titles: keep the key phrase first and stay within ~65 characters. */
export function fitTitle(options: string[], suffix = ' | AnimeSparks', max = 68): string {
  const fitting = options.find(option => (option + suffix).length <= max);
  return (fitting || options.at(-1)!) + suffix;
}

/** Descriptions: at most ~158 characters, cut on a word boundary. */
export function clampDescription(text: string, max = 158): string {
  const clean = text.replace(/\s+/g, ' ').trim();
  if (clean.length <= max) return clean;
  const cut = clean.slice(0, max - 1);
  return `${cut.slice(0, cut.lastIndexOf(' ')).replace(/[,;:–—-]$/, '')}…`;
}

/** Guides linked site-wide (homepage, footer, HTML sitemap). Every href is a built landing page. */
export const FEATURED_GUIDES: Array<{ href: string; label: string; group: 'Filler lists' | 'Watch orders' | 'Anime to manga' }> = [
  { href: '/tools/anime-filler-checker/naruto-shippuden', label: 'Naruto Shippuden filler list', group: 'Filler lists' },
  { href: '/tools/anime-filler-checker/naruto', label: 'Naruto filler list', group: 'Filler lists' },
  { href: '/tools/anime-filler-checker/one-piece', label: 'One Piece filler list', group: 'Filler lists' },
  { href: '/tools/anime-filler-checker/bleach', label: 'Bleach filler list', group: 'Filler lists' },
  { href: '/tools/anime-filler-checker/dragon-ball-z', label: 'Dragon Ball Z filler list', group: 'Filler lists' },
  { href: '/tools/anime-watch-order/monogatari', label: 'Monogatari watch order', group: 'Watch orders' },
  { href: '/tools/anime-watch-order/naruto', label: 'Naruto watch order', group: 'Watch orders' },
  { href: '/tools/anime-watch-order/one-piece', label: 'One Piece watch order', group: 'Watch orders' },
  { href: '/tools/anime-watch-order/attack-on-titan', label: 'Attack on Titan watch order', group: 'Watch orders' },
  { href: '/tools/anime-manga-chapter-finder/jujutsu-kaisen', label: 'Jujutsu Kaisen: anime to manga', group: 'Anime to manga' },
  { href: '/tools/anime-manga-chapter-finder/solo-leveling', label: 'Solo Leveling: anime to manga', group: 'Anime to manga' },
  { href: '/tools/anime-manga-chapter-finder/demon-slayer', label: 'Demon Slayer: anime to manga', group: 'Anime to manga' },
  { href: '/tools/anime-manga-chapter-finder/chainsaw-man', label: 'Chainsaw Man: anime to manga', group: 'Anime to manga' },
];
