/**
 * Text for the header counters.
 *
 * Pure: these take plain numbers and return plain strings. The DOM wiring
 * lives in header.js, so the wording and pluralisation stay testable under
 * `node --test` without a browser.
 */

import { daysLeftInYear } from './dates.js';

export function formatDaysLeft(count) {
  if (count === 1) return '1 day left';
  return `${count} days left`;
}

export function formatAchieved(count) {
  if (count === 0) return 'no goals achieved';
  if (count === 1) return '1 goal achieved';
  return `${count} goals achieved`;
}

/**
 * The header's three values for `today` and a set of achieved day keys.
 *
 * `achieved` is counted rather than taken on trust, so a store holding keys
 * from another year cannot inflate this year's total.
 */
export function buildStats(today, achievedKeys = []) {
  const year = today.getFullYear();
  const prefix = `${year}-`;
  const keys = achievedKeys instanceof Set ? achievedKeys : new Set(achievedKeys);

  let achieved = 0;
  for (const key of keys) {
    if (typeof key === 'string' && key.startsWith(prefix)) achieved += 1;
  }

  const daysLeft = daysLeftInYear(today);
  return { year, daysLeft, achieved, daysLeftText: formatDaysLeft(daysLeft) };
}
