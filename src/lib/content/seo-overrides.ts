import type { ArticleCard, ArticleDocument } from './types';

type PublicArticle = ArticleDocument | ArticleCard;

/** Search-result title/description rewrites chosen from Search Console data
 * (Sep 26–Oct 23, 2026: high impressions, CTR under ~0.3%). They apply at build
 * time only, so MongoDB, H1s, slugs and dates stay untouched. `metaTitle` omits
 * the brand because ArticleDetail appends " | AnimeSparks". Keep titles near 47
 * characters or less so the brand is not truncated, and descriptions at 160 or
 * less (articleSeo cuts anything longer). */
const seoOverrides: Record<string, { metaTitle: string; metaDescription: string }> = {
  'what-happened-to-deku-powers-my-hero-academia-ending': {
    metaTitle: 'Does Deku Lose One For All? MHA Ending Explained',
    metaDescription: 'Does Deku lose One For All at the end of MHA? What happens to his powers, the embers of One For All, the Shigaraki finale and his return to hero work.',
  },
  'is-megumi-fushiguro-dead-in-jjk-modulo-explained': {
    metaTitle: 'Is Megumi Dead in JJK Modulo? Ten Shadows Clues',
    metaDescription: 'Megumi Fushiguro is almost certainly dead in JJK Modulo, though it is never stated outright. Here is the Ten Shadows inheritance and the other evidence.',
  },
  'who-is-lakan-apothecary-diaries-maomao-father': {
    metaTitle: 'Is Lakan Maomao’s Father? Apothecary Diaries',
    metaDescription: 'Lakan is Maomao’s biological father, but she keeps her distance. What the anime shows about Lakan, Fengxian and Luomen and why the bond is so complicated.',
  },
  'the-fragrant-flower-blooms-with-dignity-season-2': {
    metaTitle: 'Fragrant Flower Season 2: Confirmed or Not?',
    metaDescription: 'Has The Fragrant Flower Blooms With Dignity Season 2 been announced? Renewal status, what the ongoing manga means, and what is still unknown.',
  },
  'how-does-subaru-return-by-death-work-re-zero': {
    metaTitle: 'Re:Zero Return by Death Explained: Rules & Limits',
    metaDescription: 'How Return by Death works in Re:Zero: what resets, who chooses the checkpoints, why Subaru cannot tell anyone, whether Satella is the source, and its limits.',
  },
  'black-clover-magic-knight-captains-ranked-strongest': {
    metaTitle: 'Black Clover Captains Ranked: Mereoleona Is #1',
    metaDescription: 'Who is the strongest Black Clover captain? We rank Mereoleona, Yami, Fuegoleon, Nozel and more using manga feats, matchups and final-arc performances.',
  },
  'tokyo-revengers-season-4-release-date-trailer-and-final-arc-explained-2026': {
    metaTitle: 'Tokyo Revengers Season 4 Schedule & Streaming',
    metaDescription: 'Tokyo Revengers Season 4 premiered October 2, 2026. See the Japan broadcast schedule, Disney+ streaming and what the War of the Three Titans Arc covers.',
  },
  'tougen-anki-season-2-release-date-arc-details-cast-and-everything-we-know': {
    metaTitle: 'Tougen Anki Season 2: Premiere, Cast & Trailer',
    metaDescription: 'Tougen Anki Season 2, the Nikko Kegon Falls Arc, premiered October 2, 2026 on Nippon TV. Trailer, new cast, theme songs, recap schedule and story details.',
  },
  'the-ramparts-of-ice-season-2-release-date-october-2026': {
    metaTitle: 'Ramparts of Ice Season 2 Schedule & Streaming',
    metaDescription: 'The Ramparts of Ice Season 2 premiered October 1, 2026 in Japan, airing Thursdays on TBS, with weekly Netflix episodes worldwide. Schedule, story and cast.',
  },
  'who-is-future-rudeus-mushoku-tensei-turning-point-4': {
    metaTitle: 'Who Is Oldeus in Mushoku Tensei? Future Rudeus',
    metaDescription: 'Oldeus is the fan name for Future Rudeus, an older Rudeus from a ruined future. Who he is, why he returns, and what Season 3 Episodes 12 and 13 reveal.',
  },
  'who-is-hitogami-mushoku-tensei-man-god-explained': {
    metaTitle: 'Who Is Hitogami in Mushoku Tensei? The Man-God',
    metaDescription: 'Who is Hitogami, the Man-God of Mushoku Tensei? Why his advice seemed trustworthy, how Oldeus exposes it, and what Season 3 Episode 13 changes. Spoilers.',
  },
  'jujutsu-kaisen-domain-expansion-explained-how-domains-work': {
    metaTitle: 'JJK Domain Expansion Rules, Clashes & Counters',
    metaDescription: 'How does Domain Expansion work in Jujutsu Kaisen? Sure-hit effects, domain clashes, counters, incomplete domains like Megumi’s, and why Sukuna’s domain differs.',
  },
  'who-is-jinshi-apothecary-diaries-true-identity': {
    metaTitle: 'Is Jinshi a Eunuch? True Identity Explained',
    metaDescription: 'Is Jinshi really a eunuch? What The Apothecary Diaries reveals about his royal identity, why he hides it, and when Maomao notices. Major spoilers.',
  },
  'maomao-jinshi-relationship-apothecary-diaries-explained': {
    metaTitle: 'Are Maomao and Jinshi Together? Explained',
    metaDescription: 'Are Maomao and Jinshi together? Not officially in the anime yet. How their slow-burn romance develops, why she resists him, and where they stand now.',
  },
  'how-long-does-it-take-to-watch-one-piece': {
    metaTitle: 'How Long to Watch One Piece? Hours & Days by Pace',
    metaDescription: 'How long does it take to watch One Piece? About 469 hours for 1,173 episodes. See the days needed at 1, 2, 4 or 8 hours a day, with and without filler.',
  },
};

export function applySeoOverride<T extends PublicArticle>(article: T): T {
  const override = article.language === 'en' ? seoOverrides[article.slug] : undefined;
  return override ? { ...article, ...override } : article;
}
