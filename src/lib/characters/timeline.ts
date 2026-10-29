import { animeSeq, chapterNumber } from './format.ts';
import type { SeriesData, TimelineEvent } from './types.ts';

export type TimelineOrder = 'story' | 'release';

export function storyOrdered(events: TimelineEvent[]): TimelineEvent[] {
  return [...events].sort((a, b) => a.storyOrder - b.storyOrder);
}

/**
 * Release order: anime episodes in broadcast order first, then events that
 * exist only in the manga, in chapter order. The anime never runs ahead of
 * the manga, so this reads as "the order a viewer meets the events".
 */
export function releaseOrdered(events: TimelineEvent[], series: Pick<SeriesData, 'editions'>): TimelineEvent[] {
  const key = (event: TimelineEvent) => {
    const seq = animeSeq(event.anime, series);
    if (seq !== undefined) return [0, seq, chapterNumber(event.manga) ?? 0] as const;
    return [1, chapterNumber(event.manga) ?? Infinity, 0] as const;
  };
  return [...events].sort((a, b) => {
    const ka = key(a);
    const kb = key(b);
    return ka[0] - kb[0] || ka[1] - kb[1] || ka[2] - kb[2] || a.storyOrder - b.storyOrder;
  });
}

/** True when the two orderings disagree, i.e. a reader benefits from the toggle. */
export function orderingsDiffer(events: TimelineEvent[], series: Pick<SeriesData, 'editions'>): boolean {
  const story = storyOrdered(events).map(event => event.id).join();
  const release = releaseOrdered(events, series).map(event => event.id).join();
  return story !== release;
}
