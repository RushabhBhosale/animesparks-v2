type AnalyticsEnv = {
  GA_PROPERTY_ID?: string;
  GA_CLIENT_EMAIL?: string;
  GA_PRIVATE_KEY?: string;
};

type RankingWindow = 'week' | 'month' | 'year';

const TOKEN_URL = 'https://oauth2.googleapis.com/token';
const REPORT_TTL_MS = 5 * 60 * 1000;
const REPORT_TIMEOUT_MS = 5000;
let tokenCache: { value: string; expiresAt: number } | undefined;
const reportCache = new Map<string, { value: Map<string, number>; expiresAt: number }>();

// Isolates are short-lived and many, so each would otherwise sign its own JWT
// and call GA4 again. The colo's edge cache shares one report between them.
const edgeCache = () => (globalThis as unknown as { caches?: { default?: Cache } }).caches?.default;
const edgeKey = (propertyId: string, range: RankingWindow) => new Request(`https://ga4-cache.animesparks.internal/${propertyId}/${range}`);

async function readEdgeReport(propertyId: string, range: RankingWindow) {
  try {
    const hit = await edgeCache()?.match(edgeKey(propertyId, range));
    if (!hit) return undefined;
    return new Map(Object.entries(await hit.json() as Record<string, number>));
  } catch { return undefined; /* Cache API unavailable (e.g. astro dev). */ }
}

async function writeEdgeReport(propertyId: string, range: RankingWindow, views: Map<string, number>) {
  try {
    await edgeCache()?.put(edgeKey(propertyId, range), new Response(JSON.stringify(Object.fromEntries(views)), {
      headers: { 'Content-Type': 'application/json', 'Cache-Control': `public, max-age=${REPORT_TTL_MS / 1000}` },
    }));
  } catch { /* best effort */ }
}

const base64Url = (bytes: Uint8Array) => {
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
};

const decodeBase64 = (value: string) => {
  const binary = atob(value.replace(/-----[^-]+-----/g, '').replace(/\s/g, ''));
  return Uint8Array.from(binary, character => character.charCodeAt(0));
};

const encodeJson = (value: unknown) => new TextEncoder().encode(JSON.stringify(value));

async function getAccessToken(email: string, privateKey: string) {
  const now = Math.floor(Date.now() / 1000);
  if (tokenCache && tokenCache.expiresAt > now + 60) return tokenCache.value;

  const unsigned = [
    base64Url(encodeJson({ alg: 'RS256', typ: 'JWT' })),
    base64Url(encodeJson({
      iss: email,
      scope: 'https://www.googleapis.com/auth/analytics.readonly',
      aud: TOKEN_URL,
      iat: now,
      exp: now + 3600,
    })),
  ].join('.');
  const key = await crypto.subtle.importKey(
    'pkcs8',
    decodeBase64(privateKey),
    { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
    false,
    ['sign'],
  );
  const signature = await crypto.subtle.sign('RSASSA-PKCS1-v1_5', key, new TextEncoder().encode(unsigned));
  const assertion = `${unsigned}.${base64Url(new Uint8Array(signature))}`;
  const response = await fetch(TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion,
    }),
    signal: AbortSignal.timeout(REPORT_TIMEOUT_MS),
  });
  if (!response.ok) throw new Error(`token endpoint returned ${response.status}`);
  const result = await response.json() as { access_token?: string; expires_in?: number };
  if (!result.access_token) throw new Error('token response omitted access token');
  tokenCache = { value: result.access_token, expiresAt: now + (result.expires_in || 3600) };
  return result.access_token;
}

const startDateFor = (range: RankingWindow) => ({ week: '7daysAgo', month: '30daysAgo', year: '365daysAgo' })[range];

/** Reads the same GA4 page-view signal as the previous Next.js site. */
export async function getGa4PageViews(env: AnalyticsEnv, range: RankingWindow = 'month') {
  const { GA_PROPERTY_ID: propertyId, GA_CLIENT_EMAIL: email, GA_PRIVATE_KEY: rawKey } = env;
  if (!propertyId || !email || !rawKey) return null;
  const cacheKey = `${propertyId}:${range}`;
  const cached = reportCache.get(cacheKey);
  if (cached && cached.expiresAt > Date.now()) return cached.value;
  const shared = await readEdgeReport(propertyId, range);
  if (shared) {
    reportCache.set(cacheKey, { value: shared, expiresAt: Date.now() + REPORT_TTL_MS });
    return shared;
  }

  try {
    const accessToken = await getAccessToken(email, rawKey.replace(/\\n/g, '\n'));
    const response = await fetch(`https://analyticsdata.googleapis.com/v1beta/properties/${propertyId}:runReport`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        dateRanges: [{ startDate: startDateFor(range), endDate: 'yesterday' }],
        dimensions: [{ name: 'pagePath' }],
        metrics: [{ name: 'screenPageViews' }],
        dimensionFilter: { orGroup: { expressions: [
          { filter: { fieldName: 'pagePath', stringFilter: { matchType: 'BEGINS_WITH', value: '/blog/' } } },
          { filter: { fieldName: 'pagePath', stringFilter: { matchType: 'BEGINS_WITH', value: '/es/blog/' } } },
        ] } },
        limit: 10000,
      }),
      signal: AbortSignal.timeout(REPORT_TIMEOUT_MS),
    });
    if (!response.ok) throw new Error(`report endpoint returned ${response.status}`);
    const result = await response.json() as {
      rows?: Array<{ dimensionValues?: Array<{ value?: string }>; metricValues?: Array<{ value?: string }> }>;
    };
    const views = new Map<string, number>();
    for (const row of result.rows || []) {
      const path = row.dimensionValues?.[0]?.value;
      const count = Number(row.metricValues?.[0]?.value || 0);
      if (path && Number.isFinite(count)) views.set(path.replace(/\/$/, ''), count);
    }
    reportCache.set(cacheKey, { value: views, expiresAt: Date.now() + REPORT_TTL_MS });
    await writeEdgeReport(propertyId, range, views);
    return views;
  } catch (error) {
    console.warn('[ga4] Unable to refresh article rankings', error instanceof Error ? error.message : 'unknown error');
    return cached?.value || null;
  }
}

export function sortByGaViews<T extends { slug: string; language?: string; publishedAt?: string; viewCount?: number }>(
  articles: T[], views: Map<string, number> | null,
) {
  const pathFor = (article: T) => `${article.language === 'es' ? '/es' : ''}/blog/${article.slug}`;
  return [...articles].sort((a, b) => {
    const aViews = views?.get(pathFor(a));
    const bViews = views?.get(pathFor(b));
    if (aViews !== undefined || bViews !== undefined) {
      const difference = (bViews || 0) - (aViews || 0);
      if (difference) return difference;
    }
    return Date.parse(b.publishedAt || '') - Date.parse(a.publishedAt || '');
  });
}
