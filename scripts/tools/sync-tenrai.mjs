// Scheduled Tenrai → MongoDB synchronisation for AnimeSparks tools.
//
//   node scripts/tools/sync-tenrai.mjs [--dry-run] [--top-pages=20] [--franchise-roots=250]
//                                      [--max-requests=1800] [--skip-franchises] [--skip-seeds]
//                                      [--refresh-relations] [--skip-extras]
//
// Extras (after the catalogue): source manga, per-episode filler/recap flags,
// MyAnimeList user recommendations and the daily-game schedule. Each has a
// refresh interval so a daily run only fetches what is stale.
//
// Writes only to the additive tool* collections. Existing collections
// (articles, animeEntries, ...) are read for linking and never modified.
// Visitors never trigger this job; pages are built from MongoDB.

import { argValue, connect, defined, ensureToolIndexes, getMongoUri, hasFlag } from './lib.mjs';
import {
  TenraiBlockedError, TenraiClient, fetchAllEpisodes, fetchMainCharacters, fetchManga, fetchRecommendations, isSafeForCatalog, mapJikanAnime, mapJikanManga, schedulePage,
} from '../../src/lib/tools/providers/tenrai.ts';
import { buildClues, pickForDate, utcDateKey } from '../../src/lib/tools/daily.ts';
import { compactKey, slugify } from '../../src/lib/tools/normalize.ts';
import { FRANCHISE_BRIDGES, FRANCHISE_RELATIONS, FRANCHISE_MAX_MEMBERS, deriveFranchises, uniqueSlug } from '../../src/lib/tools/franchise.ts';

const dryRun = hasFlag('dry-run');
const topPages = Number(argValue('top-pages', '20'));
const franchiseRoots = Number(argValue('franchise-roots', '250'));
const maxRequests = Number(argValue('max-requests', '1800'));
const RELATIONS_TTL_MS = hasFlag('refresh-relations') ? 0 : 7 * 24 * 3600 * 1000;
const DAY_MS = 24 * 3600 * 1000;
const AIRED_TTL_MS = 20 * 3600 * 1000;
const SEED_RETRY_MS = 30 * 24 * 3600 * 1000;
// Franchises with real "watch order" search demand whose first series sits
// outside the popularity-based roots (MAL IDs). Always crawled.
const EXTRA_FRANCHISE_ROOTS = [
  527, // Pokémon
  80, // Mobile Suit Gundam
  235, // Detective Conan (Case Closed)
  530, // Sailor Moon
  481, // Yu-Gi-Oh! Duel Monsters
  45, // Rurouni Kenshin
  263, // Hajime no Ippo (Fighting Spirit)
  33, // Berserk (1997)
  43, // Ghost in the Shell (1995)
  467, // Ghost in the Shell: Stand Alone Complex
  1254, // Saint Seiya
  552, // Digimon Adventure
  1088, // Super Dimension Fortress Macross
  185, // Initial D First Stage
  270, // Hellsing
  5231, // Inazuma Eleven
  4081, // Natsume's Book of Friends
  14131, // Girls und Panzer
  170, // Slam Dunk
  18179, // Yowamushi Pedal
  22, // The Prince of Tennis
  1412, // Lupin III
  12031, // Kingdom
  392, // Yu Yu Hakusho
  27989, // Sound! Euphonium
  820, // Legend of the Galactic Heroes
  232, // Cardcaptor Sakura
  18689, // Ace of Diamond
  287, // Baki the Grappler
  34443, // Baki (2018)
  627, // Major
  539, // Tenchi Muyo! Ryo-Ohki
];
// Article anime names that describe several series or are not a title.
const NON_TITLE_NAMES = new Set(['multipleanime', 'hololive']);

const log = message => console.log(`[tools-sync] ${message}`);
const client = new TenraiClient({ serverKey: process.env.TENRAI_SERVER_KEY || undefined, log });
const errors = [];
const budgetLeft = () => client.requestCount < maxRequests;

async function main() {
  const startedAt = new Date();
  const { client: mongo, db } = await connect(getMongoUri(process.env.TOOLS_SYNC_MONGODB_URI ? 'TOOLS_SYNC_MONGODB_URI' : 'MONGODB_URI'));
  const runs = db.collection('toolSyncRuns');
  let runId;
  const counts = { catalog: 0, upserted: 0, inserted: 0, seedsResolved: 0, seedsUnresolved: 0, airedChecked: 0, relationsFetched: 0, franchises: 0 };
  let status = 'success';
  try {
    if (!dryRun) {
      await ensureToolIndexes(db);
      runId = (await runs.insertOne({ startedAt, status: 'running', provider: 'tenrai', dryRun })).insertedId;
    }
    const animeCollection = db.collection('toolAnime');
    const existing = new Map();
    const takenSlugs = new Set();
    for await (const doc of animeCollection.find({}, { projection: { _id: 0, slug: 1, 'externalIds.mal': 1, relationsFetchedAt: 1, episodesAiredCheckedAt: 1, status: 1, relations: 1, format: 1 } })) {
      takenSlugs.add(doc.slug);
      if (doc.externalIds?.mal) existing.set(doc.externalIds.mal, doc);
    }
    const fetchedAt = new Date().toISOString();
    /** malId → { anime: ProviderAnime, legacy } gathered this run. */
    const gathered = new Map();
    const take = (raw, legacy) => {
      if (!raw || !isSafeForCatalog(raw)) return null;
      const mapped = mapJikanAnime(raw, fetchedAt);
      const current = gathered.get(raw.mal_id);
      // Keep relations from a /full response if a list response arrives later.
      const anime = current?.anime?.relations && !mapped.relations ? { ...mapped, relations: current.anime.relations } : mapped;
      const merged = { anime, legacy: { ...(current?.legacy || {}) } };
      for (const [key, values] of Object.entries(legacy || {})) {
        merged.legacy[key] = [...new Set([...(merged.legacy[key] || []), ...values])];
      }
      gathered.set(raw.mal_id, merged);
      return mapped;
    };

    // 1. Catalogue: most popular titles plus everything airing this season.
    for (let page = 1; page <= topPages && budgetLeft(); page++) {
      const result = await client.topByPopularity(page, 100);
      result.data.forEach(raw => take(raw));
      if (!result.hasNextPage) break;
    }
    for (let page = 1; page <= 10 && budgetLeft(); page++) {
      const result = await client.currentSeason(page, 100);
      result.data.forEach(raw => take(raw));
      if (!result.hasNextPage) break;
    }
    // Everything with a weekly broadcast slot, including long-running shows.
    for (let page = 1; page <= 10 && budgetLeft(); page++) {
      const result = await schedulePage(client, page, 100);
      result.data.forEach(raw => take(raw));
      if (!result.hasNextPage) break;
    }
    counts.catalog = gathered.size;
    log(`Catalogue pages fetched: ${gathered.size} titles (${client.requestCount} requests).`);

    // 2. Seeds from existing AnimeSparks content, resolved by exact title only.
    if (!hasFlag('skip-seeds')) await resolveSeeds(db, take, counts, gathered, existing);

    // 3. Aired-episode counts for ongoing series.
    const airedCounts = new Map();
    const now = Date.now();
    for (const [malId, { anime }] of gathered) {
      if (anime.status !== 'airing' || !budgetLeft()) continue;
      const checked = Date.parse(existing.get(malId)?.episodesAiredCheckedAt || '');
      if (Number.isFinite(checked) && now - checked < AIRED_TTL_MS) continue;
      try {
        airedCounts.set(malId, await client.airedEpisodeCount(malId));
        counts.airedChecked++;
      } catch (error) {
        if (error instanceof TenraiBlockedError) throw error;
        errors.push(`aired ${malId}: ${error.message}`);
      }
    }

    // 4. Relation crawl from popular roots, refreshed weekly.
    const relationsByMal = new Map([...existing].filter(([, doc]) => doc.relations).map(([id, doc]) => [id, doc.relations]));
    if (!hasFlag('skip-franchises')) {
      const roots = [...gathered.values()]
        .filter(({ anime }) => ['tv', 'ona', 'movie'].includes(anime.format) && anime.popularity)
        .sort((a, b) => a.anime.popularity - b.anime.popularity)
        .slice(0, franchiseRoots)
        .map(({ anime }) => anime.externalIds.mal)
        .concat(EXTRA_FRANCHISE_ROOTS);
      const visited = new Set();
      for (const root of roots) {
        if (!budgetLeft()) { status = 'partial'; errors.push('Request budget reached during the relation crawl.'); break; }
        if (visited.has(root)) continue;
        const queue = [root];
        let size = 0;
        while (queue.length && size < FRANCHISE_MAX_MEMBERS && budgetLeft()) {
          const malId = queue.shift();
          if (visited.has(malId)) continue;
          visited.add(malId);
          size++;
          const stored = existing.get(malId);
          const fresh = stored?.relationsFetchedAt && now - Date.parse(stored.relationsFetchedAt) < RELATIONS_TTL_MS && stored.relations;
          let relations = fresh ? stored.relations : null;
          if (!relations) {
            try {
              const raw = await client.full(malId);
              const mapped = take(raw);
              if (!mapped) continue;
              relations = mapped.relations || [];
              relationsByMal.set(malId, relations);
              counts.relationsFetched++;
            } catch (error) {
              if (error instanceof TenraiBlockedError) throw error;
              errors.push(`full ${malId}: ${error.message}`);
              continue;
            }
          }
          for (const relation of relations) {
            if (FRANCHISE_RELATIONS.has(relation.kind) && relation.externalIds.mal && !visited.has(relation.externalIds.mal) && !FRANCHISE_BRIDGES.has(relation.externalIds.mal)) {
              queue.push(relation.externalIds.mal);
            }
          }
        }
      }
      log(`Relation crawl: ${counts.relationsFetched} detail requests.`);
    }

    // 5. Upsert anime records.
    const operations = [];
    for (const [malId, { anime, legacy }] of gathered) {
      const stored = existing.get(malId);
      const slug = stored?.slug || uniqueSlug(slugify(anime.title) || slugify(anime.titleRomaji || '') || `anime-${malId}`, takenSlugs, [anime.year, malId]);
      if (!stored) {
        takenSlugs.add(slug);
        existing.set(malId, { slug, externalIds: { mal: malId }, format: anime.format });
        counts.inserted++;
      }
      const set = defined({
        ...anime,
        relations: anime.relations,
        relationsFetchedAt: anime.relations ? fetchedAt : undefined,
        episodesAired: airedCounts.has(malId) ? airedCounts.get(malId) : undefined,
        episodesAiredCheckedAt: airedCounts.has(malId) ? fetchedAt : undefined,
        updatedAt: fetchedAt,
      });
      const update = { $set: set, $setOnInsert: { slug, createdAt: fetchedAt } };
      const addToSet = {};
      if (legacy.animeEntrySanityIds?.length) addToSet['legacy.animeEntrySanityIds'] = { $each: legacy.animeEntrySanityIds };
      if (legacy.articleAnimeNames?.length) addToSet['legacy.articleAnimeNames'] = { $each: legacy.articleAnimeNames };
      if (Object.keys(addToSet).length) update.$addToSet = addToSet;
      operations.push({ updateOne: { filter: { 'externalIds.mal': malId }, update, upsert: true } });
    }
    counts.upserted = operations.length;
    if (!dryRun && operations.length) {
      for (let index = 0; index < operations.length; index += 500) {
        await animeCollection.bulkWrite(operations.slice(index, index + 500), { ordered: false });
      }
    }
    log(`Anime records: ${operations.length} upserted (${counts.inserted} new).`);

    // 6. Derive franchises from all stored relations.
    if (!hasFlag('skip-franchises') && !dryRun) counts.franchises = await rebuildFranchises(db, fetchedAt);
    if (!hasFlag('skip-extras') && !dryRun) await syncExtras(db, counts);
    if (errors.length && status === 'success') status = 'partial';
  } catch (error) {
    status = 'failed';
    errors.push(error.message);
    console.error(`[tools-sync] ${error instanceof TenraiBlockedError ? 'Blocked' : 'Failed'}: ${error.message}`);
  } finally {
    const summary = { status, finishedAt: new Date(), requests: client.requestCount, counts, errors: errors.slice(0, 50) };
    if (!dryRun && runId) await runs.updateOne({ _id: runId }, { $set: summary });
    log(`Finished: ${JSON.stringify({ ...summary, errors: errors.length })}`);
    await mongo.close();
  }
  if (status === 'failed') process.exitCode = 1;
}

/** Links existing animeEntries and article anime names to provider records. */
async function resolveSeeds(db, take, counts, gathered, existing) {
  const state = db.collection('toolSyncState');
  const entries = await db.collection('animeEntries').find({}, { projection: { _id: 0, sanityId: 1, title: 1, year: 1 } }).toArray();
  const names = (await db.collection('articles').distinct('animeName', { publicationState: 'published', language: 'en' })).filter(Boolean);
  const seeds = new Map();
  for (const entry of entries) {
    const key = compactKey(entry.title || '');
    if (!key) continue;
    const seed = seeds.get(key) || { title: entry.title, year: entry.year, animeEntrySanityIds: [], articleAnimeNames: [] };
    seed.animeEntrySanityIds.push(entry.sanityId);
    seeds.set(key, seed);
  }
  for (const name of names) {
    const key = compactKey(name);
    if (!key || NON_TITLE_NAMES.has(key) || /\s\/\s/.test(name)) continue;
    const seed = seeds.get(key) || { title: name, animeEntrySanityIds: [], articleAnimeNames: [] };
    seed.articleAnimeNames.push(name);
    seeds.set(key, seed);
  }
  const cached = new Map((await state.find({ _id: { $in: [...seeds.keys()].map(key => `seed:${key}`) } }).toArray()).map(doc => [doc._id, doc]));
  const now = Date.now();
  const updates = [];
  for (const [key, seed] of seeds) {
    if (!budgetLeft()) break;
    const legacy = { animeEntrySanityIds: seed.animeEntrySanityIds, articleAnimeNames: seed.articleAnimeNames };
    const memo = cached.get(`seed:${key}`);
    if (memo?.malId) {
      counts.seedsResolved++;
      const known = gathered.get(memo.malId);
      if (known) known.legacy = mergeLegacy(known.legacy, legacy);
      else if (existing.has(memo.malId)) gathered.set(memo.malId, { anime: null, legacy, linkOnly: true });
      else take(await client.full(memo.malId), legacy);
      continue;
    }
    if (memo && now - Date.parse(memo.triedAt) < SEED_RETRY_MS) { counts.seedsUnresolved++; continue; }
    let match = null;
    try {
      const result = await client.search(seed.title, 10);
      match = pickExactMatch(result.data, key, seed.year);
    } catch (error) {
      if (error instanceof TenraiBlockedError) throw error;
      errors.push(`seed "${seed.title}": ${error.message}`);
      continue;
    }
    if (match) { take(match, legacy); counts.seedsResolved++; } else counts.seedsUnresolved++;
    if (hasFlag('verbose')) log(`seed "${seed.title}"${seed.year ? ` (${seed.year})` : ''} → ${match ? `${match.title} [MAL ${match.mal_id}, ${match.type}, ${match.year || '?'}]` : 'no exact match'}`);
    updates.push({ updateOne: { filter: { _id: `seed:${key}` }, update: { $set: { title: seed.title, malId: match?.mal_id || null, triedAt: new Date().toISOString(), method: 'exact-title' } }, upsert: true } });
  }
  // Link-only seeds: the record exists and was not refetched, so only add legacy links.
  for (const [malId, value] of [...gathered]) {
    if (!value.linkOnly) continue;
    gathered.delete(malId);
    if (!dryRun) {
      const addToSet = {};
      if (value.legacy.animeEntrySanityIds?.length) addToSet['legacy.animeEntrySanityIds'] = { $each: value.legacy.animeEntrySanityIds };
      if (value.legacy.articleAnimeNames?.length) addToSet['legacy.articleAnimeNames'] = { $each: value.legacy.articleAnimeNames };
      if (Object.keys(addToSet).length) await db.collection('toolAnime').updateOne({ 'externalIds.mal': malId }, { $addToSet: addToSet });
    }
  }
  if (!dryRun && updates.length) await state.bulkWrite(updates, { ordered: false });
  log(`Seeds: ${counts.seedsResolved} linked, ${counts.seedsUnresolved} without an exact match.`);
}

function mergeLegacy(a = {}, b = {}) {
  const result = { ...a };
  for (const [key, values] of Object.entries(b)) result[key] = [...new Set([...(result[key] || []), ...values])];
  return result;
}

/**
 * Conservative matching: a candidate must have a title, English title or
 * synonym whose compact form equals the seed, and its year must be within one
 * year of the seed year when both are known. Ambiguity resolves to the
 * earliest TV/ONA/movie entry; otherwise no match is recorded.
 */
export function pickExactMatch(candidates, key, year) {
  const exact = candidates.filter(candidate => {
    if (!isSafeForCatalog(candidate)) return false;
    const titles = [candidate.title, candidate.title_english, ...(candidate.title_synonyms || []), ...(candidate.titles || []).map(title => title.title)];
    if (!titles.some(title => title && compactKey(title) === key)) return false;
    const candidateYear = candidate.year || (candidate.aired?.from ? new Date(candidate.aired.from).getUTCFullYear() : null);
    return !year || !candidateYear || Math.abs(candidateYear - year) <= 1;
  });
  const preferred = exact.filter(candidate => ['TV', 'ONA', 'Movie'].includes(candidate.type));
  const pool = preferred.length ? preferred : exact;
  return pool.sort((a, b) => (Date.parse(a.aired?.from || '') || Infinity) - (Date.parse(b.aired?.from || '') || Infinity))[0] || null;
}

async function rebuildFranchises(db, fetchedAt) {
  const animeCollection = db.collection('toolAnime');
  const franchises = db.collection('toolFranchises');
  const nodes = new Map();
  for await (const doc of animeCollection.find({}, { projection: { _id: 0, slug: 1, title: 1, format: 1, airedFrom: 1, popularity: 1, relations: 1, 'externalIds.mal': 1 } })) {
    if (doc.externalIds?.mal) nodes.set(doc.externalIds.mal, { malId: doc.externalIds.mal, slug: doc.slug, title: doc.title, format: doc.format, airedFrom: doc.airedFrom, popularity: doc.popularity, relations: doc.relations });
  }
  const derived = deriveFranchises(nodes);
  const stored = await franchises.find({}, { projection: { _id: 0, slug: 1, anchorMalId: 1 } }).toArray();
  const slugByAnchor = new Map(stored.map(doc => [doc.anchorMalId, doc.slug]));
  const taken = new Set(stored.map(doc => doc.slug));
  const activeSlugs = [];
  const operations = [];
  const memberOps = [];
  for (const franchise of derived) {
    const anchor = nodes.get(franchise.anchorMalId);
    const slug = slugByAnchor.get(franchise.anchorMalId)
      || uniqueSlug(slugify(franchise.title) || anchor.slug, taken, [anchor.airedFrom?.slice(0, 4), franchise.anchorMalId]);
    taken.add(slug);
    activeSlugs.push(slug);
    operations.push({ updateOne: {
      filter: { anchorMalId: franchise.anchorMalId },
      update: {
        $set: {
          title: franchise.title, members: franchise.members.map(({ slug: memberSlug, role }) => ({ slug: memberSlug, role })),
          truncated: franchise.truncated, derivedFrom: 'relations', active: true,
          provenance: { provider: 'tenrai', source: 'MyAnimeList', fetchedAt }, updatedAt: fetchedAt,
        },
        $setOnInsert: { slug, anchorMalId: franchise.anchorMalId, createdAt: fetchedAt },
      },
      upsert: true,
    } });
    memberOps.push({ updateMany: { filter: { slug: { $in: franchise.members.map(member => member.slug) } }, update: { $set: { franchiseSlug: slug } } } });
  }
  for (let index = 0; index < operations.length; index += 500) await franchises.bulkWrite(operations.slice(index, index + 500), { ordered: false });
  await franchises.updateMany({ slug: { $nin: activeSlugs } }, { $set: { active: false, updatedAt: fetchedAt } });
  await animeCollection.updateMany({ franchiseSlug: { $exists: true, $nin: activeSlugs } }, { $unset: { franchiseSlug: '' } });
  for (let index = 0; index < memberOps.length; index += 500) await animeCollection.bulkWrite(memberOps.slice(index, index + 500), { ordered: false });
  log(`Franchises: ${derived.length} derived.`);
  return derived.length;
}

if (import.meta.url === `file://${process.argv[1]}`) await main();

// ── Extras ────────────────────────────────────────────────────────────────

async function syncExtras(db, counts) {
  const anime = db.collection('toolAnime');
  const now = Date.now();
  const stamp = new Date().toISOString();
  const stale = (value, ttl) => !value || now - Date.parse(value) >= ttl;
  const guard = async (label, fn) => {
    try { await fn(); } catch (error) {
      if (error instanceof TenraiBlockedError) throw error;
      errors.push(`${label}: ${error.message}`);
    }
  };

  // Source manga for adapted series, refreshed weekly.
  const mangaCollection = db.collection('toolManga');
  const known = new Map((await mangaCollection.find({}, { projection: { _id: 0, 'externalIds.malManga': 1, updatedAt: 1 } }).toArray()).map(doc => [doc.externalIds.malManga, doc.updatedAt]));
  const adapted = await anime.find({ 'sourceWorks.0': { $exists: true }, popularity: { $lte: 3000 } }, { projection: { _id: 0, sourceWorks: 1, popularity: 1 } }).sort({ popularity: 1 }).toArray();
  const mangaIds = [...new Set(adapted.flatMap(doc => doc.sourceWorks.map(work => work.malManga)).filter(Boolean))];
  let mangaFetched = 0;
  for (const id of mangaIds) {
    if (!budgetLeft() || mangaFetched >= Number(argValue('manga-limit', '400'))) break;
    if (!stale(known.get(id), 7 * DAY_MS)) continue;
    await guard(`manga ${id}`, async () => {
      const raw = await fetchManga(client, id);
      mangaFetched++;
      if (raw) await mangaCollection.updateOne({ 'externalIds.malManga': id }, { $set: { ...mapJikanManga(raw, stamp), updatedAt: stamp } }, { upsert: true });
    });
  }
  counts.mangaFetched = mangaFetched;

  // Episode lists with MAL filler/recap flags for long series.
  const episodeLists = db.collection('toolEpisodeLists');
  const listDates = new Map((await episodeLists.find({}, { projection: { _id: 0, slug: 1, updatedAt: 1 } }).toArray()).map(doc => [doc.slug, doc.updatedAt]));
  const longSeries = await anime.find({
    format: { $in: ['tv', 'ona'] }, status: { $in: ['finished', 'airing'] }, popularity: { $lte: 2500 },
    $or: [{ episodes: { $gte: 24 } }, { episodesAired: { $gte: 24 } }],
  }, { projection: { _id: 0, slug: 1, status: 1, 'externalIds.mal': 1, episodes: 1, episodesAired: 1 } }).sort({ popularity: 1 }).toArray();
  let episodeRequests = 0;
  const episodeBudget = Number(argValue('episode-requests', '600'));
  for (const doc of longSeries) {
    if (!budgetLeft() || episodeRequests >= episodeBudget) break;
    if (!stale(listDates.get(doc.slug), doc.status === 'airing' ? 3 * DAY_MS : 30 * DAY_MS)) continue;
    await guard(`episodes ${doc.slug}`, async () => {
      const before = client.requestCount;
      const episodes = await fetchAllEpisodes(client, doc.externalIds.mal);
      episodeRequests += client.requestCount - before;
      if (episodes?.length) {
        await episodeLists.updateOne({ slug: doc.slug }, { $set: {
          slug: doc.slug, episodes, updatedAt: stamp,
          provenance: { provider: 'tenrai', source: 'MyAnimeList', sourceUrl: `https://myanimelist.net/anime/${doc.externalIds.mal}/episode`, fetchedAt: stamp },
        } }, { upsert: true });
      }
    });
  }
  counts.episodeRequests = episodeRequests;

  // MyAnimeList user recommendations for popular titles, refreshed fortnightly.
  const popular = await anime.find({ format: { $in: ['tv', 'movie', 'ona'] }, popularity: { $lte: 600 } }, { projection: { _id: 0, 'externalIds.mal': 1, recommendationsFetchedAt: 1 } }).sort({ popularity: 1 }).toArray();
  let recFetched = 0;
  for (const doc of popular) {
    if (!budgetLeft() || recFetched >= Number(argValue('rec-limit', '400'))) break;
    if (!stale(doc.recommendationsFetchedAt, 14 * DAY_MS)) continue;
    await guard(`recommendations ${doc.externalIds.mal}`, async () => {
      const recommendations = await fetchRecommendations(client, doc.externalIds.mal);
      recFetched++;
      await anime.updateOne({ 'externalIds.mal': doc.externalIds.mal }, { $set: { recommendations, recommendationsFetchedAt: stamp } });
    });
  }
  counts.recommendationsFetched = recFetched;

  // Daily game: schedule yesterday … +30 days. Existing days are never changed.
  const games = db.collection('toolDailyGame');
  const pool = (await anime.find({
    format: { $in: ['tv', 'movie'] }, status: { $in: ['finished', 'airing'] }, popularity: { $lte: 400 },
    year: { $ne: null }, 'genres.0': { $exists: true }, 'images.poster': { $exists: true },
  }, { projection: { _id: 0 } }).sort({ popularity: 1 }).toArray());
  const since = utcDateKey(now - 365 * DAY_MS);
  const scheduled = await games.find({ date: { $gte: since } }, { projection: { _id: 0, date: 1, slug: 1 } }).toArray();
  const used = new Set(scheduled.map(game => game.slug));
  const existingDates = new Set(scheduled.map(game => game.date));
  let created = 0;
  for (let offset = -1; offset <= 30; offset++) {
    const date = utcDateKey(now + offset * DAY_MS);
    if (existingDates.has(date) || !budgetLeft()) continue;
    const pick = pickForDate(pool, date, used);
    if (!pick) break;
    await guard(`daily ${date}`, async () => {
      const mainCharacters = await fetchMainCharacters(client, pick.externalIds.mal);
      const clues = buildClues({
        format: pick.format, season: pick.season, year: pick.year, genres: pick.genres || [], themes: pick.themes || [],
        demographics: pick.demographics || [], studios: pick.studios || [], episodes: pick.episodes, sourceMaterial: pick.sourceMaterial, mainCharacters,
      });
      const alternatives = [...new Set([pick.titleEnglish, pick.titleRomaji, ...(pick.synonyms || [])].filter(title => title && title !== pick.title))];
      await games.updateOne({ date }, { $setOnInsert: { date, slug: pick.slug, answer: { title: pick.title, alternatives }, clues, source: 'metadata', createdAt: stamp } }, { upsert: true });
      used.add(pick.slug);
      created++;
    });
  }
  counts.dailyCreated = created;
  log(`Extras: ${mangaFetched} manga, ${episodeRequests} episode pages, ${recFetched} recommendation lists, ${created} daily puzzles.`);
}
