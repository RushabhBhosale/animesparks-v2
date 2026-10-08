import type { APIRoute } from 'astro';
import { env } from 'cloudflare:workers';
import { verifySession, unauthorized } from '../../../../lib/admin/auth';
import { withDatabase } from '../../../../lib/content/mongodb';
import { getAdminArticles } from '../../../../lib/admin/db';

export const GET: APIRoute = async ({ request }) => {
  const user = await verifySession(request, env.ADMIN_JWT_SECRET);
  if (!user) return unauthorized();

  const url = new URL(request.url);
  const q = url.searchParams.get('q') || '';
  const status = url.searchParams.get('status') || 'all';
  const language = url.searchParams.get('language') || 'all';
  const category = url.searchParams.get('category') || 'all';
  const sort = (url.searchParams.get('sort') || 'updated') as 'updated' | 'published' | 'title';
  const page = parseInt(url.searchParams.get('page') || '1', 10);
  const limit = parseInt(url.searchParams.get('limit') || '20', 10);

  const result = await withDatabase(env.MONGODB_URI, db =>
    getAdminArticles(db, { q, status, language, category, sort, page, limit })
  );

  return new Response(JSON.stringify(result), {
    headers: { 'Content-Type': 'application/json' },
  });
};
