// Build-time links from the encyclopedia into the rest of AnimeSparks: the
// tools (only pages that exist and are indexable) and the blog articles.

import type { ArticleCard } from '../content/types';
import { getToolsBuildData } from '../tools/build-data';
import { getToolsExtras } from '../tools/build-extras';
import { ARC_LANDINGS, canonicalFranchiseSlug, MANGA_LANDINGS } from '../tools/landings';
import { compactKey } from '../tools/normalize';
import type { CharacterProfile, SeriesData } from './types.ts';

export interface SiteLink { href: string; label: string; note: string }

/** Tool pages that exist for this series, with descriptive anchor text. */
export async function seriesToolLinks(series: SeriesData, english: ArticleCard[]): Promise<SiteLink[]> {
  const [{ franchises }, { filler, source }] = await Promise.all([getToolsBuildData(), getToolsExtras(english)]);
  const links: SiteLink[] = [];
  const keys = series.toolKeys;
  const franchise = keys.franchise && franchises.find(item => item.indexable && item.slug === canonicalFranchiseSlug(keys.franchise!));
  if (franchise) links.push({ href: `/tools/anime-watch-order/${franchise.slug}`, label: `${series.title} watch order`, note: 'every season, movie and special in release order' });
  const manga = keys.manga && MANGA_LANDINGS.find(item => item.slug === keys.manga && item.entries.every(slug => source[slug]?.mapping));
  if (manga) links.push({ href: `/tools/anime-manga-chapter-finder/${manga.slug}`, label: `Where the ${series.short} anime ends in the manga`, note: 'the chapter to continue from' });
  const arc = keys.arc && ARC_LANDINGS.find(item => item.slug === keys.arc && item.entries.every(slug => source[slug]?.arcs?.arcs.length));
  if (arc) links.push({ href: `/tools/anime-arc-explorer/${arc.slug}`, label: `${series.short} arcs in order`, note: 'every story arc with its episodes' });
  const fillerView = filler.find(view => view.indexable && keys.anime.includes(view.slug));
  if (fillerView) links.push({ href: `/tools/anime-filler-checker/${fillerView.slug}`, label: `${fillerView.title} filler list`, note: 'which episodes you can skip' });
  if (keys.anime[0]) links.push({ href: `/tools/anime-binge-calculator?anime=${keys.anime[0]}`, label: `How long it takes to watch ${series.short}`, note: 'total time and your finish date' });
  return links;
}

/**
 * Articles for a profile: those that name the character in their title or
 * tags rank first, then articles about the same series. Newest first inside a tier.
 */
export function articlesForCharacter(profile: CharacterProfile, series: SeriesData, english: ArticleCard[], limit = 6): ArticleCard[] {
  const seriesKeys = new Set(series.articleNames.map(compactKey));
  const nameKeys = [profile.name, ...(profile.articleKeys || [])].map(compactKey).filter(key => key.length > 3);
  const scored = english.flatMap(article => {
    const title = compactKey(article.title);
    const tags = (article.tags || []).map(compactKey);
    const named = nameKeys.some(key => title.includes(key) || tags.includes(key));
    const about = Boolean(article.animeName && seriesKeys.has(compactKey(article.animeName))) || tags.some(tag => seriesKeys.has(tag));
    return named || about ? [{ article, score: (named ? 2 : 0) + (about ? 1 : 0) }] : [];
  });
  return scored.sort((a, b) => b.score - a.score).slice(0, limit).map(item => item.article);
}

export function seriesArticles(series: SeriesData, english: ArticleCard[], limit = 6): ArticleCard[] {
  const keys = new Set(series.articleNames.map(compactKey));
  return english.filter(article => (article.animeName && keys.has(compactKey(article.animeName))) || (article.tags || []).some(tag => keys.has(compactKey(tag)))).slice(0, limit);
}
