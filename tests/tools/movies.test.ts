import { test } from 'node:test';
import assert from 'node:assert/strict';
import { movieTimeline } from '../../src/lib/tools/movies.ts';

const entry = (slug: string, format: string, airedFrom: string | null, role = 'main') => ({ slug, title: slug, format, airedFrom, role });

test('movies come in release order with the series that was current', () => {
  const movies = movieTimeline([
    entry('series-1', 'tv', '2002-10-03'), entry('movie-1', 'movie', '2004-08-21', 'side'), entry('recap', 'tv', '2006-01-01', 'recap'),
    entry('series-2', 'tv', '2007-02-15'), entry('movie-3', 'movie', null, 'side'), entry('movie-2', 'movie', '2007-08-04', 'side'),
    entry('movie-0', 'movie', '2001-01-01', 'side'),
  ]);
  assert.deepEqual(movies.map(movie => [movie.slug, movie.during?.slug]), [
    ['movie-0', undefined], ['movie-1', 'series-1'], ['movie-2', 'series-2'], ['movie-3', undefined],
  ]);
});
