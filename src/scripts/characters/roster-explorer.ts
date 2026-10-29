// Complete family tree explorer. Loads the series roster once (lazy), then
// renders only what is on screen: clan cards, the tree of one clan or one
// person's connected family, or a paged list. No layout library: the
// layered tree layout is the same pure module used at build time.
import { familyForest, familyTree, type FamilyTree } from '../../lib/characters/graph.ts';
import type { CastMember, Relationship } from '../../lib/characters/types.ts';

type Kind = 'parent' | 'spouse' | 'sibling' | 'lineage';
type Edge = [string, string, Kind, number?];
interface Node { id: string; name: string; clan: number[]; status: string; affiliation: string[]; kekkei: string[]; other: Array<[string, string, string]>; profile: [string, string, string] | 0 }
interface Data { importedAt: string; source: string; total: number; clans: Array<{ name: string; count: number }>; n: unknown[][]; e: Edge[]; locked: Record<string, number> }

const root = document.querySelector<HTMLElement>('[data-roster]');
if (root) void start(root);

async function start(root: HTMLElement) {
  const $ = <T extends HTMLElement>(selector: string) => root.querySelector<T>(selector)!;
  const viewport = $('[data-viewport]'); const stage = $('[data-stage]'); const panel = $('[data-detail]');
  const searchInput = $<HTMLInputElement>('[data-search]'); const suggest = $('[data-suggest]'); const clanList = $('[data-clan-list]');
  const status = $('[data-status]'); const onlyLinked = $<HTMLInputElement>('[data-only-linked]');
  const maxLevel = Number(root.dataset.maxLevel ?? 0);
  let level = -1;

  status.textContent = 'Loading the roster…';
  const data: Data = await (await fetch(root.dataset.src!)).json();
  const nodes = new Map<string, Node>();
  for (const row of data.n) nodes.set(row[0] as string, { id: row[0] as string, name: row[1] as string, clan: row[2] as number[], status: row[3] as string, affiliation: row[4] as string[], kekkei: row[5] as string[], other: row[6] as Node['other'], profile: row[7] as Node['profile'] });
  const sorted = [...nodes.values()];
  const visibleEdge = (edge: Edge) => !((data.locked[[edge[0], edge[1]].sort().join('|')] ?? -1) > level);
  const adjacency = () => {
    const map = new Map<string, Edge[]>();
    for (const edge of data.e) { if (!visibleEdge(edge)) continue; for (const id of [edge[0], edge[1]]) { if (!map.has(id)) map.set(id, []); map.get(id)!.push(edge); } }
    return map;
  };
  let adj = adjacency();
  const fold = (value: string) => value.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
  const esc = (value: string) => value.replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]!));

  // ── camera ──
  let scale = 1; let x = 0; let y = 0;
  const apply = () => { stage.style.transform = `translate(${x}px, ${y}px) scale(${scale})`; };
  const fit = () => { const w = stage.scrollWidth || 1; scale = Math.max(0.15, Math.min(1, viewport.clientWidth / w)); x = Math.max(0, (viewport.clientWidth - w * scale) / 2); y = 0; apply(); };
  const zoomAt = (factor: number, cx = viewport.clientWidth / 2, cy = viewport.clientHeight / 2) => { const next = Math.min(2.5, Math.max(0.1, scale * factor)); x = cx - (cx - x) * (next / scale); y = cy - (cy - y) * (next / scale); scale = next; apply(); };
  const pointers = new Map<number, { x: number; y: number }>(); let pinch = 0; let moved = 0;
  viewport.addEventListener('pointerdown', e => { pointers.set(e.pointerId, { x: e.clientX, y: e.clientY }); moved = 0; viewport.setPointerCapture(e.pointerId); viewport.classList.add('is-dragging'); });
  viewport.addEventListener('pointermove', e => {
    const prev = pointers.get(e.pointerId); if (!prev) return; const point = { x: e.clientX, y: e.clientY }; pointers.set(e.pointerId, point);
    if (pointers.size === 2) { const [a, b] = [...pointers.values()]; const d = Math.hypot(a.x - b.x, a.y - b.y); if (pinch) { const r = viewport.getBoundingClientRect(); zoomAt(d / pinch, (a.x + b.x) / 2 - r.left, (a.y + b.y) / 2 - r.top); } pinch = d; moved = 99; return; }
    x += point.x - prev.x; y += point.y - prev.y; moved += Math.abs(point.x - prev.x) + Math.abs(point.y - prev.y); apply();
  });
  const release = (e: PointerEvent) => { pointers.delete(e.pointerId); pinch = 0; if (!pointers.size) viewport.classList.remove('is-dragging'); };
  viewport.addEventListener('pointerup', release); viewport.addEventListener('pointercancel', release);
  viewport.addEventListener('wheel', e => { if (!e.ctrlKey && !e.metaKey) return; e.preventDefault(); const r = viewport.getBoundingClientRect(); zoomAt(e.deltaY < 0 ? 1.12 : 1 / 1.12, e.clientX - r.left, e.clientY - r.top); }, { passive: false });
  $('[data-zoom-in]').addEventListener('click', () => zoomAt(1.25)); $('[data-zoom-out]').addEventListener('click', () => zoomAt(0.8)); $('[data-fit]').addEventListener('click', fit);
  $('[data-fullscreen]').addEventListener('click', () => { if (document.fullscreenElement) void document.exitFullscreen(); else void root.requestFullscreen?.(); });
  document.addEventListener('fullscreenchange', () => setTimeout(fit, 60));

  // ── tree drawing ──
  const W = 132; const H = 36;
  const clip = (name: string) => (name.length > 18 ? `${name.slice(0, 17)}…` : name);
  const toGraph = (ids: Set<string>) => {
    const cast: CastMember[] = [...ids].map(id => ({ id, name: nodes.get(id)?.name ?? id, profile: nodes.get(id)?.profile ? (nodes.get(id)!.profile as [string, string, string])[0] : undefined }));
    const rels: Relationship[] = [];
    for (const edge of data.e) {
      if (!ids.has(edge[0]) || !ids.has(edge[1]) || !visibleEdge(edge)) continue;
      const kin = edge[2] === 'parent' ? 'parent' : edge[2] === 'lineage' ? 'ancestor' : edge[2];
      rels.push({ id: `${edge[2]}-${edge[0]}-${edge[1]}`, a: edge[0], b: edge[1], type: 'family', kin, generations: edge[3], summary: '', evolution: [] } as Relationship);
    }
    return { cast, rels };
  };
  const drawTree = (tree: FamilyTree, highlight: string) => {
    const lines = tree.links.map(link => {
      const { from, to } = link; let d: string; let cls = 'tree-line';
      if (link.kind === 'parent' || link.kind === 'lineage') { const mid = (from.y + H / 2 + to.y - H / 2) / 2; d = `M${from.x},${from.y + H / 2} V${mid} H${to.x} V${to.y - H / 2}`; if (link.kind === 'lineage') cls += ' tree-line--other'; }
      else { const [l, r] = from.x <= to.x ? [from, to] : [to, from]; if (l.y !== r.y) d = `M${from.x},${from.y} L${to.x},${to.y}`; else if (link.kind === 'sibling') d = `M${l.x},${l.y - H / 2} V${l.y - H / 2 - 14} H${r.x} V${r.y - H / 2}`; else d = `M${l.x + W / 2},${l.y} H${r.x - W / 2}`; cls += link.kind === 'spouse' ? ' tree-line--spouse' : ' tree-line--sibling'; }
      return `<path class="${cls}" d="${d}" data-a="${esc(from.id)}" data-b="${esc(to.id)}"/>`;
    }).join('');
    const boxes = tree.nodes.map(node => {
      const n = nodes.get(node.id); const cls = `node${node.id === highlight ? ' is-selected' : ''}${n?.profile ? '' : ' node--plain'}`;
      return `<g class="${cls}" data-id="${esc(node.id)}" tabindex="0" role="button" aria-label="${esc(node.name)}" transform="translate(${node.x - W / 2},${node.y - H / 2})"><rect width="${W}" height="${H}"/><text x="${W / 2}" y="${H / 2}">${esc(clip(node.name))}</text></g>`;
    }).join('');
    return `<svg width="${tree.width}" height="${tree.height}" viewBox="0 0 ${tree.width} ${tree.height}" role="group" aria-label="Family tree"><g>${lines}</g><g>${boxes}</g></svg>`;
  };

  // ── views ──
  let view: 'clans' | 'tree' | 'list' = 'clans'; let clanIndex = -1; let selected = ''; let listLimit = 100;
  const setView = (next: typeof view) => {
    view = next;
    root.querySelectorAll<HTMLButtonElement>('[data-view]').forEach(b => b.setAttribute('aria-selected', String(b.dataset.view === next)));
    root.classList.toggle('roster--list', next === 'list');
    render();
  };
  const clanCards = () => {
    stage.innerHTML = `<div class="roster-clans">${data.clans.map((clan, index) => ({ clan, index })).sort((a, b) => b.clan.count - a.clan.count).map(({ clan, index }) => {
      const members = sorted.filter(n => n.clan.includes(index)).slice(0, 6).map(n => esc(n.name)).join(', ');
      return `<button type="button" class="roster-clan" data-clan="${index}"><strong>${esc(clan.name)}</strong><span>${clan.count} characters</span><small>${members}${clan.count > 6 ? '…' : ''}</small></button>`;
    }).join('')}</div>`;
    status.textContent = `${data.clans.length} clans and families. Choose one to open its family tree.`;
    x = 0; y = 0; scale = 1; apply();
  };
  const clanTree = () => {
    const members = new Set(sorted.filter(n => n.clan.includes(clanIndex)).map(n => n.id));
    const ids = new Set(members);
    for (const id of members) for (const edge of adj.get(id) || []) { ids.add(edge[0]); ids.add(edge[1]); }
    const { cast, rels } = toGraph(ids);
    const forest = familyForest(cast, rels);
    const inTrees = new Set(forest.flatMap(t => t.nodes.map(n => n.id)));
    const loose = [...members].filter(id => !inTrees.has(id)).map(id => nodes.get(id)!).sort((a, b) => a.name.localeCompare(b.name));
    const shown = forest.slice(0, 10);
    stage.innerHTML = shown.map(tree => `<div class="tree-fixed">${drawTree(tree, selected)}</div>`).join('') +
      (forest.length > shown.length ? `<p class="explorer__hint">${forest.length - shown.length} smaller families are not drawn; use search or the list view to find them.</p>` : '') +
      (loose.length ? `<div class="roster-loose"><h3>No recorded family links</h3>${loose.map(n => `<button type="button" data-pick="${esc(n.id)}">${esc(n.name)}</button>`).join('')}</div>` : '');
    status.textContent = `${data.clans[clanIndex].name}: ${members.size} characters, ${forest.length} connected ${forest.length === 1 ? 'family' : 'families'}${loose.length ? `, ${loose.length} without recorded links` : ''}.`;
    requestAnimationFrame(fit);
  };
  const personTree = () => {
    const seen = new Set([selected]); const queue = [selected];
    while (queue.length && seen.size < 150) { const id = queue.shift()!; for (const edge of adj.get(id) || []) for (const other of [edge[0], edge[1]]) if (!seen.has(other)) { seen.add(other); queue.push(other); } }
    const { cast, rels } = toGraph(seen);
    const tree = familyTree(selected, cast, rels, { highlight: true, minEdges: 1 });
    stage.innerHTML = tree ? `<div class="tree-fixed">${drawTree(tree, selected)}</div>` : `<p class="explorer__hint" style="padding:var(--sp-6)">No family connections are recorded for ${esc(nodes.get(selected)?.name ?? '')}.</p>`;
    status.textContent = tree ? `${nodes.get(selected)!.name}: ${seen.size} connected characters.` : '';
    requestAnimationFrame(fit);
  };
  const list = () => {
    const query = fold(searchInput.value).split(/\s+/).filter(Boolean);
    const rows = sorted.filter(n => (clanIndex < 0 || n.clan.includes(clanIndex)) && (!onlyLinked.checked || adj.has(n.id)) && query.every(w => fold(n.name).includes(w)));
    stage.innerHTML = `<ul class="roster-list">${rows.slice(0, listLimit).map(n => `<li><button type="button" data-pick="${esc(n.id)}"><strong>${esc(n.name)}</strong><span>${n.clan.map(i => esc(data.clans[i].name)).join(', ') || '—'}</span></button></li>`).join('')}</ul>${rows.length > listLimit ? `<button type="button" class="tool-button" data-more style="margin:var(--sp-4)">Show more (${rows.length - listLimit} left)</button>` : ''}`;
    status.textContent = `${rows.length} of ${sorted.length} characters${clanIndex >= 0 ? ` in ${data.clans[clanIndex].name}` : ''}.`;
    x = 0; y = 0; scale = 1; apply();
  };
  const render = () => {
    if (view === 'clans') clanCards(); else if (view === 'list') list(); else if (selected && clanIndex < 0) personTree(); else if (clanIndex >= 0) { clanTree(); } else clanCards();
    clanList.querySelectorAll<HTMLButtonElement>('[data-clan]').forEach(b => b.setAttribute('aria-pressed', String(Number(b.dataset.clan) === clanIndex)));
    history.replaceState(null, '', `#${new URLSearchParams({ ...(clanIndex >= 0 ? { clan: data.clans[clanIndex].name } : {}), ...(selected ? { c: selected } : {}), view }).toString()}`);
  };

  // ── details ──
  const group = (id: string) => {
    const out: Record<string, Array<[string, string]>> = { Parents: [], Spouse: [], Siblings: [], Children: [], 'Ancestors and descendants': [] };
    for (const edge of adj.get(id) || []) {
      const other = edge[0] === id ? edge[1] : edge[0]; const label = nodes.get(other)?.name ?? other; const pair: [string, string] = [other, label];
      if (edge[2] === 'parent') out[edge[1] === id ? 'Parents' : 'Children'].push(pair);
      else if (edge[2] === 'spouse') out.Spouse.push(pair); else if (edge[2] === 'sibling') out.Siblings.push(pair);
      else out['Ancestors and descendants'].push(pair);
    }
    return out;
  };
  const detail = () => {
    const n = nodes.get(selected); if (!n) { panel.innerHTML = '<p class="explorer__hint">Select a character to see their family and affiliations.</p>'; return; }
    const groups = group(n.id);
    const shown = n.status && level >= maxLevel ? n.status : '';
    const people = (pairs: Array<[string, string]>) => pairs.map(([id, name]) => `<button type="button" data-pick="${esc(id)}">${esc(name)}</button>`).join('');
    panel.innerHTML = `<h2>${esc(n.name)}</h2>
      <p class="roster-chips">${n.clan.map(i => `<button type="button" data-clan="${i}">${esc(data.clans[i].name)}</button>`).join('')}${shown ? `<span>${esc(shown)}</span>` : ''}</p>
      ${n.profile ? `<p>${esc(n.profile[1])}</p><p class="explorer__hint" style="padding:0">${esc(n.profile[2])}</p><p><a class="tool-button tool-button--primary" href="/characters/${esc(n.profile[0])}">Open the full profile →</a></p>` : '<p class="explorer__hint" style="padding:0">No full profile yet. Only recorded facts are shown.</p>'}
      <dl>${n.affiliation.length ? `<dt>Affiliation</dt><dd>${n.affiliation.map(esc).join(', ')}</dd>` : ''}${n.kekkei.length ? `<dt>Bloodline trait</dt><dd>${n.kekkei.map(esc).join(', ')}</dd>` : ''}</dl>
      ${Object.entries(groups).filter(([, list]) => list.length).map(([label, list]) => `<h3>${label}</h3><p class="roster-chips">${people(list)}</p>`).join('')}
      ${n.other.length ? `<h3>Other relatives</h3><ul class="roster-other">${n.other.map(o => `<li>${esc(o[1])} <small>(${esc(o[2])})</small></li>`).join('')}</ul>` : ''}
      <p><button type="button" class="tool-button" data-focus="${esc(n.id)}">Show ${esc(n.name)}’s family tree</button></p>`;
  };
  const select = (id: string, show = false) => { if (!nodes.has(id)) return; selected = id; detail(); if (show) { clanIndex = -1; setView('tree'); } else if (view === 'tree') render(); };

  // ── events ──
  root.addEventListener('click', event => {
    if (moved > 6) { moved = 0; return; }
    const t = event.target as HTMLElement;
    const clan = t.closest<HTMLElement>('[data-clan]'); if (clan) { clanIndex = Number(clan.dataset.clan); selected = ''; listLimit = 100; setView(view === 'list' ? 'list' : 'tree'); return; }
    const pick = t.closest<HTMLElement>('[data-pick]'); if (pick) { select(pick.dataset.pick!); return; }
    const focus = t.closest<HTMLElement>('[data-focus]'); if (focus) { select(focus.dataset.focus!, true); return; }
    const node = t.closest<SVGGElement>('.node[data-id]'); if (node) { select(node.dataset.id!); return; }
    if (t.closest('[data-more]')) { listLimit += 200; list(); return; }
    const tab = t.closest<HTMLElement>('[data-view]'); if (tab) { if (tab.dataset.view === 'clans') { clanIndex = -1; selected = ''; } setView(tab.dataset.view as typeof view); }
  });
  root.addEventListener('keydown', e => { const node = (e.target as Element).closest<SVGGElement>('.node[data-id]'); if (node && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); select(node.dataset.id!); } });
  searchInput.addEventListener('input', () => {
    const query = fold(searchInput.value).trim();
    if (view === 'list') { listLimit = 100; list(); }
    if (!query) { suggest.innerHTML = ''; return; }
    const words = query.split(/\s+/);
    suggest.innerHTML = sorted.filter(n => words.every(w => fold(n.name).includes(w))).slice(0, 10).map(n => `<li><button type="button" data-suggest-pick="${esc(n.id)}">${esc(n.name)}<small>${n.clan.map(i => esc(data.clans[i].name)).join(', ')}</small></button></li>`).join('');
  });
  suggest.addEventListener('click', e => { const b = (e.target as HTMLElement).closest<HTMLElement>('[data-suggest-pick]'); if (b) { suggest.innerHTML = ''; searchInput.value = nodes.get(b.dataset.suggestPick!)!.name; select(b.dataset.suggestPick!, true); } });
  onlyLinked.addEventListener('change', () => { if (view === 'list') list(); });
  $('[data-share]').addEventListener('click', async ev => { const b = ev.currentTarget as HTMLButtonElement; try { if (navigator.share) await navigator.share({ url: location.href, title: document.title }); else { await navigator.clipboard.writeText(location.href); b.textContent = 'Link copied'; setTimeout(() => { b.textContent = 'Share'; }, 1600); } } catch { /* cancelled */ } });
  document.addEventListener('spoilerchange', e => { level = (e as CustomEvent).detail.level; adj = adjacency(); detail(); if (view !== 'clans') render(); });

  // initial state from the URL
  const params = new URLSearchParams(location.hash.slice(1));
  const clanName = params.get('clan'); if (clanName) { const found = data.clans.findIndex(c => c.name === clanName); if (found >= 0) clanIndex = found; }
  if (params.get('c') && nodes.has(params.get('c')!)) selected = params.get('c')!;
  status.textContent = '';
  const initial = (params.get('view') as typeof view) || 'clans';
  detail(); setView(clanIndex >= 0 || selected ? (initial === 'clans' ? 'tree' : initial) : initial);
}
