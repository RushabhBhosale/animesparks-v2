// Read-only inventory of stored legacy CDN references; never prints credentials or URL values.
import { readFileSync, writeFileSync } from 'node:fs';
import { MongoClient } from 'mongodb';
const line = readFileSync('.dev.vars', 'utf8').split(/\r?\n/).find(value => value.startsWith('MONGODB_URI='));
if (!line) throw new Error('MONGODB_URI is required');
const client = new MongoClient(JSON.parse(line.slice('MONGODB_URI='.length)), { serverSelectionTimeoutMS: 10000 });
const collections = ['articles', 'categories', 'authors', 'animeEntries', 'homepageSettings'];
const fields = {};
const documents = {};
function visit(value, path, collection, documentId) {
  if (typeof value === 'string') {
    const hits = value.match(/cdn\.sanity\.io/g)?.length || 0;
    if (hits) {
      const key = `${collection}.${path}`;
      fields[key] = (fields[key] || 0) + hits;
      documents[`${collection}:${documentId}`] = true;
    }
  } else if (Array.isArray(value)) value.forEach(item => visit(item, `${path}[]`, collection, documentId));
  else if (value && typeof value === 'object') for (const [key, item] of Object.entries(value)) {
    if (key !== '_id') visit(item, path ? `${path}.${key}` : key, collection, documentId);
  }
}
try {
  await client.connect();
  const db = client.db('animesparks');
  for (const collection of collections) {
    const cursor = db.collection(collection).find({});
    for await (const doc of cursor) visit(doc, '', collection, String(doc._id));
  }
  const result = { documentsWithReferences: Object.keys(documents).length, totalReferences: Object.values(fields).reduce((a,b)=>a+b,0), fields };
  writeFileSync(process.argv[2] || '/private/tmp/animesparks-stage3-legacy-audit.json', JSON.stringify(result, null, 2));
  console.log(JSON.stringify(result, null, 2));
} finally { await client.close(); }
