// Intrinsic sizes for article images, so every R2 image can go through the
// build-time optimiser (WebP + srcset). Keys migrated from Sanity usually carry
// "-WIDTHxHEIGHT" in their name; images uploaded in the admin do not, so their
// size is read once from the file header during the build. Failures return
// undefined and the caller falls back to the original file.

import { inferRemoteSize } from 'astro/assets/utils';
import type { ContentImage, PortableBlock } from './types';
import { r2ImageDimensions, r2ImageUrl } from './images';

export interface ImageDimensions { width: number; height: number }

const cache = new Map<string, Promise<ImageDimensions | undefined>>();

export function resolveImageDimensions(image?: ContentImage | PortableBlock): Promise<ImageDimensions | undefined> {
  const known = r2ImageDimensions(image);
  if (known) return Promise.resolve(known);
  const src = r2ImageUrl(image);
  if (!src) return Promise.resolve(undefined);
  let pending = cache.get(src);
  if (!pending) {
    pending = inferRemoteSize(src)
      .then(({ width, height }) => (width > 0 && height > 0 ? { width, height } : undefined))
      .catch(error => {
        console.warn(`[images] Could not read the size of ${src}; serving the original file: ${String(error)}`);
        return undefined;
      });
    cache.set(src, pending);
  }
  return pending;
}
