import type { APIRoute } from 'astro';
import { env } from 'cloudflare:workers';
import {
  verifyPassword,
  createSessionToken,
  buildSessionCookie,
} from '../../../../lib/admin/auth';

export const POST: APIRoute = async ({ request, redirect }) => {
  try {
    const adminUser = env.ADMIN_USER || 'admin';
    const adminPassHash = env.ADMIN_PASS_HASH;
    const jwtSecret = env.ADMIN_JWT_SECRET;

    if (!adminPassHash || !jwtSecret) {
      return redirect('/admin/login?error=missing_config');
    }

    const formData = await request.formData();
    const username = (formData.get('username') as string || '').trim();
    const password = (formData.get('password') as string || '');

    if (!username || !password) {
      return redirect('/admin/login?error=invalid');
    }

    if (username !== adminUser) {
      return redirect('/admin/login?error=invalid');
    }

    const isValid = await verifyPassword(password, adminPassHash);
    if (!isValid) {
      return redirect('/admin/login?error=invalid');
    }

    const token = await createSessionToken(jwtSecret, username);
    const cookie = buildSessionCookie(token);

    return new Response(null, {
      status: 302,
      headers: {
        Location: '/admin',
        'Set-Cookie': cookie,
      },
    });
  } catch {
    return redirect('/admin/login?error=invalid');
  }
};
