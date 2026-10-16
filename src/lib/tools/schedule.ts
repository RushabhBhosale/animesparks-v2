// Release Calendar maths. Providers list the weekly *Japanese* TV broadcast
// slot (JST, UTC+9, no daylight saving). That is converted to the viewer's
// timezone; it is never presented as an international streaming time.

export const JST_OFFSET_MINUTES = 9 * 60;
export const WEEKDAYS = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'] as const;

/** "Fridays" / "friday" → 5, otherwise null. */
export function weekdayIndex(day: string | undefined | null): number | null {
  const normalized = (day || '').toLowerCase().replace(/s$/, '');
  const index = WEEKDAYS.indexOf(normalized as typeof WEEKDAYS[number]);
  return index >= 0 ? index : null;
}

/** "23:00" → minutes after midnight, otherwise null. */
export function parseClock(time: string | undefined | null): number | null {
  const match = /^(\d{1,2}):(\d{2})$/.exec(time || '');
  if (!match) return null;
  const hours = Number(match[1]);
  const minutes = Number(match[2]);
  // Japanese listings use 24:00+ for after-midnight slots on the same "TV day".
  return hours < 30 && minutes < 60 ? hours * 60 + minutes : null;
}

/**
 * Next occurrence (as a UTC timestamp) of a weekly JST broadcast slot at or
 * after `now`. Slots such as "Saturday 25:30" roll into Sunday 01:30 JST.
 */
export function nextBroadcast(day: string | undefined | null, time: string | undefined | null, now: number): number | null {
  const weekday = weekdayIndex(day);
  const clock = parseClock(time);
  if (weekday === null || clock === null) return null;
  const week = 7 * 24 * 60 * 60 * 1000;
  // Current JST wall-clock expressed as a UTC date.
  const jstNow = new Date(now + JST_OFFSET_MINUTES * 60000);
  const jstMidnight = Date.UTC(jstNow.getUTCFullYear(), jstNow.getUTCMonth(), jstNow.getUTCDate());
  const daysAhead = (weekday - jstNow.getUTCDay() + 7) % 7;
  let slot = jstMidnight + daysAhead * 86400000 + clock * 60000 - JST_OFFSET_MINUTES * 60000;
  // A slot earlier this week (or earlier today) belongs to next week.
  while (slot < now) slot += week;
  while (slot - week >= now) slot -= week;
  return slot;
}

export function countdownParts(ms: number): { days: number; hours: number; minutes: number; seconds: number } {
  const total = Math.max(0, Math.floor(ms / 1000));
  return {
    days: Math.floor(total / 86400),
    hours: Math.floor((total % 86400) / 3600),
    minutes: Math.floor((total % 3600) / 60),
    seconds: total % 60,
  };
}

/** Weekday (0–6) of a UTC timestamp in an IANA timezone. */
export function weekdayIn(timestamp: number, timeZone: string): number {
  const name = new Intl.DateTimeFormat('en-US', { weekday: 'long', timeZone }).format(timestamp).toLowerCase();
  return WEEKDAYS.indexOf(name as typeof WEEKDAYS[number]);
}
