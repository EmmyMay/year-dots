/**
 * Pure date helpers for Year Dots.
 *
 * Every export takes the date or year it operates on as an argument, so the
 * whole module is deterministic and testable. Nothing here reads the clock and
 * nothing here touches the DOM.
 *
 * Dates are handled in LOCAL time throughout. `toISOString` is deliberately
 * never used: it converts to UTC first, which shifts the calendar day by one
 * for anyone west of Greenwich.
 */

const MS_PER_DAY = 86400000;

const LONG_FORMATTER = new Intl.DateTimeFormat('en-GB', {
  weekday: 'short',
  day: 'numeric',
  month: 'long',
  year: 'numeric',
});

/** Proleptic Gregorian rule: 2024 and 2000 are leap, 2025 and 1900 are not. */
export function isLeapYear(year) {
  return (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0;
}

export function daysInYear(year) {
  return isLeapYear(year) ? 366 : 365;
}

/** Midnight local time on the same calendar day as `date`. */
export function startOfDay(date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

/** 'YYYY-MM-DD' for the local calendar day of `date`. */
export function toKey(date) {
  const year = String(date.getFullYear()).padStart(4, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/** Inverse of `toKey`: a Date at local midnight on that calendar day. */
export function fromKey(key) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(key);
  if (!match) throw new TypeError(`Not a YYYY-MM-DD key: ${key}`);
  const [, year, month, day] = match;
  return new Date(Number(year), Number(month) - 1, Number(day));
}

/**
 * Every day of `year` in order, from 1 January to 31 December.
 *
 * Built by incrementing the day-of-month and letting Date roll over, rather
 * than by adding 24h at a time, so DST transitions cannot drop or repeat a day.
 */
export function daysOfYear(year) {
  const days = [];
  const cursor = new Date(year, 0, 1);
  let dayOfYear = 1;
  while (cursor.getFullYear() === year) {
    const date = new Date(cursor.getTime());
    days.push({
      key: toKey(date),
      date,
      month: date.getMonth(),
      dayOfMonth: date.getDate(),
      weekday: date.getDay(),
      dayOfYear,
    });
    cursor.setDate(cursor.getDate() + 1);
    dayOfYear += 1;
  }
  return days;
}

/** 'past' | 'today' | 'future', comparing calendar days and ignoring clock time. */
export function dayStatus(date, today) {
  const a = startOfDay(date).getTime();
  const b = startOfDay(today).getTime();
  if (a < b) return 'past';
  if (a > b) return 'future';
  return 'today';
}

/**
 * Days remaining in `today`'s year, counting today itself.
 * 31 December -> 1; 1 January -> the full length of the year.
 */
export function daysLeftInYear(today) {
  const start = startOfDay(today);
  const endExclusive = new Date(start.getFullYear() + 1, 0, 1);
  // Round rather than floor: a DST shift makes the span a non-integer number
  // of 24h periods, and we want whole calendar days.
  return Math.round((endExclusive.getTime() - start.getTime()) / MS_PER_DAY);
}

/** Human-readable date, e.g. 'Mon, 3 March 2026'. */
export function formatLong(date) {
  return LONG_FORMATTER.format(date);
}
