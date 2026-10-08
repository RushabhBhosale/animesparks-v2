import type { APIRoute } from 'astro';
import { env } from 'cloudflare:workers';
import { verifySession, unauthorized } from '../../../../lib/admin/auth';
import { withDatabase } from '../../../../lib/content/mongodb';
import { getAdminCategories } from '../../../../lib/admin/db';

export const GET: APIRoute = async ({ request }) => {
  const user = await verifySession(request, env.ADMIN_JWT_SECRET);
  if (!user) return unauthorized();

  const categories = await withDatabase(env.MONGODB_URI, getAdminCategories);
  return new Response(JSON.stringify(categories), {
    headers: { 'Content-Type': 'application/json' },
  });
};
