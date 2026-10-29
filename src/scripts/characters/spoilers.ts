// Spoiler shield: one stored level per series. Everything spoiler-tagged is
// already in the HTML; this only folds or unfolds it.
const bar = document.querySelector<HTMLElement>('[data-spoiler-bar]');

if (bar) {
  const key = `animesparks:spoilers:${bar.dataset.series}`;
  const select = bar.querySelector<HTMLSelectElement>('[data-spoiler-select]')!;
  const note = bar.querySelector<HTMLElement>('[data-spoiler-note]')!;
  const defaultNote = note.textContent || '';
  const read = () => { try { return localStorage.getItem(key) || ''; } catch { return ''; } };
  const write = (value: string) => { try { if (value) localStorage.setItem(key, value); else localStorage.removeItem(key); } catch { /* storage may be blocked */ } };

  const apply = (id: string) => {
    const option = [...select.options].find(item => item.value === id) || select.options[0];
    const level = Number(option.dataset.idx ?? -1);
    select.value = option.value;
    document.querySelectorAll<HTMLDetailsElement>('details.spoiler[data-spoiler-idx]').forEach(details => {
      const unlocked = Number(details.dataset.spoilerIdx) <= level;
      if (unlocked) { details.open = true; details.dataset.unlocked = 'true'; }
      else if (details.dataset.unlocked === 'true') { details.open = false; delete details.dataset.unlocked; }
    });
    document.querySelectorAll<HTMLElement>('[data-spoiler-hide][data-spoiler-idx]').forEach(element => {
      element.toggleAttribute('hidden', Number(element.dataset.spoilerIdx) > level);
    });
    document.querySelectorAll<HTMLElement>('[data-spoiler-row]').forEach(row => {
      row.dataset.locked = String(Number(row.dataset.spoilerIdx) > level);
    });
    note.textContent = level >= 0 ? `Showing everything through: ${option.dataset.covers || option.textContent}` : defaultNote;
    document.dispatchEvent(new CustomEvent('spoilerchange', { detail: { level } }));
  };

  select.addEventListener('change', () => { write(select.value); apply(select.value); });
  apply(read());
}
