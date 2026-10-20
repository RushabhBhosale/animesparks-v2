// Editorial list of anime-specific landing pages. Each one was checked to
// have real data behind it (MAL episode flags, MAL relations, or chapter
// data imported from the series' fan wiki). Pages outside these lists keep
// working but are only indexed when they meet their own data rules.

/** Filler Checker pages featured on the tools hub. */
export const FILLER_LANDINGS = ['naruto', 'naruto-shippuden', 'bleach', 'one-piece', 'dragon-ball-z', 'dragon-ball-super', 'pokemon'];

/** Featured watch-order franchises shown on the tools hub. */
export const WATCH_ORDER_LANDINGS = [
  'one-piece', 'naruto', 'bleach', 'monogatari', 'attack-on-titan', 'jujutsu-kaisen', 'demon-slayer-kimetsu-no-yaiba', 'my-hero-academia',
  'fate-stay-night',
];

/** Stable database slugs for franchises whose public URLs were renamed. */
const FRANCHISE_SLUG_ALIASES: Record<string, string> = {
  bakemonogatari: 'monogatari',
  // Database slugs come from the first entry's MAL title; URLs use the searched name.
  'case-closed': 'detective-conan',
  'fighting-spirit': 'hajime-no-ippo',
  'initial-d-first-stage': 'initial-d',
  'major-s1': 'major',
  'yu-yu-hakusho-ghost-files': 'yu-yu-hakusho',
  'legend-of-the-galactic-heroes-my-conquest-is-the-sea-of-stars': 'legend-of-the-galactic-heroes',
  'saint-seiya-knights-of-the-zodiac': 'saint-seiya',
  'digimon-digital-monsters': 'digimon',
  'super-dimension-fortress-macross': 'macross',
  'ghost-in-the-shell-stand-alone-complex': 'ghost-in-the-shell',
  'the-prince-of-tennis': 'prince-of-tennis',
  'baki-the-grappler': 'baki',
  'tenchi-muyo-ryo-ohki': 'tenchi-muyo',
};

export function canonicalFranchiseSlug(slug: string): string {
  return FRANCHISE_SLUG_ALIASES[slug] || slug;
}

/** Franchise names as people search them, keyed by public slug. */
export const FRANCHISE_TITLES: Record<string, string> = {
  'detective-conan': 'Detective Conan',
  'hajime-no-ippo': 'Hajime no Ippo',
  'initial-d': 'Initial D',
  major: 'Major',
  'yu-yu-hakusho': 'Yu Yu Hakusho',
  'legend-of-the-galactic-heroes': 'Legend of the Galactic Heroes',
  'saint-seiya': 'Saint Seiya',
  digimon: 'Digimon',
  macross: 'Macross',
  'ghost-in-the-shell': 'Ghost in the Shell',
  'prince-of-tennis': 'The Prince of Tennis',
  baki: 'Baki',
  'tenchi-muyo': 'Tenchi Muyo!',
};

/** Anime names as people search them, for Filler Checker pages (by anime slug). */
export const ANIME_DISPLAY_TITLES: Record<string, string> = {
  'case-closed': 'Detective Conan',
  'fighting-spirit': 'Hajime no Ippo',
  'yu-yu-hakusho-ghost-files': 'Yu Yu Hakusho',
};

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
  { slug: 'one-piece', name: 'One Piece', entries: ['one-piece'] },
  { slug: 'bleach', name: 'Bleach', entries: ['bleach', 'bleach-thousand-year-blood-war', 'bleach-thousand-year-blood-war-the-separation', 'bleach-thousand-year-blood-war-the-conflict', 'bleach-thousand-year-blood-war-the-calamity'] },
  { slug: 'hunter-x-hunter', name: 'Hunter x Hunter', entries: ['hunter-x-hunter'] },
  { slug: 'black-clover', name: 'Black Clover', entries: ['black-clover', 'black-clover-season-2'] },
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
  { href: '/tools/anime-filler-checker/dragon-ball-super', label: 'Dragon Ball Super filler list', group: 'Filler lists' },
  { href: '/tools/anime-filler-checker/pokemon', label: 'Pokémon filler list', group: 'Filler lists' },
  { href: '/tools/anime-watch-order/fate-stay-night', label: 'Fate anime watch order', group: 'Watch orders' },
  { href: '/tools/anime-manga-chapter-finder/one-piece', label: 'One Piece: anime to manga', group: 'Anime to manga' },
  { href: '/tools/anime-manga-chapter-finder/bleach', label: 'Bleach: anime to manga', group: 'Anime to manga' },
];
