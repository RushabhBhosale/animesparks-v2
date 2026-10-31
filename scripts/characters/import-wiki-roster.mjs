// Imports a character roster from a Fandom wiki's MediaWiki API: every page in
// the series' character categories whose infobox looks like a character, with
// affiliation, status, species, occupation and the relatives the infobox
// lists. Only factual fields are kept; no wiki prose. Content is CC BY-SA and
// credited on the page. Resumable (page text is cached) and gentle: serial
// requests with an identifying User-Agent, 50 pages per request.
//
//   node scripts/characters/import-wiki-roster.mjs <slug> [--cache=/dir]
// Series are listed in data/characters/rosters/series.json.
import { existsSync, readFileSync, writeFileSync } from 'node:fs';

const slug = process.argv[2];
const series = JSON.parse(readFileSync('data/characters/rosters/series.json', 'utf8')).find(item => item.slug === slug && !item.importer);
if (!series) throw new Error(`Unknown series ${slug}`);
const cacheDir = (process.argv.find(arg => arg.startsWith('--cache=')) || '--cache=.').slice(8);
const cachePath = `${cacheDir}/${slug}-pages.json`;
const UA = 'AnimeSparksRoster/1.0 (+https://www.animesparks.blog/family-trees; factual roster import)';
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));
const idOf = text => text.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
const api = async params => {
  for (let attempt = 0; attempt < 5; attempt++) {
    try {
      const response = await fetch(`https://${series.host}.fandom.com/api.php?${new URLSearchParams({ format: 'json', ...params })}`, { headers: { 'User-Agent': UA } });
      if (response.ok) return await response.json();
    } catch { /* retried below */ }
    await sleep(1500 * (attempt + 1));
  }
  throw new Error(`failed ${series.host} ${JSON.stringify(params).slice(0, 120)}`);
};

// ── 1. Page list: the character categories and their sub-categories ──
const SKIP_CATEGORY = /image|gallery|template|user|blog|episode|volume|chapter|fanon|redirect|stub|candidate|disambig|spoiler|quote|trivia|merch|soundtrack|real|voice|staff|creator|cosplay/i;
async function pages() {
  const found = new Set(); const seen = new Set(); let level = series.categories.map(name => `Category:${name}`);
  for (let depth = 0; depth <= (series.depth ?? 2) && level.length; depth++) {
    const next = [];
    for (const category of level) {
      if (seen.has(category)) continue;
      seen.add(category);
      for (let cont; ;) {
        const json = await api({ action: 'query', list: 'categorymembers', cmtitle: category, cmlimit: '500', cmtype: 'page|subcat', ...(cont ? { cmcontinue: cont } : {}) });
        for (const member of json.query?.categorymembers ?? []) {
          if (member.ns === 14) { if (!SKIP_CATEGORY.test(member.title)) next.push(member.title); } else if (member.ns === 0) found.add(member.title);
        }
        cont = json.continue?.cmcontinue; if (!cont) break;
        await sleep(150);
      }
      await sleep(150);
    }
    level = next;
  }
  return [...found];
}

// ── 2. Page text, 50 titles per request ──
const cache = existsSync(cachePath) ? JSON.parse(readFileSync(cachePath, 'utf8')) : { titles: null, text: {}, resolved: {} };
if (!cache.titles) { cache.titles = await pages(); writeFileSync(cachePath, JSON.stringify(cache)); }
console.log(`${slug}: ${cache.titles.length} candidate pages`);
const todo = cache.titles.filter(title => !(title in cache.text));
for (let i = 0; i < todo.length; i += 50) {
  const batch = todo.slice(i, i + 50);
  const json = await api({ action: 'query', titles: batch.join('|'), prop: 'revisions', rvprop: 'content', rvslots: 'main', redirects: '1' });
  const redirected = new Map((json.query?.redirects ?? []).map(item => [item.to, item.from]));
  for (const page of Object.values(json.query?.pages ?? {})) {
    const text = page.revisions?.[0]?.slots?.main?.['*'] ?? '';
    const heading = text.search(/\n==[^=]/);
    cache.text[redirected.get(page.title) ?? page.title] = { title: page.title, text: text.slice(0, heading > 200 ? heading : 12000).slice(0, 12000) };
  }
  for (const title of batch) if (!(title in cache.text)) cache.text[title] = { title, text: '' };
  if ((i / 50) % 10 === 9) { writeFileSync(cachePath, JSON.stringify(cache)); console.log(`text ${Object.keys(cache.text).length}/${cache.titles.length}`); }
  await sleep(200);
}
writeFileSync(cachePath, JSON.stringify(cache));

// ── 3. Infobox fields ──
// Display templates ({{Small|(Father)}}, {{Scroll Box|…}}) wrap the text we want; every other template is dropped.
const KEEP_TEXT = new Set(['s', 'small', 'smaller', 'tiny', 'scroll box', 'scrollbox', 'nowrap', 'plainlist', 'flatlist', 'hlist', 'ubl', 'unbulleted list', 'collapsible list', 'collapse', 'br', 'sub', 'sup', 'status', 'ruby']);
function stripTemplates(value) {
  for (let pass = 0; pass < 6; pass++) {
    const next = value.replace(/\{\{\s*([^{}|]+?)\s*(?:\|([^{}]*))?\}\}/g, (_, name, args = '') => {
      const key = name.toLowerCase();
      if (key === 'br') return '\n';
      if (!KEEP_TEXT.has(key)) return '';
      const parts = args.split('|').filter(part => !/^\s*[a-z-]+\s*=/.test(part));
      return ['hlist', 'ubl', 'unbulleted list', 'plainlist', 'flatlist'].includes(key) ? parts.join('\n') : parts.join(' ');
    });
    if (next === value) break;
    value = next;
  }
  return value;
}
const strip = value => stripTemplates(value
  .replace(/<!--[\s\S]*?-->/g, '').replace(/<ref[\s\S]*?<\/ref>|<ref[^>]*\/>/g, '')
  .replace(/\[\[(?:File|Image):[^\]]*\]\]/gi, '')).replace(/\{\{|\}\}/g, '');
const plain = value => strip(value).replace(/\[\[(?:[^\]|]*\|)?([^\]]*)\]\]/g, '$1').replace(/<[^>]+>/g, ' ').replace(/'{2,}/g, '').replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/\s+/g, ' ').trim();
function readParams(text) {
  const out = {}; let key = null;
  for (const line of text.split('\n')) {
    const match = line.match(/^\s*\|\s*([A-Za-z0-9_ .()\-]+?)\s*=\s?(.*)$/);
    if (match) {
      // Some wikis prefix a tab code ("F. Occupation"); the first filled-in value of a field wins.
      const name = match[1].replace(/^[A-Za-z]{1,3}\.\s*/, '').toLowerCase().replace(/[^a-z0-9]+/g, '');
      // Some wikis write several fields on one line; a value ends where the next "|field =" starts.
      const value = match[2].split(/\s\|\s*[A-Za-z0-9_ .()\-]{2,25}\s*=(?!=)/)[0].replace(/^\s*\|.*$/, '');
      if (name in out && out[name].trim()) key = null; else { key = name; out[name] = value; }
      continue;
    }
    if (key && !/^\s*\}\}/.test(line)) out[key] += `\n${line}`; else if (/^\s*\}\}/.test(line)) key = null;
  }
  return out;
}
const first = (fields, names) => { for (const name of names) if (fields[name] && plain(fields[name])) return fields[name]; return ''; };
const items = value => splitOutside(strip(value).replace(/<br\s*\/?>|\*|•|·/g, '\n')).map(part => plain(part)).filter(Boolean);
const clean = text => text.replace(/\s*\([^)]*\)/g, '').replace(/^(?:ally|allies|subordinate|subordinates|former|formerly)\s+(?:of\s+)?(?:the\s+)?/i, '').replace(/[.,:]+$/, '').trim();
// Anything still carrying wiki or HTML syntax is not a value.
const tidy = text => (text && !/[|={}<>\[\]"]/.test(text) ? text : '');
const NOT_FAMILY = /counterpart|alternate|timeline|fusion|fusee|potara|component|unborn|hypothetical|what if|universe|edolas|unnamed|unknown|apparent|supposed|claimed|reincarnat|\bsee\b|template|\bjjl\b|jojolion|online|\bgame\b|movie|film|\bova\b|\bau\b|figure|spiritual|contracted|previous|former spirit/i;
const FORMER = /\((?:former|formerly|ex-|previous|past|defected|disbanded|deceased)/i;
const LOOKS_LIKE_CHARACTER = ['gender', 'status', 'race', 'species', 'affiliation', 'affiliations', 'occupation', 'relatives', 'family', 'allrelatives', 'birthday', 'age', 'kanji', 'romaji', 'alias', 'height', 'bloodtype', 'debut', 'mangadebut', 'animedebut', 'manga', 'anime'];
const plural = text => text.replace(/\b(brother|sister|parent|cousin|uncle|aunt|nephew|niece|sibling|grandparent|grandchild|son|daughter|grandson|granddaughter|child)s\b/gi, '$1').replace(/\bchildren\b/gi, 'child').replace(/\bbrothers\b/gi, 'brother');

function splitOutside(text) {
  const parts = []; let depth = 0; let current = '';
  for (const char of text) {
    if (char === '(' || char === '[') depth++; if (char === ')' || char === ']') depth = Math.max(0, depth - 1);
    if ((char === ',' && !depth) || char === '\n' || char === ';') { parts.push(current); current = ''; } else current += char;
  }
  parts.push(current);
  return parts;
}
function relatives(value) {
  const out = [];
  const text = strip(value).replace(/<br\s*\/?>/gi, '\n').replace(/^\s*[*#:]+\s*/gm, '').replace(/&nbsp;/g, ' ');
  for (const raw of splitOutside(text)) {
    const token = raw.trim(); if (!token) continue;
    const links = [...token.matchAll(/\[\[([^\]|#]+)(?:\|([^\]]*))?\]\]/g)].filter(match => !/#|\//.test(match[0].split('|')[0])).map(match => match[1].trim());
    const parenthetical = token.match(/\(([^()]+)\)/)?.[1];
    const label = token.match(/^\s*(?:'{2,})?([A-Za-z -]{3,30}?)(?:'{2,})?\s*[:–—-]\s*(?=\S)/)?.[1];
    // Some wikis write the relation after the link instead of in brackets: "[[Name]] † {{s|wife}}".
    const after = plain(token.replace(/\[\[[^\]]*\]\]/g, '')).replace(/[†‡*]/g, '').trim();
    let relation = parenthetical ?? label ?? (links.length === 1 && /^[A-Za-z][A-Za-z '/-]{2,38}$/.test(after) ? after : '');
    relation = plural(plain(relation).replace(/\b(deceased|alive|dead|status|former|late|unnamed)\b/gi, '').replace(/[,\s]+$/, '').trim());
    if (!links.length) {
      const name = plain(token.replace(/\([^)]*\)/g, '').replace(/^[^:]*:\s*/, ''));
      if (name && name.length < 40 && /^[A-Z]/.test(name) && parenthetical) links.push(name); else continue;
    }
    // Alternate versions, fusions and unborn children are not this character's family.
    if (NOT_FAMILY.test(relation)) continue;
    for (const link of links) out.push({ name: link, relation });
  }
  return out;
}

const people = new Map();
for (const [requested, { title, text }] of Object.entries(cache.text)) {
  if (!text || /^\s*#redirect/i.test(text)) continue;
  const fields = readParams(text);
  if (LOOKS_LIKE_CHARACTER.filter(name => name in fields).length < 3) continue;
  const id = idOf(title);
  if (!id || people.has(id)) continue;
  let affiliations = items(first(fields, ['affiliation', 'affiliations', 'allegiance', 'organization', 'organisation', 'organizations']));
  const teams = items(first(fields, ['team', 'teams', 'squad', 'group', 'division', 'unit', 'guild', 'house']));
  const occupation = items(first(fields, ['occupation', 'occupations', 'occ', 'rank', 'position']));
  // Wikis without an affiliation field still say where someone is from or which team they play for.
  if (!affiliations.length) affiliations = items(first(fields, ['team', 'teams', 'squad', 'country', 'homecountry', 'nation', 'origin', 'residence', 'workplace', 'baseofoperations', 'location', 'birthplace']));
  const species = plain(first(fields, ['race', 'species', 'type'])).split(/[,;(/]/)[0].trim();
  const status = plain(first(fields, ['status'])).split(/[,;(/]/)[0].trim();
  const ghost = !plain(first(fields, ['status', 'gender']));
  void requested; void ghost;
  const family = relatives(['relatives', 'family', 'fam', 'allrelatives', 'famconnect', 'relationship', 'relation', 'relative', 'familymembers', 'relations'].map(name => fields[name] ?? '').join('\n'));
  people.set(id, {
    id, name: title.replace(/\s*\((?:character|manga|anime)\)$/i, ''), clan: [], status: tidy(/^(alive|deceased|dead|unknown|missing|active|inactive|sealed|imprisoned|incapacitated)/i.test(status) ? status.replace(/^dead$/i, 'Deceased') : status) || undefined,
    affiliation: [...new Set([...affiliations.filter(item => !FORMER.test(item)), ...affiliations.filter(item => FORMER.test(item))].map(clean).map(tidy).filter(item => item && item.length < 50))].slice(0, 6), kekkei: [],
    family: /fusion/i.test(species) ? [] : family, team: [...new Set(teams.map(clean).map(tidy).filter(item => item && item.length < 40))].slice(0, 4),
    rank: [...new Set(occupation.filter(item => !FORMER.test(item)).map(clean).map(tidy).filter(item => item && item.length < 40))].slice(0, 3),
    species: /^human/i.test(species) ? '' : tidy(species.length < 30 ? species : ''), classes: [],
    male: /^male/i.test(plain(first(fields, ['gender', 'sex']))) || undefined,
  });
}

// ── 4. Relatives named on a page but not among the pages: resolve redirects, then keep the rest as people without a page ──
const unknown = new Set();
for (const person of people.values()) for (const relative of person.family) { relative.id = idOf(relative.name); if (!people.has(relative.id)) unknown.add(relative.name); }
const alias = new Map(); const names = [...unknown];
for (let i = 0; i < names.length; i += 50) {
  const batch = names.slice(i, i + 50);
  const json = await api({ action: 'query', titles: batch.join('|'), redirects: '1', converttitles: '1' });
  const normalised = new Map((json.query?.normalized ?? []).map(item => [item.to, item.from]));
  for (const item of json.query?.redirects ?? []) alias.set(idOf(normalised.get(item.from) ?? item.from), idOf(item.to));
  await sleep(150);
}
for (const person of people.values()) for (const relative of person.family) if (alias.has(relative.id) && people.has(alias.get(relative.id))) { relative.id = alias.get(relative.id); relative.name = people.get(relative.id).name; }
const GHOST = /unnamed|^(?:mr|mrs|ms|miss|dr)\.?\s|'s\s|’s\s|\band\b|^(?:older|younger|elder|eldest|youngest)\b|^(?:mother|father|grandfather|grandmother|brother|sister|parents?|child|children|wife|husband|son|daughter|uncle|aunt|ancestors?|relatives?|family)$/i;
for (const person of people.values()) {
  person.family = person.family.map(relative => people.has(relative.id) ? { ...relative, relation: relative.relation || 'Relative' } : relative).filter(relative => people.has(relative.id) || (relative.relation && !GHOST.test(relative.name)));
  person.family = person.family.filter((relative, index, list) => relative.id && relative.id !== person.id && list.findIndex(other => other.id === relative.id && other.relation === relative.relation) === index);
  for (const relative of person.family) if (people.has(relative.id)) relative.name = people.get(relative.id).name;
}

// A tie one page claims and the other page's own family list leaves out is not kept: it is usually a fusion,
// an alternate version or a loose "related to" link rather than family. Pages with no family list keep what others say.
let dropped = 0;
const claims = new Map([...people.values()].map(person => [person.id, new Set(person.family.map(relative => relative.id))]));
for (const person of people.values()) {
  person.family = person.family.filter(relative => {
    const other = people.get(relative.id);
    if (!other || other.family.length < 2 || claims.get(other.id).has(person.id)) return true;
    dropped++; return false;
  });
}
console.log(`dropped ${dropped} one-sided ties`);

// The most common occupations become the groups people with no family are filed under.
const count = new Map();
for (const person of people.values()) for (const rank of person.rank) count.set(rank, (count.get(rank) ?? 0) + 1);
const ranks = [...count].filter(([, n]) => n >= 6).sort((a, b) => b[1] - a[1]).slice(0, 14).map(([name]) => name);
const characters = [...people.values()];
const out = `data/characters/rosters/${slug}.json`;
writeFileSync(out, JSON.stringify({ source: `${series.wiki} (CC BY-SA), factual fields only`, importedAt: new Date().toISOString().slice(0, 10), total: characters.length, meta: { ranks }, characters }));
const linked = characters.filter(person => person.family.length).length;
console.log(`wrote ${out}: ${characters.length} characters, ${linked} with relatives, ${new Set(characters.flatMap(person => person.affiliation.slice(0, 1))).size} affiliations`);
