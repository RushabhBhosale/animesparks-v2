import type { Article, Ctx, MediaAsset, PortableBlock, Project } from './types';
import { CmsError } from './types';
import { applyUpdate, articleId, ensureMeta } from './articles';
import { cms, collections } from './projects';
import { log } from './jobs';
import { fetchImage, ingestImage, probeSize, sniff, trackUsage } from './media';
import { headingsOf, inlineImages, inlineTargets } from './quality';
import { escapeRegex, now, shortKey } from './util';

interface Candidate {
  /** Already in the library (reuse) or a remote file to download. */
  asset?: MediaAsset; url?: string; generate?: string;
  provider: string; subject: string; franchise?: string; alt: string; page?: string; license: string; attribution?: string;
  /** Minimum bytes per pixel; filters blank or near-black video frames. */
  minDensity?: number;
}
const norm = (s: string) => s.toLowerCase().normalize('NFKD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, ' ').trim();
/** Loose title equality used to reject provider results that are not actually about the subject. */
function sameSubject(a: string, b: string) {
  const x = norm(a), y = norm(b);
  if (!x || !y) return false;
  if (x === y || (x.length > 3 && y.includes(x)) || (y.length > 3 && x.includes(y))) return true;
  const tx = new Set(x.split(' ')), ty = y.split(' ');
  return ty.filter(t => tx.has(t)).length / Math.max(tx.size, ty.length) >= 0.6;
}
const GENERIC = /^(multiple|various|anime|manga|anime industry|n\/a|other)\b/i;
/** Franchises the article is about, most specific first. */
export function franchisesOf(article: Article): string[] {
  const names = (article.animeName || '').split(/\s*(?:\/\/|\/|\|)\s*/).map(s => s.trim()).filter(s => s && !GENERIC.test(s));
  return [...new Set([...names, ...names.map(n => n.split(':')[0].trim())])].filter(Boolean);
}
const cleanHeading = (text: string) => text.replace(/^\s*(?:#?\d+[.):]?|[-•])\s*/, '').replace(/\s*[?!.]+$/, '').trim();
const STOP = new Set(['What', 'Why', 'How', 'Who', 'When', 'Where', 'The', 'A', 'An', 'Is', 'Are', 'Does', 'Do', 'Did', 'Will', 'Can', 'Should', 'In', 'On', 'Of', 'And', 'Or', 'For', 'To', 'With', 'From', 'Explained', 'Everything', 'We', 'Know', 'So', 'Far', 'Final', 'Thoughts', 'Conclusion', 'FAQ', 'Quick', 'Answer']);
/** Proper-noun phrases in a heading ("What Are Hollows in Bleach?" → Hollows, Bleach). */
function entities(heading: string) {
  const out: string[] = [];
  for (const match of cleanHeading(heading).matchAll(/(?:[A-Z][\w'’.-]*|\d+)(?:\s+(?:of|the|no|x|and|de|to|[A-Z][\w'’.-]*|\d+))*/g)) {
    const words = match[0].split(/\s+/);
    while (words.length && STOP.has(words[0])) words.shift();
    while (words.length && (STOP.has(words[words.length - 1]) || /^(of|the|and|to|no|x|de)$/.test(words[words.length - 1]))) words.pop();
    if (words.length && words.join(' ').length > 2) out.push(words.join(' '));
  }
  return [...new Set(out)];
}

// ── Providers ────────────────────────────────────────────────────────────────
interface AniMedia { id: number; title: { english?: string; romaji?: string }; bannerImage?: string; coverImage?: { extraLarge?: string }; trailer?: { id?: string; site?: string } | null; streamingEpisodes?: Array<{ title?: string; thumbnail?: string; url?: string; site?: string }>; relations?: { edges: Array<{ relationType: string; node: AniMedia & { type: string } }> } }
const aniCache = new Map<string, Promise<AniMedia | null>>();
function anilist(ctx: Ctx, search: string): Promise<AniMedia | null> {
  const key = norm(search);
  if (!aniCache.has(key)) aniCache.set(key, (async () => {
    const query = `query($s:String){Page(perPage:6){media(search:$s,type:ANIME,sort:SEARCH_MATCH){id title{english romaji} synonyms bannerImage coverImage{extraLarge} trailer{id site} streamingEpisodes{title thumbnail url site} relations{edges{relationType node{id type title{english romaji} bannerImage coverImage{extraLarge}}}}}}}`;
    const response = await ctx.fetch('https://graphql.anilist.co', { method: 'POST', headers: { 'Content-Type': 'application/json', Accept: 'application/json' }, body: JSON.stringify({ query, variables: { s: search } }), signal: AbortSignal.timeout(15_000) });
    if (response.status === 429 || response.status >= 500) throw new CmsError(502, 'provider_unavailable', `AniList is unavailable (HTTP ${response.status}).`);
    if (!response.ok) return null;
    const media = ((await response.json()) as { data?: { Page?: { media?: Array<AniMedia & { synonyms?: string[] }> } } }).data?.Page?.media || [];
    return media.find(m => [m.title.english, m.title.romaji, ...(m.synonyms || [])].some(t => t && sameSubject(t, search))) || null;
  })().catch(error => { aniCache.delete(key); throw error; }));
  return aniCache.get(key)!;
}
const aniTitle = (m: AniMedia) => m.title.english || m.title.romaji || '';
const aniCandidate = (m: AniMedia, url: string, kind: string, franchise: string): Candidate => ({
  url, provider: 'anilist', subject: aniTitle(m), franchise, alt: `${aniTitle(m)} ${kind}`, page: `https://anilist.co/anime/${m.id}`,
  license: 'Official promotional artwork; editorial use', attribution: `${aniTitle(m)} — via AniList`,
});
/** 16:9 frames of the official trailer: the designed thumbnail first, then YouTube's three mid-video frames. */
function trailerFrames(m: AniMedia, franchise: string, frames: string[]): Candidate[] {
  const id = m.trailer?.site === 'youtube' && /^[\w-]{6,20}$/.test(m.trailer.id || '') ? m.trailer.id : null;
  if (!id) return [];
  return frames.map(frame => ({
    url: `https://i.ytimg.com/vi/${id}/${frame}.jpg`, provider: 'anilist', subject: aniTitle(m), franchise, alt: `${aniTitle(m)} official trailer still`, page: `https://www.youtube.com/watch?v=${id}`,
    license: 'Still from the official trailer; editorial use', attribution: `${aniTitle(m)} — official trailer`, minDensity: 0.03,
  }));
}
/** Official episode thumbnails, earliest episodes first so later plot points are not shown. */
function episodeStills(m: AniMedia, franchise: string, limit: number): Candidate[] {
  return (m.streamingEpisodes || []).map(e => ({ e, n: Number(/episode\s+(\d+)/i.exec(e.title || '')?.[1] ?? NaN) })).filter(x => x.e.thumbnail && Number.isFinite(x.n)).sort((a, b) => a.n - b.n).slice(0, limit).map(({ e, n }) => {
    const name = (e.title || '').split(' - ').slice(1).join(' - ').trim();
    return {
      url: e.thumbnail!, provider: 'anilist', subject: aniTitle(m), franchise, alt: `${aniTitle(m)} episode ${n}${name && !/^untitled$/i.test(name) ? ` — ${name}` : ''}`, page: e.url,
      license: 'Official episode still; editorial use', attribution: `${aniTitle(m)} — ${e.site || 'official stream'}`, minDensity: 0.03,
    };
  });
}
/**
 * hero: 16:9 trailer thumbnail before the wide banner strip. inline: episode stills, then trailer frames, then key art.
 * section: the best single images of a title named in a heading (list articles).
 */
async function anilistCandidates(ctx: Ctx, franchise: string, kind: 'hero' | 'inline' | 'section'): Promise<Candidate[]> {
  const media = await anilist(ctx, franchise);
  if (!media) return [];
  const related = (media.relations?.edges || []).filter(e => e.node.type === 'ANIME' && ['SEQUEL', 'PREQUEL', 'SIDE_STORY', 'PARENT', 'ALTERNATIVE', 'SPIN_OFF'].includes(e.relationType)).map(e => e.node);
  const banner = media.bannerImage ? [aniCandidate(media, media.bannerImage, 'key visual', franchise)] : [];
  const cover = media.coverImage?.extraLarge ? [aniCandidate(media, media.coverImage.extraLarge, 'cover art', franchise)] : [];
  const relatedBanners = related.filter(n => n.bannerImage).map(n => aniCandidate(n, n.bannerImage!, 'key visual', franchise));
  if (kind === 'hero') return [...trailerFrames(media, franchise, ['maxresdefault']), ...banner, ...relatedBanners.slice(0, 3), ...cover];
  if (kind === 'section') return [...trailerFrames(media, franchise, ['maxresdefault']), ...banner, ...episodeStills(media, franchise, 1)];
  return [
    ...episodeStills(media, franchise, 6), ...trailerFrames(media, franchise, ['maxres1', 'maxres2', 'maxres3', 'maxresdefault']), ...relatedBanners, ...banner, ...cover,
    ...related.filter(n => n.coverImage?.extraLarge).map(n => aniCandidate(n, n.coverImage!.extraLarge!, 'cover art', franchise)),
  ];
}
async function fandomCandidates(ctx: Ctx, project: Project, franchise: string, subjects: string[]): Promise<Candidate[]> {
  const wiki = Object.entries(project.media.fandomWikis).find(([name]) => sameSubject(name, franchise))?.[1];
  if (!wiki || !subjects.length) return [];
  const url = `https://${wiki}.fandom.com/api.php?action=query&titles=${encodeURIComponent(subjects.slice(0, 5).join('|'))}&prop=pageimages&piprop=thumbnail|name&pithumbsize=1200&redirects=1&format=json`;
  const response = await ctx.fetch(url, { headers: { 'User-Agent': 'cms-media-fetcher/1.0' }, signal: AbortSignal.timeout(15_000) });
  if (!response.ok) return [];
  const pages = Object.values(((await response.json()) as { query?: { pages?: Record<string, { title: string; thumbnail?: { source: string } }> } }).query?.pages || {});
  return pages.filter(p => p.thumbnail?.source).map(p => ({
    url: p.thumbnail!.source, provider: 'fandom', subject: p.title, franchise, alt: `${p.title} in ${franchise}`, page: `https://${wiki}.fandom.com/wiki/${encodeURIComponent(p.title.replace(/ /g, '_'))}`,
    license: 'Fandom wiki image; rights with the original holder (project-approved source)', attribution: `${franchise} Wiki (Fandom)`,
  }));
}
/** Approved library assets about the same franchise, least-used first. */
async function libraryCandidates(ctx: Ctx, project: Project, article: Article, franchise: string, kind: 'hero' | 'inline'): Promise<Candidate[]> {
  const c = collections(ctx, project), rx = { $regex: `^${escapeRegex(franchise)}$`, $options: 'i' };
  const tagged = await c.assets.find({ franchise: rx, approved: { $ne: false }, broken: { $ne: true } }).limit(60).toArray();
  // Images already published on other articles about this franchise are approved media too.
  const siblings = await c.articles.find({ animeName: rx, publicationState: 'published', sanityId: { $ne: article.sanityId } }, { projection: { mainImage: 1, 'body._type': 1, 'body.asset': 1, 'body.alt': 1 } }).limit(30).toArray();
  const siblingKeys = new Map<string, string>();
  for (const s of siblings) for (const block of (kind === 'inline' ? inlineImages(s.body) : [])) if (block.asset?.r2Key) siblingKeys.set(block.asset.r2Key, block.alt || '');
  const fromSiblings = siblingKeys.size ? await c.assets.find({ r2Key: { $in: [...siblingKeys.keys()] }, approved: { $ne: false }, broken: { $ne: true } }).toArray() : [];
  const seen = new Set<string>();
  return [...tagged, ...fromSiblings].filter(a => !seen.has(a.r2Key) && seen.add(a.r2Key))
    .filter(a => a.width >= (kind === 'hero' ? project.media.heroMinWidth : project.media.inlineMinWidth) && (kind !== 'hero' || a.aspectRatio >= 1.2))
    .sort((a, b) => (a.usedBy?.length || 0) - (b.usedBy?.length || 0))
    .map(a => ({ asset: a, provider: 'library', subject: a.title || franchise, franchise, alt: a.alt || siblingKeys.get(a.r2Key) || `${franchise} artwork`, license: a.source?.license || 'existing approved media' }));
}

const imageBlock = (asset: MediaAsset, alt: string, caption = ''): PortableBlock => ({ _type: 'image', _key: `img${shortKey()}`, alt, caption, asset: { r2Key: asset.r2Key, publicUrl: asset.publicUrl } });
/** Where new inline images go: after the first paragraph of sections that have none, spread evenly. */
function placements(body: PortableBlock[], count: number): Array<{ after: number; heading: string }> {
  const heads = headingsOf(body);
  const sections = heads.map((h, i) => ({ ...h, end: heads[i + 1]?.index ?? body.length })).filter(s => !body.slice(s.index, s.end).some(b => b._type === 'image') && s.end - s.index > 1);
  if (!sections.length) {
    const paragraphs = body.map((b, index) => ({ b, index })).filter(({ b }) => b._type === 'block' && !b.listItem && (b.style || 'normal') === 'normal');
    if (heads.length || paragraphs.length < 3 || inlineImages(body).length) return [];
    return [{ after: paragraphs[1].index, heading: '' }];
  }
  const picked = count >= sections.length ? sections : Array.from({ length: count }, (_, i) => sections[Math.floor((i * sections.length) / count)]);
  return picked.map(s => {
    let after = s.index;
    if (body[after + 1]?._type === 'block' && !body[after + 1].listItem && (body[after + 1].style || 'normal') === 'normal') after += 1;
    return { after, heading: cleanHeading(body[s.index].children?.map(c => c.text).join('') || '') };
  });
}

export interface ImageResult { hero: 'present' | 'attached' | 'missing'; inlineAdded: number; inlineMissing: number; uploaded: number; reused: number; notes: string[] }
/**
 * Makes images a backend responsibility: finds topic-matched, permitted images, stores them and
 * attaches them to the real hero field and into the body. The article is written once, at the end,
 * and only with assets that were verified in storage.
 */
export async function processImages(ctx: Ctx, project: Project, article: Article): Promise<ImageResult> {
  const id = articleId(article), meta = await ensureMeta(ctx, project, article), m = project.media;
  if (!m.enabled) throw new CmsError(412, 'media_disabled', 'The image pipeline is disabled for this project.');
  if (article.publicationState === 'published') throw new CmsError(409, 'conflict', 'Images of published articles are not changed automatically.');
  const body = [...(article.body || [])], notes: string[] = [];
  const needHero = !article.mainImage?.asset?.r2Key;
  const { target, required } = inlineTargets(project, article);
  const have = inlineImages(body).length;
  const slots = have < target ? placements(body, target - have) : [];
  const result: ImageResult = { hero: needHero ? 'missing' : 'present', inlineAdded: 0, inlineMissing: 0, uploaded: 0, reused: 0, notes };
  if (!needHero && !slots.length) return result;

  const franchises = franchisesOf(article), providers = m.providers, storage = ctx.storage(project);
  if (!storage) throw new CmsError(412, 'storage_unavailable', 'Media storage is not configured for this runtime.');
  const used = new Set<string>([article.mainImage?.asset?.r2Key, ...inlineImages(body).map(b => b.asset?.r2Key)].filter((k): k is string => !!k));
  const usedUrls = new Set<string>();
  const failures: string[] = [];
  /** Tries candidates in order until one is stored and verified. */
  const take = async (candidates: Candidate[], kind: 'hero' | 'inline', context: string): Promise<{ asset: MediaAsset; candidate: Candidate } | null> => {
    for (const candidate of candidates) {
      if (candidate.asset) {
        if (used.has(candidate.asset.r2Key)) continue;
        // A library record is only reused if its file is really still in storage.
        if (!await storage!.head(candidate.asset.r2Key).catch(() => null)) { failures.push(`library: ${candidate.asset.r2Key} is missing from storage`); continue; }
        used.add(candidate.asset.r2Key); result.reused++;
        return { asset: candidate.asset, candidate };
      }
      const ref = candidate.url || candidate.generate!;
      if (usedUrls.has(ref)) continue;
      usedUrls.add(ref);
      try {
        const bytes = candidate.url ? await fetchImage(ctx, candidate.url) : await ctx.ai!.image!(candidate.generate!, kind === 'hero' ? { width: 1536, height: 1024 } : { width: 1024, height: 1024 });
        if (candidate.minDensity) {
          const mime = sniff(bytes), size = mime ? probeSize(bytes, mime) : null;
          if (size && bytes.byteLength / (size.width * size.height) < candidate.minDensity) { failures.push(`${candidate.provider}: skipped a blank video frame`); continue; }
        }
        const { asset, reused } = await ingestImage(ctx, project, { bytes, kind, context, alt: candidate.alt, title: candidate.subject, franchise: candidate.franchise, subjects: [candidate.subject],
          source: { provider: candidate.provider, url: candidate.url, page: candidate.page, license: candidate.license, attribution: candidate.attribution } });
        if (used.has(asset.r2Key)) continue;
        used.add(asset.r2Key);
        reused ? result.reused++ : result.uploaded++;
        return { asset, candidate };
      } catch (error) {
        // Storage and provider outages must fail the job so it is retried; a single bad image just moves on.
        if (error instanceof CmsError && (error.status >= 500 || error.status === 412)) throw error;
        failures.push(`${candidate.provider}: ${(error as Error).message}`);
      }
    }
    return null;
  };
  const gather = async (kind: 'hero' | 'inline', heading: string): Promise<Candidate[]> => {
    const out: Candidate[] = [];
    const subjects = heading ? [cleanHeading(heading), ...entities(heading)] : [];
    for (const provider of providers) {
      if (provider === 'library') for (const f of franchises) out.push(...await libraryCandidates(ctx, project, article, f, kind));
      if (provider === 'anilist') {
        // A section about a specific title (list articles) gets that title's art before the article-wide franchise.
        for (const subject of kind === 'inline' ? subjects.slice(0, 3) : []) if (!franchises.some(f => sameSubject(f, subject))) out.push(...(await anilistCandidates(ctx, subject, 'section')).slice(0, 2));
        for (const f of franchises) out.push(...await anilistCandidates(ctx, f, kind));
      }
      if (provider === 'fandom') for (const f of franchises) out.push(...await fandomCandidates(ctx, project, f, kind === 'hero' ? [f] : subjects));
      if (provider === 'ai' && m.aiGeneration.enabled && ctx.ai?.image) out.push({ generate: `${m.aiGeneration.stylePrompt}\nTopic: ${article.title}${heading ? `\nSection: ${heading}` : ''}`, provider: 'ai', subject: heading || article.title, franchise: franchises[0], alt: `Illustration for ${heading || article.title}`, license: 'AI-generated original image' });
    }
    return out;
  };

  const set: Partial<Article> = {};
  // Translations reuse the images of the article they translate (existing AnimeSparks rule).
  const source = providers.includes('translation') && article.translationOfSanityId ? await collections(ctx, project).articles.findOne({ sanityId: article.translationOfSanityId }) : null;
  if (needHero) {
    if (source?.mainImage?.asset?.r2Key) { set.mainImage = { ...source.mainImage, alt: source.mainImage.alt || article.title }; used.add(source.mainImage.asset.r2Key); result.reused++; result.hero = 'attached'; notes.push('hero reused from the source-language article'); }
    else {
      const found = await take(await gather('hero', ''), 'hero', `${article.slug}-hero`);
      if (found) { set.mainImage = { _type: 'image', alt: found.candidate.alt, asset: { r2Key: found.asset.r2Key, publicUrl: found.asset.publicUrl } }; result.hero = 'attached'; notes.push(`hero from ${found.candidate.provider}: ${found.candidate.subject}`); }
    }
  }
  const sourceImages = source ? inlineImages(source.body).filter(b => b.asset?.r2Key && !used.has(b.asset.r2Key)) : [];
  const inserts: Array<{ after: number; block: PortableBlock }> = [];
  for (const slot of slots) {
    const fromSource = sourceImages.shift();
    if (fromSource) { used.add(fromSource.asset!.r2Key!); inserts.push({ after: slot.after, block: { ...fromSource, _key: `img${shortKey()}` } }); result.reused++; continue; }
    const found = await take(await gather('inline', slot.heading), 'inline', `${article.slug}-${slot.heading || 'inline'}`);
    if (found) inserts.push({ after: slot.after, block: imageBlock(found.asset, slot.heading && !sameSubject(slot.heading, found.candidate.subject) ? `${found.candidate.alt} — ${slot.heading}` : found.candidate.alt, found.candidate.provider === 'library' ? '' : found.candidate.subject) });
  }
  for (const insert of inserts.sort((a, b) => b.after - a.after)) body.splice(insert.after + 1, 0, insert.block);
  if (inserts.length) set.body = body;
  result.inlineAdded = inserts.length;
  result.inlineMissing = Math.max(0, required - have - inserts.length);

  if (Object.keys(set).length) {
    await applyUpdate(ctx, project, article, { set }, { reason: 'image pipeline', skipQueue: true });
    await trackUsage(ctx, project, id, [set.mainImage?.asset?.r2Key, ...inserts.map(i => i.block.asset?.r2Key)].filter((k): k is string => !!k));
    if (result.hero === 'attached') await log(ctx, { projectId: project._id, articleId: id, title: article.title, type: 'hero.attached', level: 'success', message: `Hero image attached (${set.mainImage!.asset!.r2Key})` });
    if (inserts.length) await log(ctx, { projectId: project._id, articleId: id, title: article.title, type: 'inline.inserted', level: 'success', message: `${inserts.length} inline image${inserts.length > 1 ? 's' : ''} inserted` });
  }
  const stillMissing = result.hero === 'missing' && project.quality.requireHero || result.inlineMissing > 0;
  if (stillMissing) {
    const reason = !franchises.length ? 'the article has no identifiable anime/franchise (set "Anime / franchise")' : `no permitted image found for ${franchises.join(', ')}${failures.length ? ` (${[...new Set(failures)].slice(0, 3).join('; ')})` : ''}`;
    await cms(ctx).meta.updateOne({ _id: meta._id }, { $set: { mediaReview: { reason, at: now() } } });
    await log(ctx, { projectId: project._id, articleId: id, title: article.title, type: 'media.review', level: 'warning', message: `Sent to media review: ${reason}` });
    notes.push(`media review: ${reason}`);
  } else if (meta.mediaReview) await cms(ctx).meta.updateOne({ _id: meta._id }, { $unset: { mediaReview: '' } });
  return result;
}

/** Explicit placement by an editor or assistant: library assets only, real image blocks, no duplicates. */
export async function insertInlineImages(ctx: Ctx, project: Project, article: Article, images: Array<{ assetKey: string; alt?: string; caption?: string; afterHeading?: string; afterBlock?: number }>) {
  const { assets } = collections(ctx, project);
  const body = [...(article.body || [])];
  const present = new Set(inlineImages(body).map(b => b.asset?.r2Key));
  const inserts: Array<{ after: number; block: PortableBlock }> = [], skipped: Array<{ assetKey: string; reason: string }> = [];
  for (const image of images) {
    const asset = await assets.findOne({ r2Key: image.assetKey, broken: { $ne: true } });
    if (!asset) { skipped.push({ assetKey: image.assetKey, reason: 'not in the media library (upload it first)' }); continue; }
    if (present.has(asset.r2Key)) { skipped.push({ assetKey: image.assetKey, reason: 'already in the article body' }); continue; }
    let after = -1;
    if (image.afterHeading) {
      const heading = headingsOf(body).find(h => norm(h.text).includes(norm(image.afterHeading!)));
      if (!heading) { skipped.push({ assetKey: image.assetKey, reason: `no heading matches "${image.afterHeading}"` }); continue; }
      after = body[heading.index + 1]?._type === 'block' && !body[heading.index + 1].listItem && (body[heading.index + 1].style || 'normal') === 'normal' ? heading.index + 1 : heading.index;
    } else if (typeof image.afterBlock === 'number' && image.afterBlock >= 0 && image.afterBlock < body.length) after = image.afterBlock;
    else { skipped.push({ assetKey: image.assetKey, reason: 'give afterHeading or a valid afterBlock index' }); continue; }
    present.add(asset.r2Key);
    inserts.push({ after, block: imageBlock(asset, image.alt ?? asset.alt ?? '', image.caption) });
  }
  for (const insert of inserts.sort((a, b) => b.after - a.after)) body.splice(insert.after + 1, 0, insert.block);
  if (inserts.length) {
    await applyUpdate(ctx, project, article, { set: { body } }, { reason: 'inline images inserted' });
    await trackUsage(ctx, project, articleId(article), inserts.map(i => i.block.asset!.r2Key!));
    await log(ctx, { projectId: project._id, articleId: articleId(article), title: article.title, type: 'inline.inserted', level: 'success', message: `${inserts.length} inline image${inserts.length > 1 ? 's' : ''} inserted` });
  }
  return { inserted: inserts.length, skipped, inlineImages: inlineImages(body).length };
}
