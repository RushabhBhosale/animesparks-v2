import type { APIRoute } from 'astro';
import { env } from 'cloudflare:workers';
import { verifySession, unauthorized } from '../../../../lib/admin/auth';
import { checkWritesEnabled } from '../../../../lib/admin/write-guard';
import { withDatabase } from '../../../../lib/content/mongodb';

export const POST: APIRoute = async ({ request }) => {
  const user = await verifySession(request, env.ADMIN_JWT_SECRET);
  if (!user) return unauthorized();

  const guard = checkWritesEnabled(env);
  if (guard) return guard;

  try {
    const { sanityId, publish = true } = await request.json() as { sanityId: string; publish?: boolean };
    if (!sanityId) {
      return new Response(JSON.stringify({ error: 'sanityId is required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const nextState = publish ? 'published' : 'draft';
    const res = await withDatabase(env.MONGODB_URI, async db => {
      return db.collection('articles').updateOne(
        { sanityId },
        {
          $set: {
            publicationState: nextState,
            updatedAt: new Date().toISOString(),
          },
        }
      );
    });

    return new Response(JSON.stringify({ success: true, publicationState: nextState, modifiedCount: res.modifiedCount }), {
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err: unknown) {
    return new Response(JSON.stringify({ error: (err as Error).message || 'Failed to toggle publication status' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};
