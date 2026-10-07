import type { PortableBlock, PortableSpan } from './types';
import { r2ImageUrl } from './images';

const escapeHtml = (value: string) => value.replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]!));
const safeHref = (href?: string) => {
  if (!href) return undefined;
  try {
    const url = new URL(href, 'https://www.animesparks.blog');
    if (!['http:', 'https:', 'mailto:'].includes(url.protocol)) return undefined;
    if (url.hostname === 'www.animesparks.blog' && url.pathname.startsWith('/blog/')) return `${url.pathname}${url.search}${url.hash}`;
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
      const href = safeHref(def?.href);
      if (href) html = `<a href="${escapeHtml(href)}"${href.startsWith('http') && !href.startsWith('https://www.animesparks.blog') ? ' rel="noopener noreferrer"' : ''}>${html}</a>`;
    }
  }
  return html;
};
const renderBlock = (block: PortableBlock, headingIds: Map<string, number>) => {
  if (block._type === 'image') {
    const src = r2ImageUrl(block);
    if (!src) return '';
    const alt = escapeHtml(block.alt || '');
    return `<figure><img src="${escapeHtml(src)}" alt="${alt}" loading="lazy" decoding="async"><figcaption>${alt}</figcaption></figure>`;
  }
  if (block._type !== 'block') return '';
  const content = (block.children || []).map(child => renderSpan(child, block)).join('');
  if (block.listItem) return `<li>${content}</li>`;
  const style = block.style || 'normal';
  if (['h1', 'h2', 'h3', 'h4'].includes(style)) {
    const tag = style === 'h1' ? 'h2' : style;
    const base = slugify(blockText(block));
    const count = (headingIds.get(base) || 0) + 1;
    headingIds.set(base, count);
    return `<${tag} id="${base}${count > 1 ? `-${count}` : ''}">${content}</${tag}>`;
  }
  if (style === 'blockquote') return `<blockquote>${content}</blockquote>`;
  return `<p>${content}</p>`;
};
export function renderPortableText(blocks: PortableBlock[] = []): string {
  const headingIds = new Map<string, number>();
  let listTag = '';
  let html = '';
  for (const block of blocks) {
    const nextTag = block.listItem ? (block.listItem === 'number' ? 'ol' : 'ul') : '';
    if (listTag !== nextTag) {
      if (listTag) html += `</${listTag}>`;
      if (nextTag) html += `<${nextTag}>`;
      listTag = nextTag;
    }
    html += renderBlock(block, headingIds);
  }
  if (listTag) html += `</${listTag}>`;
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
