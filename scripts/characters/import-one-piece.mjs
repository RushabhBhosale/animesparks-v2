// Imports the One Piece roster from the One Piece Wiki: the canon character
// list, each character's infobox (affiliation, occupation, origin, status),
// the wiki's {{familytree}} charts, and kinship stated in an article's opening
// paragraph. Only factual fields are kept; no wiki prose. Content is CC BY-SA,
// credited on the page. Resumable and serialised, with an identifying UA.
//
//   node scripts/characters/import-one-piece.mjs [--cache=/path/cache.json]
import { existsSync, readFileSync, writeFileSync } from 'node:fs';

const UA = 'AnimeSparksRoster/1.0 (+https://www.animesparks.blog/family-trees; factual roster import)';
const cachePath = (process.argv.find(a => a.startsWith('--cache=')) || '--cache=./one-piece-cache.json').slice(8);
const out = 'data/characters/rosters/one-piece.json';
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));
const slug = text => text.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
const api = async params => {
  for (let attempt = 0; attempt < 5; attempt++) {
    try {
      const response = await fetch(`https://onepiece.fandom.com/api.php?${new URLSearchParams({ format: 'json', ...params })}`, { headers: { 'User-Agent': UA } });
      if (response.ok) return response.json();
    } catch { /* retried below */ }
    await sleep(1500 * (attempt + 1));
  }
  throw new Error(`failed ${JSON.stringify(params)}`);
};

// ── Canon list and lead sections ──
const names = [];
for (const part of ['A-E', 'F-K', 'L-R', 'S-Z']) {
  const text = (await api({ action: 'parse', page: `List of Canon Characters/Names ${part}`, prop: 'wikitext' })).parse.wikitext['*'];
  for (const row of text.split(/\n\|-/)) {
    const cells = row.split(/\n\|/).map(cell => cell.trim());
    const link = cells.map(cell => cell.match(/^\[\[([^\]|]+)(?:\|([^\]]*))?\]\]$/)).find(Boolean);
    if (link) names.push({ title: link[1], label: link[2] || link[1] });
  }
}
console.log(`names ${names.length}`);
const cache = existsSync(cachePath) ? JSON.parse(readFileSync(cachePath, 'utf8')) : {};
let fetched = 0;
for (const { title } of names) {
  if (title in cache) continue;
  const json = await api({ action: 'parse', page: title, prop: 'text|wikitext|categories', section: '0', redirects: '1', disablelimitreport: '1' });
  cache[title] = json.parse ? { resolved: json.parse.title, html: json.parse.text['*'].slice(0, 14000), intro: json.parse.wikitext['*'].slice(0, 4000), cats: [] } : null;
  if (++fetched % 100 === 0) { writeFileSync(cachePath, JSON.stringify(cache)); console.log(`pages ${fetched}`); }
  await sleep(120);
}
writeFileSync(cachePath, JSON.stringify(cache));

// ── Infobox fields ──
const decode = text => text.replace(/&amp;/g, '&').replace(/&#0?39;/g, "'").replace(/&quot;/g, '"').replace(/&nbsp;/g, ' ').replace(/&#91;/g, '[').replace(/&#93;/g, ']');
const field = (html, name) => {
  const match = html.match(new RegExp(`data-source="${name}"[^>]*>([\\s\\S]*?)(?=<div class="pi-item|<section class="pi-item|</aside>|<h2 class="pi-item)`));
  if (!match) return '';
  const value = match[1].match(/pi-data-value[^>]*>([\s\S]*)/);
  return decode((value ? value[1] : match[1]).replace(/<sup[\s\S]*?<\/sup>/g, '').replace(/<br\s*\/?>/g, ';').replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim());
};
const entries = text => text.split(';').map(item => item.trim()).filter(Boolean);
const RENAMED = { 'Caesar Clown': 'Punk Hazard' };
const bare = text => { const name = text.replace(/\s*\([^)]*\)/g, '').replace(/^(?:Ally|Allies|Subordinate|Subordinates) of (?:the )?/i, '').trim(); return RENAMED[name] ?? name; };
const lastPlace = text => text.split(',').at(-1).trim();
const RANKS = [[/fleet admiral/i, 'Fleet Admiral'], [/vice admiral/i, 'Vice Admirals'], [/rear admiral/i, 'Rear Admirals'], [/\badmiral/i, 'Admirals'], [/commodore/i, 'Commodores'], [/all-star|calamit/i, 'All-Stars'], [/headliner/i, 'Headliners'], [/shinuchi/i, 'Shinuchi'], [/gifter/i, 'Gifters'], [/pleasure/i, 'Pleasures'], [/waiter/i, 'Waiters'], [/division commander/i, 'Division Commanders'], [/captain/i, 'Captains'], [/officer/i, 'Officers'], [/\b(?:king|queen|prince|princess)\b/i, 'Royalty'], [/noble/i, 'Nobles'], [/doctor|nurse|surgeon/i, 'Doctors'], [/samurai/i, 'Samurai'], [/pirate/i, 'Pirates'], [/marine|soldier/i, 'Soldiers']];
const SPECIES = [['Fish-Men', /fish-?m[ae]n/i], ['Merfolk', /\bmer(?:man|maid|men|folk)/i], ['Minks', /\bmink\b/i], ['Giants', /\bgiants?\b/i], ['Dwarves', /\bdwar(?:f|ves)\b/i], ['Zombies', /\bzombie/i], ['Sea Kings', /\bsea king/i]];

// ── People ──
const people = new Map();
const byTitle = new Map();
for (const { title, label } of names) {
  const page = cache[title];
  const name = title.includes('#') || !page ? label : page.resolved;
  const id = slug(name);
  byTitle.set(title, id); byTitle.set(label, id); if (page) byTitle.set(page.resolved, id);
  if (people.has(id) || !page) { if (!people.has(id)) people.set(id, { id, name, clan: [], status: undefined, affiliation: [], kekkei: [], family: [], team: [], rank: [], species: '', classes: [] }); continue; }
  const affiliations = entries(field(page.html, 'affiliation')).flatMap(item => item.split(/,(?= [A-Z])/)).map(item => item.trim());
  const current = affiliations.filter(item => !/\((?:former|disbanded|defected)/i.test(item));
  const former = affiliations.filter(item => /\((?:former|disbanded|defected)/i.test(item));
  const origin = field(page.html, 'origin').split('(')[0].trim();
  const residence = lastPlace(bare(entries(field(page.html, 'residence'))[0] ?? ''));
  const lead = page.intro.replace(/<ref[\s\S]*?<\/ref>|<ref[^>]*\/>/g, '').replace(/\{\{[^{}]*\}\}/g, '').split(/\n\n+/).find(text => text.includes("'''")) ?? '';
  people.set(id, {
    id, name, clan: [], status: field(page.html, 'status').split(/[;(]/)[0].trim() || undefined,
    affiliation: [...new Set([...current, ...former].map(bare).concat(origin, residence).filter(Boolean))], kekkei: [], family: [],
    team: [...new Set(affiliations.flatMap(item => [...item.matchAll(/\(([^)]+)\)/g)].map(match => match[1])).filter(item => !/former|disbanded|defected/i.test(item)))],
    rank: [...new Set(entries(field(page.html, 'occupation')).filter(item => !/former/i.test(item)).flatMap(item => RANKS.filter(([test]) => test.test(item)).map(([, name]) => name)))],
    species: SPECIES.find(([, test]) => test.test(lead))?.[0] ?? '', classes: [],
  });
}
const resolve = name => byTitle.get(name) ?? (people.has(slug(name)) ? slug(name) : null);
const addRelative = (ownerId, relativeId, relation) => {
  const owner = people.get(ownerId); const relative = people.get(relativeId);
  if (owner && relative && ownerId !== relativeId && !owner.family.some(item => item.id === relativeId && item.relation === relation)) owner.family.push({ id: relativeId, name: relative.name, relation });
};

// ── {{familytree}} charts: boxes are three tiles wide; line tiles connect through their open sides ──
const OPEN = { ',': 'DR', v: 'LRD', '.': 'LD', ')': 'UDL', '(': 'UDR', '+': 'UDLR', '!': 'UD', '-': 'LR', '`': 'UR', '^': 'LRU', "'": 'UL', y: 'LRD', F: 'DR', V: 'LRD', 7: 'LD', C: 'UDR', D: 'UDL', L: 'UR', A: 'LRU', J: 'UL', ':': 'UD', '~': 'LR', x: 'UDLR' };
const DASHED = new Set(['F', 'V', '7', 'C', 'D', 'L', 'A', 'J', ':', '~']);
const OPPOSITE = { U: 'D', D: 'U', L: 'R', R: 'L' };
const STEP = { U: [-1, 0], D: [1, 0], L: [0, -1], R: [0, 1] };
function readChart(source) {
  const rows = []; const labels = {};
  for (const call of source.matchAll(/\{\{familytree\s*\|((?:[^{}]|\{\{[^{}]*\}\})*)\}\}/gi)) {
    const row = [];
    for (const part of call[1].split(/\|(?![^[]*\]\])(?![^{]*\}\})/)) {
      const named = part.match(/^\s*([A-Za-z0-9]{3})\s*=(.*)$/s);
      if (named) { labels[named[1]] = named[2]; continue; }
      const tile = part.length ? part : ' ';
      if (/^[A-Za-z0-9]{3}$/.test(tile.trim())) row.push({ box: tile.trim(), col: 0 }, { box: tile.trim(), col: 1 }, { box: tile.trim(), col: 2 });
      else row.push({ tile: tile.trim() });
    }
    rows.push(row);
  }
  const at = (y, x) => rows[y]?.[x];
  // "#" is a crossing: a line passing through it carries straight on.
  const opens = (y, x, axis) => (at(y, x)?.tile === '#' ? (axis === 'LR' ? 'LR' : 'UD') : OPEN[at(y, x)?.tile] ?? '');
  const seen = new Set(); const ties = [];
  const name = id => { const text = labels[id] ?? ''; const link = text.match(/\[\[([^\]|]+)(?:\|[^\]]*)?\]\]/); return { name: link ? link[1].trim() : text.replace(/\{\{[^}]*\}\}|'''?|<[^>]+>/g, '').trim(), former: /Status\|former/i.test(text) }; };
  rows.forEach((row, r) => row.forEach((_, c) => {
    if (!opens(r, c) || at(r, c).tile === '#' || seen.has(`${r},${c}`)) return;
    const sides = new Set(); const tops = new Map(); const bottoms = new Set(); let dashed = 0; let solid = 0;
    const stack = [[r, c, '']]; seen.add(`${r},${c}`);
    while (stack.length) {
      const [y, x, axis] = stack.pop(); const tile = at(y, x).tile; const isDashed = tile === '#' ? axis === 'LR' : DASHED.has(tile);
      if (isDashed) dashed++; else solid++;
      for (const side of opens(y, x, axis)) {
        const ny = y + STEP[side][0]; const nx = x + STEP[side][1]; const next = at(ny, nx); const heading = 'LR'.includes(side) ? 'LR' : 'UD';
        if (next?.box) {
          if (side === 'D') tops.set(next.box, isDashed);
          if (side === 'U') bottoms.add(next.box);
          if (side === 'L' || side === 'R') sides.add(next.box);
        } else if (opens(ny, nx, heading).includes(OPPOSITE[side])) {
          const key = at(ny, nx).tile === '#' ? `${ny},${nx},${heading}` : `${ny},${nx}`;
          if (!seen.has(key)) { seen.add(key); stack.push([ny, nx, heading]); }
        }
      }
    }
    if (sides.size === 2) { const [a, b] = [...sides]; ties.push({ a: name(a), b: name(b), kind: 'partner', dashed: dashed > 0 && solid === 0 }); }
    for (const parent of [...sides, ...bottoms]) for (const [child, isDashed] of tops) ties.push({ a: name(parent), b: name(child), kind: 'parent', dashed: isDashed });
  }));
  return ties;
}
const charts = (await api({ action: 'query', list: 'categorymembers', cmtitle: 'Category:Family Tree Templates', cmlimit: '100' })).query.categorymembers;
for (const { title } of charts) {
  const source = (await api({ action: 'parse', page: title, prop: 'wikitext' })).parse?.wikitext?.['*'] ?? '';
  await sleep(200);
  const ties = readChart(source);
  // "many generations" boxes stand between a distant ancestor and a descendant.
  const across = ties.filter(tie => tie.b.name === 'many generations').flatMap(up => ties.filter(tie => tie.a.name === 'many generations').map(down => ({ up, down })));
  for (const { up, down } of across) { const a = resolve(up.a.name); const b = resolve(down.b.name); if (a && b) addRelative(b, a, 'Ancestor'); }
  for (const tie of ties) {
    const a = resolve(tie.a.name); const b = resolve(tie.b.name);
    if (!a || !b) continue;
    if (tie.kind === 'parent') addRelative(b, a, tie.dashed ? 'Adoptive Parent' : 'Parent');
    else if (!tie.a.former && !tie.b.former) { addRelative(a, b, tie.dashed ? 'Fiancé' : 'Spouse'); addRelative(b, a, tie.dashed ? 'Fiancé' : 'Spouse'); }
  }
}

// Sworn ties the charts do not draw between people.
for (const [a, b] of [['monkey-d-luffy', 'portgas-d-ace'], ['monkey-d-luffy', 'sabo'], ['portgas-d-ace', 'sabo']]) { addRelative(a, b, 'Sworn Brother'); addRelative(b, a, 'Sworn Brother'); }

// ── Kinship stated in the opening paragraph: "X is the father of [[Y]]", "X is [[Y]]'s wife" ──
const KIN = 'sons?|daughters?|child|children|father|mother|parents?|brothers?|half-brother|half-sister|sisters?|siblings?|twin|wife|husband|spouse|fianc[ée]e?|great-grandfather|great-grandmother|grandfather|grandmother|grandson|granddaughter|grandchild|uncle|aunt|nephew|niece|cousin';
const QUALIFIER = '(?:(?:older|younger|elder|eldest|youngest|twin|adoptive|adopted|late|only|biological|step|foster|sworn|\\d+(?:st|nd|rd|th)|\\w+est)[- ])*';
const LINK = '\\[\\[([^\\]|#]+)(?:\\|[^\\]]*)?\\]\\]';
const OF_LINK = new RegExp(`\\b((?:the |a |an )?${QUALIFIER})(${KIN}) of (?:the (?:late |former )?[^.\\[]{0,30})?${LINK}(?:(?:,| and)+ (?:the (?:late )?)?${LINK})?`, 'gi');
const POSSESSIVE = new RegExp(`\\b(?:is|was|and|being)(?: also| the)? (?:the )?${LINK}(?:'s|’s) (${QUALIFIER})(${KIN})\\b`, 'gi');
const REVERSED = { father: 'Child', mother: 'Child', parent: 'Child', son: 'Parent', daughter: 'Parent', child: 'Parent', brother: 'Sibling', 'half-brother': 'Half-Sibling', sister: 'Sibling', 'half-sister': 'Half-Sibling', sibling: 'Sibling', twin: 'Sibling', wife: 'Spouse', husband: 'Spouse', spouse: 'Spouse', fiance: 'Fiancé', grandfather: 'Grandchild', grandmother: 'Grandchild', 'great-grandfather': 'Great-Grandson', 'great-grandmother': 'Great-Grandson', grandson: 'Grandparent', granddaughter: 'Grandparent', grandchild: 'Grandparent', uncle: 'Nephew', aunt: 'Nephew', nephew: 'Uncle', niece: 'Uncle', cousin: 'Cousin' };
const REJECTED = JSON.parse(readFileSync('data/characters/rosters/one-piece-rejected.json', 'utf8'));
const mined = [];
for (const { title } of names) {
  const page = cache[title]; const ownerId = byTitle.get(title);
  if (!page || !people.has(ownerId)) continue;
  const lead = page.intro.replace(/<ref[\s\S]*?<\/ref>|<ref[^>]*\/>/g, '').replace(/\{\{Qref[^{}]*\}\}/g, '').replace(/\{\{[^{}]*\}\}/g, '').replace(/\[\[(?:File|Image):[^\]]*\]\]/g, '').split(/\n\n+/).find(text => text.includes("'''")) ?? '';
  const consider = (word, qualifier, target) => {
    const key = word.toLowerCase().replace(/s$/, '').replace(/children/, 'child').replace(/fianc[ée]e?/, 'fiance');
    // The Charlotte children are numbered within "the Charlotte Family"; their mother is Linlin.
    const relativeId = target === 'Charlotte Family' ? (/son|daughter|child/i.test(key) ? 'charlotte-linlin' : null) : resolve(target);
    const relation = REVERSED[key];
    if (!relativeId || !relation || relativeId === ownerId) return;
    const flagged = /adopt|foster|step/i.test(qualifier) ? `Adoptive ${relation}` : /sworn/i.test(qualifier) ? `Sworn ${relation}` : relation;
    if (REJECTED.includes(`${ownerId}|${relativeId}`)) return;
    mined.push(`${people.get(ownerId).name}\t${word}\t${people.get(relativeId).name}\t${flagged}`);
    addRelative(ownerId, relativeId, flagged);
    if (/^(father|son|brother|half-brother|husband|grandfather|grandson|great-grandfather|uncle|nephew)s?$/i.test(key)) people.get(ownerId).male = true;
  };
  const doubted = match => /proclaimed|claimed|alleged|rumou?red|supposed/i.test(lead.slice(Math.max(0, match.index - 24), match.index));
  for (const match of lead.matchAll(OF_LINK)) { if (doubted(match)) continue; consider(match[2], match[1], match[3]); if (match[4]) consider(match[2], match[1], match[4]); }
  for (const match of lead.matchAll(POSSESSIVE)) if (!doubted(match)) consider(match[3], match[2], match[1]);
}
if (process.env.MINED_OUT) writeFileSync(process.env.MINED_OUT, mined.join('\n'));

const characters = [...people.values()];
writeFileSync(out, JSON.stringify({ source: 'One Piece Wiki (CC BY-SA), factual fields only', importedAt: new Date().toISOString().slice(0, 10), total: characters.length, characters }));
console.log(`wrote ${out}: ${characters.length} characters, ${characters.filter(item => item.family.length).length} with relatives, ${mined.length} ties read from articles`);
