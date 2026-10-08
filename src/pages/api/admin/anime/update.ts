import type { APIRoute } from 'astro';
import { env } from 'cloudflare:workers';
import { verifySession, unauthorized } from '../../../../lib/admin/auth';
import { checkWritesEnabled } from '../../../../lib/admin/write-guard';
import { withDatabase } from '../../../../lib/content/mongodb';
import type { AnimeEntryDocument } from '../../../../lib/content/types';

export const POST: APIRoute = async ({ request }) => {
  const user = await verifySession(request, env.ADMIN_JWT_SECRET);
  if (!user) return unauthorized();

  const guard = checkWritesEnabled(env);
  if (guard) return guard;

  try {
    const body = await request.json() as Partial<AnimeEntryDocument> & { sanityId: string };
    if (!body.sanityId) {
      return new Response(JSON.stringify({ error: 'sanityId is required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const updateFields: Record<string, unknown> = {};
    if (body.title !== undefined) updateFields.title = body.title;
    if (body.score !== undefined) updateFields.score = body.score;
    if (body.year !== undefined) updateFields.year = body.year;
    if (body.genres !== undefined) updateFields.genres = body.genres;
    if (body.coverImage !== undefined) updateFields.coverImage = body.coverImage;
    if (body.bannerImage !== undefined) updateFields.bannerImage = body.bannerImage;

    const res = await withDatabase(env.MONGODB_URI, db =>
      db.collection('animeEntries').updateOne({ sanityId: body.sanityId }, { $set: updateFields })
    );

    return new Response(JSON.stringify({ success: true, modifiedCount: res.modifiedCount }), {
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err: unknown) {
    return new Response(JSON.stringify({ error: (err as Error).message || 'Failed to update anime entry' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};
