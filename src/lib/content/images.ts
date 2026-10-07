import type { ContentImage, PortableBlock } from './types';
const BASE = 'https://images.animesparks.blog';
export function r2ImageUrl(image?: ContentImage | PortableBlock): string | undefined {
  const key = image?.asset?.r2Key;
  if (!key || key.startsWith('/') || key.includes('..')) return undefined;
  return `${BASE}/${key.split('/').map(encodeURIComponent).join('/')}`;
}
