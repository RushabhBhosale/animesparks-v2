// Worker-side access to the prerendered listing snapshot. The parsed snapshot
// is immutable for a deployment, so it is kept per isolate rather than being
// fetched and parsed again on every request.

import type { ListingSource } from './listing-view';

type Assets = { fetch(request: Request | string): Promise<Response> } | undefined;

let pending: Promise<ListingSource> | undefined;

export function loadListingData(assets: Assets, requestUrl: string): Promise<ListingSource> {
  if (!pending) {
    pending = (async () => {
      if (!assets) throw new Error('Static assets binding is unavailable');
      const response = await assets.fetch(new URL('/listing-data.json', requestUrl).toString());
      if (!response.ok) throw new Error(`Listing data unavailable: ${response.status}`);
      return response.json() as Promise<ListingSource>;
    })();
    // A failed load must not poison later requests.
    pending.catch(() => { pending = undefined; });
  }
  return pending;
}
