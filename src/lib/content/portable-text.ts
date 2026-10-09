import type { PortableBlock, PortableSpan } from './types';
import { r2ImageDimensions, r2ImageUrl } from './images';
import { inferRemoteSize } from 'astro/assets/utils';

interface ImageDimensions { width: number; height: number }
const remoteDimensions = new Map<string, Promise<ImageDimensions>>();

async function dimensionsForImage(src: string, block: PortableBlock): Promise<ImageDimensions> {
  const known = r2ImageDimensions(block);
  if (known) return known;

  const url = new URL(src);
  if (url.hostname !== 'images.animesparks.blog') throw new Error(`Unexpected article image host: ${url.hostname}`);
  let dimensions = remoteDimensions.get(src);
  if (!dimensions) {
    dimensions = inferRemoteSize(src).then(({ width, height }) => {
      if (!Number.isFinite(width) || !Number.isFinite(height) || width <= 0 || height <= 0) {
        throw new Error('Remote image returned invalid intrinsic dimensions.');
      }
      return { width, height };
    }).catch(error => {
      remoteDimensions.delete(src);
      throw new Error(`Could not determine dimensions for article image ${src}: ${String(error)}`);
    });
    remoteDimensions.set(src, dimensions);
  }
  return dimensions;
}

const escapeHtml = (value: string) => value.replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]!));
const safeHref = (href?: string) => {
  if (!href) return undefined;
  try {
    const url = new URL(href, 'https://www.animesparks.blog');
    if (!['http:', 'https:', 'mailto:'].includes(url.protocol)) return undefined;
    if (['www.animesparks.blog', 'animesparks.blog'].includes(url.hostname) && url.pathname.startsWith('/blog/')) return `${url.pathname}${url.search}${url.hash}`;
    return href;
  } catch { return undefined; }
};
const slugify = (text: string) => text.normalize('NFKD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-+$/g, '') || 'section';
export const blockText = (block: PortableBlock) => (block.children || []).map(child => child.text || '').join('');
const renderSpan = (span: PortableSpan, block: PortableBlock) => {
  let html = escapeHtml(span.text || '');
  for (const mark of span.marks || []) {
    if (mark === 'strong') html = `<strong>${html}</strong>`;
    else if (mark === 'em') html = `<em>${html}</em>`;
    else if (mark === 'code') html = `<code>${html}</code>`;
    else if (mark === 'underline') html = `<u>${html}</u>`;
    else if (mark === 'strike-through') html = `<s>${html}</s>`;
    else {
      const def = block.markDefs?.find(item => item._key === mark);
      if (!def || def._type !== 'link') throw new Error(`Unsupported Portable Text mark: ${mark}`);
      const href = safeHref(def?.href);
      if (href) html = `<a href="${escapeHtml(href)}"${href.startsWith('http') && !href.startsWith('https://www.animesparks.blog') ? ' rel="noopener noreferrer"' : ''}>${html}</a>`;
    }
  }
  return html;
};
const renderBlock = (block: PortableBlock, headingIds: Map<string, number>, imageSizes: Map<string, ImageDimensions>) => {
  if (block._type === 'image') {
    const src = r2ImageUrl(block);
    if (!src) return '';
    const dimensions = imageSizes.get(src);
    if (!dimensions) throw new Error(`Missing intrinsic dimensions for article image ${src}`);
    const alt = escapeHtml(block.alt || '');
    const caption = escapeHtml(block.caption || block.alt || '');
    return `<figure><img src="${escapeHtml(src)}" alt="${alt}" width="${dimensions.width}" height="${dimensions.height}" loading="lazy" decoding="async">${caption ? `<figcaption>${caption}</figcaption>` : ''}</figure>`;
  }
  if (block._type !== 'block') throw new Error(`Unsupported Portable Text block: ${block._type}`);
  const content = (block.children || []).map(child => renderSpan(child, block)).join('');
  if (block.listItem) return `<li>${content}`;
  const style = block.style || 'normal';
  if (['h1', 'h2', 'h3', 'h4'].includes(style)) {
    const tag = style === 'h1' ? 'h2' : style;
    const base = slugify(blockText(block));
    const count = (headingIds.get(base) || 0) + 1;
    headingIds.set(base, count);
    return `<${tag} id="${base}${count > 1 ? `-${count}` : ''}">${content}</${tag}>`;
  }
  if (style === 'blockquote') return `<blockquote>${content}</blockquote>`;
  if (style !== 'normal') throw new Error(`Unsupported Portable Text style: ${style}`);
  return `<p>${content}</p>`;
};
export async function renderPortableText(blocks: PortableBlock[] = [], adMarkersAfterBlock: Map<number, string> = new Map()): Promise<string> {
  const imageSizes = new Map<string, ImageDimensions>();
  await Promise.all(blocks.filter(block => block._type === 'image').map(async block => {
    const src = r2ImageUrl(block);
    if (src && !imageSizes.has(src)) imageSizes.set(src, await dimensionsForImage(src, block));
  }));
  const headingIds = new Map<string, number>();
  const listTags: string[] = [];
  let html = '';
  for (const [index, block] of blocks.entries()) {
    const nextTag = block.listItem ? (block.listItem === 'number' ? 'ol' : 'ul') : '';
    if (block.listItem && !['bullet', 'number'].includes(block.listItem)) throw new Error(`Unsupported Portable Text list: ${block.listItem}`);
    if (!nextTag) {
      while (listTags.length) html += `</li></${listTags.pop()}>`;
      html += renderBlock(block, headingIds, imageSizes);
    } else {
      const level = Math.max(1, Math.min(block.level || 1, listTags.length + 1));
      while (listTags.length > level) html += `</li></${listTags.pop()}>`;
      if (listTags.length === level && listTags[level - 1] !== nextTag) html += `</li></${listTags.pop()}>`;
      if (listTags.length < level) {
        html += `<${nextTag}>`;
        listTags.push(nextTag);
      } else html += '</li>';
      html += renderBlock(block, headingIds, imageSizes);
    }
    const adSlot = adMarkersAfterBlock.get(index);
    if (adSlot) html += `<!--AS_AD_SLOT:${adSlot}-->`;
  }
  while (listTags.length) html += `</li></${listTags.pop()}>`;
  return html;
}
export function tableOfContents(blocks: PortableBlock[] = []) {
  const counts = new Map<string, number>();
  return blocks.filter(b => b._type === 'block' && (b.style === 'h2' || b.style === 'h1')).map(b => {
    const title = blockText(b);
    const base = slugify(title);
    const count = (counts.get(base) || 0) + 1;
    counts.set(base, count);
    return { title, id: `${base}${count > 1 ? `-${count}` : ''}` };
  });
}
