// Dropdown filters for the power index. Rows hidden by the spoiler shield stay hidden.
document.querySelectorAll<HTMLElement>('[data-rowfilter]').forEach(root => {
  const selects = [...root.querySelectorAll<HTMLSelectElement>('select[data-rf]')];
  const rows = [...root.querySelectorAll<HTMLElement>('[data-rf-row]')];
  const empty = root.querySelector<HTMLElement>('[data-rf-empty]');
  const apply = () => {
    let shown = 0;
    for (const row of rows) {
      const match = selects.every(select => !select.value || row.dataset[select.dataset.rf!] === select.value);
      row.toggleAttribute('data-rf-hidden', !match);
      if (match && !row.hidden) shown++;
    }
    if (empty) empty.hidden = shown > 0;
  };
  selects.forEach(select => select.addEventListener('change', apply));
  document.addEventListener('spoilerchange', apply);
  apply();
});
