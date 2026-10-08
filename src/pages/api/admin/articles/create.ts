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
    const body = await request.json() as Partial<ArticleDocument> & { mainImage?: ContentImage | null };
    if (!body.title || !body.slug) {
      return new Response(JSON.stringify({ error: 'Title and slug are required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const mainImage = body.mainImage || undefined;
    const mainImageKey = mainImage?.asset?.r2Key;
    if (mainImage && (!mainImageKey || mainImageKey.startsWith('/') || mainImageKey.includes('..'))) {
      return new Response(JSON.stringify({ error: 'Hero image must use a valid R2 storage key.' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const doc: ArticleDocument = {
      sanityId: body.sanityId || `draft-${Date.now()}`,
      publicationState: body.publicationState || 'draft',
      language: body.language || 'en',
      slug: body.slug,
      title: body.title,
      metaTitle: body.metaTitle,
      metaDescription: body.metaDescription,
      excerpt: body.excerpt,
      publishedAt: body.publishedAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      categorySanityIds: body.categorySanityIds || [],
      authorSanityId: body.authorSanityId,
      animeName: body.animeName,
      mainImage,
      body: body.body || [],
    };

    const res = await withDatabase(env.MONGODB_URI, async db => {
      return db.collection('articles').insertOne(doc);
    });

    return new Response(JSON.stringify({ success: true, id: doc.sanityId, insertedId: res.insertedId }), {
      status: 201,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err: unknown) {
    return new Response(JSON.stringify({ error: (err as Error).message || 'Failed to create article' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};
