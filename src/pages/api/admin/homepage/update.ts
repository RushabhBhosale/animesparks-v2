import type { APIRoute } from 'astro';
import { env } from 'cloudflare:workers';
import { verifySession, unauthorized } from '../../../../lib/admin/auth';
import { checkWritesEnabled } from '../../../../lib/admin/write-guard';
import { withDatabase } from '../../../../lib/content/mongodb';
import type { HomepageSettingsDocument } from '../../../../lib/content/types';

export const POST: APIRoute = async ({ request }) => {
  const user = await verifySession(request, env.ADMIN_JWT_SECRET);
  if (!user) return unauthorized();

  const guard = checkWritesEnabled(env);
  if (guard) return guard;

  try {
    const body = await request.json() as Partial<HomepageSettingsDocument>;

    const updateFields: Record<string, unknown> = {
      sourceUpdatedAt: new Date().toISOString(),
    };
    if (Array.isArray(body.editorsPicks)) updateFields.editorsPicks = body.editorsPicks;
    if (Array.isArray(body.moreBlogs)) updateFields.moreBlogs = body.moreBlogs;

    const res = await withDatabase(env.MONGODB_URI, db =>
      db.collection('homepageSettings').updateOne({}, { $set: updateFields })
    );

    return new Response(JSON.stringify({ success: true, modifiedCount: res.modifiedCount }), {
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err: unknown) {
    return new Response(JSON.stringify({ error: (err as Error).message || 'Failed to update homepage settings' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};
