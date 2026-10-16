import { test } from 'node:test';
import assert from 'node:assert/strict';
import { addDays, calculateBinge, validateBingeInput, type BingeInput } from '../../src/lib/tools/binge.ts';

const base: BingeInput = {
  episodes: 24, minutesPerEpisode: 24, skipOpeningEnding: false, openingEndingMinutes: 3,
  skippedEpisodes: 0, hoursPerDay: 2, daysPerWeek: 7, playbackSpeed: 1, startDate: '2026-10-16',
};

test('total time is episodes × runtime', () => {
  const result = calculateBinge(base);
  assert.equal(result.totalMinutes, 576);
  assert.equal(result.watchingDays, 5); // 576 / 120 = 4.8
  assert.equal(result.completionDate, '2026-10-20');
  assert.equal(result.episodesPerDay, 5);
});

test('an exact multiple of the daily budget does not add a day', () => {
  const result = calculateBinge({ ...base, episodes: 10, minutesPerEpisode: 24, hoursPerDay: 4 });
  assert.equal(result.totalMinutes, 240);
  assert.equal(result.watchingDays, 1);
  assert.equal(result.completionDate, base.startDate);
});

test('opening/ending skipping removes minutes from long episodes only', () => {
  assert.equal(calculateBinge({ ...base, skipOpeningEnding: true }).totalMinutes, 24 * 21);
  const shorts = calculateBinge({ ...base, minutesPerEpisode: 4, skipOpeningEnding: true });
  assert.equal(shorts.openingEndingApplied, false);
  assert.equal(shorts.totalMinutes, 96);
});

test('playback speed shortens runtime', () => {
  assert.equal(calculateBinge({ ...base, playbackSpeed: 1.5 }).totalMinutes, 384);
});

test('verified filler skipping reduces watched episodes', () => {
  const result = calculateBinge({ ...base, skippedEpisodes: 4 });
  assert.equal(result.episodesWatched, 20);
  assert.equal(result.totalMinutes, 480);
});

test('watching fewer days a week stretches the calendar', () => {
  // 1,100 episodes × 24 min at 3 h/day = 147 watching days.
  const result = calculateBinge({ ...base, episodes: 1100, hoursPerDay: 3, daysPerWeek: 5 });
  assert.equal(result.watchingDays, 147);
  // 29 full weeks (145 days) + 2 days into week 30 → 29 × 7 + 2 = 205 calendar days.
  assert.equal(result.calendarDays, 205);
  assert.equal(result.completionDate, addDays('2026-10-16', 204));
});

test('calendar maths is timezone independent and handles leap years', () => {
  assert.equal(addDays('2028-02-28', 1), '2028-02-29');
  assert.equal(addDays('2027-02-28', 1), '2027-03-01');
  assert.equal(addDays('2026-12-31', 1), '2027-01-01');
});

test('invalid input is rejected with readable errors', () => {
  assert.ok(validateBingeInput({ ...base, episodes: 0 }).length);
  assert.ok(validateBingeInput({ ...base, hoursPerDay: 0 }).length);
  assert.ok(validateBingeInput({ ...base, startDate: '2026-02-30' }).length);
  assert.ok(validateBingeInput({ ...base, skippedEpisodes: 24 }).length);
  assert.ok(validateBingeInput({ ...base, playbackSpeed: 3 }).length);
  assert.throws(() => calculateBinge({ ...base, minutesPerEpisode: Number.NaN }), RangeError);
  assert.deepEqual(validateBingeInput(base), []);
});
