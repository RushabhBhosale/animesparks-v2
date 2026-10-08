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
    const body = await request.json() as Partial<CategoryDocument> & { sanityId: string };
    if (!body.sanityId) {
      return new Response(JSON.stringify({ error: 'sanityId is required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const updateFields: Record<string, unknown> = {};
    if (body.title) updateFields.title = body.title;
    if (body.slug) updateFields.slug = body.slug;
    if (body.description !== undefined) updateFields.description = body.description;

    const res = await withDatabase(env.MONGODB_URI, db =>
      db.collection('categories').updateOne({ sanityId: body.sanityId }, { $set: updateFields })
    );

    return new Response(JSON.stringify({ success: true, modifiedCount: res.modifiedCount }), {
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err: unknown) {
    return new Response(JSON.stringify({ error: (err as Error).message || 'Failed to update category' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};
