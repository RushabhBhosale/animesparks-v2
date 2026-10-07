import type { Db } from 'mongodb';
import { getArticlesByIds, getLatestArticles, hydrateCards } from './articles';
import type { ArticleCard, HomePageData, HomepageSettingsDocument } from './types';

export async function getHomepage(db: Db): Promise<HomePageData> {
  const [latestDocs, settings] = await Promise.all([
    getLatestArticles(db),
    db.collection<HomepageSettingsDocument>('homepageSettings').findOne({}, { projection: { _id: 0, editorsPicks: 1, moreBlogs: 1 } }),
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
  const popular = latest.filter(a => !used.has(a.sanityId)).sort((a, b) => (b.viewCount || 0) - (a.viewCount || 0)).slice(0, 5);
  const sections = [...new Map(latest.flatMap(a => a.categories).map(c => [c.slug, c])).values()].slice(0, 6);
  return { featured, editorsPicks, latest: latestVisible, popular, sections };
}
