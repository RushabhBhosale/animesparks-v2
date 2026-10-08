import type { APIRoute } from 'astro';
import { env } from 'cloudflare:workers';
import { authenticate, applyRateLimit, audit, apiResponse } from '../../../lib/publishing/api';
import { withDatabase } from '../../../lib/content/mongodb';
const types: Record<string, string> = { 'image/jpeg':'jpg', 'image/png':'png', 'image/webp':'webp', 'image/avif':'avif', 'image/gif':'gif' };
export const POST: APIRoute = async ({ request }) => {
  if (!await authenticate(request, env.PUBLISHING_API_KEY)) return apiResponse({ error:'Unauthorized' },401);
  if (env.PUBLISHING_WRITES_ENABLED !== 'true') return apiResponse({ error:'Publishing writes are disabled.' },403);
  if (!env.IMAGES_BUCKET) return apiResponse({ error:'R2 storage unavailable.' },503);
  try {
    const contentLength = Number(request.headers.get('content-length') || 0);
    if (contentLength > 10_500_000) return apiResponse({ error:'Image exceeds 10 MB.' },413);
    return await withDatabase(env.MONGODB_URI, async db => {
      if (!await applyRateLimit(db, 'publishing-media')) return apiResponse({ error:'Rate limit exceeded.' },429);
      const form = await request.formData(); const file = form.get('file');
      if (form.get('rightsConfirmed') !== 'true') return apiResponse({ error:'Confirm that you have permission to publish this image.' },400);
      if (!(file instanceof File) || !types[file.type] || !file.size || file.size > 10_000_000) return apiResponse({ error:'Upload a JPEG, PNG, WebP, AVIF or GIF up to 10 MB.' },400);
      const key = `uploads/${Date.now()}-${crypto.randomUUID()}.${types[file.type]}`;
      await env.IMAGES_BUCKET!.put(key, await file.arrayBuffer(), { httpMetadata:{contentType:file.type} });
      await audit(db,{action:'media.upload',key,mimeType:file.type,size:file.size,actor:'publishing-api'});
      return apiResponse({ key, publicUrl:`https://images.animesparks.blog/${key}`, size:file.size },201);
    });
  } catch { return apiResponse({ error:'Image upload failed.' },503); }
};
