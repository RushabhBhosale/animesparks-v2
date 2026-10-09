import type { ContentImage, PortableBlock } from './types';
const BASE = 'https://images.animesparks.blog';
export function r2ImageUrl(image?: ContentImage | PortableBlock): string | undefined {
  const key = image?.asset?.r2Key;
  if (!key || key.startsWith('/') || key.includes('..')) return undefined;
  return `${BASE}/${key.split('/').map(encodeURIComponent).join('/')}`;
}

export function r2ImageDimensions(image?: ContentImage | PortableBlock): { width: number; height: number } | undefined {
  const key = image?.asset?.r2Key;
  if (!key?.startsWith('sanity/')) return undefined;
  const match = key.match(/-(\d{2,5})x(\d{2,5})\.[a-z0-9]+$/i);
  if (!match) return undefined;
  const width = Number(match[1]);
  const height = Number(match[2]);
  return width > 0 && height > 0 ? { width, height } : undefined;
}
