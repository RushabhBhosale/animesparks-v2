// Per-colo response cache for deterministic API answers. Isolates are many and
// short-lived, so without it each one recomputes the same popular searches.
// Entries live for the response's own Cache-Control max-age; non-200 and
// max-age=0 responses are never stored.

type Waiter = { waitUntil(promise: Promise<unknown>): void } | undefined;

export async function edgeCached(key: string, compute: () => Promise<Response>, context?: Waiter): Promise<Response> {
  const cache = (globalThis as unknown as { caches?: { default?: Cache } }).caches?.default;
  if (!cache) return compute();
  const request = new Request(`https://edge-cache.animesparks.internal/${key}`);
  try {
    const hit = await cache.match(request);
    if (hit) return hit;
  } catch { /* Cache API unavailable (e.g. astro dev). */ }
  const response = await compute();
  if (response.status === 200) {
    const store = cache.put(request, response.clone()).catch(() => { /* best effort */ });
    if (context) context.waitUntil(store); else await store;
  }
  return response;
}

/** Hex SHA-1 of a string, for building compact cache keys from request bodies. */
export async function digest(value: string): Promise<string> {
  const bytes = new Uint8Array(await crypto.subtle.digest('SHA-1', new TextEncoder().encode(value)));
  return Array.from(bytes, byte => byte.toString(16).padStart(2, '0')).join('');
}
