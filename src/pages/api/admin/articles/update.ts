import type { APIRoute } from 'astro';
import { env } from 'cloudflare:workers';
import { verifySession, unauthorized } from '../../../../lib/admin/auth';
import { checkWritesEnabled } from '../../../../lib/admin/write-guard';
import { withDatabase } from '../../../../lib/content/mongodb';
import type { ArticleDocument, ContentImage } from '../../../../lib/content/types';

export const POST: APIRoute = async ({ request }) => {
  // 1. Authentication check
  const user = await verifySession(request, env.ADMIN_JWT_SECRET);
  if (!user) return unauthorized();

  // 2. Write safety guard check
  const guard = checkWritesEnabled(env);
  if (guard) return guard;

  // 3. Payload validation
  try {
    const body = await request.json() as Partial<ArticleDocument> & { sanityId: string; mainImage?: ContentImage | null };
    if (!body.sanityId) {
      return new Response(JSON.stringify({ error: 'sanityId is required for update' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const updateFields: Record<string, unknown> = {
      updatedAt: new Date().toISOString(),
    };

    if (body.title !== undefined) updateFields.title = body.title;
    if (body.slug !== undefined) updateFields.slug = body.slug;
    if (body.excerpt !== undefined) updateFields.excerpt = body.excerpt;
    if (body.metaTitle !== undefined) updateFields.metaTitle = body.metaTitle;
    if (body.metaDescription !== undefined) updateFields.metaDescription = body.metaDescription;
    if (body.publicationState !== undefined) updateFields.publicationState = body.publicationState;
    if (body.publishedAt !== undefined) updateFields.publishedAt = body.publishedAt;
    if (body.authorSanityId !== undefined) updateFields.authorSanityId = body.authorSanityId;
    if (body.categorySanityIds !== undefined) updateFields.categorySanityIds = body.categorySanityIds;
    if (body.animeName !== undefined) updateFields.animeName = body.animeName;
    if (body.body !== undefined) updateFields.body = body.body;
    if (body.mainImage !== undefined) {
      const key = body.mainImage?.asset?.r2Key;
      if (body.mainImage !== null && (!key || key.startsWith('/') || key.includes('..'))) {
        return new Response(JSON.stringify({ error: 'Hero image must use a valid R2 storage key.' }), {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        });
      }
      updateFields.mainImage = body.mainImage;
    }

    const res = await withDatabase(env.MONGODB_URI, async db => {
      return db.collection('articles').updateOne(
        { sanityId: body.sanityId },
        { $set: updateFields }
      );
    });

    return new Response(JSON.stringify({ success: true, matchedCount: res.matchedCount, modifiedCount: res.modifiedCount }), {
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err: unknown) {
    return new Response(JSON.stringify({ error: (err as Error).message || 'Failed to update article' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};
