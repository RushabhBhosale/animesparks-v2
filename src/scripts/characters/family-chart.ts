// Camera, overview map, search, selection and spoiler levels for the family
// chart. The SVG arrives prerendered with everything shown; a spoiler level or
// the families-only view redraws it from the roster, loaded only when needed.
import { buildChart, chartSvg, visibleEdges, type ChartData } from '../../lib/characters/family-chart.ts';

const root = document.querySelector<HTMLElement>('[data-chart]');
if (root) start(root);

function start(root: HTMLElement) {
  const $ = <T extends HTMLElement>(selector: string) => root.querySelector<T>(selector)!;
  const view = $('[data-view]'); const stage = $('[data-stage]'); const card = $('[data-card]');
  const input = $<HTMLInputElement>('[data-search]'); const suggest = $('[data-suggest]'); const spoilers = root.querySelector<HTMLSelectElement>('[data-spoilers]');
  const jump = $<HTMLSelectElement>('[data-jump]'); const familiesOnly = $<HTMLInputElement>('[data-families]'); const crumbs = $('[data-crumbs]');
  const mini = $('[data-mini]'); const miniCanvas = mini.querySelector('canvas')!; const miniFrame = $('[data-mini-frame]');
  const full = Number(root.dataset.full);
  const storageKey = `animesparks:family-spoilers:${root.dataset.series}`;
  const fold = (value: string) => value.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
  const esc = (value: string) => value.replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]!));

  let boxes = new Map<string, SVGElement>();
  let linesTo = new Map<string, SVGPathElement[]>();
  let names: Array<{ id: string; name: string; folded: string }> = [];
  let branches: Array<{ id: string; name: string; x: number; y: number; w: number; h: number; up: string; top: boolean; major: boolean }> = [];
  let labels: Array<{ id: string; cx: number; cy: number; pw: number; ph: number; top: boolean }> = [];
  const index = () => {
    boxes = new Map(); linesTo = new Map(); names = []; branches = []; labels = [];
    stage.querySelectorAll<SVGElement>('[data-id]').forEach(node => {
      const id = node.dataset.id!; boxes.set(id, node);
      if (node.dataset.b) {
        const [bx, by, bw, bh] = node.dataset.b.split(',').map(Number);
        branches.push({ id, name: node.dataset.name!, x: bx, y: by, w: bw, h: bh, up: node.dataset.up ?? '', top: node.classList.contains('fc-n--branch'), major: node.classList.contains('fc-n--major') });
      }
      if (node.dataset.name && !node.dataset.target && !node.classList.contains('fc-n--team')) names.push({ id, name: node.dataset.name, folded: fold(node.dataset.name) });
    });
    stage.querySelectorAll<SVGPathElement>('path[data-to]').forEach(line => {
      for (const id of line.dataset.to!.split('|')) { if (!linesTo.has(id)) linesTo.set(id, []); linesTo.get(id)!.push(line); }
    });
    names.sort((a, b) => a.name.localeCompare(b.name));
    labels = branches.filter(item => item.id === 'root' || item.top || item.major).sort((a, b) => Number(b.id === 'root') - Number(a.id === 'root') || b.w * b.h - a.w * a.h).map(item => {
      const node = boxes.get(item.id)!; const place = node.getAttribute('transform')!.match(/translate\(([\d.-]+) ([\d.-]+)\)/)!; const shape = node.querySelector('rect')!;
      return { id: item.id, cx: Number(place[1]), cy: Number(place[2]), pw: Number(shape.getAttribute('width')), ph: Number(shape.getAttribute('height')), top: item.top || item.id === 'root' };
    });
    lastBranchSize = 0;
    const list = (title: string, items: typeof branches) => `<optgroup label="${title}">${items.sort((a, b) => a.name.localeCompare(b.name)).map(item => `<option value="${esc(item.id)}">${esc(item.name)}</option>`).join('')}</optgroup>`;
    jump.innerHTML = `<option value="">Jump to…</option>${list('Villages and lands', branches.filter(item => item.top))}${list('Clans', branches.filter(item => item.major && !item.top))}`;
    drawMini();
  };
  const svgSize = () => { const svg = stage.querySelector('svg')!; return { w: svg.width.baseVal.value, h: svg.height.baseVal.value }; };

  // ── camera ──
  let scale = 1; let x = 0; let y = 0; let minScale = 0.05; let flight = 0; let far = false; let hereTimer = 0; let lastBranchSize = 0; let lastClanSize = 0;
  // Zoomed out, labels are drawn larger than life, so the biggest branches keep theirs and the rest wait.
  const cullLabels = (branchSize: number, clanSize: number) => {
    const kept: Array<{ x: number; y: number; w: number; h: number }> = [];
    for (const item of labels) {
      const size = (item.top ? branchSize : clanSize) * scale;
      const box = { x: item.cx * scale, y: item.cy * scale, w: item.pw * size, h: item.ph * size };
      const clash = kept.some(other => Math.abs(box.x - other.x) < (box.w + other.w) / 2 + 6 && Math.abs(box.y - other.y) < (box.h + other.h) / 2 + 3);
      boxes.get(item.id)?.classList.toggle('is-culled', clash);
      if (!clash) kept.push(box);
    }
  };
  const zoomVars = () => {
    const step = (value: number) => Math.round(value * 4) / 4;
    const branchSize = step(Math.min(5, Math.max(1, 0.5 / scale))); const clanSize = step(Math.min(3.5, Math.max(1, 0.35 / scale)));
    if (branchSize !== lastBranchSize || clanSize !== lastClanSize) { lastBranchSize = branchSize; lastClanSize = clanSize; cullLabels(branchSize, clanSize); }
    stage.style.setProperty('--branch', String(branchSize));
    stage.style.setProperty('--clan', String(clanSize));
    stage.style.setProperty('--line', String(step(Math.min(10, Math.max(1, 0.9 / scale)))));
    const nowFar = scale < 0.26;
    if (nowFar !== far) { far = nowFar; root.classList.toggle('fc--far', far); }
    root.classList.toggle('fc--farther', scale < 0.14);
  };
  const apply = () => {
    // The tree can never be dragged out of sight.
    const { w, h } = svgSize(); const margin = Math.min(view.clientWidth, view.clientHeight) * 0.3;
    x = Math.min(view.clientWidth - margin, Math.max(margin - w * scale, x));
    y = Math.min(view.clientHeight - margin, Math.max(margin - h * scale, y));
    stage.style.transform = `translate(${x}px, ${y}px) scale(${scale})`;
    zoomVars(); frameMini();
    clearTimeout(hereTimer); hereTimer = window.setTimeout(showHere, 140);
  };
  const fitView = () => {
    const { w, h } = svgSize();
    const next = Math.min(view.clientWidth / w, view.clientHeight / h) * 0.97;
    minScale = next * 0.7;
    return { scale: next, x: (view.clientWidth - w * next) / 2, y: (view.clientHeight - h * next) / 2 };
  };
  const fit = () => { ({ scale, x, y } = fitView()); apply(); };
  // A wide tree in a tall phone screen: start larger, at the top of the trunk.
  const opening = () => {
    const whole = fitView();
    if (view.clientWidth >= view.clientHeight) return whole;
    const { w, h } = svgSize();
    const next = Math.min(view.clientHeight / h, whole.scale * 2.4);
    const trunk = boxes.get('root') as unknown as SVGGraphicsElement | undefined;
    const centre = trunk ? trunk.getCTM()!.e : w / 2;
    return { scale: next, x: view.clientWidth / 2 - centre * next, y: 8 };
  };
  const fly = (target: { scale: number; x: number; y: number }) => {
    cancelAnimationFrame(flight);
    if (matchMedia('(prefers-reduced-motion: reduce)').matches) { ({ scale, x, y } = target); apply(); return; }
    const from = { scale, x, y }; const began = performance.now();
    const frame = (now: number) => {
      const t = Math.min(1, (now - began) / 420); const eased = 1 - (1 - t) ** 3;
      scale = from.scale + (target.scale - from.scale) * eased; x = from.x + (target.x - from.x) * eased; y = from.y + (target.y - from.y) * eased;
      apply();
      if (t < 1) flight = requestAnimationFrame(frame);
    };
    flight = requestAnimationFrame(frame);
  };
  const zoomAt = (factor: number, cx = view.clientWidth / 2, cy = view.clientHeight / 2) => {
    cancelAnimationFrame(flight);
    const next = Math.min(2.2, Math.max(minScale, scale * factor));
    x = cx - (cx - x) * (next / scale); y = cy - (cy - y) * (next / scale); scale = next; apply();
  };
  const zoomButton = (factor: number) => {
    const next = Math.min(2.2, Math.max(minScale, scale * factor)); const cx = view.clientWidth / 2; const cy = view.clientHeight / 2;
    fly({ scale: next, x: cx - (cx - x) * (next / scale), y: cy - (cy - y) * (next / scale) });
  };
  const centreOf = (id: string) => {
    const node = boxes.get(id) as unknown as SVGGraphicsElement | undefined; if (!node) return null;
    const box = node.getBBox(); const ctm = node.getCTM()!;
    return { x: ctm.e + box.x + box.width / 2, y: ctm.f + box.y + box.height / 2 };
  };
  const flyTo = (id: string) => {
    const point = centreOf(id); if (!point) return;
    const next = Math.max(scale, 0.95);
    const clear = view.clientWidth < 600 ? 0.26 : 0.5; // on a phone the card covers the lower half
    fly({ scale: next, x: view.clientWidth / 2 - point.x * next, y: view.clientHeight * clear - point.y * next });
  };
  // Frame a whole branch; a big one opens readable at its top instead of tiny.
  const openBranch = (id: string) => {
    const branch = branches.find(item => item.id === id); if (!branch) return;
    const pad = 40; const whole = Math.min((view.clientWidth - pad) / branch.w, (view.clientHeight - pad) / branch.h, 1);
    if (id === 'root') { fly(fitView()); return; }
    const next = Math.max(whole, 0.62);
    const left = whole >= 0.62 ? (view.clientWidth - branch.w * next) / 2 - branch.x * next : view.clientWidth / 2 - (centreOf(id)?.x ?? branch.x) * next;
    fly({ scale: next, x: left, y: (whole >= 0.62 ? (view.clientHeight - branch.h * next) / 2 : 56) - branch.y * next });
  };

  // ── where am I ──
  const showHere = () => {
    const wx = (view.clientWidth / 2 - x) / scale; const wy = (view.clientHeight / 2 - y) / scale;
    const inside = branches.filter(item => item.id !== 'root' && wx >= item.x && wx <= item.x + item.w && wy >= item.y && wy <= item.y + item.h && scale > fitView().scale * 1.6);
    const deepest = inside.sort((a, b) => a.w * a.h - b.w * b.h)[0];
    const trail: typeof branches = [];
    for (let id: string | undefined = deepest?.id; id; id = boxes.get(id)?.dataset.up) { const item = branches.find(other => other.id === id); if (item) trail.unshift(item); }
    const key = trail.map(item => item.id).join('|');
    if (crumbs.dataset.key === key) return;
    crumbs.dataset.key = key;
    crumbs.innerHTML = `<button type="button" data-open="root">${esc(root.dataset.title!)}</button>${trail.filter(item => item.id !== 'root').map(item => `<span aria-hidden="true">›</span><button type="button" data-open="${esc(item.id)}">${esc(item.name)}</button>`).join('')}`;
  };
  crumbs.addEventListener('click', event => { const button = (event.target as HTMLElement).closest<HTMLElement>('[data-open]'); if (button) openBranch(button.dataset.open!); });
  jump.addEventListener('change', () => { if (jump.value) openBranch(jump.value); jump.value = ''; });

  // ── overview map ──
  let miniScale = 1;
  function drawMini() {
    const { w, h } = svgSize(); const width = mini.clientWidth || 200; const height = Math.round(width * h / w);
    miniCanvas.style.height = `${height}px`; const ratio = devicePixelRatio || 1;
    miniCanvas.width = width * ratio; miniCanvas.height = height * ratio; miniScale = width / w;
    const context = miniCanvas.getContext('2d')!; context.scale(ratio, ratio);
    const colour = getComputedStyle(root).getPropertyValue('--rel-family').trim() || '#e8b04a';
    context.fillStyle = colour; context.globalAlpha = 0.65;
    stage.querySelectorAll('.fc-n--person').forEach(node => {
      const match = node.getAttribute('transform')!.match(/translate\(([\d.-]+) ([\d.-]+)\)/);
      if (match) context.fillRect(Number(match[1]) * miniScale, Number(match[2]) * miniScale, 1.4, 1.4);
    });
  }
  function frameMini() {
    miniFrame.style.left = `${-x / scale * miniScale}px`; miniFrame.style.top = `${-y / scale * miniScale}px`;
    miniFrame.style.width = `${view.clientWidth / scale * miniScale}px`; miniFrame.style.height = `${view.clientHeight / scale * miniScale}px`;
  }
  const miniMove = (event: PointerEvent) => {
    const box = mini.getBoundingClientRect(); cancelAnimationFrame(flight);
    x = view.clientWidth / 2 - (event.clientX - box.left) / miniScale * scale;
    y = view.clientHeight / 2 - (event.clientY - box.top) / miniScale * scale; apply();
  };
  mini.addEventListener('pointerdown', event => { mini.setPointerCapture(event.pointerId); miniMove(event); });
  mini.addEventListener('pointermove', event => { if (mini.hasPointerCapture(event.pointerId)) miniMove(event); });

  const overlay = '[data-card], [data-mini], [data-zoombar], [data-crumbs]';
  const pointers = new Map<number, { x: number; y: number }>(); let pinch = 0; let travelled = 0;
  view.addEventListener('pointerdown', event => {
    if ((event.target as Element).closest(overlay)) return;
    cancelAnimationFrame(flight); pointers.set(event.pointerId, { x: event.clientX, y: event.clientY }); travelled = 0;
  });
  view.addEventListener('pointermove', event => {
    const previous = pointers.get(event.pointerId); if (!previous) return;
    const point = { x: event.clientX, y: event.clientY }; pointers.set(event.pointerId, point);
    if (pointers.size === 2) {
      const [a, b] = [...pointers.values()]; const distance = Math.hypot(a.x - b.x, a.y - b.y);
      if (pinch) { const box = view.getBoundingClientRect(); zoomAt(distance / pinch, (a.x + b.x) / 2 - box.left, (a.y + b.y) / 2 - box.top); }
      pinch = distance; travelled = 99; return;
    }
    travelled += Math.abs(point.x - previous.x) + Math.abs(point.y - previous.y);
    if (travelled > 4) { if (!view.hasPointerCapture(event.pointerId)) view.setPointerCapture(event.pointerId); view.classList.add('is-dragging'); }
    x += point.x - previous.x; y += point.y - previous.y; apply();
  });
  const release = (event: PointerEvent) => { pointers.delete(event.pointerId); pinch = 0; if (!pointers.size) view.classList.remove('is-dragging'); };
  view.addEventListener('pointerup', release); view.addEventListener('pointercancel', release);
  // Trackpad: two fingers move, pinch zooms. Mouse wheel: zooms. Decided once per gesture so it cannot flip midway.
  let wheelEnds = 0; let mouseWheel = false;
  view.addEventListener('wheel', event => {
    if ((event.target as Element).closest('[data-card]')) return;
    event.preventDefault();
    const now = performance.now();
    if (now > wheelEnds) {
      const deltaY = (event as WheelEvent & { wheelDeltaY?: number }).wheelDeltaY;
      mouseWheel = event.deltaX === 0 && (event.deltaMode !== 0 || (deltaY !== undefined && deltaY !== 0 && deltaY !== -3 * event.deltaY));
    }
    wheelEnds = now + 200;
    const box = view.getBoundingClientRect();
    if (event.ctrlKey || event.metaKey) zoomAt(Math.exp(-event.deltaY * 0.012), event.clientX - box.left, event.clientY - box.top);
    else if (mouseWheel) zoomAt(Math.exp(-event.deltaY * 0.0028), event.clientX - box.left, event.clientY - box.top);
    else { cancelAnimationFrame(flight); x -= event.deltaX; y -= event.deltaY; apply(); }
  }, { passive: false });
  view.addEventListener('dblclick', event => {
    if ((event.target as Element).closest(overlay)) return;
    const box = view.getBoundingClientRect(); const next = Math.min(2.2, scale * 2.2); const cx = event.clientX - box.left; const cy = event.clientY - box.top;
    fly({ scale: next, x: cx - (cx - x) * (next / scale), y: cy - (cy - y) * (next / scale) });
  });
  view.addEventListener('keydown', event => {
    const moves: Record<string, [number, number]> = { ArrowLeft: [120, 0], ArrowRight: [-120, 0], ArrowUp: [0, 120], ArrowDown: [0, -120] };
    if (moves[event.key]) { event.preventDefault(); x += moves[event.key][0]; y += moves[event.key][1]; apply(); }
    if (event.key === '+' || event.key === '=') zoomButton(1.4);
    if (event.key === '-') zoomButton(0.7);
    if (event.key === '0') fly(fitView());
    if (event.key === 'Escape') clear();
  });
  $('[data-zoom-in]').addEventListener('click', () => zoomButton(1.5));
  $('[data-zoom-out]').addEventListener('click', () => zoomButton(0.66));
  $('[data-fit]').addEventListener('click', () => { fly(fitView()); });
  $('[data-fullscreen]').addEventListener('click', () => { if (document.fullscreenElement) void document.exitFullscreen(); else void root.requestFullscreen?.(); });
  document.addEventListener('fullscreenchange', () => setTimeout(() => { if (!selected) fit(); }, 60));
  let framed = false;
  $('[data-share]').addEventListener('click', async event => {
    const button = event.currentTarget as HTMLButtonElement;
    try { if (navigator.share) await navigator.share({ url: location.href, title: document.title }); else { await navigator.clipboard.writeText(location.href); button.textContent = 'Link copied'; setTimeout(() => { button.textContent = 'Share'; }, 1600); } } catch { /* cancelled */ }
  });

  // ── data, loaded the first time it is needed ──
  let data: ChartData | null = null;
  let loading: Promise<ChartData> | null = null;
  const load = () => (loading ??= fetch(root.dataset.src!).then(response => response.json()).then(json => (data = json as ChartData)));
  const row = (id: string) => data?.n.find(item => item[0] === id);
  const label = (id: string) => (row(id)?.[1] as string | undefined) ?? id;

  // ── selection ──
  let selected = ''; let level = full;
  const trail = () => stage.querySelectorAll('.is-trail, .is-picked').forEach(node => node.classList.remove('is-trail', 'is-picked'));
  const branchesOf = (id: string) => {
    const out: string[] = [];
    for (let node = boxes.get(id); node?.dataset.up; node = boxes.get(node.dataset.up)) {
      const up = boxes.get(node.dataset.up);
      if (up?.classList.contains('fc-n--clan') || up?.classList.contains('fc-n--branch')) out.unshift(up.dataset.name!);
    }
    return out;
  };
  const relatives = (id: string) => {
    if (!data) return '<p class="fc-card__wait">Loading…</p>';
    const groups: Record<string, string[]> = { Parents: [], Partner: [], Siblings: [], Children: [], Ancestors: [], Descendants: [] };
    for (const [a, b, kind] of visibleEdges(data, level)) {
      if (a !== id && b !== id) continue;
      const other = a === id ? b : a;
      if (kind === 'parent') groups[b === id ? 'Parents' : 'Children'].push(other);
      else if (kind === 'spouse') groups.Partner.push(other);
      else if (kind === 'sibling') groups.Siblings.push(other);
      else groups[b === id ? 'Ancestors' : 'Descendants'].push(other);
    }
    const others = level >= full ? (row(id)?.[6] as Array<[string, string, string]> | undefined) ?? [] : [];
    const teams = level >= full ? (row(id)?.[8] as string[] | undefined) ?? [] : [];
    const ranks = level >= full ? (row(id)?.[9] as string[] | undefined) ?? [] : [];
    const chips = (ids: string[]) => `<p class="fc-chips">${ids.map(other => `<button type="button" data-pick="${esc(other)}">${esc(label(other))}</button>`).join('')}</p>`;
    return Object.entries(groups).filter(([, ids]) => ids.length).map(([title, ids]) => `<h3>${title}</h3>${chips(ids)}`).join('') +
      (teams.length ? `<h3>Teams</h3><p class="fc-card__path">${teams.map(esc).join(' · ')}</p>` : '') +
      (ranks.length ? `<h3>Rank</h3><p class="fc-card__path">${ranks.map(esc).join(' · ')}</p>` : '') +
      (others.length ? `<h3>Other relatives</h3><p class="fc-chips">${others.map(([other, name, relation]) => `<button type="button" data-pick="${esc(other)}" title="${esc(relation)}">${esc(name)}</button>`).join('')}</p>` : '');
  };
  const showCard = () => {
    const node = boxes.get(selected); if (!node) { card.hidden = true; return; }
    const profile = node.querySelector('a')?.getAttribute('href');
    const branches = branchesOf(selected);
    card.innerHTML = `<button type="button" class="fc-card__close" data-close aria-label="Close">×</button><h2>${esc(node.dataset.name!)}</h2>${branches.length ? `<p class="fc-card__path">${branches.map(esc).join(' · ')}</p>` : ''}${relatives(selected)}${profile ? `<a class="tool-button tool-button--primary" href="${esc(profile)}">Open profile</a>` : ''}`;
    card.hidden = false;
  };
  const clear = () => { selected = ''; trail(); card.hidden = true; history.replaceState(null, '', location.pathname + location.search); };
  const select = (id: string, move = true) => {
    const node = boxes.get(id); if (!node) return;
    trail(); selected = id; node.classList.add('is-picked');
    for (let current: string | undefined = id; current; current = boxes.get(current)?.dataset.up) { boxes.get(current)?.classList.add('is-trail'); linesTo.get(current)?.forEach(line => line.classList.add('is-trail')); }
    if (node.tagName === 'g' && !node.classList.contains('fc-dot')) showCard();
    if (data) showCard(); else void load().then(() => { if (selected === id) showCard(); });
    history.replaceState(null, '', `#c=${encodeURIComponent(id)}`);
    if (move) flyTo(id);
  };
  stage.addEventListener('click', event => {
    if (travelled > 4) { event.preventDefault(); return; }
    const node = (event.target as Element).closest<SVGElement>('[data-id]');
    if (!node) { clear(); return; }
    event.preventDefault();
    if (node.dataset.b) { clear(); openBranch(node.dataset.id!); return; }
    if (node.dataset.target) select(node.dataset.target); else if (node.dataset.name) select(node.dataset.id!, scale < 0.5);
  });
  card.addEventListener('click', event => {
    const target = event.target as HTMLElement;
    if (target.closest('[data-close]')) { clear(); return; }
    const pick = target.closest<HTMLElement>('[data-pick]'); if (pick) select(pick.dataset.pick!);
  });

  // ── search ──
  const close = () => { suggest.innerHTML = ''; };
  const find = (query: string) => {
    const words = fold(query).trim().split(/\s+/).filter(Boolean);
    if (!words.length) return [];
    return names.filter(item => words.every(word => item.folded.includes(word))).sort((a, b) => Number(b.folded.startsWith(words[0])) - Number(a.folded.startsWith(words[0]))).slice(0, 10);
  };
  input.addEventListener('input', () => { suggest.innerHTML = find(input.value).map(item => `<li><button type="button" data-suggest-pick="${esc(item.id)}">${esc(item.name)}<small>${esc(branchesOf(item.id).at(-1) ?? '')}</small></button></li>`).join(''); });
  input.addEventListener('keydown', event => { if (event.key !== 'Enter') return; const first = find(input.value)[0]; if (first) { event.preventDefault(); input.value = first.name; close(); select(first.id); } });
  suggest.addEventListener('click', event => {
    const button = (event.target as HTMLElement).closest<HTMLElement>('[data-suggest-pick]'); if (!button) return;
    const id = button.dataset.suggestPick!; input.value = names.find(item => item.id === id)?.name ?? ''; close(); select(id);
  });
  document.addEventListener('click', event => { if (!(event.target as Element).closest('.fc-search')) close(); });

  // ── spoilers ──
  const redraw = async () => {
    const value = spoilers?.value ?? '';
    level = value === '' ? full : Number(value);
    try { if (value) localStorage.setItem(storageKey, value); else localStorage.removeItem(storageKey); } catch { /* storage may be blocked */ }
    const chart = buildChart(await load(), level, root.dataset.title!, { familiesOnly: familiesOnly.checked });
    stage.innerHTML = chartSvg(chart, root.dataset.label!);
    index(); fit();
    if (selected && boxes.has(selected)) select(selected, false); else card.hidden = true;
  };
  spoilers?.addEventListener('change', () => { void redraw(); });
  familiesOnly.addEventListener('change', () => { void redraw(); });

  // ── start ──
  root.classList.add('fc--live');
  index();
  ({ scale, x, y } = opening()); apply();
  // The first report only repeats the size just measured.
  new ResizeObserver(() => { if (framed && !selected) fit(); drawMini(); frameMini(); framed = true; }).observe(view);
  let stored = ''; try { stored = localStorage.getItem(storageKey) ?? ''; } catch { /* storage may be blocked */ }
  const linked = () => new URLSearchParams(location.hash.slice(1)).get('c') ?? '';
  const finish = () => { const id = linked(); if (id !== selected && boxes.has(id)) select(id); };
  window.addEventListener('hashchange', finish);
  if (spoilers && stored && [...spoilers.options].some(option => option.value === stored)) { spoilers.value = stored; void redraw().then(finish); } else finish();
}
