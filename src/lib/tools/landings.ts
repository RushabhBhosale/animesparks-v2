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
  'demon-slayer-kimetsu-no-yaiba': 'Demon Slayer',
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

export type ArcLanding = MangaLanding;

/** "Arcs in order" guides, one page per series; each entry needs an imported arc list. */
export const ARC_LANDINGS: ArcLanding[] = [
  { slug: 'one-piece', name: 'One Piece', entries: ['one-piece'] },
  { slug: 'naruto', name: 'Naruto', entries: ['naruto', 'naruto-shippuden'] },
  { slug: 'bleach', name: 'Bleach', entries: ['bleach', 'bleach-thousand-year-blood-war', 'bleach-thousand-year-blood-war-the-separation', 'bleach-thousand-year-blood-war-the-conflict', 'bleach-thousand-year-blood-war-the-calamity'] },
  { slug: 'hunter-x-hunter', name: 'Hunter x Hunter', entries: ['hunter-x-hunter'] },
  { slug: 'black-clover', name: 'Black Clover', entries: ['black-clover', 'black-clover-season-2'] },
  { slug: 'jujutsu-kaisen', name: 'Jujutsu Kaisen', entries: ['jujutsu-kaisen', 'jujutsu-kaisen-season-2', 'jujutsu-kaisen-the-culling-game-part-1'] },
  { slug: 'chainsaw-man', name: 'Chainsaw Man', entries: ['chainsaw-man'] },
  { slug: 'my-hero-academia', name: 'My Hero Academia', entries: ['my-hero-academia', 'my-hero-academia-season-2', 'my-hero-academia-season-3', 'my-hero-academia-season-4', 'my-hero-academia-season-5', 'my-hero-academia-season-6', 'my-hero-academia-season-7', 'my-hero-academia-final-season'] },
  { slug: 'solo-leveling', name: 'Solo Leveling', entries: ['solo-leveling', 'solo-leveling-season-2-arise-from-the-shadow'] },
];

/** "Movies in order" pages (public franchise slugs), each backed by "X movies in order" search demand. */
export const MOVIE_LANDINGS = [
  'pokemon', 'one-piece', 'naruto', 'dragon-ball', 'demon-slayer-kimetsu-no-yaiba', 'my-hero-academia', 'macross', 'detective-conan',
  'yu-gi-oh', 'slam-dunk', 'made-in-abyss', 'haikyu', 'overlord', 'puella-magi-madoka-magica', 'inuyasha', 'initial-d', 'gintama',
  'cardcaptor-sakura', 'bleach', 'jujutsu-kaisen',
];
/** A movies page needs at least this many movies in the franchise. */
export const MIN_LANDING_MOVIES = 3;

export interface RecLanding {
  /** URL slug under /tools/anime-recommendations/. */
  slug: string;
  /** Name as people search it. */
  name: string;
  /** Catalogue slug of the seed anime. */
  anime: string;
}

/** "Anime like X" pages, each backed by "anime like X" search demand and MAL user recommendations. */
export const REC_LANDINGS: RecLanding[] = [
  { slug: 'anime-like-attack-on-titan', name: "Attack on Titan", anime: 'attack-on-titan' },
  { slug: 'anime-like-death-note', name: "Death Note", anime: 'death-note' },
  { slug: 'anime-like-fullmetal-alchemist', name: "Fullmetal Alchemist", anime: 'fullmetal-alchemist-brotherhood' },
  { slug: 'anime-like-one-punch-man', name: "One Punch Man", anime: 'one-punch-man' },
  { slug: 'anime-like-demon-slayer', name: "Demon Slayer", anime: 'demon-slayer-kimetsu-no-yaiba' },
  { slug: 'anime-like-my-hero-academia', name: "My Hero Academia", anime: 'my-hero-academia' },
  { slug: 'anime-like-sword-art-online', name: "Sword Art Online", anime: 'sword-art-online' },
  { slug: 'anime-like-hunter-x-hunter', name: "Hunter x Hunter", anime: 'hunter-x-hunter' },
  { slug: 'anime-like-naruto', name: "Naruto", anime: 'naruto' },
  { slug: 'anime-like-jujutsu-kaisen', name: "Jujutsu Kaisen", anime: 'jujutsu-kaisen' },
  { slug: 'anime-like-tokyo-ghoul', name: "Tokyo Ghoul", anime: 'tokyo-ghoul' },
  { slug: 'anime-like-your-name', name: "Your Name", anime: 'your-name' },
  { slug: 'anime-like-steins-gate', name: "Steins;Gate", anime: 'steins-gate' },
  { slug: 'anime-like-one-piece', name: "One Piece", anime: 'one-piece' },
  { slug: 'anime-like-a-silent-voice', name: "A Silent Voice", anime: 'a-silent-voice' },
  { slug: 'anime-like-re-zero', name: "Re:Zero", anime: 're-zero-starting-life-in-another-world' },
  { slug: 'anime-like-code-geass', name: "Code Geass", anime: 'code-geass-lelouch-of-the-rebellion' },
  { slug: 'anime-like-your-lie-in-april', name: "Your Lie in April", anime: 'your-lie-in-april' },
  { slug: 'anime-like-toradora', name: "Toradora!", anime: 'toradora' },
  { slug: 'anime-like-mob-psycho-100', name: "Mob Psycho 100", anime: 'mob-psycho-100' },
  { slug: 'anime-like-noragami', name: "Noragami", anime: 'noragami' },
  { slug: 'anime-like-erased', name: "Erased", anime: 'erased' },
  { slug: 'anime-like-akame-ga-kill', name: "Akame ga Kill!", anime: 'akame-ga-kill' },
  { slug: 'anime-like-bleach', name: "Bleach", anime: 'bleach' },
  { slug: 'anime-like-angel-beats', name: "Angel Beats!", anime: 'angel-beats' },
  { slug: 'anime-like-haikyuu', name: "Haikyuu!!", anime: 'haikyu' },
  { slug: 'anime-like-konosuba', name: "KonoSuba", anime: 'konosuba-gods-blessing-on-this-wonderful-world' },
  { slug: 'anime-like-the-promised-neverland', name: "The Promised Neverland", anime: 'the-promised-neverland' },
  { slug: 'anime-like-cowboy-bebop', name: "Cowboy Bebop", anime: 'cowboy-bebop' },
  { slug: 'anime-like-evangelion', name: "Neon Genesis Evangelion", anime: 'neon-genesis-evangelion' },
  { slug: 'anime-like-parasyte', name: "Parasyte", anime: 'parasyte-the-maxim' },
  { slug: 'anime-like-chainsaw-man', name: "Chainsaw Man", anime: 'chainsaw-man' },
  { slug: 'anime-like-violet-evergarden', name: "Violet Evergarden", anime: 'violet-evergarden' },
  { slug: 'anime-like-dr-stone', name: "Dr. Stone", anime: 'dr-stone' },
  { slug: 'anime-like-black-clover', name: "Black Clover", anime: 'black-clover' },
  { slug: 'anime-like-spy-x-family', name: "Spy x Family", anime: 'spy-x-family' },
  { slug: 'anime-like-jojo', name: "JoJo's Bizarre Adventure", anime: 'jojos-bizarre-adventure-2012' },
  { slug: 'anime-like-vinland-saga', name: "Vinland Saga", anime: 'vinland-saga' },
  { slug: 'anime-like-fairy-tail', name: "Fairy Tail", anime: 'fairy-tail' },
  { slug: 'anime-like-darling-in-the-franxx', name: "Darling in the Franxx", anime: 'darling-in-the-franxx' },
  { slug: 'anime-like-another', name: "Another", anime: 'another' },
  { slug: 'anime-like-soul-eater', name: "Soul Eater", anime: 'soul-eater' },
  { slug: 'anime-like-shield-hero', name: "The Rising of the Shield Hero", anime: 'the-rising-of-the-shield-hero' },
  { slug: 'anime-like-overlord', name: "Overlord", anime: 'overlord' },
  { slug: 'anime-like-horimiya', name: "Horimiya", anime: 'horimiya' },
  { slug: 'anime-like-slime', name: "That Time I Got Reincarnated as a Slime", anime: 'that-time-i-got-reincarnated-as-a-slime' },
  { slug: 'anime-like-danmachi', name: "DanMachi", anime: 'is-it-wrong-to-try-to-pick-up-girls-in-a-dungeon' },
  { slug: 'anime-like-kakegurui', name: "Kakegurui", anime: 'kakegurui' },
  { slug: 'anime-like-mushoku-tensei', name: "Mushoku Tensei", anime: 'mushoku-tensei-jobless-reincarnation' },
  { slug: 'anime-like-bungo-stray-dogs', name: "Bungo Stray Dogs", anime: 'bungo-stray-dogs' },
  { slug: 'anime-like-frieren', name: "Frieren", anime: 'frieren-beyond-journeys-end' },
  { slug: 'anime-like-classroom-of-the-elite', name: "Classroom of the Elite", anime: 'classroom-of-the-elite' },
  { slug: 'anime-like-hyouka', name: "Hyouka", anime: 'hyouka' },
  { slug: 'anime-like-tokyo-revengers', name: "Tokyo Revengers", anime: 'tokyo-revengers' },
  { slug: 'anime-like-my-dress-up-darling', name: "My Dress-Up Darling", anime: 'my-dress-up-darling' },
  { slug: 'anime-like-maid-sama', name: "Maid Sama!", anime: 'maid-sama' },
  { slug: 'anime-like-dragon-ball', name: "Dragon Ball", anime: 'dragon-ball-z' },
  { slug: 'anime-like-solo-leveling', name: "Solo Leveling", anime: 'solo-leveling' },
  { slug: 'anime-like-black-lagoon', name: "Black Lagoon", anime: 'black-lagoon' },
  { slug: 'anime-like-rent-a-girlfriend', name: "Rent-a-Girlfriend", anime: 'rent-a-girlfriend' },
  { slug: 'anime-like-oshi-no-ko', name: "Oshi no Ko", anime: 'oshi-no-ko' },
  { slug: 'anime-like-tower-of-god', name: "Tower of God", anime: 'tower-of-god' },
  { slug: 'anime-like-dandadan', name: "Dandadan", anime: 'dan-da-dan' },
  { slug: 'anime-like-komi-cant-communicate', name: "Komi Can't Communicate", anime: 'komi-cant-communicate' },
  { slug: 'anime-like-hells-paradise', name: "Hell's Paradise", anime: 'hells-paradise' },
  { slug: 'anime-like-fruits-basket', name: "Fruits Basket", anime: 'fruits-basket-1st-season' },
  { slug: 'anime-like-yona-of-the-dawn', name: "Yona of the Dawn", anime: 'yona-of-the-dawn' },
  { slug: 'anime-like-blue-lock', name: "Blue Lock", anime: 'blue-lock' },
  { slug: 'anime-like-mushishi', name: "Mushishi", anime: 'mushi-shi' },
  { slug: 'anime-like-the-apothecary-diaries', name: "The Apothecary Diaries", anime: 'the-apothecary-diaries' },
  { slug: 'anime-like-the-eminence-in-shadow', name: "The Eminence in Shadow", anime: 'the-eminence-in-shadow' },
  { slug: 'anime-like-gate', name: "Gate", anime: 'gate' },
  { slug: 'anime-like-inuyasha', name: "InuYasha", anime: 'inuyasha' },
  { slug: 'anime-like-trigun', name: "Trigun", anime: 'trigun' },
  { slug: 'anime-like-mashle', name: "Mashle", anime: 'mashle-magic-and-muscles' },
  { slug: 'anime-like-hellsing', name: "Hellsing", anime: 'hellsing' },
  { slug: 'anime-like-berserk', name: "Berserk", anime: 'berserk' },
  { slug: 'anime-like-kaiju-no-8', name: "Kaiju No. 8", anime: 'kaiju-no-8' },
  { slug: 'anime-like-pokemon', name: "Pokémon", anime: 'pokemon' },
  { slug: 'anime-like-delicious-in-dungeon', name: "Delicious in Dungeon", anime: 'delicious-in-dungeon' },
  { slug: 'anime-like-sakamoto-days', name: "Sakamoto Days", anime: 'sakamoto-days' },
  { slug: 'anime-like-baki', name: "Baki", anime: 'baki' },
  { slug: 'anime-like-wind-breaker', name: "Wind Breaker", anime: 'wind-breaker' },
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
