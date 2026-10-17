// Contextual links from articles to the tools, built at prerender time.
// Only pages that exist and are indexable are linked, and only when the
// article is about that anime (its animeName, or a tag equal to a title).

import type { ArticleCard } from '../content/types';
import { getToolsBuildData } from './build-data';
import { getToolsExtras } from './build-extras';
import { canonicalFranchiseSlug, MANGA_LANDINGS } from './landings.ts';
import { compactKey } from './normalize.ts';

export interface ArticleToolLink {
  href: string;
  label: string;
  note: string;
}

const SCHEDULE_PATTERN = /\b(release date|premiere|airing|air date|episode \d+ release|new season|season \d+ (confirmed|release)|schedule)\b/i;

async function createLinker(english: ArticleCard[]) {
  const [{ anime, franchises }, { filler, source }] = await Promise.all([getToolsBuildData(), getToolsExtras(english)]);
  const fillerBySlug = new Map(filler.filter(view => view.indexable).map(view => [view.slug, view]));
  const franchiseBySlug = new Map(franchises.filter(item => item.indexable).map(item => [item.slug, item]));
  const mangaBySlug = new Map(MANGA_LANDINGS.filter(landing => landing.entries.every(slug => source[slug]?.mapping)).flatMap(landing => landing.entries.map(slug => [slug, landing] as const)));
  // Title key → the most popular TV/ONA entry with that title.
  const byKey = new Map<string, (typeof anime)[number]>();
  for (const item of [...anime].filter(entry => ['tv', 'ona'].includes(entry.format)).sort((a, b) => (b.popularity || Infinity) - (a.popularity || Infinity))) {
    for (const title of [item.title, item.titleEnglish, item.titleRomaji, ...(item.legacy?.articleAnimeNames || [])]) {
      const key = title && compactKey(title);
      if (key && key.length > 3) byKey.set(key, item);
    }
  }

  return (article: ArticleCard): ArticleToolLink[] => {
    if (article.language !== 'en') return [];
    const candidates = [article.animeName, ...(article.tags || [])].filter((value): value is string => Boolean(value));
    const item = candidates.map(value => byKey.get(compactKey(value))).find(Boolean);
    const links: ArticleToolLink[] = [];
    if (item) {
      const fillerView = fillerBySlug.get(item.slug);
      if (fillerView && fillerView.summary.skippable > 0) {
        links.push({ href: `/tools/anime-filler-checker/${item.slug}`, label: `${item.title} filler list`, note: `${fillerView.summary.skippable} filler and recap episodes you can skip` });
      }
      const franchise = item.franchiseSlug ? franchiseBySlug.get(canonicalFranchiseSlug(item.franchiseSlug)) : undefined;
      if (franchise) links.push({ href: `/tools/anime-watch-order/${franchise.slug}`, label: `${franchise.title} watch order`, note: 'every season, movie and special in order' });
      const manga = mangaBySlug.get(item.slug);
      if (manga) links.push({ href: `/tools/anime-manga-chapter-finder/${manga.slug}`, label: `Where the ${manga.name} anime ends in the manga`, note: 'the chapter to continue from' });
      if ((item.episodes || item.episodesAired || 0) >= 12) links.push({ href: `/tools/anime-binge-calculator?anime=${item.slug}`, label: `How long to watch ${item.title}`, note: 'total time and your finish date' });
    }
    const isNews = article.categories.some(category => /news/i.test(category.title));
    if (isNews && SCHEDULE_PATTERN.test(`${article.title} ${(article.tags || []).join(' ')}`)) {
      links.push({ href: '/tools/anime-release-calendar', label: 'Anime release calendar', note: 'this week’s broadcast times in your timezone' });
    }
    return links.slice(0, 3);
  };
}

let linker: ReturnType<typeof createLinker> | undefined;
export function getArticleToolLinker(english: ArticleCard[]) {
  return linker ??= createLinker(english);
}
