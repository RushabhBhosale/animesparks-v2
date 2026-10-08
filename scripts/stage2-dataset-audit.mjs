// Read-only audit of the migrated public article dataset. Never prints the URI.
import { readFileSync, writeFileSync } from 'node:fs';
import { MongoClient } from 'mongodb';

const secretLine = readFileSync('.dev.vars', 'utf8').split(/\r?\n/).find(line => line.startsWith('MONGODB_URI='));
if (!secretLine) throw new Error('Local read-only audit requires MONGODB_URI in .dev.vars');
const client = new MongoClient(JSON.parse(secretLine.slice('MONGODB_URI='.length)), { serverSelectionTimeoutMS: 10000 });
const now = Date.now();
const count = (items, predicate) => items.filter(predicate).length;
try {
  await client.connect();
  const db = client.db('animesparks');
  const articles = await db.collection('articles').find({}, {
    projection: { _id: 0, sourceDocument: 0, sourceUnknownFields: 0, migration: 0 },
  }).toArray();
  const publicDocs = articles.filter(article => article.publicationState === 'published' && article.slug && Date.parse(article.publishedAt || '') <= now);
  const drafts = articles.filter(article => article.publicationState === 'draft');
  const publicKeys = new Map();
  for (const article of publicDocs) {
    const key = `${article.language}:${article.slug}`;
    publicKeys.set(key, (publicKeys.get(key) || 0) + 1);
  }
  const enById = new Map(publicDocs.filter(article => article.language === 'en').map(article => [article.sanityId, article]));
  const spanish = publicDocs.filter(article => article.language === 'es');
  const blockTypes = {}, styles = {}, listTypes = {}, listLevels = {}, markDefTypes = {};
  const unsupported = [], missingInlineR2 = [], orphanMarks = [];
  const supportedStyles = new Set(['normal', 'h1', 'h2', 'h3', 'h4', 'blockquote']);
  for (const article of publicDocs) for (const block of article.body || []) {
    blockTypes[block._type] = (blockTypes[block._type] || 0) + 1;
    if (!['block', 'image'].includes(block._type)) unsupported.push(`${article.slug}:block:${block._type}`);
    if (block._type === 'image' && !block.asset?.r2Key) missingInlineR2.push(article.slug);
    if (block.style) {
      styles[block.style] = (styles[block.style] || 0) + 1;
      if (!supportedStyles.has(block.style)) unsupported.push(`${article.slug}:style:${block.style}`);
    }
    if (block.listItem) {
      listTypes[block.listItem] = (listTypes[block.listItem] || 0) + 1;
      listLevels[block.level || 1] = (listLevels[block.level || 1] || 0) + 1;
      if (!['bullet', 'number'].includes(block.listItem)) unsupported.push(`${article.slug}:list:${block.listItem}`);
    }
    for (const def of block.markDefs || []) {
      markDefTypes[def._type] = (markDefTypes[def._type] || 0) + 1;
      if (def._type !== 'link') unsupported.push(`${article.slug}:markDef:${def._type}`);
    }
    for (const span of block.children || []) for (const mark of span.marks || []) {
      if (['strong', 'em', 'code', 'underline', 'strike-through'].includes(mark)) continue;
      if (!(block.markDefs || []).some(def => def._key === mark)) orphanMarks.push(`${article.slug}:${mark}`);
    }
  }
  const storedSanity = publicDocs.filter(article => JSON.stringify(article).includes('cdn.sanity.io'));
  const result = {
    totalArticles: articles.length,
    publishedEnglish: count(publicDocs, article => article.language === 'en'),
    publishedSpanish: spanish.length,
    drafts: drafts.length,
    draftOnlySlugs: drafts.filter(article => !publicDocs.some(pub => pub.language === article.language && pub.slug === article.slug)).map(article => article.slug),
    missingSlugs: articles.filter(article => !article.slug).map(article => article.sanityId),
    duplicatePublicSlugs: [...publicKeys].filter(([, n]) => n > 1),
    missingPublicHeroR2: publicDocs.filter(article => !article.mainImage?.asset?.r2Key).map(article => article.slug),
    missingInlineR2: [...new Set(missingInlineR2)],
    publicArticlesWithStoredSanityCdnHostedUrls: storedSanity.length,
    publicStoredSanityCdnPaths: storedSanity.map(article => article.slug),
    blockTypes, styles, listTypes, listLevels, markDefTypes,
    unsupported, orphanMarks,
    brokenSpanishRelationships: spanish.filter(article => !enById.has(article.translationOfSanityId)).map(article => article.slug),
    duplicatedSpanishRelationships: [...new Map(spanish.map(article => [article.translationOfSanityId, spanish.filter(peer => peer.translationOfSanityId === article.translationOfSanityId).length]))].filter(([, n]) => n > 1),
  };
  const output = process.argv[2] || '/private/tmp/animesparks-stage2-dataset-audit.json';
  writeFileSync(output, JSON.stringify(result, null, 2));
  console.log(JSON.stringify({ ...result, publicStoredSanityCdnPaths: `${storedSanity.length} slugs in report` }, null, 2));
} finally {
  await client.close();
}
