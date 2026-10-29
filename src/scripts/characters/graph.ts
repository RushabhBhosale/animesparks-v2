// Relationship diagram interactions: type filters and neighbour highlighting.
document.querySelectorAll<HTMLElement>('[data-graph-filters]').forEach(filters => {
  const wrap = filters.nextElementSibling as HTMLElement | null;
  const svg = wrap?.querySelector<SVGSVGElement>('[data-graph]');
  if (!svg) return;
  filters.addEventListener('click', event => {
    const button = (event.target as HTMLElement).closest<HTMLButtonElement>('button[data-type]');
    if (!button) return;
    const on = button.getAttribute('aria-pressed') !== 'true';
    button.setAttribute('aria-pressed', String(on));
    svg.querySelectorAll<SVGGElement>(`.edge[data-type="${button.dataset.type}"]`).forEach(edge => {
      if (on) edge.removeAttribute('data-filtered'); else edge.setAttribute('data-filtered', '');
    });
  });
  const focusOn = (id: string | null) => {
    svg.classList.toggle('has-focus', Boolean(id));
    const linked = new Set<string>();
    svg.querySelectorAll<SVGGElement>('.edge').forEach(edge => {
      const hit = Boolean(id) && (edge.dataset.a === id || edge.dataset.b === id);
      edge.classList.toggle('is-linked', hit);
      if (hit) { linked.add(edge.dataset.a!); linked.add(edge.dataset.b!); }
    });
    svg.querySelectorAll<SVGGElement>('.node').forEach(node => node.classList.toggle('is-linked', linked.has(node.dataset.id!)));
  };
  svg.addEventListener('mouseover', event => focusOn((event.target as Element).closest<SVGGElement>('.node')?.dataset.id ?? null));
  svg.addEventListener('mouseleave', () => focusOn(null));
  svg.addEventListener('focusin', event => focusOn((event.target as Element).closest<SVGGElement>('.node')?.dataset.id ?? null));
  svg.addEventListener('focusout', () => focusOn(null));
});

// Opening a relationship from a diagram line expands its card.
const openTarget = () => {
  const target = location.hash ? document.getElementById(decodeURIComponent(location.hash.slice(1))) : null;
  if (target instanceof HTMLDetailsElement) target.open = true;
  const parent = target?.closest('details.spoiler');
  if (parent instanceof HTMLDetailsElement && !parent.open) parent.open = true;
};
window.addEventListener('hashchange', openTarget);
openTarget();
