import type { APIRoute } from 'astro';
import { env } from 'cloudflare:workers';
import { verifySession, unauthorized } from '../../../../lib/admin/auth';
import { withDatabase } from '../../../../lib/content/mongodb';
import type { ArticleDocument } from '../../../../lib/content/types';

export const GET: APIRoute = async ({ request }) => {
  const user = await verifySession(request, env.ADMIN_JWT_SECRET);
  if (!user) return unauthorized();

  const url = new URL(request.url);
  const cursor = url.searchParams.get('cursor') || undefined;
  const prefix = url.searchParams.get('prefix') || undefined;
  const limit = parseInt(url.searchParams.get('limit') || '36', 10);

  // If native R2 bucket is bound
  if (env.IMAGES_BUCKET && typeof env.IMAGES_BUCKET.list === 'function') {
    try {
      const listRes = await env.IMAGES_BUCKET.list({ limit, cursor, prefix });
      const objects = listRes.objects.map((obj: { key: string; size: number; uploaded: Date }) => ({
        key: obj.key,
        size: obj.size,
        uploaded: obj.uploaded,
        publicUrl: `https://images.animesparks.blog/${obj.key.split('/').map(encodeURIComponent).join('/')}`,
      }));

      return new Response(JSON.stringify({
        objects,
        truncated: listRes.truncated,
        cursor: listRes.cursor,
      }), {
        headers: { 'Content-Type': 'application/json' },
      });
    } catch (err: unknown) {
      console.error('R2 list failed:', err);
    }
  }

  // Fallback: list known image assets referenced in MongoDB
  const mongoAssets = await withDatabase(env.MONGODB_URI, async db => {
    return db.collection<ArticleDocument>('articles').aggregate([
      { $match: { 'mainImage.asset.r2Key': { $exists: true, $ne: null } } },
      { $project: { _id: 0, key: '$mainImage.asset.r2Key' } },
      { $limit: limit },
    ]).toArray();
  });

  const objects = mongoAssets.map(doc => ({
    key: doc.key as string,
    publicUrl: `https://images.animesparks.blog/${(doc.key as string).split('/').map(encodeURIComponent).join('/')}`,
  }));

  return new Response(JSON.stringify({
    objects,
    truncated: false,
  }), {
    headers: { 'Content-Type': 'application/json' },
  });
};
