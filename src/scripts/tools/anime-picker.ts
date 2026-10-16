// Accessible combobox that searches the tools API as the reader types.
// Only the top matches are sent to the browser; the full catalogue stays
// on the server.

import { formatLabel, statusLabel } from '../../lib/tools/normalize.ts';

export interface PickerItem {
  s: string;
  t: string;
  o?: string;
  f?: string;
  st?: string;
  y?: number;
  e?: number;
  ea?: number;
  d?: number;
  p?: string;
  n?: number;
  fl?: number;
  r?: number;
  /** Found by a live provider lookup rather than the catalogue. */
  live?: boolean;
}

interface PickerOptions {
  root: HTMLElement;
  endpoint: string;
  /** Called when the catalogue has no match. Defaults to the live anime lookup for anime searches. */
  liveEndpoint?: string | null;
  describe?: (item: PickerItem) => string;
  onSelect: (item: PickerItem) => void;
}

export function describeAnime(item: PickerItem): string {
  const episodes = item.st === 'airing' && item.ea ? `${item.ea} eps aired` : item.e ? `${item.e} eps` : '';
  return [item.f ? formatLabel(item.f) : '', item.y, episodes, item.st && item.st !== 'finished' ? statusLabel(item.st) : ''].filter(Boolean).join(' · ');
}

export function createPicker({ root, endpoint, liveEndpoint, describe = describeAnime, onSelect }: PickerOptions) {
  const live = liveEndpoint === undefined ? (endpoint === '/api/tools/anime-search' ? '/api/tools/anime-lookup' : null) : liveEndpoint;
  const input = root.querySelector<HTMLInputElement>('input')!;
  const list = root.querySelector<HTMLUListElement>('[role="listbox"]')!;
  let items: PickerItem[] = [];
  let active = -1;
  let timer: number | undefined;
  let controller: AbortController | undefined;

  const close = () => {
    list.hidden = true;
    input.setAttribute('aria-expanded', 'false');
    input.removeAttribute('aria-activedescendant');
    active = -1;
  };

  const setActive = (index: number) => {
    active = index;
    list.querySelectorAll<HTMLElement>('[role="option"]').forEach((option, position) => {
      option.setAttribute('aria-selected', String(position === index));
      if (position === index) {
        input.setAttribute('aria-activedescendant', option.id);
        option.scrollIntoView({ block: 'nearest' });
      }
    });
  };

  const status = (text: string) => {
    list.replaceChildren();
    const row = document.createElement('li');
    row.className = 'anime-picker__status';
    row.setAttribute('role', 'presentation');
    row.textContent = text;
    list.append(row);
    list.hidden = false;
    input.setAttribute('aria-expanded', 'true');
  };

  const choose = (index: number) => {
    const item = items[index];
    if (!item) return;
    input.value = item.t;
    close();
    onSelect(item);
  };

  const render = () => {
    list.replaceChildren();
    if (!items.length) {
      status('No matches yet. Try the English or Japanese title.');
      return;
    }
    items.forEach((item, index) => {
      const option = document.createElement('li');
      option.id = `${list.id}-option-${index}`;
      option.className = 'anime-picker__option';
      option.setAttribute('role', 'option');
      option.setAttribute('aria-selected', 'false');
      if (item.p) {
        const image = document.createElement('img');
        image.src = item.p;
        image.alt = '';
        image.width = 34;
        image.height = 48;
        image.loading = 'lazy';
        image.decoding = 'async';
        image.referrerPolicy = 'no-referrer';
        option.append(image);
      } else {
        const placeholder = document.createElement('span');
        placeholder.className = 'anime-picker__thumb';
        option.append(placeholder);
      }
      const text = document.createElement('div');
      const title = document.createElement('strong');
      title.textContent = item.t;
      const meta = document.createElement('span');
      meta.textContent = [item.o, describe(item), item.live ? 'New · from MyAnimeList' : ''].filter(Boolean).join(' — ');
      text.append(title, meta);
      option.append(text);
      option.addEventListener('mousedown', event => event.preventDefault());
      option.addEventListener('click', () => choose(index));
      list.append(option);
    });
    list.hidden = false;
    input.setAttribute('aria-expanded', 'true');
  };

  input.addEventListener('input', () => {
    window.clearTimeout(timer);
    controller?.abort();
    const query = input.value.trim();
    if (query.length < 2) { close(); return; }
    timer = window.setTimeout(async () => {
      controller = new AbortController();
      status('Searching…');
      try {
        const response = await fetch(`${endpoint}?q=${encodeURIComponent(query)}`, { signal: controller.signal });
        if (!response.ok) throw new Error(String(response.status));
        items = ((await response.json()) as { results?: PickerItem[] }).results || [];
        if (!items.length && live && query.replace(/[^\p{L}\p{N}]/gu, '').length >= 3) {
          status('Not in our catalogue yet. Checking MyAnimeList…');
          const lookup = await fetch(`${live}?q=${encodeURIComponent(query)}`, { signal: controller!.signal });
          const body = (await lookup.json().catch(() => ({}))) as { results?: PickerItem[]; error?: string };
          items = body.results || [];
          if (!items.length) {
            status(body.error || 'No anime found with that title. Try the English or Japanese name.');
            return;
          }
        }
        render();
      } catch (error) {
        if ((error as Error).name !== 'AbortError') status('Search is unavailable right now. Please try again shortly.');
      }
    }, 180);
  });

  input.addEventListener('keydown', event => {
    if (list.hidden || !items.length) return;
    if (event.key === 'ArrowDown') { event.preventDefault(); setActive((active + 1) % items.length); }
    else if (event.key === 'ArrowUp') { event.preventDefault(); setActive((active - 1 + items.length) % items.length); }
    else if (event.key === 'Enter') { event.preventDefault(); choose(active >= 0 ? active : 0); }
    else if (event.key === 'Escape') close();
  });
  input.addEventListener('blur', () => window.setTimeout(close, 120));
  input.addEventListener('focus', () => { if (items.length && input.value.trim().length >= 2) render(); });
}
