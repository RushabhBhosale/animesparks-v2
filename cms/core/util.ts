import type { Ctx, Project, PortableBlock, Article } from './types';

export const now = () => new Date().toISOString();
export const uid = (prefix = '') => `${prefix}${crypto.randomUUID()}`;
export const shortKey = () => crypto.randomUUID().replace(/-/g, '').slice(0, 12);

export const slugify = (text: string) => text.normalize('NFKD').replace(/[̀-ͯ]/g, '').toLowerCase()
  .replace(/['’]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 120).replace(/-+$/, '');
export const validSlug = (value: unknown): value is string => typeof value === 'string' && value.length <= 180 && /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(value);
export const escapeRegex = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
export const escapeHtml = (value: string) => value.replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]!));

const hex = (buf: ArrayBuffer) => Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('');
export async function digest(algo: 'SHA-1' | 'SHA-256', data: string | Uint8Array) {
  const bytes = typeof data === 'string' ? new TextEncoder().encode(data) : data;
  return hex(await crypto.subtle.digest(algo, bytes as BufferSource));
}
export async function safeEqual(a: string, b: string) {
  const [x, y] = await Promise.all([digest('SHA-256', a), digest('SHA-256', b)]);
  let diff = 0;
  for (let i = 0; i < x.length; i++) diff |= x.charCodeAt(i) ^ y.charCodeAt(i);
  return diff === 0;
}

const stable = (value: unknown): string => {
  if (Array.isArray(value)) return `[${value.map(stable).join(',')}]`;
  if (value && typeof value === 'object') return `{${Object.keys(value).sort().map(k => `${JSON.stringify(k)}:${stable((value as Record<string, unknown>)[k])}`).join(',')}}`;
  return JSON.stringify(value ?? null);
};
const HASHED = ['title', 'slug', 'excerpt', 'body', 'mainImage', 'authorSanityId', 'categorySanityIds', 'tags', 'metaTitle', 'metaDescription', 'language', 'animeName', 'articleType', 'translationOfSanityId'];
/** Fingerprint of the editorial content. Unchanged content is never re-processed. */
export const contentHash = (article: Partial<Article>) => digest('SHA-256', stable(Object.fromEntries(HASHED.map(k => [k, article[k]]))));

export const blockText = (block: PortableBlock) => (block.children || []).map(c => c.text || '').join('');
export const bodyText = (body: PortableBlock[] = []) => body.filter(b => b._type === 'block').map(blockText).join('\n');
export const wordCount = (text: string) => (text.trim().match(/\S+/g) || []).length;
export function truncate(text: string, max: number) {
  const clean = text.replace(/\s+/g, ' ').trim();
  if (clean.length <= max) return clean;
  const sentence = clean.slice(0, max + 1).match(/^.*[.!?](?=\s|$)/)?.[0];
  if (sentence && sentence.length >= max * 0.6) return sentence;
  return clean.slice(0, max - 1).replace(/\s+\S*$/, '').replace(/[,;:\-–]$/, '') + '…';
}

export function articleUrl(project: Project, article: Pick<Article, 'slug' | 'language'>) {
  const pattern = (article.language && project.urls.byLanguage?.[article.language]) || project.urls.article;
  return project.siteUrl.replace(/\/$/, '') + pattern.replace('{slug}', article.slug);
}
export function publicMediaUrl(ctx: Ctx, project: Project, key: string) {
  const base = (ctx.storage(project)?.publicBase || project.media.publicBaseUrl).replace(/\/$/, '');
  return `${base}/${key.split('/').map(encodeURIComponent).join('/')}`;
}

// ── Time zones ───────────────────────────────────────────────────────────────
function tzOffsetMs(at: number, timeZone: string) {
  const parts = new Intl.DateTimeFormat('en-US', { timeZone, hourCycle: 'h23', year: 'numeric', month: 'numeric', day: 'numeric', hour: 'numeric', minute: 'numeric', second: 'numeric' }).formatToParts(new Date(at));
  const p = Object.fromEntries(parts.map(x => [x.type, Number(x.value)]));
  return Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute, p.second) - Math.floor(at / 1000) * 1000;
}
export function validTimeZone(timeZone: string) { try { new Intl.DateTimeFormat('en-US', { timeZone }); return true; } catch { return false; } }
/** Wall-clock time in `timeZone` → UTC epoch ms. */
export function zonedToUtc(y: number, m: number, d: number, h: number, min: number, timeZone: string) {
  const guess = Date.UTC(y, m - 1, d, h, min);
  const first = guess - tzOffsetMs(guess, timeZone);
  return guess - tzOffsetMs(first, timeZone);
}
/** Next free publishing slot (project-local `HH:MM` slots) after `after`, skipping taken times. */
export function nextSlot(project: Project, taken: string[], after = Date.now()) {
  const tz = project.timezone;
  const slots = (project.publishing.slots.length ? project.publishing.slots : ['09:00']).map(s => s.split(':').map(Number)).sort((a, b) => a[0] * 60 + a[1] - (b[0] * 60 + b[1]));
  const earliest = after + project.publishing.minLeadMinutes * 60000;
  const used = new Set(taken.map(t => Math.floor(Date.parse(t) / 60000)));
  const local = new Date(earliest + tzOffsetMs(earliest, tz));
  for (let day = 0; day < 60; day++) {
    const base = new Date(Date.UTC(local.getUTCFullYear(), local.getUTCMonth(), local.getUTCDate() + day));
    for (const [h, min] of slots) {
      const at = zonedToUtc(base.getUTCFullYear(), base.getUTCMonth() + 1, base.getUTCDate(), h, min, tz);
      if (at >= earliest && !used.has(Math.floor(at / 60000))) return new Date(at).toISOString();
    }
  }
  throw new Error('No free publishing slot in the next 60 days.');
}
