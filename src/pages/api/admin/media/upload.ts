import type { APIRoute } from 'astro';
import { env } from 'cloudflare:workers';
import { verifySession, unauthorized } from '../../../../lib/admin/auth';
import { checkWritesEnabled } from '../../../../lib/admin/write-guard';

const ALLOWED_MIME_TYPES = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/avif',
  'image/gif',
]);

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB
const FILE_EXTENSION_BY_TYPE: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'image/avif': 'avif',
  'image/gif': 'gif',
};

export const POST: APIRoute = async ({ request }) => {
  // 1. Authenticated admin check
  const user = await verifySession(request, env.ADMIN_JWT_SECRET);
  if (!user) return unauthorized();

  // 2. Write safety guard check (ADMIN_WRITES_ENABLED=false rejects here)
  const guard = checkWritesEnabled(env);
  if (guard) return guard;

  // 3. Bucket availability check
  if (!env.IMAGES_BUCKET) {
    return new Response(JSON.stringify({ error: 'R2 IMAGES_BUCKET binding not configured' }), {
      status: 503,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  try {
    const formData = await request.formData();
    const fileValue = formData.get('file');
    if (!(fileValue instanceof File)) {
      return new Response(JSON.stringify({ error: 'No file provided in form data' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }
    const file = fileValue;

    if (!ALLOWED_MIME_TYPES.has(file.type)) {
      return new Response(JSON.stringify({ error: `Unsupported image type: ${file.type}` }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    if (file.size === 0) {
      return new Response(JSON.stringify({ error: 'The selected image is empty' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    if (file.size > MAX_FILE_SIZE) {
      return new Response(JSON.stringify({ error: 'File size exceeds 10MB limit' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Generate safe key
    const safeName = file.name
      .toLowerCase()
      .replace(/[^a-z0-9.-]/g, '-')
      .replace(/^-|-+$/g, '')
      .slice(-80);
    const extension = FILE_EXTENSION_BY_TYPE[file.type];
    const baseName = safeName.replace(/\.[^.]*$/, '').replace(/-+$/g, '') || 'image';
    const key = `uploads/${Date.now()}-${crypto.randomUUID()}-${baseName}.${extension}`;

    const arrayBuffer = await file.arrayBuffer();
    await env.IMAGES_BUCKET.put(key, arrayBuffer, {
      httpMetadata: {
        contentType: file.type,
        cacheControl: 'public, max-age=31536000, immutable',
      },
      customMetadata: { uploadedBy: user },
    });

    const publicUrl = `https://images.animesparks.blog/${key}`;
    return new Response(JSON.stringify({
      success: true,
      key,
      publicUrl,
      size: file.size,
      type: file.type,
    }), {
      status: 201,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err: unknown) {
      console.error('Admin R2 image upload failed');
      return new Response(JSON.stringify({ error: 'Failed to upload image. Please try again.' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};
