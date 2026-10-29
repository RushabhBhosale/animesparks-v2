export {};
// Pan / zoom / fit / fullscreen, character search, branch focus, tabs and
// shareable URLs for the family tree explorer. Every node and line is
// already in the HTML; this only moves the camera and toggles visibility.
const root = document.querySelector<HTMLElement>('[data-explorer]');

if (root) {
  const viewport = root.querySelector<HTMLElement>('[data-viewport]')!;
  const stage = root.querySelector<HTMLElement>('[data-stage]')!;
  const search = root.querySelector<HTMLInputElement>('[data-search]')!;
  const list = root.querySelector<HTMLDataListElement>('#explorer-names')!;
  const branchButton = root.querySelector<HTMLButtonElement>('[data-branch]')!;
  const tabs = [...root.querySelectorAll<HTMLButtonElement>('[data-tab]')];
  const panels = [...root.querySelectorAll<HTMLElement>('[data-panel]')];
  let scale = 1; let x = 0; let y = 0; let selected = '';
  let active = 'family';

  const apply = () => { stage.style.transform = `translate(${x}px, ${y}px) scale(${scale})`; };
  const bounds = () => ({ w: stage.scrollWidth, h: stage.scrollHeight });
  const fit = () => {
    const { w, h } = bounds();
    // Fit the width, never shrinking below a readable size; tall maps are panned vertically.
    scale = Math.max(0.4, Math.min(1, viewport.clientWidth / w)) || 1;
    x = Math.max(0, (viewport.clientWidth - w * scale) / 2); y = 0;
    apply();
  };
  const zoomAt = (factor: number, cx = viewport.clientWidth / 2, cy = viewport.clientHeight / 2) => {
    const next = Math.min(2.5, Math.max(0.2, scale * factor));
    x = cx - (cx - x) * (next / scale); y = cy - (cy - y) * (next / scale); scale = next; apply();
  };

  // Pointer pan and two-finger pinch.
  const pointers = new Map<number, { x: number; y: number }>();
  let pinch = 0; let moved = 0;
  viewport.addEventListener('pointerdown', event => {
    pointers.set(event.pointerId, { x: event.clientX, y: event.clientY }); moved = 0;
    viewport.setPointerCapture(event.pointerId); viewport.classList.add('is-dragging');
  });
  viewport.addEventListener('pointermove', event => {
    const previous = pointers.get(event.pointerId); if (!previous) return;
    const point = { x: event.clientX, y: event.clientY }; pointers.set(event.pointerId, point);
    if (pointers.size === 2) {
      const [a, b] = [...pointers.values()]; const distance = Math.hypot(a.x - b.x, a.y - b.y);
      if (pinch) { const rect = viewport.getBoundingClientRect(); zoomAt(distance / pinch, (a.x + b.x) / 2 - rect.left, (a.y + b.y) / 2 - rect.top); }
      pinch = distance; moved = 99; return;
    }
    x += point.x - previous.x; y += point.y - previous.y; moved += Math.abs(point.x - previous.x) + Math.abs(point.y - previous.y); apply();
  });
  const release = (event: PointerEvent) => { pointers.delete(event.pointerId); pinch = 0; if (!pointers.size) viewport.classList.remove('is-dragging'); };
  viewport.addEventListener('pointerup', release); viewport.addEventListener('pointercancel', release);
  // A drag must not follow a profile link by accident.
  viewport.addEventListener('click', event => { if (moved > 6) { event.preventDefault(); event.stopPropagation(); } }, true);
  viewport.addEventListener('wheel', event => { if (!event.ctrlKey && !event.metaKey) return; event.preventDefault(); const rect = viewport.getBoundingClientRect(); zoomAt(event.deltaY < 0 ? 1.12 : 1 / 1.12, event.clientX - rect.left, event.clientY - rect.top); }, { passive: false });

  root.querySelector('[data-zoom-in]')!.addEventListener('click', () => zoomAt(1.25));
  root.querySelector('[data-zoom-out]')!.addEventListener('click', () => zoomAt(0.8));
  root.querySelector('[data-fit]')!.addEventListener('click', fit);
  root.querySelector('[data-fullscreen]')!.addEventListener('click', () => { if (document.fullscreenElement) void document.exitFullscreen(); else void root.requestFullscreen?.(); });
  document.addEventListener('fullscreenchange', () => setTimeout(fit, 50));

  // Search only ever offers characters that are currently visible, so hidden relatives cannot leak.
  const visibleNodes = () => [...stage.querySelectorAll<SVGGElement>('.node[data-id]')].filter(node => !node.hasAttribute('hidden'));
  const refreshNames = () => {
    const names = [...new Set(visibleNodes().map(node => node.dataset.name!))].sort();
    list.innerHTML = names.map(name => `<option value="${name.replace(/"/g, '&quot;')}"></option>`).join('');
  };
  const family = (id: string) => {
    // The selected person plus every ancestor, descendant, sibling and partner reachable through visible lines.
    const links = [...stage.querySelectorAll<SVGAElement>('a[data-a]')].filter(link => !link.hasAttribute('hidden'));
    const seen = new Set([id]); let grew = true;
    while (grew) { grew = false; for (const link of links) { const a = link.dataset.a!; const b = link.dataset.b!; if (seen.has(a) !== seen.has(b)) { seen.add(a); seen.add(b); grew = true; } } }
    return { seen, links };
  };
  const select = (id: string, center = true) => {
    stage.querySelectorAll('.is-selected').forEach(node => node.classList.remove('is-selected'));
    selected = id;
    const node = stage.querySelector<SVGGElement>(`.node[data-id="${id}"]`);
    if (!node || node.hasAttribute('hidden')) { selected = ''; return; }
    node.classList.add('is-selected');
    if (center) { if (scale < 0.8) { const before = node.getBoundingClientRect(); const view0 = viewport.getBoundingClientRect(); const cx = before.left + before.width / 2 - view0.left; const cy = before.top + before.height / 2 - view0.top; x = cx - (cx - x) * (0.9 / scale); y = cy - (cy - y) * (0.9 / scale); scale = 0.9; apply(); }
      const rect = node.getBoundingClientRect(); const view = viewport.getBoundingClientRect(); x += view.left + view.width / 2 - (rect.left + rect.width / 2); y += view.top + view.height / 2 - (rect.top + rect.height / 2); apply(); }
    const state = new URLSearchParams(location.hash.slice(1)); state.set('c', id); state.set('view', active);
    history.replaceState(null, '', `#${state.toString()}`);
    branch();
  };
  const branch = () => {
    const on = root.classList.contains('explorer--branch') && Boolean(selected);
    stage.querySelectorAll('.is-branch').forEach(element => element.classList.remove('is-branch'));
    if (!on) return;
    const { seen, links } = family(selected);
    stage.querySelectorAll<SVGGElement>('.node[data-id]').forEach(node => node.classList.toggle('is-branch', seen.has(node.dataset.id!)));
    links.forEach(link => link.classList.toggle('is-branch', seen.has(link.dataset.a!) && seen.has(link.dataset.b!)));
  };
  search.addEventListener('change', () => {
    const match = visibleNodes().find(node => node.dataset.name!.toLowerCase() === search.value.trim().toLowerCase());
    if (match) select(match.dataset.id!);
  });
  stage.addEventListener('click', event => {
    const node = (event.target as Element).closest<SVGGElement>('.node[data-id]');
    if (node && !node.querySelector('a')) select(node.dataset.id!, false);
  });
  branchButton.addEventListener('click', () => {
    const on = root.classList.toggle('explorer--branch');
    branchButton.setAttribute('aria-pressed', String(on)); branch();
  });

  const show = (name: string) => {
    active = name;
    tabs.forEach(tab => tab.setAttribute('aria-selected', String(tab.dataset.tab === name)));
    panels.forEach(panel => { panel.hidden = panel.dataset.panel !== name; });
    const state = new URLSearchParams(location.hash.slice(1)); state.set('view', name); history.replaceState(null, '', `#${state.toString()}`);
    if (name === 'family') requestAnimationFrame(fit);
  };
  tabs.forEach(tab => tab.addEventListener('click', () => show(tab.dataset.tab!)));
  root.querySelector('[data-share]')!.addEventListener('click', async event => {
    const button = event.currentTarget as HTMLButtonElement; const url = location.href;
    try { if (navigator.share) await navigator.share({ url, title: document.title }); else { await navigator.clipboard.writeText(url); button.textContent = 'Link copied'; setTimeout(() => { button.textContent = 'Share'; }, 1600); } } catch { /* cancelled */ }
  });

  document.addEventListener('spoilerchange', () => { refreshNames(); if (selected) select(selected, false); });
  const params = new URLSearchParams(location.hash.slice(1));
  requestAnimationFrame(() => {
    fit(); refreshNames();
    const view = params.get('view'); if (view && tabs.some(tab => tab.dataset.tab === view)) show(view);
    const id = params.get('c'); if (id) { const node = stage.querySelector<SVGGElement>(`.node[data-id="${id}"]`); if (node && !node.hasAttribute('hidden')) { search.value = node.dataset.name!; select(id); } }
  });
  // Filter for the accessible relationship list.
  const filter = root.parentElement?.querySelector<HTMLInputElement>('[data-list-filter]');
  filter?.addEventListener('input', () => {
    const query = filter.value.trim().toLowerCase();
    root.parentElement!.querySelectorAll<HTMLElement>('.relation').forEach(item => { item.hidden = Boolean(query) && !(item.textContent || '').toLowerCase().includes(query); });
  });
}
