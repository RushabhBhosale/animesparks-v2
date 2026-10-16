// Worker-side access to the build-time tool indexes. Parsed indexes are
// kept per isolate: they are immutable for a deployment, so this cache
// cannot serve stale data across releases.

type Assets = { fetch(request: Request | string): Promise<Response> } | undefined;

const cache = new Map<string, Promise<unknown>>();

export function loadToolIndex<T>(assets: Assets, requestUrl: string, path: `/tools-data/${string}.json`): Promise<T[]> {
  return loadToolData<T[]>(assets, requestUrl, path);
}

export function loadToolData<T>(assets: Assets, requestUrl: string, path: `/tools-data/${string}.json`): Promise<T> {
  let pending = cache.get(path);
  if (!pending) {
    const url = new URL(path, requestUrl).toString();
    pending = (async () => {
      let response = assets ? await assets.fetch(url).catch(() => null) : null;
      // `astro dev` has no ASSETS binding and serves the index on demand.
      if ((!response || !response.ok) && import.meta.env.DEV) response = await fetch(url);
      if (!response || !response.ok) throw new Error(`Tool index unavailable: ${response?.status ?? 'no assets binding'}`);
      return response.json() as Promise<unknown>;
    })();
    // A failed load must not poison later requests.
    pending.catch(() => cache.delete(path));
    cache.set(path, pending);
  }
  return pending as Promise<T>;
}

/** Drops the internal search key before an entry is sent to the browser. */
export function publicEntry<T extends { k: string }>({ k: _key, ...entry }: T): Omit<T, 'k'> {
  return entry;
}

export function jsonResponse(body: unknown, status = 200, maxAge = 300): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': status === 200 ? `public, max-age=${maxAge}` : 'no-store',
      'X-Robots-Tag': 'noindex, nofollow',
    },
  });
}
