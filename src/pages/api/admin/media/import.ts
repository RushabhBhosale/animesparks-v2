import type { APIRoute } from 'astro';
import { env } from 'cloudflare:workers';
import { verifySession, unauthorized } from '../../../../lib/admin/auth';
import { checkWritesEnabled } from '../../../../lib/admin/write-guard';

const IMAGE_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/avif', 'image/gif']);
const EXTENSIONS: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'image/avif': 'avif',
  'image/gif': 'gif',
};
const MAX_FILE_SIZE = 10 * 1024 * 1024;
const json = (body: Record<string, unknown>, status = 200) => new Response(JSON.stringify(body), {
  status,
  headers: { 'Content-Type': 'application/json' },
});

export const POST: APIRoute = async ({ request }) => {
  const user = await verifySession(request, env.ADMIN_JWT_SECRET);
  if (!user) return unauthorized();
  const guard = checkWritesEnabled(env);
  if (guard) return guard;
  if (!env.IMAGES_BUCKET) return json({ error: 'R2 image storage is unavailable.' }, 503);

  try {
    const { url: source } = await request.json() as { url?: string };
    if (!source || source.length > 2048) return json({ error: 'A valid image URL is required.' }, 400);

    const url = new URL(source);
    const host = url.hostname.toLowerCase().replace(/\.$/, '');
    const isIpAddress = host.startsWith('[') || /^\d{1,3}(?:\.\d{1,3}){3}$/.test(host) || host.includes(':');
    if (
      url.protocol !== 'https:' ||
      (url.port && url.port !== '443') ||
      url.username || url.password ||
      isIpAddress || !host.includes('.') ||
      host === 'localhost' || host.endsWith('.localhost') || host.endsWith('.local') || host.endsWith('.internal')
    ) {
      return json({ error: 'Only public HTTPS image URLs can be imported.' }, 400);
    }

    const response = await fetch(url, { redirect: 'manual', headers: { Accept: 'image/*' } });
    if (!response.ok) return json({ error: 'The source image could not be downloaded.' }, 400);

    const contentType = (response.headers.get('content-type') || '').split(';')[0].trim().toLowerCase();
    if (!IMAGE_TYPES.has(contentType)) return json({ error: 'The source must be a JPG, PNG, WebP, AVIF or GIF image.' }, 415);

    const declaredSize = Number(response.headers.get('content-length') || 0);
    if (declaredSize > MAX_FILE_SIZE) return json({ error: 'Images must be 10 MB or smaller.' }, 413);
    const bytes = await response.arrayBuffer();
    if (!bytes.byteLength || bytes.byteLength > MAX_FILE_SIZE) return json({ error: 'Images must be between 1 byte and 10 MB.' }, 413);

    const leafName = decodeURIComponent(url.pathname.split('/').pop() || 'pasted-image')
      .toLowerCase()
      .replace(/[^a-z0-9.-]/g, '-')
      .replace(/\.[^.]*$/, '')
      .slice(-70) || 'pasted-image';
    const key = `uploads/${Date.now()}-${crypto.randomUUID()}-${leafName}.${EXTENSIONS[contentType]}`;
    await env.IMAGES_BUCKET.put(key, bytes, {
      httpMetadata: { contentType },
      customMetadata: { uploadedBy: user, sourceHost: host },
    });

    return json({
      success: true,
      key,
      publicUrl: `https://images.animesparks.blog/${key}`,
      size: bytes.byteLength,
      type: contentType,
    }, 201);
  } catch (error) {
    if (error instanceof SyntaxError || error instanceof TypeError) return json({ error: 'A valid HTTPS image URL is required.' }, 400);
    console.error('Admin remote image import failed');
    return json({ error: 'Could not import the image. Please try again.' }, 502);
  }
};
