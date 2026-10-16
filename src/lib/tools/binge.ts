// Binge Calculator maths. Pure and deterministic so it can run in the
// browser and in tests with identical results.

export interface BingeInput {
  /** Episodes to watch before any skipping. */
  episodes: number;
  minutesPerEpisode: number;
  skipOpeningEnding: boolean;
  /** Combined opening + ending length removed per episode when skipping. */
  openingEndingMinutes: number;
  /** Episodes removed by verified filler skipping. 0 when no verified data. */
  skippedEpisodes: number;
  hoursPerDay: number;
  /** Watching days in each 7-day week, 1–7. */
  daysPerWeek: number;
  playbackSpeed: number;
  /** Local calendar date, YYYY-MM-DD. Day one counts as a watching day. */
  startDate: string;
}

export interface BingeResult {
  episodesWatched: number;
  effectiveMinutesPerEpisode: number;
  totalMinutes: number;
  watchingDays: number;
  calendarDays: number;
  completionDate: string;
  episodesPerDay: number;
  openingEndingApplied: boolean;
}

export const BINGE_LIMITS = {
  maxEpisodes: 5000,
  maxMinutesPerEpisode: 600,
  maxHoursPerDay: 24,
  minHoursPerDay: 0.25,
  speeds: [1, 1.25, 1.5, 1.75, 2],
  /** Opening/ending skipping only applies to episodes at least this long. */
  minMinutesForSkip: 15,
};

export function validateBingeInput(input: BingeInput): string[] {
  const errors: string[] = [];
  if (!Number.isInteger(input.episodes) || input.episodes < 1 || input.episodes > BINGE_LIMITS.maxEpisodes) {
    errors.push(`Episodes must be a whole number from 1 to ${BINGE_LIMITS.maxEpisodes}.`);
  }
  if (!Number.isFinite(input.minutesPerEpisode) || input.minutesPerEpisode <= 0 || input.minutesPerEpisode > BINGE_LIMITS.maxMinutesPerEpisode) {
    errors.push('Episode length must be between 1 and 600 minutes.');
  }
  if (!Number.isFinite(input.hoursPerDay) || input.hoursPerDay < BINGE_LIMITS.minHoursPerDay || input.hoursPerDay > BINGE_LIMITS.maxHoursPerDay) {
    errors.push('Daily watching time must be between 15 minutes and 24 hours.');
  }
  if (!Number.isInteger(input.daysPerWeek) || input.daysPerWeek < 1 || input.daysPerWeek > 7) {
    errors.push('Watching days per week must be from 1 to 7.');
  }
  if (!BINGE_LIMITS.speeds.includes(input.playbackSpeed)) {
    errors.push('Playback speed is not supported.');
  }
  if (!Number.isInteger(input.skippedEpisodes) || input.skippedEpisodes < 0 || input.skippedEpisodes >= input.episodes) {
    errors.push('Skipped episodes must leave at least one episode to watch.');
  }
  if (!parseIsoDate(input.startDate)) errors.push('Start date must be a valid date.');
  if (input.skipOpeningEnding && (!Number.isFinite(input.openingEndingMinutes) || input.openingEndingMinutes < 0 || input.openingEndingMinutes > 10)) {
    errors.push('Opening and ending length must be between 0 and 10 minutes.');
  }
  return errors;
}

export function calculateBinge(input: BingeInput): BingeResult {
  const errors = validateBingeInput(input);
  if (errors.length) throw new RangeError(errors.join(' '));

  const episodesWatched = input.episodes - input.skippedEpisodes;
  const openingEndingApplied = input.skipOpeningEnding && input.minutesPerEpisode >= BINGE_LIMITS.minMinutesForSkip;
  const runtime = openingEndingApplied
    ? Math.max(input.minutesPerEpisode - input.openingEndingMinutes, 1)
    : input.minutesPerEpisode;
  const effectiveMinutesPerEpisode = runtime / input.playbackSpeed;
  const totalMinutes = round2(episodesWatched * effectiveMinutesPerEpisode);
  const dailyMinutes = input.hoursPerDay * 60;
  // Subtract a tiny epsilon so exact multiples do not round up a day.
  const watchingDays = Math.max(1, Math.ceil(totalMinutes / dailyMinutes - 1e-9));
  const fullWeeks = Math.floor((watchingDays - 1) / input.daysPerWeek);
  const dayInLastWeek = ((watchingDays - 1) % input.daysPerWeek) + 1;
  const calendarDays = fullWeeks * 7 + dayInLastWeek;
  return {
    episodesWatched,
    effectiveMinutesPerEpisode: round2(effectiveMinutesPerEpisode),
    totalMinutes,
    watchingDays,
    calendarDays,
    completionDate: addDays(input.startDate, calendarDays - 1),
    episodesPerDay: round2(dailyMinutes / effectiveMinutesPerEpisode),
    openingEndingApplied,
  };
}

function round2(value: number): number {
  return Math.round(value * 100) / 100;
}

export function parseIsoDate(value: string): Date | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value || '');
  if (!match) return null;
  const date = new Date(Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3])));
  return date.toISOString().slice(0, 10) === value ? date : null;
}

/** Calendar arithmetic on YYYY-MM-DD strings, independent of the local timezone. */
export function addDays(isoDate: string, days: number): string {
  const date = parseIsoDate(isoDate);
  if (!date) throw new RangeError(`Invalid date: ${isoDate}`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}
