/**
 * Admin authentication — JWT session via Web Crypto API (native to Cloudflare Workers).
 *
 * Security properties:
 * - Credentials never sent to client JS or HTML
 * - HttpOnly; Secure; SameSite=Strict cookie
 * - Constant-time credential comparison (SHA-256 both sides, then compare hashes)
 * - JWT signed with HS256 using ADMIN_JWT_SECRET from Wrangler secret
 * - No logging of credentials or JWT payloads
 * - Cookie name is opaque (not "session" etc.)
 *
 * The architecture intentionally keeps the auth boundary clean so that
 * Cloudflare Access can be layered in front later without rewriting CMS logic.
 */

const COOKIE_NAME = '__as_adm';
const COOKIE_OPTS = 'HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=28800'; // 8 hours; admin API shares this origin
const ALG = { name: 'HMAC', hash: 'SHA-256' } as const;

/** Encode base64url without padding */
const b64url = (buf: ArrayBuffer | Uint8Array) => {
  const bytes = buf instanceof Uint8Array ? buf : new Uint8Array(buf);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
};

/** Decode base64url */
const fromb64url = (s: string) =>
  Uint8Array.from(atob(s.replace(/-/g, '+').replace(/_/g, '/')), c => c.charCodeAt(0));

function enc(s: string) {
  return new TextEncoder().encode(s);
}

async function importKey(secret: string): Promise<CryptoKey> {
  return crypto.subtle.importKey('raw', enc(secret), ALG, false, ['sign', 'verify']);
}

/** Create a signed JWT with 8-hour expiry */
export async function createSessionToken(jwtSecret: string, username: string): Promise<string> {
  const header = b64url(enc(JSON.stringify({ alg: 'HS256', typ: 'JWT' })));
  const now = Math.floor(Date.now() / 1000);
  const payload = b64url(enc(JSON.stringify({ sub: username, iat: now, exp: now + 28800 })));
  const key = await importKey(jwtSecret);
  const sig = await crypto.subtle.sign(ALG, key, enc(`${header}.${payload}`));
  return `${header}.${payload}.${b64url(sig)}`;
}

/** Verify a JWT and return the username, or null if invalid/expired */
export async function verifySessionToken(jwtSecret: string, token: string): Promise<string | null> {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    const [header, payload, sig] = parts;
    const key = await importKey(jwtSecret);
    const valid = await crypto.subtle.verify(ALG, key, fromb64url(sig), enc(`${header}.${payload}`));
    if (!valid) return null;
    const claims = JSON.parse(new TextDecoder().decode(fromb64url(payload)));
    if (typeof claims.exp !== 'number' || claims.exp < Math.floor(Date.now() / 1000)) return null;
    return claims.sub as string;
  } catch {
    return null;
  }
}

/** Extract the session cookie from a request */
export function getSessionCookie(request: Request): string | null {
  const header = request.headers.get('cookie') || '';
  for (const part of header.split(';')) {
    const [name, ...rest] = part.trim().split('=');
    if (name.trim() === COOKIE_NAME) return rest.join('=').trim();
  }
  return null;
}

/** Verify the request's session, return username or null */
export async function verifySession(request: Request, jwtSecret: string | undefined): Promise<string | null> {
  if (!jwtSecret) return null;
  const token = getSessionCookie(request);
  if (!token) return null;
  return verifySessionToken(jwtSecret, token);
}

/** Compare password against stored SHA-256 hash using constant-time comparison */
export async function verifyPassword(password: string, storedHex: string): Promise<boolean> {
  const hashBuf = await crypto.subtle.digest('SHA-256', enc(password));
  const inputHex = Array.from(new Uint8Array(hashBuf)).map(b => b.toString(16).padStart(2, '0')).join('');
  // Constant-time comparison
  if (inputHex.length !== storedHex.length) return false;
  let diff = 0;
  for (let i = 0; i < inputHex.length; i++) {
    diff |= inputHex.charCodeAt(i) ^ storedHex.charCodeAt(i);
  }
  return diff === 0;
}

/** Build a Set-Cookie header for a new session */
export function buildSessionCookie(token: string): string {
  return `${COOKIE_NAME}=${token}; ${COOKIE_OPTS}`;
}

/** Build a Set-Cookie header that clears the session */
export function clearSessionCookie(): string {
  return `${COOKIE_NAME}=; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=0`;
}

/** Redirect to login if not authenticated. Returns username or throws redirect response. */
export async function requireAuth(request: Request, jwtSecret: string | undefined): Promise<string> {
  const user = await verifySession(request, jwtSecret);
  if (!user) {
    throw new Response(null, {
      status: 302,
      headers: { Location: '/admin/login' },
    });
  }
  return user;
}

/** Return a 401 JSON response for unauthenticated API requests */
export function unauthorized(): Response {
  return new Response(JSON.stringify({ error: 'Unauthorized' }), {
    status: 401,
    headers: { 'Content-Type': 'application/json' },
  });
}

/** Return a 403 JSON response for forbidden API requests */
export function forbidden(reason = 'Forbidden'): Response {
  return new Response(JSON.stringify({ error: reason }), {
    status: 403,
    headers: { 'Content-Type': 'application/json' },
  });
}
