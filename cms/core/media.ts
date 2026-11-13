import type { Filter } from 'mongodb';
import type { Ctx, MediaAsset, Project } from './types';
import { CmsError, invalid, notFound } from './types';
import { collections, projectFor } from './projects';
import { log } from './jobs';
import { digest, escapeRegex, now, publicMediaUrl, slugify } from './util';

const MAX_BYTES = 15 * 1024 * 1024;
const EXT: Record<string, string> = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp', 'image/gif': 'gif', 'image/avif': 'avif' };

/** File type from magic bytes — the declared content type and file name are never trusted. */
export function sniff(b: Uint8Array): string | null {
  const ascii = (from: number, to: number) => String.fromCharCode(...b.subarray(from, to));
  if (b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) return 'image/jpeg';
  if (b[0] === 0x89 && ascii(1, 4) === 'PNG') return 'image/png';
  if (ascii(0, 4) === 'RIFF' && ascii(8, 12) === 'WEBP') return 'image/webp';
  if (ascii(0, 4) === 'GIF8') return 'image/gif';
  if (ascii(4, 8) === 'ftyp' && /avif|avis/.test(ascii(8, 12))) return 'image/avif';
  return null;
}
/** Intrinsic size from the file header, for runtimes without an image optimizer. */
export function probeSize(b: Uint8Array, mime: string): { width: number; height: number } | null {
  const view = new DataView(b.buffer, b.byteOffset, b.byteLength);
  try {
    if (mime === 'image/png') return { width: view.getUint32(16), height: view.getUint32(20) };
    if (mime === 'image/gif') return { width: view.getUint16(6, true), height: view.getUint16(8, true) };
    if (mime === 'image/webp') {
      const kind = String.fromCharCode(...b.subarray(12, 16));
      if (kind === 'VP8X') return { width: 1 + (b[24] | b[25] << 8 | b[26] << 16), height: 1 + (b[27] | b[28] << 8 | b[29] << 16) };
      if (kind === 'VP8 ') return { width: view.getUint16(26, true) & 0x3fff, height: view.getUint16(28, true) & 0x3fff };
      if (kind === 'VP8L') { const n = view.getUint32(21, true); return { width: (n & 0x3fff) + 1, height: ((n >> 14) & 0x3fff) + 1 }; }
    }
    if (mime === 'image/jpeg') for (let i = 2; i < b.length - 9;) {
      if (b[i] !== 0xff) { i++; continue; }
      const marker = b[i + 1];
      if (marker >= 0xc0 && marker <= 0xcf && ![0xc4, 0xc8, 0xcc].includes(marker)) return { width: view.getUint16(i + 7), height: view.getUint16(i + 5) };
      i += 2 + view.getUint16(i + 2);
    }
  } catch { /* truncated header */ }
  return null;
}

export class ImageDownloadError extends CmsError {
  constructor(public readonly upstreamStatus: number, host: string) {
    super(upstreamStatus >= 500 || upstreamStatus === 429 ? 502 : 400, 'download_failed', `Image download failed: HTTP ${upstreamStatus} from ${host}.`);
  }
}

/** Downloads a remote image without letting a URL reach internal hosts (checked on every redirect hop). */
export async function fetchImage(ctx: Ctx, source: string): Promise<Uint8Array> {
  let url = new URL(source);
  for (let hop = 0; hop < 4; hop++) {
    const host = url.hostname.toLowerCase().replace(/\.$/, '');
    if (url.protocol !== 'https:' || (url.port && url.port !== '443') || url.username || url.password || host.startsWith('[') || /^\d{1,3}(\.\d{1,3}){3}$/.test(host) || !host.includes('.') || /(^|\.)(localhost|local|internal|lan)$/.test(host))
      throw invalid('Only public HTTPS image URLs can be imported.');
    const response = await ctx.fetch(url, { redirect: 'manual', headers: { Accept: 'image/*', 'User-Agent': 'cms-media-fetcher/1.0' }, signal: AbortSignal.timeout(20_000) });
    if (response.status >= 300 && response.status < 400 && response.headers.get('location')) { url = new URL(response.headers.get('location')!, url); continue; }
    if (!response.ok) throw new ImageDownloadError(response.status, host);
    if (Number(response.headers.get('content-length') || 0) > MAX_BYTES) throw invalid('Image is larger than 15 MB.');
    return new Uint8Array(await response.arrayBuffer());
  }
  throw invalid('Too many redirects while downloading the image.');
}

export interface IngestInput {
  bytes: Uint8Array; kind: 'hero' | 'inline' | 'upload'; context?: string; filename?: string;
  alt?: string; title?: string; franchise?: string; subjects?: string[];
  source: NonNullable<MediaAsset['source']>; rightsConfirmed?: boolean;
}
/**
 * The only way an image enters the library. An asset record is written, and success reported,
 * only after the file is in storage and readable back — never on the strength of the upload call alone.
 */
export async function ingestImage(ctx: Ctx, project: Project, input: IngestInput): Promise<{ asset: MediaAsset; reused: boolean }> {
  const { assets } = collections(ctx, project), m = project.media;
  if (!input.bytes.byteLength || input.bytes.byteLength > MAX_BYTES) throw invalid('Image must be between 1 byte and 15 MB.');
  const sourceMime = sniff(input.bytes);
  if (!sourceMime) throw invalid('File is not a JPEG, PNG, WebP, GIF or AVIF image.');
  const sha1 = await digest('SHA-1', input.bytes);
  const existing = await assets.findOne({ sha1 });
  if (existing && !existing.broken) {
    const fill = Object.fromEntries(Object.entries({ alt: input.alt, franchise: input.franchise, title: input.title }).filter(([k, v]) => v && !existing[k as 'alt']));
    if (Object.keys(fill).length) await assets.updateOne({ sha1 }, { $set: { ...fill, updatedAt: now() } });
    return { asset: { ...existing, ...fill }, reused: true };
  }
  const storage = ctx.storage(project);
  if (!storage) throw new CmsError(412, 'storage_unavailable', 'Media storage is not configured for this runtime (set R2 credentials or CMS_STORAGE=local).');

  const maxWidth = input.kind === 'hero' ? m.heroMaxWidth : m.inlineMaxWidth;
  let out: { bytes: Uint8Array; width: number; height: number; mimeType: string; ext: string };
  if (ctx.optimize && sourceMime !== 'image/gif') out = await ctx.optimize(input.bytes, { maxWidth, quality: m.quality });
  else {
    const size = probeSize(input.bytes, sourceMime);
    if (!size) throw invalid('Could not read the image dimensions.');
    out = { bytes: input.bytes, ...size, mimeType: sourceMime, ext: EXT[sourceMime] };
  }
  const minWidth = input.kind === 'hero' ? m.heroMinWidth : input.kind === 'inline' ? m.inlineMinWidth : 1;
  if (out.width < minWidth) throw invalid(`Image is ${out.width}px wide; ${input.kind} images need at least ${minWidth}px.`);

  const date = new Date(), name = slugify(input.context || input.filename?.replace(/\.[^.]*$/, '') || 'image').slice(0, 60) || 'image';
  // Deterministic key: a retried upload overwrites the same object instead of creating a second one.
  const key = `${m.keyPrefix}/${date.getUTCFullYear()}/${String(date.getUTCMonth() + 1).padStart(2, '0')}/${name}-${sha1.slice(0, 10)}-${out.width}x${out.height}.${out.ext}`;
  await storage.put(key, out.bytes, out.mimeType);
  const stored = await storage.head(key);
  if (!stored || stored.size !== out.bytes.byteLength) throw new CmsError(502, 'upload_unverified', `Upload of ${key} could not be verified in storage.`);
  const publicUrl = publicMediaUrl(ctx, project, key);
  await assertPublic(ctx, publicUrl);

  const at = now();
  const asset: MediaAsset = {
    sanityId: `image-${sha1}`, sha1, r2Key: key, publicUrl, filename: key.split('/').pop()!, originalFilename: input.filename, mimeType: out.mimeType,
    byteSize: out.bytes.byteLength, width: out.width, height: out.height, aspectRatio: out.width / out.height,
    alt: input.alt, title: input.title, franchise: input.franchise, subjects: input.subjects, source: input.source, rightsConfirmed: input.rightsConfirmed,
    approved: true, referenced: false, usedBy: [], projectId: project._id, r2VerifiedAt: at, createdAt: at, updatedAt: at,
  };
  if (existing) await assets.updateOne({ sha1 }, { $set: { ...asset, createdAt: existing.createdAt }, $unset: { broken: '' } });
  else await assets.insertOne(asset);
  await log(ctx, { projectId: project._id, type: 'media.uploaded', level: 'success', message: `Image uploaded: ${key} (${out.width}×${out.height}, ${Math.round(out.bytes.byteLength / 1024)} KB, ${input.source.provider})`, data: { key } });
  return { asset, reused: false };
}
async function assertPublic(ctx: Ctx, url: string) {
  let status = 0;
  for (let attempt = 0; attempt < 3; attempt++) {
    try { const r = await ctx.fetch(url, { method: 'HEAD', signal: AbortSignal.timeout(10_000) }); status = r.status; if (r.ok) return; } catch { status = 0; }
    await new Promise(resolve => setTimeout(resolve, 800 * (attempt + 1)));
  }
  throw new CmsError(502, 'upload_unverified', `Uploaded image is not publicly reachable at ${url} (HTTP ${status || 'no response'}).`);
}

export async function uploadMedia(ctx: Ctx, projectId: string, input: { bytes?: Uint8Array; url?: string; filename?: string; alt?: string; title?: string; franchise?: string; rightsConfirmed?: boolean; sourcePage?: string; license?: string }) {
  const project = await projectFor(ctx, projectId, 'media');
  if (input.rightsConfirmed !== true) throw invalid('Confirm that you have the right to publish this image (rightsConfirmed: true).');
  const bytes = input.bytes ?? (input.url ? await fetchImage(ctx, input.url) : null);
  if (!bytes) throw invalid('Provide image bytes or an HTTPS url.');
  const { asset, reused } = await ingestImage(ctx, project, {
    bytes, kind: 'upload', filename: input.filename, context: input.title || input.franchise, alt: input.alt, title: input.title, franchise: input.franchise, rightsConfirmed: true,
    source: { provider: input.url ? 'import' : 'upload', url: input.url, page: input.sourcePage, license: input.license || 'rights confirmed by uploader' },
  });
  return { ...asset, reused };
}

export async function listMedia(ctx: Ctx, projectId: string, query: { q?: string; franchise?: string; filter?: 'unused' | 'broken' | 'cms'; page?: number; limit?: number } = {}) {
  const project = await projectFor(ctx, projectId, 'read');
  const { assets } = collections(ctx, project);
  const filter: Filter<MediaAsset> = {};
  if (query.q?.trim()) { const rx = { $regex: escapeRegex(query.q.trim()), $options: 'i' }; filter.$or = [{ alt: rx }, { title: rx }, { franchise: rx }, { filename: rx }, { originalFilename: rx }, { subjects: rx }]; }
  if (query.franchise) filter.franchise = { $regex: `^${escapeRegex(query.franchise)}$`, $options: 'i' };
  if (query.filter === 'unused') filter.referenced = { $ne: true };
  if (query.filter === 'broken') filter.broken = true;
  if (query.filter === 'cms') filter.projectId = projectId;
  const page = Math.max(1, query.page || 1), limit = Math.min(100, query.limit || 40);
  const [items, total] = await Promise.all([
    assets.find(filter, { projection: { _id: 0, sourceMetadata: 0 } }).sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit).toArray(), assets.countDocuments(filter)]);
  return { items: items.map(a => ({ ...a, publicUrl: a.publicUrl || publicMediaUrl(ctx, project, a.r2Key) })), total, page, pages: Math.ceil(total / limit) };
}
export async function getMedia(ctx: Ctx, projectId: string, key: string) {
  const project = await projectFor(ctx, projectId, 'read');
  const c = collections(ctx, project);
  const asset = await c.assets.findOne({ $or: [{ r2Key: key }, { sanityId: key }] }, { projection: { _id: 0, sourceMetadata: 0 } });
  if (!asset) throw notFound('Media asset');
  const usedIn = await c.articles.find({ $or: [{ 'mainImage.asset.r2Key': asset.r2Key }, { 'body.asset.r2Key': asset.r2Key }] }, { projection: { sanityId: 1, title: 1, slug: 1 } }).limit(50).toArray();
  return { ...asset, usedIn: usedIn.map(a => ({ id: a.sanityId, title: a.title, slug: a.slug })) };
}
export async function updateMedia(ctx: Ctx, projectId: string, key: string, patch: { alt?: string; title?: string; franchise?: string; subjects?: string[]; approved?: boolean }) {
  const project = await projectFor(ctx, projectId, 'media');
  const set = Object.fromEntries(Object.entries(patch).filter(([k, v]) => ['alt', 'title', 'franchise', 'subjects', 'approved'].includes(k) && v !== undefined));
  const result = await collections(ctx, project).assets.findOneAndUpdate({ r2Key: key }, { $set: { ...set, updatedAt: now() } }, { returnDocument: 'after', projection: { _id: 0, sourceMetadata: 0 } });
  if (!result) throw notFound('Media asset');
  return result;
}
/** Reference tracking: which articles use which assets. */
export async function trackUsage(ctx: Ctx, project: Project, articleId: string, keys: string[]) {
  if (keys.length) await collections(ctx, project).assets.updateMany({ r2Key: { $in: keys } }, { $set: { referenced: true }, $addToSet: { usedBy: articleId } });
}
/** Broken media detection: confirms each file still exists in storage and flags the ones that do not. */
export async function verifyMedia(ctx: Ctx, projectId: string, keys?: string[], limit = 100) {
  const project = await projectFor(ctx, projectId, 'media');
  const storage = ctx.storage(project);
  if (!storage) throw new CmsError(412, 'storage_unavailable', 'Media storage is not configured for this runtime.');
  const { assets } = collections(ctx, project);
  const rows = await assets.find(keys?.length ? { r2Key: { $in: keys } } : {}, { projection: { r2Key: 1 } }).sort({ r2VerifiedAt: 1 }).limit(limit).toArray();
  const broken: string[] = [];
  for (const row of rows) {
    const ok = !!await storage.head(row.r2Key).catch(() => null);
    if (!ok) broken.push(row.r2Key);
    await assets.updateOne({ r2Key: row.r2Key }, ok ? { $set: { r2VerifiedAt: now() }, $unset: { broken: '' } } : { $set: { broken: true, updatedAt: now() } });
  }
  if (broken.length) await log(ctx, { projectId, type: 'media.broken', level: 'error', message: `${broken.length} media file${broken.length > 1 ? 's are' : ' is'} missing from storage`, data: { keys: broken } });
  return { checked: rows.length, broken };
}
