import type { APIRoute } from 'astro';
import { env } from 'cloudflare:workers';
import { verifySession, unauthorized } from '../../../../lib/admin/auth';
import { withDatabase } from '../../../../lib/content/mongodb';
import { getAdminAnimeEntries } from '../../../../lib/admin/db';

export const GET: APIRoute = async ({ request }) => {
  const user = await verifySession(request, env.ADMIN_JWT_SECRET);
  if (!user) return unauthorized();

  const url = new URL(request.url);
  const q = url.searchParams.get('q') || undefined;

  const entries = await withDatabase(env.MONGODB_URI, db => getAdminAnimeEntries(db, q));
  return new Response(JSON.stringify(entries), {
    headers: { 'Content-Type': 'application/json' },
  });
};
