import type { Db } from 'mongodb';
import type { ArticleDocument, PortableBlock } from '../content/types';

const encoder = new TextEncoder();
const json = (data: unknown, status = 200) => new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' } });
const slugPattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const allowedFields = new Set(['sanityId','publicationState','language','slug','title','metaTitle','metaDescription','excerpt','publishedAt','updatedAt','sourceUpdatedAt','articleType','animeName','mainImage','body','authorSanityId','categorySanityIds','translationOfSanityId','tags','faq','sources','internalLinks']);

export function apiResponse(data: unknown, status = 200) { return json(data, status); }
export function validSlug(value: unknown): value is string { return typeof value === 'string' && value.length <= 180 && slugPattern.test(value); }
export function validateArticle(input: unknown, partial = false): { article?: Partial<ArticleDocument>; error?: string } {
  if (!input || typeof input !== 'object' || Array.isArray(input)) return { error: 'Expected an article object.' };
  const obj = input as Record<string, unknown>;
  const unknown = Object.keys(obj).filter(key => !allowedFields.has(key));
  if (unknown.length) return { error: `Unsupported article fields: ${unknown.join(', ')}` };
  if (!partial || obj.title !== undefined) if (typeof obj.title !== 'string' || !obj.title.trim() || obj.title.length > 180) return { error: 'title must be a non-empty string of at most 180 characters.' };
  if (!partial || obj.slug !== undefined) if (!validSlug(obj.slug)) return { error: 'slug must contain lowercase letters, digits and single hyphens only.' };
  if (!partial || obj.language !== undefined) if (obj.language !== 'en' && obj.language !== 'es') return { error: 'language must be en or es.' };
  if (!partial && (typeof obj.authorSanityId !== 'string' || !obj.authorSanityId.trim())) return { error: 'authorSanityId must reference an existing author.' };
  if (!partial && (!Array.isArray(obj.categorySanityIds) || obj.categorySanityIds.length === 0)) return { error: 'At least one existing category is required.' };
  if (obj.publicationState !== undefined && !['draft','published'].includes(String(obj.publicationState))) return { error: 'publicationState must be draft or published.' };
  if (obj.body !== undefined && (!Array.isArray(obj.body) || obj.body.length > 500 || !obj.body.every(isPortableBlock))) return { error: 'body must be an array of supported Portable Text blocks.' };
  if (obj.categorySanityIds !== undefined && !stringArray(obj.categorySanityIds, 30)) return { error: 'categorySanityIds must be an array of strings.' };
  if (obj.tags !== undefined && !stringArray(obj.tags, 50)) return { error: 'tags must be an array of strings.' };
  if (obj.metaTitle !== undefined && !shortString(obj.metaTitle, 180)) return { error: 'metaTitle is invalid.' };
  if (obj.metaDescription !== undefined && !shortString(obj.metaDescription, 320)) return { error: 'metaDescription is invalid.' };
  if (obj.excerpt !== undefined && !shortString(obj.excerpt, 1000)) return { error: 'excerpt is invalid.' };
  if (obj.publishedAt !== undefined && !validDate(obj.publishedAt)) return { error: 'publishedAt must be a valid ISO date.' };
  if (obj.mainImage !== undefined && obj.mainImage !== null && !validImage(obj.mainImage)) return { error: 'mainImage must reference an existing R2 key.' };
  if (obj.faq !== undefined && (!Array.isArray(obj.faq) || obj.faq.length > 30 || !obj.faq.every(row => row && typeof row.question === 'string' && typeof row.answer === 'string'))) return { error: 'faq must contain question and answer strings.' };
  if (obj.sources !== undefined && (!Array.isArray(obj.sources) || obj.sources.length > 50 || !obj.sources.every(row => row && typeof row.name === 'string' && safeHttpUrl(row.url)))) return { error: 'sources must contain named HTTPS URLs.' };
  return { article: obj as Partial<ArticleDocument> };
}
function isPortableBlock(value: unknown): value is PortableBlock {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
  const block = value as Record<string, unknown>;
  if (block._type === 'image') return typeof block.alt === 'string' && validImage({ asset: block.asset });
  if (block._type !== 'block' || (block.style !== undefined && !['normal','h1','h2','h3','h4','blockquote'].includes(String(block.style)))) return false;
  if (block.children !== undefined && (!Array.isArray(block.children) || !block.children.every(child => child && typeof child.text === 'string' && Array.isArray(child.marks || [])))) return false;
  return true;
}
function validImage(value: unknown): boolean {
  if (!value || typeof value !== 'object') return false;
  const image = value as { asset?: { r2Key?: unknown; publicUrl?: unknown } };
  const key = image.asset?.r2Key;
  return typeof key === 'string' && key.length < 512 && !key.startsWith('/') && !key.includes('..') && !key.includes('\\') && (!image.asset?.publicUrl || image.asset.publicUrl === `https://images.animesparks.blog/${key}`);
}
function stringArray(value: unknown, limit: number): value is string[] { return Array.isArray(value) && value.length <= limit && value.every(x => typeof x === 'string' && x.length <= 120); }
function shortString(value: unknown, max: number) { return typeof value === 'string' && value.length <= max; }
function validDate(value: unknown) { return typeof value === 'string' && Number.isFinite(Date.parse(value)); }
function safeHttpUrl(value: unknown) { try { return typeof value === 'string' && new URL(value).protocol === 'https:'; } catch { return false; } }
export function newArticleId() { return `as-${crypto.randomUUID()}`; }

export async function constantTimeSecretMatch(expected: string, supplied: string) {
  const [a,b] = await Promise.all([crypto.subtle.digest('SHA-256', encoder.encode(expected)), crypto.subtle.digest('SHA-256', encoder.encode(supplied))]);
  const aa = new Uint8Array(a), bb = new Uint8Array(b); let diff = 0;
  for (let i=0;i<aa.length;i++) diff |= aa[i] ^ bb[i];
  return diff === 0;
}
export async function authenticate(request: Request, key?: string) {
  if (!key || key.length < 32) return false;
  const header = request.headers.get('authorization') || '';
  const match = /^Bearer ([^\s]+)$/.exec(header);
  return !!match && constantTimeSecretMatch(key, match[1]);
}
export async function applyRateLimit(db: Db, identity: string, now = new Date()) {
  const minute = Math.floor(now.getTime() / 60000);
  const key = `${identity}:${minute}`;
  const collection = db.collection('publishingRateLimits');
  await collection.deleteMany({ expiresAt: { $lte: now } });
  const doc = await collection.findOneAndUpdate({ _id: key as never }, { $inc: { count: 1 }, $setOnInsert: { expiresAt: new Date((minute + 15) * 60000) } }, { upsert: true, returnDocument: 'after' });
  const count = (doc as unknown as { count?: number } | null)?.count;
  return typeof count === 'number' && count <= 60;
}
export async function readJson(request: Request, maxBytes = 2_000_000): Promise<unknown> {
  const size = Number(request.headers.get('content-length') || 0);
  if (size > maxBytes) throw new Error('Request body is too large.');
  const raw = await request.text();
  if (new TextEncoder().encode(raw).byteLength > maxBytes) throw new Error('Request body is too large.');
  return JSON.parse(raw);
}
export async function audit(db: Db, event: Record<string, unknown>) {
  await db.collection('publishingAudit').insertOne({ ...event, createdAt: new Date().toISOString() });
}
export function escapeRegex(value: string) { return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); }
