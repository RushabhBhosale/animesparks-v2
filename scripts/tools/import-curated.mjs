// Validates curated datasets and upserts them into MongoDB.
//
//   node scripts/tools/import-curated.mjs            # validate only (default)
//   node scripts/tools/import-curated.mjs --apply    # validate and write
//
// Files live in data/curated/<dataset>/*.json (see data/curated/README.md).
// Only records with verification.status "verified" are shown on the site.

import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { connect, ensureToolIndexes, getMongoUri, hasFlag } from './lib.mjs';
import { validateArcFile, validateFillerFile, validateMappingFile, validateNoticeFile, validateWatchOrderFile } from '../../src/lib/tools/curated.ts';

const datasets = [
  { folder: 'watch-orders', collection: 'toolWatchOrders', key: doc => ({ franchiseSlug: doc.franchiseSlug, kind: doc.kind }),
    validate: (json, known) => validateWatchOrderFile(json, known.franchises, known.anime) },
  { folder: 'filler', collection: 'toolFillerLists', key: doc => ({ slug: doc.slug }),
    validate: (json, known) => { const result = validateFillerFile(json, known.anime); return { errors: result.errors, documents: result.document ? [result.document] : [] }; } },
  { folder: 'manga-mappings', collection: 'toolMangaMappings', key: doc => ({ slug: doc.slug }),
    validate: (json, known) => { const result = validateMappingFile(json, known.anime); return { errors: result.errors, documents: result.document ? [result.document] : [] }; } },
  { folder: 'arcs', collection: 'toolArcs', key: doc => ({ slug: doc.slug }),
    validate: (json, known) => { const result = validateArcFile(json, known.anime); return { errors: result.errors, documents: result.document ? [result.document] : [] }; } },
  { folder: 'schedule-notices', collection: 'toolScheduleNotices', key: doc => ({ slug: doc.slug, date: doc.date }),
    validate: (json, known) => { const result = validateNoticeFile(json, known.anime); return { errors: result.errors, documents: result.document ? [result.document] : [] }; } },
];

const { client, db } = await connect(getMongoUri(process.env.TOOLS_SYNC_MONGODB_URI ? 'TOOLS_SYNC_MONGODB_URI' : 'MONGODB_URI'));
try {
  const [franchises, anime] = await Promise.all([
    db.collection('toolFranchises').distinct('slug', { active: true }),
    db.collection('toolAnime').distinct('slug'),
  ]);
  const known = { franchises: new Set(franchises), anime: new Set(anime) };
  let failed = 0;
  const writes = [];
  for (const dataset of datasets) {
    const directory = join('data/curated', dataset.folder);
    if (!existsSync(directory)) continue;
    for (const name of readdirSync(directory).filter(file => file.endsWith('.json')).sort()) {
      let parsed;
      try { parsed = JSON.parse(readFileSync(join(directory, name), 'utf8')); }
      catch (error) { console.error(`✗ ${dataset.folder}/${name}: invalid JSON (${error.message})`); failed++; continue; }
      const result = dataset.validate(parsed, known);
      if (result.errors.length) { failed++; console.error(`✗ ${dataset.folder}/${name}\n  - ${result.errors.join('\n  - ')}`); continue; }
      console.log(`✓ ${dataset.folder}/${name} [${parsed.verification.status}]`);
      for (const document of result.documents) writes.push({ dataset, document });
    }
  }
  if (failed) {
    console.error(`${failed} file(s) failed validation; nothing was written.`);
    process.exitCode = 1;
  } else if (!hasFlag('apply')) {
    console.log(`${writes.length} record(s) valid. Re-run with --apply to write them.`);
  } else {
    await ensureToolIndexes(db);
    for (const { dataset, document } of writes) await db.collection(dataset.collection).updateOne(dataset.key(document), { $set: document }, { upsert: true });
    console.log(`Wrote ${writes.length} record(s).`);
  }
} finally {
  await client.close();
}
