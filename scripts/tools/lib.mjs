import { readFileSync } from 'node:fs';
import { MongoClient } from 'mongodb';

/** Reads MONGODB_URI from the environment or .dev.vars (quoted or bare). */
export function getMongoUri(variable = 'MONGODB_URI') {
  if (process.env[variable]) return process.env[variable];
  try {
    const line = readFileSync('.dev.vars', 'utf8').split(/\r?\n/).find(value => value.startsWith(`${variable}=`));
    if (line) {
      const raw = line.slice(variable.length + 1).trim();
      return raw.startsWith('"') ? JSON.parse(raw) : raw;
    }
  } catch { /* CI provides the variable through the environment. */ }
  throw new Error(`${variable} is required.`);
}

export async function connect(uri) {
  const client = new MongoClient(uri, { serverSelectionTimeoutMS: 15000, connectTimeoutMS: 10000, maxPoolSize: 4 });
  await client.connect();
  return { client, db: client.db(process.env.MONGODB_DB_NAME || 'animesparks') };
}

/** Additive indexes for tool collections. Existing collections are untouched. */
export async function ensureToolIndexes(db) {
  await Promise.all([
    db.collection('toolAnime').createIndexes([
      { key: { slug: 1 }, name: 'slug_unique', unique: true },
      { key: { 'externalIds.mal': 1 }, name: 'mal_unique', unique: true, partialFilterExpression: { 'externalIds.mal': { $type: 'number' } } },
      { key: { status: 1, popularity: 1 }, name: 'status_popularity' },
      { key: { franchiseSlug: 1 }, name: 'franchise' },
    ]),
    db.collection('toolFranchises').createIndexes([
      { key: { slug: 1 }, name: 'slug_unique', unique: true },
      { key: { anchorMalId: 1 }, name: 'anchor_unique', unique: true },
      { key: { active: 1 }, name: 'active' },
    ]),
    db.collection('toolWatchOrders').createIndexes([
      { key: { franchiseSlug: 1, kind: 1 }, name: 'franchise_kind_unique', unique: true },
    ]),
    db.collection('toolSyncRuns').createIndexes([
      { key: { startedAt: -1 }, name: 'started' },
    ]),
    db.collection('toolManga').createIndexes([
      { key: { 'externalIds.malManga': 1 }, name: 'mal_manga_unique', unique: true },
    ]),
    db.collection('toolEpisodeLists').createIndexes([{ key: { slug: 1 }, name: 'slug_unique', unique: true }]),
    db.collection('toolFillerLists').createIndexes([{ key: { slug: 1 }, name: 'slug_unique', unique: true }]),
    db.collection('toolMangaMappings').createIndexes([{ key: { slug: 1 }, name: 'slug_unique', unique: true }]),
    db.collection('toolArcs').createIndexes([{ key: { slug: 1 }, name: 'slug_unique', unique: true }]),
    db.collection('toolScheduleNotices').createIndexes([{ key: { slug: 1, date: 1 }, name: 'slug_date' }]),
    db.collection('toolDailyGame').createIndexes([{ key: { date: 1 }, name: 'date_unique', unique: true }]),
  ]);
}

/** Drops undefined values so the driver does not store them as null. */
export function defined(object) {
  return Object.fromEntries(Object.entries(object).filter(([, value]) => value !== undefined));
}

export function argValue(name, fallback) {
  const prefix = `--${name}=`;
  const match = process.argv.find(value => value.startsWith(prefix));
  return match ? match.slice(prefix.length) : fallback;
}

export function hasFlag(name) {
  return process.argv.includes(`--${name}`);
}
