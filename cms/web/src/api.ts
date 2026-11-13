export class ApiError extends Error {
  constructor(public status: number, public code: string, message: string, public details?: any) { super(message); }
}
export async function api<T = any>(path: string, init: { method?: string; body?: unknown; form?: FormData } = {}): Promise<T> {
  const response = await fetch(`/api${path}`, {
    method: init.method || (init.body || init.form ? 'POST' : 'GET'), credentials: 'same-origin',
    headers: init.body ? { 'Content-Type': 'application/json' } : undefined,
    body: init.form ?? (init.body ? JSON.stringify(init.body) : undefined),
  });
  const data = await response.json().catch(() => null);
  if (!response.ok) {
    if (response.status === 401 && !path.startsWith('/auth/')) window.dispatchEvent(new Event('cms:unauthorized'));
    throw new ApiError(response.status, data?.error?.code || 'error', data?.error?.message || `Request failed (${response.status})`, data?.error?.details);
  }
  return data as T;
}
export const qs = (params: Record<string, unknown>) => {
  const s = new URLSearchParams(Object.entries(params).filter(([, v]) => v !== undefined && v !== '' && v !== null).map(([k, v]) => [k, String(v)])).toString();
  return s ? `?${s}` : '';
};
export const fmt = (iso?: string, tz?: string) => iso && Number.isFinite(Date.parse(iso)) ? new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short', timeZone: tz }).format(new Date(iso)) : '—';
export const ago = (iso?: string) => {
  if (!iso) return '—';
  const s = (Date.now() - Date.parse(iso)) / 1000, abs = Math.abs(s);
  const unit: [number, string][] = [[60, 's'], [3600, 'm'], [86400, 'h'], [86400 * 30, 'd']];
  if (abs < 45) return 'just now';
  for (let i = 1; i < unit.length; i++) if (abs < unit[i][0]) return `${s < 0 ? 'in ' : ''}${Math.round(abs / unit[i - 1][0])}${unit[i][1]}${s < 0 ? '' : ' ago'}`;
  return fmt(iso);
};

/**
 * "Process images" for one article. Where the server cannot reach the image catalogue itself (the edge
 * deployment), this browser does the lookups and hands the results over, so the images are attached right away.
 */
export async function processImages(base: string) {
  const plan = await api(`${base}/image-plan`);
  let catalog: Record<string, unknown[]> | undefined;
  if (plan.clientLookup) {
    try {
      catalog = {};
      for (const search of plan.searches as string[]) {
        const response = await fetch(plan.endpoint, { method: 'POST', headers: { 'Content-Type': 'application/json', Accept: 'application/json' }, body: JSON.stringify({ query: plan.query, variables: { s: search } }) });
        if (!response.ok) throw new Error(`catalogue lookup returned HTTP ${response.status}`);
        catalog[search] = (await response.json()).data?.Page?.media || [];
      }
    } catch { catalog = undefined; } // fall back to the background runner
  }
  return api(`${base}/images`, { body: catalog ? { catalog } : {} });
}
export const imagesMessage = (r: any) => r.queued
  ? r.note || 'Image processing was queued for the background runner.'
  : `Hero: ${r.hero}. Inline images added: ${r.inlineAdded}${r.inlineMissing ? `, still missing ${r.inlineMissing}` : ''}. Status: ${String(r.status || '').replace(/_/g, ' ')}.${r.notes?.length ? ` ${r.notes.join('; ')}` : ''}`;
