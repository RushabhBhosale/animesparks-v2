// Imports episode → chapter mappings and story arcs from fan wikis on
// Fandom, through their official MediaWiki API (content licensed CC BY-SA).
// Only factual fields are taken (episode numbers, chapter numbers, arc
// names); no wiki prose is copied. Output is written as curated JSON under
// data/curated/{manga-mappings,arcs}/ for review, then loaded with
// `npm run tools:import-curated -- --apply`.
//
//   node scripts/tools/import-wiki.mjs [--only=naruto] [--probe]
//
// Requests are serialised at ~1/second with an identifying User-Agent.

import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { argValue, connect, getMongoUri, hasFlag } from './lib.mjs';

const UA = 'AnimeSparksTools/1.0 (+https://www.animesparks.blog/tools; data import via MediaWiki API)';
const today = new Date().toISOString().slice(0, 10);
const probe = hasFlag('probe');
const only = argValue('only', '');

/**
 * Per-wiki configuration. `groups` split the wiki's episodes into our
 * catalogue entries: episodes matching `match` are sorted by number and
 * handed out in order to `slugs`, each taking as many as it has episodes.
 */
const WIKIS = [
  { key: 'naruto', host: 'naruto.fandom.com', name: 'Narutopedia', template: 'Template:Infobox/Naruto/Episode',
    groups: [
      { slugs: ['naruto'], match: p => /^no$/i.test(p.shippuden || '') && !/^yes$/i.test(p['boruto anime'] || '') },
      { slugs: ['naruto-shippuden'], match: p => /^yes$/i.test(p.shippuden || '') },
    ] },
  { key: 'bleach', host: 'bleach.fandom.com', name: 'Bleach Wiki', template: 'Template:Bleach Wiki:Episode Template',
    groups: [{ slugs: ['bleach'], match: p => Number(p.episodenumber) <= 366 }] },
  // Thousand-Year Blood War episodes (367 onwards) use their own infobox.
  { key: 'bleach-tybw', host: 'bleach.fandom.com', name: 'Bleach Wiki', template: 'Template:Bleach Wiki:TYBW Episode Template',
    groups: [{ slugs: ['bleach-thousand-year-blood-war', 'bleach-thousand-year-blood-war-the-separation', 'bleach-thousand-year-blood-war-the-conflict', 'bleach-thousand-year-blood-war-the-calamity'], match: p => Number(p.episodenumber) > 366 }] },
  { key: 'demon-slayer', host: 'kimetsu-no-yaiba.fandom.com', name: 'Kimetsu no Yaiba Wiki', template: 'Template:Episode',
    groups: [{ slugs: ['demon-slayer-kimetsu-no-yaiba', 'demon-slayer-kimetsu-no-yaiba-mugen-train-arc', 'demon-slayer-kimetsu-no-yaiba-entertainment-district-arc', 'demon-slayer-kimetsu-no-yaiba-swordsmith-village-arc', 'demon-slayer-kimetsu-no-yaiba-hashira-training-arc'], match: () => true }] },
  { key: 'mha', host: 'myheroacademia.fandom.com', name: 'My Hero Academia Wiki', template: 'Template:Episode Infobox',
    groups: [{ slugs: ['my-hero-academia', 'my-hero-academia-season-2', 'my-hero-academia-season-3', 'my-hero-academia-season-4', 'my-hero-academia-season-5', 'my-hero-academia-season-6', 'my-hero-academia-season-7', 'my-hero-academia-final-season'], match: () => true }] },
  { key: 'hxh', host: 'hunterxhunter.fandom.com', name: 'Hunterpedia', template: 'Hunterpedia:Episode (2011)',
    groups: [{ slugs: ['hunter-x-hunter'], match: () => true }] },
  { key: 'chainsaw-man', host: 'chainsaw-man.fandom.com', name: 'Chainsaw Man Wiki', template: 'Template:Episode Infobox',
    groups: [{ slugs: ['chainsaw-man'], match: p => !p['season number'] || p['season number'] === '1' }] },
  { key: 'frieren', host: 'frieren.fandom.com', name: 'Frieren Wiki', template: 'Template:Episode Infobox',
    groups: [{ slugs: ['frieren-beyond-journeys-end', 'frieren-beyond-journeys-end-season-2'], match: () => true }] },
  { key: 'black-clover', host: 'blackclover.fandom.com', name: 'Black Clover Wiki', template: 'Template:Infobox/Episode',
    groups: [{ slugs: ['black-clover', 'black-clover-season-2'], match: () => true }] },
  { key: 'spy-x-family', host: 'spy-x-family.fandom.com', name: 'Spy × Family Wiki', template: 'Template:Infobox episode',
    groups: [{ slugs: ['spy-x-family', 'spy-x-family-part-2', 'spy-x-family-season-2', 'spy-x-family-season-3'], match: () => true }] },
  { key: 'solo-leveling', host: 'solo-leveling.fandom.com', name: 'Solo Leveling Wiki', template: 'Template:Infobox episode',
    groups: [{ slugs: ['solo-leveling', 'solo-leveling-season-2-arise-from-the-shadow'], match: () => true }] },
  { key: 'jjk', host: 'jujutsu-kaisen.fandom.com', name: 'Jujutsu Kaisen Wiki', template: 'Template:Episode Infobox',
    groups: [{ slugs: ['jujutsu-kaisen', 'jujutsu-kaisen-season-2', 'jujutsu-kaisen-the-culling-game-part-1'], match: () => true }] },
];

let lastRequest = 0;
async function api(host, params) {
  const wait = lastRequest + 1100 - Date.now();
  if (wait > 0) await new Promise(resolve => setTimeout(resolve, wait));
  lastRequest = Date.now();
  const url = `https://${host}/api.php?${new URLSearchParams({ ...params, format: 'json', formatversion: '2', maxlag: '5' })}`;
  for (let attempt = 0; attempt < 4; attempt++) {
    const response = await fetch(url, { headers: { 'User-Agent': UA, Accept: 'application/json' }, signal: AbortSignal.timeout(30000) });
    if (response.ok && (response.headers.get('content-type') || '').includes('json')) return response.json();
    await new Promise(resolve => setTimeout(resolve, 2000 * 2 ** attempt));
  }
  throw new Error(`${host}: API request failed`);
}

async function pagesUsing(host, template) {
  const titles = [];
  let cont = {};
  do {
    const body = await api(host, { action: 'query', list: 'embeddedin', eititle: template, einamespace: '0', eilimit: '500', ...cont });
    titles.push(...(body.query?.embeddedin || []).map(page => page.title));
    cont = body.continue || {};
  } while (cont.eicontinue);
  return titles;
}

async function contents(host, titles) {
  const result = new Map();
  for (let index = 0; index < titles.length; index += 50) {
    const body = await api(host, { action: 'query', prop: 'revisions', rvprop: 'content', rvslots: 'main', titles: titles.slice(index, index + 50).join('|') });
    for (const page of body.query?.pages || []) result.set(page.title, page.revisions?.[0]?.slots?.main?.content || '');
  }
  return result;
}

/** Top-level "| key = value" lines of the first template on the page. */
function templateParams(text) {
  const params = {};
  for (const match of text.slice(0, 8000).matchAll(/^\s*\|\s*([^=\n|]+?)\s*=\s*(.*)$/gm)) {
    const key = match[1].trim().toLowerCase();
    if (!(key in params)) params[key] = match[2].trim();
  }
  return params;
}

const ENTITIES = { mdash: '—', ndash: '–', amp: '&', quot: '"', apos: "'", nbsp: ' ', hellip: '…' };
const decode = value => value
  .replace(/&(mdash|ndash|amp|quot|apos|nbsp|hellip);/g, (_, name) => ENTITIES[name])
  .replace(/&#(\d+);/g, (_, code) => String.fromCharCode(Number(code)));
const strip = value => decode(value).replace(/\[\[(?:[^|\]]*\|)?([^\]]*)\]\]/g, '$1').replace(/<[^>]+>/g, ' ').replace(/\{\{[^}]*\}\}/g, '').replace(/\s+/g, ' ').trim();

export function episodeNumber(params, title = '') {
  for (const key of ['ep number', 'episodenumber', 'episode', '#', 'number']) {
    const raw = String(params[key] || '');
    // "13.5"-style numbers are recap specials, not regular episodes.
    if (/^\s*\d+\.\d/.test(raw)) return null;
    const value = Number(raw.match(/^\s*(\d+)/)?.[1]);
    if (Number.isInteger(value) && value > 0) return value;
  }
  // Some wikis only number episodes in the page title ("Episode 13").
  const fromTitle = Number(title.match(/^Episode\s+(\d+)(?![.\d])/i)?.[1]);
  return Number.isInteger(fromTitle) && fromTitle > 0 ? fromTitle : null;
}

/** Chapter numbers from fields like "[[Chapter 2]] (p. 2-3)<br>[[Chapter 1]]" or "1-3". */
export function chapterNumbers(params) {
  const fields = Object.entries(params).filter(([key]) => /^(chapters?|adapted ?(from)?( \d+)?|manga)$/.test(key)).map(([, value]) => value);
  const numbers = new Set();
  for (const field of fields) {
    // "[[Chapter 14]] - [[Chapter 17]]" is a range: expand it first.
    for (const range of field.matchAll(/\[\[\s*Chapter\s+(\d+)[^\]]*\]\]\s*[-–]\s*\[\[\s*Chapter\s+(\d+)/gi)) {
      const [start, end] = [Number(range[1]), Number(range[2])];
      if (end > start && end - start < 60) for (let value = start; value <= end; value++) numbers.add(value);
    }
    const linked = [...field.matchAll(/\[\[\s*Chapter\s+(\d+)/gi)].map(match => Number(match[1]));
    if (linked.length) { linked.forEach(value => numbers.add(value)); continue; }
    // Links to anything else ("Extra Mission 1", bonus stories) are not chapters.
    if (/\[\[/.test(field)) continue;
    const plain = strip(field).replace(/\(.*?\)/g, '');
    for (const range of plain.matchAll(/(\d+)\s*(?:[-–]\s*(\d+))?/g)) {
      const start = Number(range[1]);
      const end = Number(range[2] || range[1]);
      if (end >= start && end - start < 60) for (let value = start; value <= end; value++) numbers.add(value);
    }
  }
  return [...numbers].filter(value => value > 0 && value < 5000).sort((a, b) => a - b);
}

export function arcName(params) {
  // An episode spanning two arcs links both; it belongs to the first.
  const raw = (params.arc || '').match(/^\s*\[\[[^\]]*\]\]/)?.[0] || params.arc || '';
  return raw ? strip(raw).replace(/\s*\(arc\)$/i, ' Arc').replace(/\s+arc$/i, ' Arc') || null : null;
}

/**
 * An episode may also cite flashback chapters far from what it adapts
 * (e.g. 1, 4-5 and 14-17). Group chapters that are within 3 of each other
 * and keep the largest group (the later one on a tie).
 */
export function mainChapterRun(chapters) {
  const runs = [];
  for (const chapter of [...chapters].sort((a, b) => a - b)) {
    const last = runs.at(-1);
    if (last && chapter - last.at(-1) <= 3) last.push(chapter);
    else runs.push([chapter]);
  }
  const best = runs.reduce((winner, run) => run.length >= winner.length ? run : winner, []);
  return [best[0], best.at(-1)];
}

/** Turns per-episode records into mapping ranges and arcs (episode numbers relative to the entry). */
export function buildDatasets(records) {
  const ranges = records.filter(record => record.chapters.length).map(record => {
    const [chapterStart, chapterEnd] = mainChapterRun(record.chapters);
    return { episodeStart: record.n, episodeEnd: record.n, chapterStart, chapterEnd };
  });
  const arcs = [];
  for (const record of records) {
    if (!record.arc) continue;
    const last = arcs.at(-1);
    if (last && last.name === record.arc && record.n === last.episodeEnd + 1) last.episodeEnd = record.n;
    else arcs.push({ name: record.arc, episodeStart: record.n, episodeEnd: record.n });
  }
  const maxChapter = Math.max(0, ...ranges.map(range => range.chapterEnd));
  return { ranges, arcs, continueFromChapter: maxChapter ? maxChapter + 1 : undefined };
}

/** "45, 48-53" → [[45, 45], [48, 53]] */
export function parseSegments(value) {
  return [...value.matchAll(/(\d+)\s*(?:[-–]\s*(\d+))?/g)].map(match => [Number(match[1]), Number(match[2] || match[1])]).filter(([a, b]) => b >= a);
}

/**
 * One Piece: arc-level ranges from the "Story Arcs" page. Each level-4
 * heading is an arc; its own lines (up to the next heading of any level)
 * give "Chapters: N (a-b)" and "Episodes: N (a, b-c)". Arcs without a
 * chapter line are anime-original.
 */
export function parseOnePieceArcs(text) {
  const sections = [];
  let current = null;
  for (const line of text.split('\n')) {
    const heading = line.match(/^(={2,6})\s*(.*?)\s*\1\s*$/);
    if (heading) {
      current = { level: heading[1].length, name: strip(heading[2]), body: [] };
      sections.push(current);
    } else if (current) current.body.push(line);
  }
  const arcs = [];
  for (const section of sections.filter(item => item.level === 4)) {
    const body = section.body.join('\n');
    const episodes = body.match(/Episodes\]\]:\s*\d+\s*\(([^)]*)\)/);
    if (!episodes) continue;
    const chapters = body.match(/Chapters\]\]:\s*\d+\s*\(([^)]*)\)/);
    const chapterSegments = chapters ? parseSegments(chapters[1]) : [];
    const chapterStart = chapterSegments.length ? Math.min(...chapterSegments.map(([a]) => a)) : null;
    const chapterEnd = chapterSegments.length ? Math.max(...chapterSegments.map(([, b]) => b)) : null;
    for (const [episodeStart, episodeEnd] of parseSegments(episodes[1])) {
      arcs.push({ name: section.name, episodeStart, episodeEnd, chapterStart, chapterEnd });
    }
  }
  // Neighbouring arcs share boundary episodes on the wiki; trim so ranges never overlap.
  arcs.sort((a, b) => a.episodeStart - b.episodeStart || a.episodeEnd - b.episodeEnd);
  let previousEnd = 0;
  return arcs.flatMap(arc => {
    const start = Math.max(arc.episodeStart, previousEnd + 1);
    if (start > arc.episodeEnd) return [];
    previousEnd = arc.episodeEnd;
    return [{ ...arc, episodeStart: start }];
  });
}

function meta(wiki, url) {
  return {
    sources: [{ name: `${wiki.name} on Fandom (CC BY-SA)`, url }],
    verification: { status: 'verified', verifiedBy: `Imported from ${wiki.name}`, verifiedAt: today, method: 'wiki-import', notes: 'Episode infobox fields read through the MediaWiki API; no prose copied.' },
  };
}

function write(folder, slug, data) {
  const directory = join('data/curated', folder);
  mkdirSync(directory, { recursive: true });
  writeFileSync(join(directory, `${slug}.json`), `${JSON.stringify(data, null, 2)}\n`);
}

async function main() {
  const { client, db } = await connect(getMongoUri(process.env.TOOLS_SYNC_MONGODB_URI ? 'TOOLS_SYNC_MONGODB_URI' : 'MONGODB_URI'));
  const anime = new Map((await db.collection('toolAnime').find({}, { projection: { _id: 0, slug: 1, episodes: 1, episodesAired: 1, status: 1 } }).toArray()).map(doc => [doc.slug, doc]));
  await client.close();
  const report = [];

  if (!only || only === 'one-piece') {
    const wiki = { name: 'One Piece Wiki', host: 'onepiece.fandom.com' };
    const body = await api(wiki.host, { action: 'parse', page: 'Story Arcs', prop: 'wikitext' });
    const arcs = parseOnePieceArcs(body.parse?.wikitext || '');
    const limit = anime.get('one-piece')?.episodesAired || anime.get('one-piece')?.episodes || Infinity;
    const usable = arcs.filter(arc => arc.episodeStart <= limit).map(arc => ({ ...arc, episodeEnd: Math.min(arc.episodeEnd, limit) }));
    const url = 'https://onepiece.fandom.com/wiki/Story_Arcs';
    if (!probe) {
      write('arcs', 'one-piece', { slug: 'one-piece', arcs: usable.map(arc => ({ name: arc.name, episodeStart: arc.episodeStart, episodeEnd: arc.episodeEnd, classification: arc.chapterStart ? 'canon' : 'filler' })), ...meta(wiki, url) });
      const ranges = usable.filter(arc => arc.chapterStart).map(arc => ({ episodeStart: arc.episodeStart, episodeEnd: arc.episodeEnd, chapterStart: arc.chapterStart, chapterEnd: arc.chapterEnd, note: `${arc.name}: arc-level range.` }));
      write('manga-mappings', 'one-piece', { slug: 'one-piece', ranges, continueFromChapter: Math.max(...ranges.map(range => range.chapterEnd)) + 1, continueNote: 'This is the chapter after the last arc the anime has adapted.', ...meta(wiki, url) });
    }
    report.push(`one-piece: ${usable.length} arcs (${usable.filter(arc => arc.chapterStart).length} with chapters)`);
  }

  for (const wiki of WIKIS) {
    if (only && only !== wiki.key) continue;
    let records;
    try {
      const titles = await pagesUsing(wiki.host, wiki.template);
      const pages = await contents(wiki.host, titles);
      records = [...pages.entries()].map(([title, text]) => {
        const params = templateParams(text);
        return { title, params, n: episodeNumber(params, title), chapters: chapterNumbers(params), arc: arcName(params) };
      }).filter(record => record.n);
    } catch (error) {
      report.push(`${wiki.key}: failed (${error.message})`);
      continue;
    }
    for (const group of wiki.groups) {
      // Wikis number either per season or overall; sort by season then number, de-duplicate.
      const season = record => Number(String(record.params['season number'] || record.params.season || record.params.partofseason || '1').match(/\d+/)?.[0] || 1);
      const seen = new Set();
      const ordered = records.filter(record => group.match(record.params))
        .sort((a, b) => season(a) - season(b) || a.n - b.n)
        .filter(record => { const key = `${season(record)}:${record.n}`; if (seen.has(key)) return false; seen.add(key); return true; });
      let cursor = 0;
      for (const slug of group.slugs) {
        const entry = anime.get(slug);
        const count = entry?.status === 'airing' ? entry.episodesAired : entry?.episodes;
        if (!entry || !count) { report.push(`${slug}: not in catalogue or no episode count, skipped`); continue; }
        const slice = ordered.slice(cursor, cursor + count).map((record, index) => ({ ...record, n: index + 1 }));
        cursor += count;
        const withChapters = slice.filter(record => record.chapters.length).length;
        if (slice.length < count) { report.push(`${slug}: wiki has ${slice.length}/${count} episodes, skipped`); continue; }
        const datasets = buildDatasets(slice);
        report.push(`${slug}: ${withChapters}/${count} episodes with chapters, ${datasets.arcs.length} arcs [${slice[0].title} … ${slice.at(-1).title}; ch ${datasets.ranges[0]?.chapterStart ?? '-'}…${datasets.ranges.at(-1)?.chapterEnd ?? '-'}]`);
        if (probe) continue;
        const url = `https://${wiki.host}/wiki/${encodeURIComponent(slice[0].title.replace(/ /g, '_'))}`;
        if (withChapters >= Math.ceil(count * 0.5)) {
          write('manga-mappings', slug, { slug, ranges: datasets.ranges, continueFromChapter: datasets.continueFromChapter, continueNote: 'This is the chapter after the last one this season adapts.', ...meta(wiki, url) });
        }
        if (datasets.arcs.length) write('arcs', slug, { slug, arcs: datasets.arcs, ...meta(wiki, url) });
      }
    }
  }
  console.log(report.join('\n'));
}

if (hasFlag('dump')) {
  const wiki = WIKIS.find(item => item.key === only);
  const titles = await pagesUsing(wiki.host, wiki.template);
  const pages = await contents(wiki.host, titles);
  for (const [title, text] of pages) {
    const params = templateParams(text);
    console.log(title, '|', episodeNumber(params, title), '| season', params['season number'] || params.season || '', '|', chapterNumbers(params).join(','), '|', arcName(params));
  }
} else if (import.meta.url === `file://${process.argv[1]}`) await main();
