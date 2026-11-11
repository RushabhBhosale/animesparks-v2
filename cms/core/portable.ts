import type { PortableBlock } from './types';
import { escapeHtml, shortKey } from './util';

const STYLES = new Set(['normal', 'h1', 'h2', 'h3', 'h4', 'blockquote']);
const DECORATORS = new Set(['strong', 'em', 'code', 'underline', 'strike-through']);
const validKey = (key: unknown): key is string => typeof key === 'string' && key.length > 0 && key.length < 512 && !key.startsWith('/') && !key.includes('..') && !key.includes('\\');

/**
 * Normalises a body to exactly what the site renderer accepts (it throws on unknown blocks,
 * styles and marks, which would fail the whole site build). Returns problems instead of guessing.
 */
export function sanitizeBody(input: unknown, allowedTypes: string[] = ['block', 'image']): { body: PortableBlock[]; errors: string[] } {
  const errors: string[] = [];
  if (!Array.isArray(input)) return { body: [], errors: ['body must be an array of Portable Text blocks.'] };
  if (input.length > 800) return { body: [], errors: ['body has more than 800 blocks.'] };
  const body: PortableBlock[] = [];
  input.forEach((raw, index) => {
    if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return void errors.push(`Block ${index}: not an object.`);
    const block = { ...(raw as PortableBlock) };
    if (!allowedTypes.includes(block._type)) return void errors.push(`Block ${index}: type "${block._type}" is not supported by the site renderer.`);
    block._key ||= shortKey();
    if (block._type === 'image') {
      if (!validKey(block.asset?.r2Key)) return void errors.push(`Block ${index}: image has no valid storage key. Upload the image first.`);
      block.alt = typeof block.alt === 'string' ? block.alt : '';
      return void body.push(block);
    }
    if (block._type !== 'block') return void body.push(block);
    if (block.style && !STYLES.has(block.style)) return void errors.push(`Block ${index}: style "${block.style}" is not supported.`);
    if (block.listItem && !['bullet', 'number'].includes(block.listItem)) return void errors.push(`Block ${index}: list type "${block.listItem}" is not supported.`);
    block.style ||= 'normal';
    const defs = (Array.isArray(block.markDefs) ? block.markDefs : []).filter(d => d && d._type === 'link' && typeof d._key === 'string');
    const defKeys = new Set(defs.map(d => d._key));
    block.markDefs = defs;
    block.children = (Array.isArray(block.children) ? block.children : []).map(child => ({
      _type: 'span' as const, text: typeof child?.text === 'string' ? child.text : '',
      marks: (Array.isArray(child?.marks) ? child.marks : []).filter(m => DECORATORS.has(m) || defKeys.has(m)),
      ...((child as { _key?: string })?._key ? { _key: (child as { _key?: string })._key } : {}),
    }));
    body.push(block);
  });
  return { body, errors };
}

// ── Markdown → Portable Text (so assistants can draft in Markdown) ───────────
function inline(text: string): Pick<PortableBlock, 'children' | 'markDefs'> {
  const children: NonNullable<PortableBlock['children']> = [];
  const markDefs: NonNullable<PortableBlock['markDefs']> = [];
  const pattern = /(\*\*([^*]+)\*\*|__([^_]+)__|\*([^*\n]+)\*|_([^_\n]+)_|`([^`]+)`|\[([^\]]+)\]\(([^)\s]+)\))/g;
  let last = 0;
  const push = (t: string, marks: string[] = []) => { if (t) children.push({ _type: 'span', text: t, marks }); };
  for (const m of text.matchAll(pattern)) {
    push(text.slice(last, m.index));
    if (m[2] ?? m[3]) push(m[2] ?? m[3], ['strong']);
    else if (m[4] ?? m[5]) push(m[4] ?? m[5], ['em']);
    else if (m[6]) push(m[6], ['code']);
    else if (m[7] && /^(https?:\/\/|mailto:|\/)/.test(m[8])) { const key = shortKey(); markDefs.push({ _key: key, _type: 'link', href: m[8] }); push(m[7], [key]); }
    else push(m[0]);
    last = m.index! + m[0].length;
  }
  push(text.slice(last));
  if (!children.length) children.push({ _type: 'span', text: '', marks: [] });
  return { children, markDefs };
}
export function markdownToPortable(markdown: string): PortableBlock[] {
  const blocks: PortableBlock[] = [];
  const make = (text: string, extra: Partial<PortableBlock> = {}) => blocks.push({ _type: 'block', _key: shortKey(), style: 'normal', ...inline(text.trim()), ...extra });
  let paragraph: string[] = [];
  const flush = () => { if (paragraph.length) { make(paragraph.join(' ')); paragraph = []; } };
  for (const line of markdown.replace(/\r\n/g, '\n').split('\n')) {
    const heading = /^(#{1,4})\s+(.*)$/.exec(line), bullet = /^(\s*)[-*+]\s+(.*)$/.exec(line), numbered = /^(\s*)\d+[.)]\s+(.*)$/.exec(line), quote = /^>\s?(.*)$/.exec(line);
    if (!line.trim()) flush();
    else if (heading) { flush(); make(heading[2].replace(/\s+#+$/, ''), { style: heading[1].length === 1 ? 'h2' : `h${heading[1].length}` }); }
    else if (bullet) { flush(); make(bullet[2], { listItem: 'bullet', level: Math.floor(bullet[1].length / 2) + 1 }); }
    else if (numbered) { flush(); make(numbered[2], { listItem: 'number', level: Math.floor(numbered[1].length / 2) + 1 }); }
    else if (quote) { flush(); make(quote[1], { style: 'blockquote' }); }
    else if (/^(-{3,}|\*{3,})$/.test(line.trim())) flush();
    else paragraph.push(line.trim());
  }
  flush();
  return blocks;
}

// ── Preview renderer (mirrors src/lib/content/portable-text.ts without Astro assets) ──
export function renderHtml(blocks: PortableBlock[] = [], imageUrl: (key: string, block: PortableBlock) => string): string {
  const span = (block: PortableBlock) => (block.children || []).map(child => {
    let html = escapeHtml(child.text || '');
    for (const mark of child.marks || []) {
      if (mark === 'strong') html = `<strong>${html}</strong>`;
      else if (mark === 'em') html = `<em>${html}</em>`;
      else if (mark === 'code') html = `<code>${html}</code>`;
      else if (mark === 'underline') html = `<u>${html}</u>`;
      else if (mark === 'strike-through') html = `<s>${html}</s>`;
      else { const href = block.markDefs?.find(d => d._key === mark)?.href; if (href && /^(https?:|mailto:|\/)/.test(href)) html = `<a href="${escapeHtml(href)}">${html}</a>`; }
    }
    return html;
  }).join('');
  const lists: string[] = [];
  let html = '';
  const close = (to = 0) => { while (lists.length > to) html += `</li></${lists.pop()}>`; };
  for (const block of blocks) {
    if (block._type === 'block' && block.listItem) {
      const tag = block.listItem === 'number' ? 'ol' : 'ul', level = Math.max(1, Math.min(block.level || 1, lists.length + 1));
      close(level);
      if (lists.length === level && lists[level - 1] !== tag) close(level - 1);
      if (lists.length < level) { html += `<${tag}>`; lists.push(tag); } else html += '</li>';
      html += `<li>${span(block)}`;
      continue;
    }
    close();
    if (block._type === 'image') {
      const key = block.asset?.r2Key;
      if (key) html += `<figure><img src="${escapeHtml(block.asset?.publicUrl || imageUrl(key, block))}" alt="${escapeHtml(block.alt || '')}" loading="lazy">${block.caption ? `<figcaption>${escapeHtml(block.caption)}</figcaption>` : ''}</figure>`;
    } else if (block._type === 'block') {
      const style = block.style || 'normal', tag = style === 'normal' ? 'p' : style === 'h1' ? 'h2' : style;
      html += `<${tag}>${span(block)}</${tag}>`;
    }
  }
  close();
  return html;
}
