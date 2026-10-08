import type { Db } from 'mongodb';
import { getArticlesByIds, getLatestArticles, getPublishedArticles, hydrateCards } from './articles';
import type { ArticleCard, HomePageData, HomepageSettingsDocument } from './types';

export async function getHomepage(db: Db): Promise<HomePageData> {
  const [latestDocs, settings, allCards, spanishCards] = await Promise.all([
    getLatestArticles(db),
    db.collection<HomepageSettingsDocument>('homepageSettings').findOne({}, { projection: { _id: 0, editorsPicks: 1, moreBlogs: 1 } }),
    getPublishedArticles(db),
    getPublishedArticles(db, 'es'),
  ]);
  const pickIds = (settings?.editorsPicks || []).map(x => x.sanityId).filter(Boolean);
  const pickDocs = await getArticlesByIds(db, pickIds);
  const [latest, picks] = await Promise.all([hydrateCards(db, latestDocs), hydrateCards(db, pickDocs)]);
  // The production cover currently follows the latest published story.
  // Migrated settings remain available, but their picks are older than the live cover.
  const featured = latest[0] || picks[0] || null;
  const used = new Set(featured ? [featured.sanityId] : []);
  const unique = (items: ArticleCard[], max: number) => {
    const result: ArticleCard[] = [];
    for (const article of items) {
      if (result.length >= max) break;
      if (used.has(article.sanityId)) continue;
      used.add(article.sanityId);
      result.push(article);
    }
    return result;
  };
  const currentPickIds = new Set(latest.slice(0, 4).map(article => article.sanityId));
  const editorsSource = picks.some(article => currentPickIds.has(article.sanityId)) ? picks : latest;
  const editorsPicks = unique(editorsSource, 3);
  const latestVisible = unique(latest, 6);
  const popular = latest.filter(a => !used.has(a.sanityId)).sort((a, b) => (b.viewCount || 0) - (a.viewCount || 0)).slice(0, 2);
  const sections = [...new Map(latest.flatMap(a => a.categories).map(c => [c.slug, c])).values()].slice(0, 6);
  const trending = allCards.filter(article => article.mainImage?.asset?.r2Key).sort((a, b) => (b.viewCount || 0) - (a.viewCount || 0) || Date.parse(b.publishedAt || '') - Date.parse(a.publishedAt || '')).slice(0, 10);
  const clusterMap = new Map<string, { name: string; count: number; cover?: ArticleCard['mainImage'] }>();
  for (const article of allCards) {
    const name = article.animeName?.trim();
    if (!name) continue;
    const cluster = clusterMap.get(name) || { name, count: 0, cover: undefined };
    cluster.count++;
    if (!cluster.cover && article.mainImage?.asset?.r2Key) cluster.cover = article.mainImage;
    clusterMap.set(name, cluster);
  }
  const animeClusters = [...clusterMap.values()].filter(cluster => cluster.count >= 2).sort((a, b) => b.count - a.count || a.name.localeCompare(b.name)).slice(0, 6);
  return { featured, editorsPicks, latest: latestVisible, popular, sections, trending, animeClusters, spanish: spanishCards.slice(0, 3) };
}
