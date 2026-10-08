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
  const [latestDocsCards, picks, hydratedAll, hydratedSpanish] = await Promise.all([
    hydrateCards(db, latestDocs), hydrateCards(db, pickDocs), hydrateCards(db, allCards), hydrateCards(db, spanishCards),
  ]);
  const orderFresh = (items: ArticleCard[]) => [...items].sort((a, b) =>
    Date.parse(b.publishedAt || '') - Date.parse(a.publishedAt || '') || a.sanityId.localeCompare(b.sanityId));
  const latest = orderFresh(latestDocsCards);
  const allEnglish = orderFresh(hydratedAll);
  const spanish = orderFresh(hydratedSpanish);
  const identity = (article: ArticleCard) => article.translationOfSanityId || article.sanityId;
  const featured = latest[0] || picks[0] || null;
  const used = new Set(featured ? [identity(featured)] : []);
  const unique = (items: ArticleCard[], max: number) => {
    const result: ArticleCard[] = [];
    for (const article of items) {
      if (result.length >= max) break;
      const key = identity(article);
      if (used.has(key)) continue;
      used.add(key);
      result.push(article);
    }
    return result;
  };
  // Explicitly configured picks retain priority, then fresh stories fill gaps.
  const editorsPicks = unique([...picks, ...latest, ...allEnglish], 3);
  const latestVisible = unique([...latest, ...allEnglish], 6);
  // The homepage fills these at request time from GA4; Mongo viewCount is stale.
  const popular: ArticleCard[] = [];
  const sections = [...new Map(latest.flatMap(a => a.categories).map(c => [c.slug, c])).values()].slice(0, 6);
  const trending: ArticleCard[] = [];
  const clusterMap = new Map<string, { name: string; count: number; cover?: ArticleCard['mainImage'] }>();
  for (const article of allEnglish) {
    const name = article.animeName?.trim();
    if (!name) continue;
    const cluster = clusterMap.get(name) || { name, count: 0, cover: undefined };
    cluster.count++;
    if (!cluster.cover && article.mainImage?.asset?.r2Key) cluster.cover = article.mainImage;
    clusterMap.set(name, cluster);
  }
  const animeClusters = [...clusterMap.values()].filter(cluster => cluster.count >= 2).sort((a, b) => b.count - a.count || a.name.localeCompare(b.name)).slice(0, 6);
  const spanishVisible = unique(spanish, 3);
  return { featured, editorsPicks, latest: latestVisible, popular, sections, trending, animeClusters, spanish: spanishVisible };
}
