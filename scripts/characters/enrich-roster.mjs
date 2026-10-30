// Adds team, rank, species and classification to an imported roster, from
// Narutopedia's Semantic MediaWiki data. Only factual fields, like
// import-roster.mjs; content is CC BY-SA and credited on the page.
//
//   node scripts/characters/enrich-roster.mjs
import { readFileSync, writeFileSync } from 'node:fs';

const UA = 'AnimeSparksRoster/1.0 (+https://www.animesparks.blog/family-trees; factual roster import)';
const path = 'data/characters/rosters/naruto.json';
const roster = JSON.parse(readFileSync(path, 'utf8'));
const plain = value => String(value?.fulltext ?? value).replace(/\[\[(?:[^\]|]*\|)?([^\]]*)\]\]/g, '$1');

const facts = new Map();
for (let offset = 0; ; offset += 500) {
  const query = `[[Category:Characters]]|?Team|?Ninja Rank|?Species|?Classification|limit=500|offset=${offset}`;
  const response = await fetch(`https://naruto.fandom.com/api.php?${new URLSearchParams({ action: 'ask', query, format: 'json' })}`, { headers: { 'User-Agent': UA } });
  const results = Object.entries((await response.json()).query?.results || {});
  for (const [title, item] of results) {
    const p = item.printouts;
    facts.set(title, { team: (p.Team || []).map(plain), rank: (p['Ninja Rank'] || []).map(plain), species: plain(p.Species?.[0] ?? ''), classes: (p.Classification || []).map(plain) });
  }
  console.log(`facts ${facts.size}`);
  if (results.length < 500) break;
  await new Promise(resolve => setTimeout(resolve, 400));
}
for (const character of roster.characters) Object.assign(character, facts.get(character.name) ?? {});
writeFileSync(path, JSON.stringify(roster));
console.log(`wrote ${path}`);
