// Imports a character roster (names, clan, status, affiliation, family links)
// from Narutopedia's Semantic MediaWiki API and "Family" infobox box.
// Only factual fields are kept; no wiki prose. Content is CC BY-SA, credited
// on the page. Resumable and serialised (~3 req/s) with an identifying UA.
//
//   node scripts/characters/import-roster.mjs [--cache=/path/cache.json]
import { existsSync, readFileSync, writeFileSync } from 'node:fs';

const HOST = 'naruto.fandom.com';
const UA = 'AnimeSparksRoster/1.0 (+https://www.animesparks.blog/family-trees; factual roster import)';
const cachePath = (process.argv.find(a => a.startsWith('--cache=')) || '--cache=./roster-cache.json').slice(8);
const out = 'data/characters/rosters/naruto.json';
const sleep = ms => new Promise(r => setTimeout(r, ms));
let last = 0;
async function api(params) {
  const wait = last + 120 - Date.now(); if (wait > 0) await sleep(wait); last = Date.now();
  const url = `https://${HOST}/api.php?${new URLSearchParams({ format: 'json', ...params })}`;
  for (let attempt = 0; attempt < 5; attempt++) {
    const res = await fetch(url, { headers: { 'User-Agent': UA } });
    if (res.ok) return res.json();
    await sleep(1500 * (attempt + 1));
  }
  throw new Error(`failed ${url}`);
}

// 1. Roster: every page in Category:Characters, with SMW properties in bulk.
const members = [];
for (let offset = 0; ; offset += 500) {
  const json = await api({ action: 'ask', query: `[[Category:Characters]]|?Clan|?Status|?Affiliation|?Kekkei Genkai|limit=500|offset=${offset}` });
  const results = Object.values(json.query?.results || {});
  for (const item of results) {
    const p = item.printouts;
    members.push({
      title: item.fulltext,
      clan: (p.Clan || []).map(x => x.fulltext).filter(Boolean),
      status: (p.Status || [])[0] || undefined,
      affiliation: (p.Affiliation || []).map(x => x.fulltext).filter(Boolean),
      kekkei: (p['Kekkei Genkai'] || []).map(x => x.fulltext).filter(Boolean),
    });
  }
  console.log(`roster ${members.length}`);
  if (results.length < 500) break;
}

// 2. Family boxes, one page at a time (cached).
const cache = existsSync(cachePath) ? JSON.parse(readFileSync(cachePath, 'utf8')) : {};
const decode = s => s.replace(/&amp;/g, '&').replace(/&#0?39;/g, "'").replace(/&quot;/g, '"').replace(/&nbsp;/g, ' ');
function familyOf(html) {
  const i = html.indexOf('>Family');
  if (i < 0) return [];
  const box = html.slice(i, i + 6000).split('</table>')[0];
  const rows = [];
  for (const li of box.matchAll(/<li>(.*?)<\/li>/gs)) {
    const text = decode(li[1].replace(/<img[^>]*>/g, '').replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim());
    const m = text.match(/^(.*?)\s*\(([^)]+)\)\s*$/);
    if (m && m[1]) rows.push({ name: m[1].trim(), relation: m[2].trim() });
  }
  return rows;
}
let done = 0;
const pending = members.filter(member => !(member.title in cache));
const worker = async () => {
  while (pending.length) {
    const member = pending.shift();
    try {
      const json = await api({ action: 'parse', page: member.title, prop: 'text', section: '0', redirects: '1', disablelimitreport: '1' });
      cache[member.title] = familyOf(json.parse?.text?.['*'] || '');
    } catch { cache[member.title] = null; }
    if (++done % 25 === 0) { writeFileSync(cachePath, JSON.stringify(cache)); console.log(`family ${Object.keys(cache).length}/${members.length}`); }
  }
};
await Promise.all([worker(), worker(), worker(), worker(), worker()]);
writeFileSync(cachePath, JSON.stringify(cache));

const slug = t => t.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
const characters = members.map(m => ({
  id: slug(m.title), name: m.title,
  clan: m.clan.map(c => c.replace(/ Clan$/, '')),
  status: m.status, affiliation: m.affiliation, kekkei: m.kekkei,
  family: (cache[m.title] || []).map(f => ({ id: slug(f.name), name: f.name, relation: f.relation })),
}));
writeFileSync(out, JSON.stringify({ source: 'Narutopedia (CC BY-SA), factual fields only', importedAt: new Date().toISOString().slice(0, 10), total: characters.length, characters }));
console.log(`wrote ${out}: ${characters.length} characters`);
