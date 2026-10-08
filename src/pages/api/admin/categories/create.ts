import type { APIRoute } from 'astro';
import { env } from 'cloudflare:workers';
import { verifySession, unauthorized } from '../../../../lib/admin/auth';
import { checkWritesEnabled } from '../../../../lib/admin/write-guard';
import { withDatabase } from '../../../../lib/content/mongodb';
import type { CategoryDocument } from '../../../../lib/content/types';

export const POST: APIRoute = async ({ request }) => {
  const user = await verifySession(request, env.ADMIN_JWT_SECRET);
  if (!user) return unauthorized();

  const guard = checkWritesEnabled(env);
  if (guard) return guard;

  try {
    const body = await request.json() as Partial<CategoryDocument>;
    if (!body.title || !body.slug) {
      return new Response(JSON.stringify({ error: 'Title and slug are required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const doc: CategoryDocument = {
      sanityId: body.sanityId || `cat-${Date.now()}`,
      title: body.title,
      slug: body.slug,
      description: body.description || '',
      publicationState: 'published',
    };

    const res = await withDatabase(env.MONGODB_URI, db => db.collection('categories').insertOne(doc));
    return new Response(JSON.stringify({ success: true, id: doc.sanityId, insertedId: res.insertedId }), {
      status: 201,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err: unknown) {
    return new Response(JSON.stringify({ error: (err as Error).message || 'Failed to create category' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};
