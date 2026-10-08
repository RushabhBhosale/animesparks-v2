import { defineMiddleware } from 'astro:middleware';
import { env } from 'cloudflare:workers';
import { verifySession, unauthorized } from './lib/admin/auth';

export const onRequest = defineMiddleware(async (context, next) => {
  const { pathname } = context.url;

  if (context.url.hostname === 'admin.animesparks.blog') {
    if (pathname === '/') return context.redirect('/admin', 302);
    if (pathname === '/robots.txt') {
      return new Response('User-agent: *\nDisallow: /\n', {
        headers: { 'Content-Type': 'text/plain; charset=utf-8', 'X-Robots-Tag': 'noindex, nofollow' },
      });
    }
    if (!pathname.startsWith('/admin') && !pathname.startsWith('/api/admin/') &&
        !pathname.startsWith('/_astro/') && pathname !== '/favicon-48x48.png') {
      return new Response('Not found', { status: 404, headers: { 'X-Robots-Tag': 'noindex, nofollow' } });
    }
  }

  if (pathname.startsWith('/api/admin/') && !['GET', 'HEAD', 'OPTIONS'].includes(context.request.method)) {
    const origin = context.request.headers.get('Origin');
    if (origin !== context.url.origin) {
      return new Response(JSON.stringify({ error: 'Invalid request origin' }), {
        status: 403,
        headers: { 'Content-Type': 'application/json', 'X-Robots-Tag': 'noindex, nofollow' },
      });
    }
  }

  // Protect all /admin/* routes except the login page
  if (pathname.startsWith('/admin') && pathname !== '/admin/login') {
    const user = await verifySession(context.request, env.ADMIN_JWT_SECRET);
    if (!user) {
      return context.redirect('/admin/login');
    }
  }

  // Protect all /api/admin/* routes except auth endpoints
  if (pathname.startsWith('/api/admin') && !pathname.startsWith('/api/admin/auth/')) {
    const user = await verifySession(context.request, env.ADMIN_JWT_SECRET);
    if (!user) {
      return unauthorized();
    }
  }

  return next();
});
