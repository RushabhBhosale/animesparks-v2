// Client-side filtering for the character directory. The URL never changes,
// so filtered views cannot create indexable duplicates.
const root = document.querySelector<HTMLElement>('[data-directory]');

if (root) {
  const cards = [...root.querySelectorAll<HTMLElement>('[data-char-card]')];
  const query = root.querySelector<HTMLInputElement>('[data-filter-query]')!;
  const series = root.querySelector<HTMLSelectElement>('[data-filter-series]')!;
  const affiliation = root.querySelector<HTMLSelectElement>('[data-filter-affiliation]')!;
  const ability = root.querySelector<HTMLSelectElement>('[data-filter-ability]')!;
  const reset = root.querySelector<HTMLButtonElement>('[data-filter-reset]')!;
  const count = root.querySelector<HTMLElement>('[data-directory-count]')!;
  const empty = root.querySelector<HTMLElement>('[data-directory-empty]')!;
  const fold = (value: string) => value.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

  const apply = () => {
    const words = fold(query.value).split(/\s+/).filter(Boolean);
    let shown = 0;
    for (const card of cards) {
      const text = fold(card.dataset.search || '');
      const ok = words.every(word => text.includes(word))
        && (!series.value || card.dataset.series === series.value)
        && (!affiliation.value || (card.dataset.affiliations || '').split('|').includes(affiliation.value))
        && (!ability.value || (card.dataset.abilities || '').split('|').includes(ability.value));
      card.hidden = !ok;
      if (ok) shown++;
    }
    count.textContent = shown === cards.length ? `${cards.length} profiles` : `${shown} of ${cards.length} profiles`;
    empty.hidden = shown > 0;
  };
  [query, series, affiliation, ability].forEach(control => control.addEventListener('input', apply));
  reset.addEventListener('click', () => { query.value = ''; series.value = ''; affiliation.value = ''; ability.value = ''; apply(); query.focus(); });
  apply();
}
