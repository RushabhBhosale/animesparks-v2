// Timeline explorer: story vs. release order, character and type filters,
// and spoiler awareness. All events are already in the HTML.
document.querySelectorAll<HTMLElement>('[data-timeline]').forEach(root => {
  const list = root.querySelector<HTMLOListElement>('[data-timeline-list]')!;
  const rows = [...list.children] as HTMLElement[];
  const empty = root.querySelector<HTMLElement>('[data-timeline-empty]')!;
  const note = root.querySelector<HTMLElement>('[data-order-note]');
  const character = root.querySelector<HTMLSelectElement>('[data-filter="character"]');
  const kind = root.querySelector<HTMLSelectElement>('[data-filter="kind"]');
  let order: 'story' | 'release' = 'story';
  const storyNote = note?.textContent || '';

  const render = () => {
    const key = order === 'story' ? 'story' : 'release';
    [...rows].sort((a, b) => Number(a.dataset[key]) - Number(b.dataset[key])).forEach(row => list.appendChild(row));
    const filtering = Boolean(character?.value || kind?.value);
    let shown = 0;
    for (const row of rows) {
      const matchesCharacter = !character?.value || (row.dataset.characters || '').split(' ').includes(character.value);
      const matchesKind = !kind?.value || row.dataset.kind === kind.value;
      // A filtered view never lists events the reader has not unlocked, so a filter cannot leak what a spoiler hides.
      const hiddenBySpoiler = filtering && row.dataset.locked === 'true';
      row.hidden = !(matchesCharacter && matchesKind) || hiddenBySpoiler;
      if (!row.hidden) shown++;
    }
    empty.hidden = shown > 0;
  };

  root.querySelectorAll<HTMLButtonElement>('[data-order]').forEach(button => button.addEventListener('click', () => {
    order = button.dataset.order as 'story' | 'release';
    root.querySelectorAll<HTMLButtonElement>('[data-order]').forEach(item => item.setAttribute('aria-pressed', String(item === button)));
    if (note) note.textContent = order === 'story' ? storyNote : 'Release order lists events as viewers meet them: anime episodes in broadcast order first, then events that only the manga has shown, in chapter order.';
    render();
  }));
  character?.addEventListener('change', render);
  kind?.addEventListener('change', render);
  document.addEventListener('spoilerchange', render);
  render();
});
