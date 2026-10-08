import type { APIRoute } from 'astro';
import { env } from 'cloudflare:workers';
import { verifySession, unauthorized } from '../../../../lib/admin/auth';
import { withDatabase } from '../../../../lib/content/mongodb';
import { getAdminHomepageData } from '../../../../lib/admin/db';

export const GET: APIRoute = async ({ request }) => {
  const user = await verifySession(request, env.ADMIN_JWT_SECRET);
  if (!user) return unauthorized();

  const data = await withDatabase(env.MONGODB_URI, getAdminHomepageData);
  return new Response(JSON.stringify(data), {
    headers: { 'Content-Type': 'application/json' },
  });
};
