// "Movies in order" view: a franchise's movies in release order, each with
// the TV series that was current when it premiered.

import { MIN_LANDING_MOVIES, MOVIE_LANDINGS } from './landings.ts';

interface Entry { slug: string; title: string; format: string; airedFrom: string | null; role: string }

const SERIES_FORMATS = new Set(['tv', 'ona']);
const time = (value: string | null) => {
  const parsed = Date.parse(value || '');
  return Number.isFinite(parsed) ? parsed : Number.POSITIVE_INFINITY;
};

/** Movies in release order (unscheduled ones last) with the latest series that premiered before each. */
export function movieTimeline<T extends Entry>(releaseOrder: T[]): Array<T & { during?: T }> {
  const series = releaseOrder.filter(entry => SERIES_FORMATS.has(entry.format) && entry.role !== 'recap');
  return releaseOrder
    .filter(entry => entry.format === 'movie')
    .sort((a, b) => time(a.airedFrom) - time(b.airedFrom))
    .map(movie => ({
      ...movie,
      during: Number.isFinite(time(movie.airedFrom)) ? series.filter(entry => time(entry.airedFrom) <= time(movie.airedFrom)).at(-1) : undefined,
    }));
}

/** Whether a franchise gets a "movies in order" landing page. */
export function hasMoviePage(franchise: { slug: string; indexable: boolean; releaseOrder: Array<{ format: string }> }): boolean {
  return franchise.indexable && MOVIE_LANDINGS.includes(franchise.slug)
    && franchise.releaseOrder.filter(entry => entry.format === 'movie').length >= MIN_LANDING_MOVIES;
}
