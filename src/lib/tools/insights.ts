// Page-specific facts for the generated tool landing pages. Every sentence is
// computed from the data already on the page (episode flags, release dates,
// runtimes, chapter maps, MyAnimeList metadata), so two pages only share a
// sentence when their data genuinely matches. Nothing here is estimated or
// editorial; when a figure can't be derived, the sentence is left out.

import { formatDuration, formatHours } from './normalize.ts';

export interface Insights {
  /** Short label/value pairs for a facts table. */
  rows: Array<[string, string]>;
  /** Prose paragraphs built from the same data. */
  paragraphs: string[];
  /** Extra FAQ entries that depend on this page's numbers. */
  faq: Array<{ question: string; answer: string }>;
}

const plural = (count: number, one: string, many = `${one}s`) => `${count.toLocaleString('en-US')} ${count === 1 ? one : many}`;
const list = (items: string[]) => items.length > 1 ? `${items.slice(0, -1).join(', ')} and ${items.at(-1)}` : items[0] || '';
/** "45 min", "1 hour", "12.5 hours": readable for short and long totals alike. */
const hoursText = (minutes: number) => minutes < 90 ? formatDuration(minutes) : formatHours(minutes).replace(/^1 hours$/, '1 hour');
/** Names for a sentence: all of them when few, otherwise the first four then "and others". */
const names = (items: string[], max = 4) => items.length > max ? `${items.slice(0, max).join(', ')} and others` : list(items);
const span = (start: number, end: number) => start === end ? String(start) : `${start}–${end}`;
const percent = (part: number, whole: number) => whole ? Math.round((part / whole) * 100) : 0;
const ordinal = (n: number) => {
  const mod100 = n % 100;
  if (mod100 >= 11 && mod100 <= 13) return `${n}th`;
  return `${n}${({ 1: 'st', 2: 'nd', 3: 'rd' } as Record<number, string>)[n % 10] || 'th'}`;
};

/** Anime metadata shared by every family (all fields optional). */
export interface AnimeFacts {
  title: string;
  format?: string;
  year?: number | null;
  studios?: string[];
  genres?: string[];
  themes?: string[];
  sourceMaterial?: string;
  ageRating?: string;
  score?: number | null;
  popularity?: number | null;
  status?: string;
  episodes?: number | null;
}

const SOURCE_LABELS: Record<string, string> = {
  manga: 'a manga', 'light novel': 'a light novel', 'web novel': 'a web novel', novel: 'a novel', 'visual novel': 'a visual novel',
  'web manga': 'a web manga', '4-koma manga': 'a 4-koma manga', original: 'an original story', game: 'a game', 'mixed media': 'mixed media',
  'picture book': 'a picture book', 'card game': 'a card game', book: 'a book', music: 'a music project', radio: 'a radio programme',
};

/** One factual sentence about the series itself, from MyAnimeList metadata. */
export function aboutSentence(facts: AnimeFacts): string {
  const bits: string[] = [];
  const studios = (facts.studios || []).slice(0, 2);
  const genres = [...(facts.genres || [])].slice(0, 3).map(genre => genre.toLowerCase());
  const source = facts.sourceMaterial && SOURCE_LABELS[facts.sourceMaterial.toLowerCase()];
  const what = `${facts.title}${facts.year ? ` (${facts.year})` : ''}`;
  if (studios.length) bits.push(`animated by ${list(studios)}`);
  if (source) bits.push(facts.sourceMaterial!.toLowerCase() === 'original' ? 'written as an original story' : `adapted from ${source}`);
  if (genres.length) bits.push(`tagged ${list(genres)}`);
  const head = bits.length ? `${what} is ${list(bits)}.` : '';
  const tail: string[] = [];
  if (facts.score) tail.push(`averages ${facts.score.toFixed(2)}`);
  if (facts.popularity) tail.push(`ranks ${ordinal(facts.popularity)} by popularity`);
  return [head, tail.length ? `On MyAnimeList it ${list(tail)}.` : ''].filter(Boolean).join(' ');
}

// ── Filler lists ───────────────────────────────────────────────────────────

export interface FillerLike {
  title: string;
  status: string;
  durationMinutes: number | null;
  basis: 'curated' | 'provider';
  episodes: Array<{ n: number; type: string }>;
  summary: { total: number; skippable: number; fillerPercent: number; counts: Record<string, number> };
  arcs: Array<{ name: string; start: number; end: number; filler: number; recap: number }>;
}

const isSkippable = (type: string) => type === 'filler' || type === 'recap';

/** Contiguous runs of episodes matching a predicate. */
export function episodeRuns(episodes: Array<{ n: number; type: string }>, match: (type: string) => boolean) {
  const runs: Array<{ start: number; end: number }> = [];
  let open = false;
  for (const episode of [...episodes].sort((a, b) => a.n - b.n)) {
    if (!match(episode.type)) { open = false; continue; }
    const last = runs.at(-1);
    if (open && last && episode.n === last.end + 1) last.end = episode.n;
    else { runs.push({ start: episode.n, end: episode.n }); open = true; }
  }
  return runs.map(run => ({ ...run, length: run.end - run.start + 1 }));
}

export interface FillerCohortEntry { slug: string; fillerPercent: number; skippable: number; total: number }

export function fillerInsights(view: FillerLike & { slug: string }, cohort: FillerCohortEntry[], facts: AnimeFacts): Insights {
  const { summary } = view;
  const skipRuns = episodeRuns(view.episodes, isSkippable);
  const storyRuns = episodeRuns(view.episodes, type => !isSkippable(type) && type !== 'unknown');
  const longestStory = storyRuns.reduce<(typeof storyRuns)[number] | undefined>((best, run) => !best || run.length > best.length ? run : best, undefined);
  const longestSkip = skipRuns.reduce<(typeof skipRuns)[number] | undefined>((best, run) => !best || run.length > best.length ? run : best, undefined);
  const firstSkip = skipRuns[0];
  const lastSkip = skipRuns.at(-1);
  const total = summary.total;
  const thirds = [0, 1, 2].map(part => {
    const from = Math.floor((total * part) / 3) + 1;
    const to = Math.floor((total * (part + 1)) / 3);
    return { from, to, count: view.episodes.filter(episode => episode.n >= from && episode.n <= to && isSkippable(episode.type)).length };
  });
  const heaviest = thirds.reduce((best, third) => third.count > best.count ? third : best, thirds[0]);
  const peers = cohort.filter(item => item.skippable > 0 && item.total >= 12);
  const byPercent = [...peers].sort((a, b) => b.fillerPercent - a.fillerPercent || b.skippable - a.skippable);
  const byCount = [...peers].sort((a, b) => b.skippable - a.skippable || b.fillerPercent - a.fillerPercent);
  const rankPercent = byPercent.findIndex(item => item.slug === view.slug) + 1;
  const rankCount = byCount.findIndex(item => item.slug === view.slug) + 1;
  const saved = view.durationMinutes ? summary.skippable * view.durationMinutes : 0;
  const rows: Array<[string, string]> = [];
  const paragraphs: string[] = [];
  const faq: Insights['faq'] = [];
  const airing = view.status === 'airing';

  if (!summary.skippable) {
    rows.push(['Filler or recap episodes', 'None flagged']);
    if (longestStory) rows.push(['Longest unbroken story run', `Episodes ${span(longestStory.start, longestStory.end)} (${plural(longestStory.length, 'episode')})`]);
    paragraphs.push(`${view.title} has no filler: none of its ${plural(total, 'episode')} is flagged as filler or recap${view.basis === 'provider' ? ' on MyAnimeList' : ''}, so there is nothing to skip and the whole run counts as story.${airing ? ' The series is still airing, and this page covers the episodes aired so far.' : ''}`);
    const about = aboutSentence(facts);
    if (about) paragraphs.push(about);
    return { rows, paragraphs, faq };
  }

  rows.push(['Skippable episodes', `${summary.skippable} of ${total} (${summary.fillerPercent}%)`]);
  if (firstSkip) rows.push(['First filler or recap', firstSkip.start === 1 ? 'Episode 1' : `Episode ${firstSkip.start}`]);
  if (lastSkip) rows.push(['Last filler or recap', `Episode ${lastSkip.end}`]);
  rows.push(['Separate stretches', String(skipRuns.length)]);
  if (longestSkip) rows.push(['Longest stretch', `Episodes ${span(longestSkip.start, longestSkip.end)} (${plural(longestSkip.length, 'episode')})`]);
  if (longestStory) rows.push(['Longest story-only run', `Episodes ${span(longestStory.start, longestStory.end)} (${plural(longestStory.length, 'episode')})`]);
  if (saved) rows.push(['Time saved by skipping', formatDuration(saved)]);
  if (rankPercent && peers.length >= 10) rows.push(['Filler share rank', `${ordinal(rankPercent)} of ${peers.length} lists with filler`]);

  // Where it sits.
  const where: string[] = [];
  if (firstSkip) {
    where.push(firstSkip.start === 1
      ? `${view.title} opens with ${firstSkip.length > 1 ? `${firstSkip.length} skippable episodes` : 'a skippable episode'} (episodes ${span(firstSkip.start, firstSkip.end)}).`
      : `The first skippable episode is ${firstSkip.start}, so episodes 1–${firstSkip.start - 1} can be watched straight through before any filler or recap appears.`);
  }
  if (longestStory && longestStory.length >= 10 && (!firstSkip || longestStory.start !== 1 || longestStory.end !== firstSkip.start - 1)) {
    where.push(`The longest unbroken run of story episodes is ${span(longestStory.start, longestStory.end)} (${plural(longestStory.length, 'episode')}).`);
  }
  if (lastSkip && lastSkip.end < total) {
    const tail = total - lastSkip.end;
    where.push(tail === 1 ? `Episode ${total}, the final one, is all story.` : `After episode ${lastSkip.end}, the last ${tail} episodes are all story.`);
  } else if (lastSkip && lastSkip.end === total && lastSkip.length >= 3) {
    where.push(`The list ends inside a filler stretch (${span(lastSkip.start, lastSkip.end)})${airing ? ', which may change as new episodes air' : ''}.`);
  }
  if (summary.skippable >= 6 && heaviest.count > 0) {
    const share = percent(heaviest.count, summary.skippable);
    if (share >= 50) where.push(`${share}% of the skippable episodes fall in episodes ${span(heaviest.from, heaviest.to)}, the ${['first', 'middle', 'final'][thirds.indexOf(heaviest)]} third of the series.`);
  }
  if (where.length) paragraphs.push(where.join(' '));

  // Shape.
  const longRuns = skipRuns.filter(run => run.length >= 3);
  const shape = skipRuns.length === 1
    ? `All ${plural(summary.skippable, 'skippable episode')} come in one block (${span(skipRuns[0].start, skipRuns[0].end)}).`
    : `The ${plural(summary.skippable, 'skippable episode')} come in ${plural(skipRuns.length, 'separate stretch', 'separate stretches')}: ${longRuns.length ? `${longRuns.length} of them ${longRuns.length === 1 ? 'runs' : 'run'} three or more episodes in a row, and the longest is ${span(longestSkip!.start, longestSkip!.end)}` : `none runs longer than two episodes, so the filler is scattered rather than arc-length`}.`;
  const counts = summary.counts;
  const mix = [counts.filler ? plural(counts.filler, 'filler episode') : '', counts.recap ? plural(counts.recap, 'recap') : '', counts.mixed ? `${plural(counts.mixed, 'mixed canon/filler episode')} (worth watching)` : ''].filter(Boolean);
  paragraphs.push(`${shape} The breakdown is ${list(mix)}.${saved ? ` Skipping the filler and recaps saves about ${formatDuration(saved)}.` : ''}`);

  // Arcs.
  if (view.arcs.length >= 3) {
    const clean = view.arcs.filter(arc => !arc.filler && !arc.recap);
    const allFiller = view.arcs.filter(arc => arc.filler + arc.recap === arc.end - arc.start + 1);
    const heavy = [...view.arcs].filter(arc => arc.filler + arc.recap > 0).sort((a, b) => (b.filler + b.recap) - (a.filler + a.recap))[0];
    const arcBits = [`Of its ${view.arcs.length} story arcs, ${clean.length} contain no filler or recap at all`];
    if (allFiller.length) arcBits.push(`${allFiller.length === 1 ? 'one is' : `${allFiller.length} are`} filler from start to finish (${names(allFiller.map(arc => arc.name))})`);
    if (heavy && !allFiller.includes(heavy)) arcBits.push(`the arc with the most skippable episodes is ${heavy.name}, with ${heavy.filler + heavy.recap} of ${heavy.end - heavy.start + 1}`);
    paragraphs.push(`${arcBits.join('; ')}.`);
  }

  // Comparison.
  if (rankPercent && peers.length >= 10) {
    paragraphs.push(`Across the ${peers.length} series with filler tracked on AnimeSparks, ${view.title} has the ${ordinal(rankPercent)} highest filler share (${summary.fillerPercent}%) and the ${ordinal(rankCount)} highest number of skippable episodes (${summary.skippable}).`);
  }
  const about = aboutSentence(facts);
  if (about) paragraphs.push(`${about}${airing ? ' It is still airing, so the list covers only the episodes aired so far.' : ''}`);

  // FAQ that depends on this page's numbers.
  if (firstSkip) {
    faq.push({
      question: `When does the first filler episode appear in ${view.title}?`,
      answer: firstSkip.start === 1
        ? `Right at the start: episodes ${span(firstSkip.start, firstSkip.end)} are flagged as ${firstSkip.length > 1 ? 'filler or recap' : view.episodes.find(episode => episode.n === 1)?.type || 'filler'}.`
        : `Episode ${firstSkip.start}. Episodes 1–${firstSkip.start - 1} are all story, so you can start watching without checking the list.`,
    });
  }
  faq.push({
    question: `Can I skip all the filler in ${view.title} and still follow the story?`,
    answer: `Yes. The ${plural(summary.skippable, 'flagged episode')} (${summary.fillerPercent}% of the series) come in ${plural(skipRuns.length, 'stretch', 'stretches')}${longestSkip && longestSkip.length >= 3 ? `, the longest being episodes ${span(longestSkip.start, longestSkip.end)}` : ''}. The filler-free list above has ${plural(total - summary.skippable, 'episode')}${view.durationMinutes ? `, about ${formatDuration((total - summary.skippable) * view.durationMinutes)}` : ''}.`
      + (counts.mixed ? ` Mixed canon/filler episodes are kept because they contain story.` : ''),
  });
  if (rankPercent && peers.length >= 10) {
    faq.push({
      question: `Does ${view.title} have more filler than other anime?`,
      answer: `Among the ${peers.length} series with filler on AnimeSparks, ${view.title} ranks ${ordinal(rankPercent)} by filler share (${summary.fillerPercent}%) and ${ordinal(rankCount)} by number of skippable episodes (${summary.skippable}).`,
    });
  }
  return { rows, paragraphs, faq };
}

// ── Watch orders ───────────────────────────────────────────────────────────

export interface OrderEntry {
  title: string;
  format: string;
  role: string;
  status: string;
  year: number | null;
  airedFrom: string | null;
  episodes: number | null;
  watchEpisodes: number | null;
  watchMinutes: number | null;
  durationMinutes: number | null;
}

export interface OrderLike {
  title: string;
  releaseOrder: OrderEntry[];
  totals: { all: { minutes: number; episodes: number }; main: { minutes: number; episodes: number } };
}

const FORMAT_NAMES: Record<string, [string, string]> = {
  tv: ['TV series', 'TV series'], movie: ['movie', 'movies'], ova: ['OVA', 'OVAs'], ona: ['ONA', 'ONAs'],
  special: ['special', 'specials'], 'tv-special': ['TV special', 'TV specials'], music: ['music video', 'music videos'], other: ['other entry', 'other entries'],
};

export function orderInsights(order: OrderLike, cohortMinutes: number[], facts: AnimeFacts | undefined, dailyHours = 2): Insights {
  const entries = order.releaseOrder;
  const main = entries.filter(entry => entry.role === 'main');
  const side = entries.filter(entry => entry.role === 'side');
  const recap = entries.filter(entry => entry.role === 'recap');
  const dated = entries.filter(entry => entry.year);
  const first = dated.reduce<OrderEntry | undefined>((best, entry) => !best || entry.year! < best.year! ? entry : best, undefined);
  const last = dated.filter(entry => entry.status !== 'upcoming').reduce<OrderEntry | undefined>((best, entry) => !best || entry.year! >= best.year! ? entry : best, undefined);
  const upcoming = entries.filter(entry => entry.status === 'upcoming');
  const airing = entries.filter(entry => entry.status === 'airing');
  const timed = entries.filter(entry => entry.watchMinutes);
  const longest = timed.reduce<OrderEntry | undefined>((best, entry) => !best || entry.watchMinutes! > best.watchMinutes! ? entry : best, undefined);
  const mainFirst = main[0] || entries[0];
  const allMinutes = order.totals.all.minutes;
  const mainMinutes = order.totals.main.minutes;
  const days = (minutes: number) => Math.max(1, Math.ceil(minutes / 60 / dailyHours));
  const rows: Array<[string, string]> = [];
  const paragraphs: string[] = [];
  const faq: Insights['faq'] = [];

  rows.push(['Main-story entries', `${main.length} of ${entries.length}`]);
  if (side.length) rows.push(['Side stories', String(side.length)]);
  if (recap.length) rows.push(['Recap entries', String(recap.length)]);
  if (first && last) rows.push(['Release span', first.year === last.year ? String(first.year) : `${first.year}–${last.year}${last.year! > first.year! ? ` (${plural(last.year! - first.year!, 'year')})` : ''}`]);
  if (longest) rows.push(['Longest entry', `${longest.title} (${formatDuration(longest.watchMinutes!)})`]);
  if (mainMinutes && allMinutes) rows.push(['Main story share of watch time', `${percent(mainMinutes, allMinutes)}%`]);
  if (allMinutes) rows.push([`Days at ${dailyHours} hours a day`, mainMinutes && days(mainMinutes) !== days(allMinutes) ? `${days(allMinutes)} (everything) · ${days(mainMinutes)} (main story)` : String(days(allMinutes))]);

  // Where to start and how big it is.
  const start: string[] = [];
  if (mainFirst) start.push(`Start with ${mainFirst.title}${mainFirst.year ? ` (${mainFirst.year})` : ''}${mainFirst.watchEpisodes && mainFirst.watchEpisodes > 1 ? `, ${plural(mainFirst.watchEpisodes, 'episode')}` : ''}.`);
  if (main.length > 1) {
    const kinds = new Map<string, number>();
    for (const entry of main) kinds.set(entry.format, (kinds.get(entry.format) || 0) + 1);
    const text = [...kinds].map(([format, count]) => plural(count, FORMAT_NAMES[format]?.[0] || 'entry', FORMAT_NAMES[format]?.[1] || 'entries'));
    start.push(`The main story is ${list(text)} in release order${mainMinutes ? `, about ${hoursText(mainMinutes)} in total` : ''}.`);
  }
  if (side.length + recap.length) {
    const other = side.length + recap.length;
    const saves = allMinutes && mainMinutes && allMinutes > mainMinutes ? `, which saves ${hoursText(allMinutes - mainMinutes)}` : '';
    const subject = side.length && recap.length
      ? `The other ${other} entries (${side.length} side ${side.length === 1 ? 'story' : 'stories'} and ${plural(recap.length, 'recap')}) can`
      : other === 1
        ? `The other entry is ${recap.length ? 'a recap' : 'a side story'} and can`
        : `The other ${other} entries are ${recap.length ? 'recaps' : 'side stories'} and can`;
    start.push(`${subject} be skipped on a first watch${saves}.`);
  }
  if (start.length) paragraphs.push(start.join(' '));

  // Time span and scale.
  const scale: string[] = [];
  if (first && last && first !== last) scale.push(`The franchise spans ${first.year === last.year ? `${first.year}` : `${first.year} (${first.title}) to ${last.year} (${last.title})`}.`);
  if (longest && entries.length > 2 && longest !== mainFirst) scale.push(`The single longest entry is ${longest.title}, at ${formatDuration(longest.watchMinutes!)}.`);
  if (airing.length) scale.push(`${list(airing.slice(0, 2).map(entry => entry.title))} ${airing.length === 1 ? 'is' : 'are'} still airing, so the totals grow as episodes air.`);
  if (upcoming.length) scale.push(`${plural(upcoming.length, 'entry', 'entries')} ${upcoming.length === 1 ? 'is' : 'are'} announced but not yet released${upcoming.length <= 2 ? ` (${list(upcoming.map(entry => entry.title))})` : ''}, and ${upcoming.length === 1 ? 'is' : 'are'} not counted in the totals.`);
  if (allMinutes && cohortMinutes.length >= 10) {
    const smaller = cohortMinutes.filter(minutes => minutes < allMinutes).length;
    const share = Math.round((smaller / cohortMinutes.length) * 100);
    scale.push(`At ${hoursText(allMinutes)}, it is longer than ${share}% of the ${cohortMinutes.length} franchise guides on AnimeSparks.`);
  }
  if (allMinutes) scale.push(mainMinutes && mainMinutes < allMinutes && days(mainMinutes) !== days(allMinutes)
    ? `At ${dailyHours} hours a day, everything takes about ${plural(days(allMinutes), 'day')} and the main story about ${plural(days(mainMinutes), 'day')}.`
    : `At ${dailyHours} hours a day, either route takes about ${plural(days(allMinutes), 'day')}.`);
  if (scale.length) paragraphs.push(scale.join(' '));

  const about = facts ? aboutSentence(facts) : '';
  if (about) paragraphs.push(about);

  faq.push({
    question: `Where should I start with ${order.title}?`,
    answer: mainFirst ? `Start with ${mainFirst.title}${mainFirst.year ? ` (${mainFirst.year})` : ''}, the first main-story entry in release order.${main.length > 1 ? ` ${plural(main.length - 1, 'main-story entry', 'main-story entries')} follow.` : ''}` : 'Start with the first entry in the release-order list.',
  });
  if (allMinutes) {
    faq.push({
      question: `How long does it take to watch all of ${order.title}?`,
      answer: `About ${hoursText(allMinutes)} (${plural(order.totals.all.episodes, 'episode')}) for all ${entries.length} entries${mainMinutes && mainMinutes < allMinutes ? `, or ${hoursText(mainMinutes)} for the main story alone` : ''}. At ${dailyHours} hours a day that is roughly ${plural(days(allMinutes), 'day')}.`,
    });
  }
  if (side.length + recap.length) {
    faq.push({
      question: `Do I need to watch the side stories and recaps in ${order.title}?`,
      answer: `No. Of ${entries.length} entries, ${main.length} are main story. The other ${side.length + recap.length} ${list([side.length ? `${side.length} ${side.length === 1 ? 'is a side story' : 'are side stories'}` : '', recap.length ? `${recap.length} ${recap.length === 1 ? 'is a recap' : 'are recaps'}` : ''].filter(Boolean))}, so skipping them loses no main plot.`,
    });
  }
  return { rows, paragraphs, faq };
}

// ── Movies ─────────────────────────────────────────────────────────────────

export interface MovieLike {
  title: string;
  role: string;
  status: string;
  year: number | null;
  airedFrom: string | null;
  durationMinutes: number | null;
  watchMinutes?: number | null;
  during?: { title: string };
  score?: number | null;
}

export function movieInsights(name: string, movies: MovieLike[], facts?: AnimeFacts): Insights {
  const released = movies.filter(movie => movie.status !== 'upcoming' && movie.year);
  const upcoming = movies.filter(movie => movie.status === 'upcoming');
  const timed = released.filter(movie => movie.durationMinutes);
  const longest = timed.reduce<MovieLike | undefined>((best, movie) => !best || movie.durationMinutes! > best.durationMinutes! ? movie : best, undefined);
  const shortest = timed.reduce<MovieLike | undefined>((best, movie) => !best || movie.durationMinutes! < best.durationMinutes! ? movie : best, undefined);
  const scored = released.filter(movie => movie.score);
  const top = scored.reduce<MovieLike | undefined>((best, movie) => !best || movie.score! > best.score! ? movie : best, undefined);
  const bottom = scored.reduce<MovieLike | undefined>((best, movie) => !best || movie.score! < best.score! ? movie : best, undefined);
  const main = movies.filter(movie => movie.role === 'main');
  const years = released.map(movie => movie.year!);
  const rows: Array<[string, string]> = [];
  const paragraphs: string[] = [];
  const faq: Insights['faq'] = [];

  // Gaps between films.
  const sorted = [...released].sort((a, b) => a.year! - b.year!);
  let gap: { from: MovieLike; to: MovieLike; years: number } | undefined;
  for (let index = 1; index < sorted.length; index++) {
    const years = sorted[index].year! - sorted[index - 1].year!;
    if (!gap || years > gap.years) gap = { from: sorted[index - 1], to: sorted[index], years };
  }
  // Films per TV series.
  const perSeries = new Map<string, number>();
  for (const movie of movies) if (movie.during) perSeries.set(movie.during.title, (perSeries.get(movie.during.title) || 0) + 1);
  const busiest = [...perSeries].sort((a, b) => b[1] - a[1])[0];

  if (years.length) rows.push(['Release span', Math.min(...years) === Math.max(...years) ? String(years[0]) : `${Math.min(...years)}–${Math.max(...years)}`]);
  const spread = longest && shortest ? Math.round(longest.durationMinutes! - shortest.durationMinutes!) : 0;
  if (longest && shortest && spread >= 5) {
    rows.push(['Longest', `${longest.title} (${Math.round(longest.durationMinutes!)} min)`]);
    rows.push(['Shortest', `${shortest.title} (${Math.round(shortest.durationMinutes!)} min)`]);
  } else if (longest) rows.push(['Runtime', `about ${Math.round(longest.durationMinutes!)} min each`]);
  if (top && scored.length >= 3) rows.push(['Highest rated on MyAnimeList', `${top.title} (${top.score!.toFixed(2)})`]);
  if (bottom && scored.length >= 3 && bottom !== top) rows.push(['Lowest rated on MyAnimeList', `${bottom.title} (${bottom.score!.toFixed(2)})`]);
  if (gap && gap.years >= 2) rows.push(['Longest gap between films', `${plural(gap.years, 'year')} (${gap.from.year}–${gap.to.year})`]);
  rows.push(['Main-story films', `${main.length} of ${movies.length}`]);

  const shape: string[] = [];
  if (years.length) shape.push(`${plural(released.length, 'film')} ${released.length === 1 ? 'was' : 'were'} released between ${Math.min(...years)} and ${Math.max(...years)}${upcoming.length ? `, with ${plural(upcoming.length, 'more')} announced` : ''}.`);
  if (gap && gap.years >= 2 && released.length >= 3) shape.push(`The longest wait between films was ${plural(gap.years, 'year')}, from ${gap.from.title} (${gap.from.year}) to ${gap.to.title} (${gap.to.year}).`);
  if (busiest && busiest[1] >= 2 && perSeries.size >= 2) shape.push(`${plural(busiest[1], 'film')} came out while ${busiest[0]} was the current TV series, more than any other.`);
  if (shape.length) paragraphs.push(shape.join(' '));

  const detail: string[] = [];
  if (longest && shortest && spread >= 10) detail.push(`Runtimes range from ${Math.round(shortest.durationMinutes!)} minutes (${shortest.title}) to ${Math.round(longest.durationMinutes!)} minutes (${longest.title}).`);
  if (top && scored.length >= 3) detail.push(`${top.title} has the highest MyAnimeList score of the group (${top.score!.toFixed(2)})${bottom && bottom !== top ? `, and ${bottom.title} the lowest (${bottom.score!.toFixed(2)})` : ''}.`);
  detail.push(main.length
    ? `${plural(main.length, 'film')} ${main.length === 1 ? 'is' : 'are'} linked into the main storyline; the other ${movies.length - main.length} are side stories or retellings.`
    : 'None of the films are linked into the main storyline, so they work as standalone side stories.');
  paragraphs.push(detail.join(' '));
  const about = facts ? aboutSentence(facts) : '';
  if (about) paragraphs.push(about);

  if (top && scored.length >= 3) {
    faq.push({ question: `What is the best ${name} movie?`, answer: `By MyAnimeList score, ${top.title} (${top.score!.toFixed(2)}) is the highest rated of the ${released.length} released films. Scores are community averages and change over time.` });
  }
  if (longest && shortest && spread >= 10) {
    faq.push({ question: `Which ${name} movie is the longest?`, answer: `${longest.title} runs ${Math.round(longest.durationMinutes!)} minutes, the longest in the list. The shortest is ${shortest.title} at ${Math.round(shortest.durationMinutes!)} minutes.` });
  }
  if (movies[0]) {
    faq.push({ question: `Which ${name} movie should I watch first?`, answer: `${movies[0].title}${movies[0].year ? ` (${movies[0].year})` : ''} is the earliest release.${movies[0].during ? ` It came out during ${movies[0].during.title}, so watch that series up to that point first.` : ''}${main.length && main[0] !== movies[0] ? ` If you only want main-story films, start with ${main[0].title}.` : ''}` });
  }
  return { rows, paragraphs, faq };
}

// ── Manga chapter guides ───────────────────────────────────────────────────

export interface MangaSeasonRow {
  title: string;
  episodes: number;
  first: number;
  last: number;
}

export interface MangaLike {
  status?: string;
  chapters?: number | null;
  volumes?: number | null;
  publishedFrom?: string | null;
  publishedTo?: string | null;
  authors?: string[];
  serializations?: string[];
}

const MANGA_STATUS: Record<string, string> = { publishing: 'still publishing', finished: 'finished', hiatus: 'on hiatus', discontinued: 'discontinued' };
const cleanAuthor = (name: string) => name.replace(/\s*\([^)]*\)/g, '').replace(/^(.+?),\s*(.+)$/, '$2 $1').trim();

export function mangaInsights(name: string, rows: MangaSeasonRow[], manga: MangaLike | undefined, continueFrom: number | undefined): Insights {
  const covered = rows.reduce((sum, row) => sum + Math.max(0, row.last - row.first + 1), 0);
  const episodes = rows.reduce((sum, row) => sum + row.episodes, 0);
  const lastChapter = Math.max(...rows.map(row => row.last));
  const perEpisode = episodes ? covered / episodes : 0;
  const widest = rows.reduce((best, row) => (row.last - row.first) > (best.last - best.first) ? row : best, rows[0]);
  const narrowest = rows.reduce((best, row) => (row.last - row.first) < (best.last - best.first) ? row : best, rows[0]);
  const rowsOut: Array<[string, string]> = [];
  const paragraphs: string[] = [];
  const faq: Insights['faq'] = [];
  const total = manga?.chapters || 0;
  const fromYear = manga?.publishedFrom?.slice(0, 4);
  const toYear = manga?.publishedTo?.slice(0, 4);
  const authors = [...new Set((manga?.authors || []).map(cleanAuthor).filter(Boolean))].slice(0, 2);

  rowsOut.push(['Chapters adapted', `${covered.toLocaleString('en-US')} across ${plural(episodes, 'episode')}`]);
  if (perEpisode) rowsOut.push(['Pace', `about ${(Math.round(perEpisode * 10) / 10).toString()} chapters per episode`]);
  if (rows.length > 1) rowsOut.push(['Densest season', `${widest.title} (${plural(widest.last - widest.first + 1, 'chapter')})`]);
  if (total && lastChapter) rowsOut.push(['Adapted so far', `${percent(lastChapter, total)}% of the manga`]);
  if (authors.length) rowsOut.push(['Author', list(authors)]);
  if (manga?.serializations?.length) rowsOut.push(['Serialized in', list(manga.serializations.slice(0, 2))]);

  const pace: string[] = [];
  pace.push(`${rows.length > 1 ? `Across ${rows.length} seasons, the` : 'The'} ${name} anime adapts chapters ${rows.map(row => row.first).reduce((a, b) => Math.min(a, b))}–${lastChapter}${perEpisode ? `, roughly ${(Math.round(perEpisode * 10) / 10).toString()} chapters per episode` : ''}.`);
  if (rows.length > 1 && widest !== narrowest) pace.push(`${widest.title} packs in the most source material (${plural(widest.last - widest.first + 1, 'chapter')}), while ${narrowest.title} covers the least (${plural(narrowest.last - narrowest.first + 1, 'chapter')}).`);
  if (pace.length) paragraphs.push(pace.join(' '));

  const status: string[] = [];
  if (total && continueFrom) {
    const left = Math.max(0, total - continueFrom + 1);
    status.push(left
      ? `Starting at chapter ${continueFrom} leaves ${plural(left, 'chapter')}${manga?.volumes ? ` of a ${manga.volumes}-volume series` : ''} to read, about ${100 - percent(lastChapter, total)}% of the manga.`
      : `The anime has already reached the end of the manga's ${total.toLocaleString('en-US')} chapters.`);
  }
  if (manga?.status && MANGA_STATUS[manga.status]) status.push(manga.status === 'finished' ? 'The manga is complete, so you can read straight through to the ending.' : manga.status === 'publishing' ? 'The manga is still publishing, so new chapters keep arriving after you catch up.' : `The manga is ${MANGA_STATUS[manga.status]} on MyAnimeList.`);
  if (authors.length || fromYear) status.push(`It ${authors.length ? `is written by ${list(authors)}` : 'was published'}${manga?.serializations?.length ? ` and serialized in ${list(manga.serializations.slice(0, 2))}` : ''}${fromYear ? `, running from ${fromYear}${manga?.status === 'finished' && toYear ? ` to ${toYear}` : ' onward'}` : ''}.`);
  if (status.length) paragraphs.push(status.join(' '));

  faq.push({ question: `How many ${name} manga chapters does the anime cover?`, answer: `${covered.toLocaleString('en-US')} chapters (chapters ${Math.min(...rows.map(row => row.first))}–${lastChapter}) across ${plural(episodes, 'episode')}${total ? `, about ${percent(lastChapter, total)}% of the ${total.toLocaleString('en-US')}-chapter manga` : ''}.` });
  if (rows.length > 1) faq.push({ question: `Which ${name} season adapts the most manga?`, answer: `${widest.title}, with ${plural(widest.last - widest.first + 1, 'chapter')} (chapters ${widest.first}–${widest.last}). ${narrowest.title} adapts the fewest, ${plural(narrowest.last - narrowest.first + 1, 'chapter')}.` });
  if (total && continueFrom) faq.push({ question: `How much of the ${name} manga is left after the anime?`, answer: `Reading from chapter ${continueFrom}, about ${plural(Math.max(0, total - continueFrom + 1), 'chapter')} remain${manga?.status === 'publishing' ? ' so far, with more being published' : ''}.` });
  return { rows: rowsOut, paragraphs, faq };
}

// ── Arc guides ─────────────────────────────────────────────────────────────

export interface ArcRowLike {
  name: string;
  length: number;
  filler: number;
  chapters: [number, number] | null;
  overallStart: number;
  overallEnd: number;
  isFiller: boolean;
}

export function arcInsights(name: string, arcs: ArcRowLike[], seasonCount: number): Insights {
  const total = arcs.reduce((sum, arc) => sum + arc.length, 0);
  const lengths = arcs.map(arc => arc.length).sort((a, b) => a - b);
  const median = lengths.length % 2 ? lengths[(lengths.length - 1) / 2] : (lengths[lengths.length / 2 - 1] + lengths[lengths.length / 2]) / 2;
  const longest = arcs.reduce((best, arc) => arc.length > best.length ? arc : best, arcs[0]);
  const shortest = arcs.reduce((best, arc) => arc.length < best.length ? arc : best, arcs[0]);
  const shortestTied = arcs.filter(arc => arc.length === shortest.length);
  const fillerArcs = arcs.filter(arc => arc.isFiller);
  const fillerEpisodes = fillerArcs.reduce((sum, arc) => sum + arc.length, 0);
  const firstFiller = fillerArcs[0];
  const withChapters = arcs.filter(arc => arc.chapters);
  const dense = withChapters.reduce<ArcRowLike | undefined>((best, arc) => {
    const ratio = (arc.chapters![1] - arc.chapters![0] + 1) / arc.length;
    return !best || ratio > (best.chapters![1] - best.chapters![0] + 1) / best.length ? arc : best;
  }, undefined);
  const rows: Array<[string, string]> = [];
  const paragraphs: string[] = [];
  const faq: Insights['faq'] = [];

  rows.push(['Average arc length', `${(Math.round((total / arcs.length) * 10) / 10).toString()} episodes (median ${median})`]);
  rows.push(['Longest arc', `${longest.name} (${plural(longest.length, 'episode')})`]);
  rows.push(['Shortest arc', shortestTied.length > 1 ? `${plural(shortestTied.length, 'arc')} of ${plural(shortest.length, 'episode')} each` : `${shortest.name} (${plural(shortest.length, 'episode')})`]);
  if (fillerArcs.length) rows.push(['Filler arcs', `${fillerArcs.length} (${plural(fillerEpisodes, 'episode')}, ${percent(fillerEpisodes, total)}% of the series)`]);
  if (dense && withChapters.length >= 3) rows.push(['Most manga per episode', dense.name]);

  const shape: string[] = [];
  shape.push(`The ${arcs.length} arcs average ${(Math.round((total / arcs.length) * 10) / 10).toString()} episodes each, but the spread is wide: ${longest.name} runs ${plural(longest.length, 'episode')} ${shortestTied.length > 1 ? `while ${plural(shortestTied.length, 'arc')} last only ${plural(shortest.length, 'episode')} each` : `while ${shortest.name} lasts only ${plural(shortest.length, 'episode')}`}.`);
  const long = arcs.filter(arc => arc.length >= 20).length;
  const short = arcs.filter(arc => arc.length <= 6).length;
  if (long || short) shape.push(`${long ? `${plural(long, 'arc')} ${long === 1 ? 'runs' : 'run'} 20 episodes or more` : ''}${long && short ? ', and ' : ''}${short ? `${plural(short, 'arc')} ${short === 1 ? 'takes' : 'take'} six episodes or fewer` : ''}.`);
  if (seasonCount > 1) shape.push(`They are spread over ${seasonCount} seasons, so arcs that cross a season break are shown once with both parts.`);
  paragraphs.push(shape.join(' '));

  if (fillerArcs.length) {
    paragraphs.push(`${plural(fillerArcs.length, 'arc')} (${names(fillerArcs.map(arc => arc.name))}) ${fillerArcs.length === 1 ? 'is' : 'are'} entirely filler, ${plural(fillerEpisodes, 'episode')} or ${percent(fillerEpisodes, total)}% of the series. The first one is ${firstFiller.name}, starting at episode ${firstFiller.overallStart}. Skipping all filler arcs leaves ${plural(total - fillerEpisodes, 'episode')} of story.`);
  } else {
    paragraphs.push(`None of the ${arcs.length} arcs is filler from start to finish, so every arc here moves the main story forward.`);
  }
  if (dense && withChapters.length >= 3) {
    const ratio = (dense.chapters![1] - dense.chapters![0] + 1) / dense.length;
    paragraphs.push(`${dense.name} is the densest adaptation: chapters ${span(dense.chapters![0], dense.chapters![1])} fit into ${plural(dense.length, 'episode')}, about ${(Math.round(ratio * 10) / 10).toString()} chapters per episode.`);
  }

  faq.push({ question: `How long is the average ${name} arc?`, answer: `${(Math.round((total / arcs.length) * 10) / 10).toString()} episodes on average across ${plural(arcs.length, 'arc')}; the middle value is ${median} episodes. The range runs from ${shortest.length} ${shortest.length === 1 ? 'episode' : 'episodes'}${shortestTied.length > 1 ? '' : ` (${shortest.name})`} to ${longest.length} (${longest.name}).` });
  if (fillerArcs.length) faq.push({ question: `How much of ${name} is filler arcs?`, answer: `${plural(fillerArcs.length, 'arc')} totalling ${plural(fillerEpisodes, 'episode')}, or ${percent(fillerEpisodes, total)}% of the ${total} listed episodes.` });
  return { rows, paragraphs, faq };
}
