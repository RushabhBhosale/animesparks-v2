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
};

export function applySeoOverride<T extends PublicArticle>(article: T): T {
  const override = article.language === 'en' ? seoOverrides[article.slug] : undefined;
  return override ? { ...article, ...override } : article;
}
