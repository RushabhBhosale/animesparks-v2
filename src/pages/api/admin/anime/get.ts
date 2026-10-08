import type { APIRoute } from 'astro';
import { env } from 'cloudflare:workers';
import { verifySession, unauthorized } from '../../../../lib/admin/auth';
import { withDatabase } from '../../../../lib/content/mongodb';
import type { AnimeEntryDocument } from '../../../../lib/content/types';

export const GET: APIRoute = async ({ request }) => {
  const user = await verifySession(request, env.ADMIN_JWT_SECRET);
  if (!user) return unauthorized();

  const url = new URL(request.url);
  const id = url.searchParams.get('id') || '';
  if (!id) {
    return new Response(JSON.stringify({ error: 'Missing anime id' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const entry = await withDatabase(env.MONGODB_URI, async db => {
    return db.collection<AnimeEntryDocument>('animeEntries').findOne(
      { sanityId: id },
      { projection: { _id: 0 } }
    );
  });

  if (!entry) {
    return new Response(JSON.stringify({ error: 'Anime entry not found' }), {
      status: 404,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  return new Response(JSON.stringify(entry), {
    headers: { 'Content-Type': 'application/json' },
  });
};
