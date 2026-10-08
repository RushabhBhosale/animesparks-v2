import { readFileSync, writeFileSync } from 'node:fs';
import { MongoClient } from 'mongodb';
import { contentFingerprint } from '../src/lib/content/content-fingerprint.mjs';

function getMongoUri() {
  if (process.env.MONGODB_URI) return process.env.MONGODB_URI;
  try {
    const line = readFileSync('.dev.vars', 'utf8').split(/\r?\n/).find(value => value.startsWith('MONGODB_URI='));
    if (line) return JSON.parse(line.slice('MONGODB_URI='.length));
  } catch { /* A CI run supplies MONGODB_URI through the environment. */ }
  throw new Error('MONGODB_URI is required to calculate the content fingerprint.');
}

const live = article => {
  const publishedAt = Date.parse(article.publishedAt || '');
  return !!article.slug && Number.isFinite(publishedAt) && publishedAt <= Date.now();
};

async function readSnapshot() {
  const client = new MongoClient(getMongoUri(), { serverSelectionTimeoutMS: 10000, connectTimeoutMS: 8000, maxPoolSize: 2 });
  try {
    await client.connect();
    const db = client.db(process.env.MONGODB_DB_NAME || 'animesparks');
    const [articles, categories, anime, homepage] = await Promise.all([
      db.collection('articles').find(
        { publicationState: 'published', language: { $in: ['en', 'es'] } },
        { projection: { _id: 0, sourceUnknownFields: 0 } },
      ).toArray(),
      db.collection('categories').find(
        { publicationState: 'published' },
        { projection: { _id: 0, sanityId: 1, title: 1, slug: 1, description: 1 } },
      ).sort({ title: 1 }).toArray(),
      db.collection('animeEntries').find(
        { publicationState: 'published' },
        { projection: { _id: 0, sanityId: 1, title: 1, score: 1, coverImage: 1, bannerImage: 1, genres: 1, year: 1 } },
      ).sort({ title: 1 }).toArray(),
      db.collection('homepageSettings').findOne({}, { projection: { _id: 0, editorsPicks: 1, moreBlogs: 1 } }),
    ]);
    const publishedArticles = articles.filter(article => ['en', 'es'].includes(article.language) && live(article));
    const categoryIds = [...new Set(publishedArticles.flatMap(article => article.categorySanityIds || []))];
    const authorIds = [...new Set(publishedArticles.map(article => article.authorSanityId).filter(Boolean))];
    const [referencedCategories, authors] = await Promise.all([
      categoryIds.length ? db.collection('categories').find(
        { sanityId: { $in: categoryIds } },
        { projection: { _id: 0, sanityId: 1, title: 1, slug: 1, description: 1 } },
      ).toArray() : [],
      authorIds.length ? db.collection('authors').find(
        { sanityId: { $in: authorIds } },
        { projection: { _id: 0, sanityId: 1, name: 1, slug: 1, image: 1, bio: 1 } },
      ).toArray() : [],
    ]);
    const byId = records => records.sort((a, b) => String(a.sanityId).localeCompare(String(b.sanityId)));
    return {
      articles: byId(publishedArticles),
      categories: byId(categories),
      referencedCategories: byId(referencedCategories),
      authors: byId(authors),
      anime: byId(anime),
      homepage: homepage || null,
    };
  } finally {
    await client.close();
  }
}

async function main() {
  if (process.argv.includes('--self-test')) {
    const base = { articles: [{ language: 'en', slug: 'sample' }], categories: [] };
    const first = contentFingerprint(base);
    if (first !== contentFingerprint(base)) throw new Error('Fingerprint is not stable for identical input.');
    if (first === contentFingerprint({ ...base, articles: [{ language: 'en', slug: 'changed' }] })) {
      throw new Error('Fingerprint did not change when relevant input changed.');
    }
    console.log('Content fingerprint self-check passed (stable input and changed input).');
    return;
  }

  const snapshot = await readSnapshot();
  const fingerprint = contentFingerprint(snapshot);
  const manifestArg = process.argv.findIndex(value => value === '--write-manifest');
  if (manifestArg >= 0) {
    const manifestPath = process.argv[manifestArg + 1];
    if (!manifestPath) throw new Error('--write-manifest requires a path.');
    if (process.env.CONTENT_FINGERPRINT && process.env.CONTENT_FINGERPRINT !== fingerprint) {
      throw new Error('MongoDB content changed during the production build; refusing to create a mismatched manifest.');
    }
    writeFileSync(manifestPath, `${JSON.stringify({ schema: 1, fingerprint }, null, 2)}\n`);
    return;
  }
  if (process.argv.includes('--github-output')) {
    if (!process.env.GITHUB_OUTPUT) throw new Error('GITHUB_OUTPUT is not set.');
    writeFileSync(process.env.GITHUB_OUTPUT, `fingerprint=${fingerprint}\n`, { flag: 'a' });
    return;
  }
  console.log(fingerprint);
}

main().catch(error => {
  console.error(`Content fingerprint failed: ${error.message}`);
  process.exitCode = 1;
});
