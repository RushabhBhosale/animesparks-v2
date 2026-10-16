// Daily guessing game. One puzzle per UTC calendar day, so every reader
// worldwide gets the same puzzle and the same reset moment. Puzzles are
// scheduled ahead and stored, never generated live.

import { compactKey } from './normalize.ts';

export const MAX_GUESSES = 6;
/** Puzzle #1 is 2026-10-15 (UTC), the first scheduled day. */
export const GAME_EPOCH = Date.UTC(2026, 9, 15);

export function utcDateKey(now: number): string {
  return new Date(now).toISOString().slice(0, 10);
}

export function puzzleNumber(dateKey: string): number {
  return Math.floor((Date.parse(`${dateKey}T00:00:00Z`) - GAME_EPOCH) / 86400000) + 1;
}

export function msUntilNextPuzzle(now: number): number {
  const date = new Date(now);
  return Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate() + 1) - now;
}

/** FNV-1a 32-bit hash: small, deterministic, identical in Node and browsers. */
export function hash32(value: string): number {
  let hash = 0x811c9dc5;
  for (let index = 0; index < value.length; index++) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193) >>> 0;
  }
  return hash >>> 0;
}

/** Picks a pool entry for a date, skipping anything used recently. */
export function pickForDate<T extends { slug: string }>(pool: T[], dateKey: string, recentlyUsed: Set<string>): T | null {
  if (!pool.length) return null;
  const start = hash32(`animesparks-daily:${dateKey}`) % pool.length;
  for (let offset = 0; offset < pool.length; offset++) {
    const candidate = pool[(start + offset) % pool.length];
    if (!recentlyUsed.has(candidate.slug)) return candidate;
  }
  return pool[start];
}

export interface ClueSource {
  format: string;
  season?: string;
  year: number | null;
  genres: string[];
  themes: string[];
  demographics: string[];
  studios: string[];
  episodes: number | null;
  sourceMaterial?: string;
  mainCharacters: string[];
}

const FORMAT_WORDS: Record<string, string> = { tv: 'TV series', movie: 'film', ona: 'web series (ONA)', ova: 'OVA', special: 'special', 'tv-special': 'TV special' };

/** Six clues from broadest to most specific, built only from stored metadata. */
export function buildClues(source: ClueSource): string[] {
  const when = source.season && source.year ? `${source.season[0].toUpperCase()}${source.season.slice(1)} ${source.year}` : source.year ? String(source.year) : 'an unlisted year';
  const tags = [...source.genres, ...source.themes].slice(0, 4);
  const clues = [
    `A ${FORMAT_WORDS[source.format] || 'title'} that premiered in ${when}.`,
    tags.length ? `Genres and themes: ${tags.join(', ')}.` : 'Its genres aren’t listed, so here’s a free pass: think popular.',
    source.studios.length ? `Animated by ${source.studios.join(' & ')}.` : 'The studio isn’t listed for this one.',
    [source.episodes ? `${source.episodes} episode${source.episodes === 1 ? '' : 's'}` : null, source.sourceMaterial ? `adapted from: ${source.sourceMaterial.toLowerCase()}` : null, source.demographics[0] ? `aimed at a ${source.demographics[0]} audience` : null].filter(Boolean).join(' · ') + '.',
    source.mainCharacters[0] ? `One main character is ${source.mainCharacters[0]}.` : 'Main characters aren’t listed.',
    source.mainCharacters.length > 1 ? `Also starring ${source.mainCharacters.slice(1).join(' and ')}.` : 'Final clue: it is one of the most popular anime on MyAnimeList.',
  ];
  return clues.map(clue => clue.replace(/^\./, 'No extra details.'));
}

export function isCorrectGuess(guessSlug: string, guessTitle: string, answer: { slug: string; title: string; alternatives: string[] }): boolean {
  if (guessSlug === answer.slug) return true;
  const key = compactKey(guessTitle);
  return [answer.title, ...answer.alternatives].some(title => compactKey(title) === key);
}

export interface GameStats {
  played: number;
  won: number;
  currentStreak: number;
  maxStreak: number;
  lastPlayed?: string;
  lastWon?: string;
  distribution: number[];
}

export function emptyStats(): GameStats {
  return { played: 0, won: 0, currentStreak: 0, maxStreak: 0, distribution: Array(MAX_GUESSES).fill(0) };
}

/** Records a finished puzzle. Replaying a finished day changes nothing. */
export function recordResult(stats: GameStats, dateKey: string, won: boolean, guesses: number): GameStats {
  if (stats.lastPlayed === dateKey) return stats;
  const next: GameStats = { ...stats, distribution: [...stats.distribution] };
  next.played++;
  const previousDay = new Date(Date.parse(`${dateKey}T00:00:00Z`) - 86400000).toISOString().slice(0, 10);
  if (won) {
    next.won++;
    next.currentStreak = stats.lastWon === previousDay ? stats.currentStreak + 1 : 1;
    next.maxStreak = Math.max(next.maxStreak, next.currentStreak);
    next.distribution[guesses - 1]++;
    next.lastWon = dateKey;
  } else {
    next.currentStreak = 0;
  }
  next.lastPlayed = dateKey;
  return next;
}

/** Spoiler-free share text: one square per guess. */
export function shareGrid(number: number, results: boolean[], won: boolean): string {
  const squares = results.map(correct => correct ? '🟩' : '🟥').join('');
  return `AnimeSparks Daily #${number} ${won ? results.length : 'X'}/${MAX_GUESSES}\n${squares}`;
}
