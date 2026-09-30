import test from 'node:test';
import assert from 'node:assert/strict';

import {
  dayStatus,
  daysInYear,
  daysLeftInYear,
  daysOfYear,
  formatLong,
  fromKey,
  isLeapYear,
  startOfDay,
  toKey,
} from '../src/dates.js';

test('isLeapYear follows the Gregorian century rule', () => {
  assert.equal(isLeapYear(2024), true);
  assert.equal(isLeapYear(2000), true);
  assert.equal(isLeapYear(2025), false);
  assert.equal(isLeapYear(1900), false);
});

test('daysInYear is 365 or 366', () => {
  assert.equal(daysInYear(2025), 365);
  assert.equal(daysInYear(2024), 366);
});

test('daysOfYear has one entry per day, in order', () => {
  assert.equal(daysOfYear(2025).length, 365);
  assert.equal(daysOfYear(2024).length, 366);

  const days = daysOfYear(2026);
  assert.equal(days[0].key, '2026-01-01');
  assert.equal(days.at(-1).key, '2026-12-31');
  assert.equal(days[0].dayOfYear, 1);
  assert.equal(days.at(-1).dayOfYear, 365);

  const keys = days.map((d) => d.key);
  assert.equal(new Set(keys).size, keys.length, 'no duplicate days');
  assert.deepEqual(keys, [...keys].sort(), 'chronological order');
});

test('daysOfYear includes 29 February in a leap year and omits it otherwise', () => {
  assert.ok(daysOfYear(2024).some((d) => d.key === '2024-02-29'));
  assert.ok(!daysOfYear(2025).some((d) => d.key === '2025-02-29'));
});

test('daysOfYear reports the real weekday', () => {
  // 1 January 2026 is a Thursday.
  assert.equal(daysOfYear(2026)[0].weekday, 4);
});

test('toKey uses the local calendar day, not UTC', () => {
  // Late evening local time is already the next day in UTC for eastern zones
  // and still the previous day for western ones; toKey must ignore that.
  assert.equal(toKey(new Date(2026, 2, 3, 23, 59, 59)), '2026-03-03');
  assert.equal(toKey(new Date(2026, 2, 3, 0, 0, 0)), '2026-03-03');
  assert.equal(toKey(new Date(2026, 0, 1)), '2026-01-01');
  assert.equal(toKey(new Date(2026, 11, 31)), '2026-12-31');
});

test('toKey survives a DST transition week with no off-by-one', () => {
  // Cover both hemispheres' usual transition windows plus the days either
  // side, so a clock shift cannot silently move a dot to the wrong day.
  for (const [year, month, firstDay] of [[2026, 2, 6], [2026, 9, 22]]) {
    for (let offset = 0; offset < 9; offset += 1) {
      const day = firstDay + offset;
      const noon = new Date(year, month, day, 12, 0, 0);
      const expected = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      assert.equal(toKey(noon), expected);
      // Just after midnight is where a backwards shift would bite.
      assert.equal(toKey(new Date(year, month, day, 0, 30, 0)), expected);
    }
  }
});

test('daysOfYear keys stay aligned with their own dates', () => {
  // A 24h-stepping implementation drifts here; this catches that.
  for (const day of daysOfYear(2026)) {
    assert.equal(toKey(day.date), day.key);
  }
});

test('fromKey round-trips with toKey', () => {
  for (const key of ['2026-01-01', '2024-02-29', '2026-10-25', '2026-12-31']) {
    assert.equal(toKey(fromKey(key)), key);
  }
  const parsed = fromKey('2026-03-03');
  assert.equal(parsed.getHours(), 0);
  assert.equal(parsed.getMinutes(), 0);
  assert.equal(parsed.getFullYear(), 2026);
  assert.equal(parsed.getMonth(), 2);
  assert.equal(parsed.getDate(), 3);
});

test('fromKey rejects malformed keys', () => {
  assert.throws(() => fromKey('2026-1-1'), TypeError);
  assert.throws(() => fromKey('nonsense'), TypeError);
});

test('startOfDay strips the time but keeps the calendar day', () => {
  const midnight = startOfDay(new Date(2026, 5, 15, 17, 45, 30, 250));
  assert.equal(midnight.getHours(), 0);
  assert.equal(midnight.getMinutes(), 0);
  assert.equal(midnight.getSeconds(), 0);
  assert.equal(midnight.getMilliseconds(), 0);
  assert.equal(toKey(midnight), '2026-06-15');
});

test('dayStatus compares calendar days, not timestamps', () => {
  const today = new Date(2026, 5, 15, 9, 0, 0);
  assert.equal(dayStatus(new Date(2026, 5, 14, 23, 59), today), 'past');
  assert.equal(dayStatus(new Date(2026, 5, 16, 0, 1), today), 'future');
  // Same day, different times, in both directions: still 'today'.
  assert.equal(dayStatus(new Date(2026, 5, 15, 0, 0, 0), today), 'today');
  assert.equal(dayStatus(new Date(2026, 5, 15, 23, 59, 59), today), 'today');
  assert.equal(dayStatus(today, today), 'today');
});

test('dayStatus handles year boundaries', () => {
  const newYearsDay = new Date(2026, 0, 1, 12, 0, 0);
  assert.equal(dayStatus(new Date(2025, 11, 31), newYearsDay), 'past');
  assert.equal(dayStatus(new Date(2026, 11, 31), newYearsDay), 'future');
});

test('daysLeftInYear counts today and runs to 31 December', () => {
  assert.equal(daysLeftInYear(new Date(2026, 11, 31, 23, 0, 0)), 1);
  assert.equal(daysLeftInYear(new Date(2026, 11, 30)), 2);
  assert.equal(daysLeftInYear(new Date(2026, 0, 1)), daysInYear(2026));
  assert.equal(daysLeftInYear(new Date(2024, 0, 1)), daysInYear(2024));
  assert.equal(daysLeftInYear(new Date(2024, 0, 1, 18, 30)), 366);
});

test('daysLeftInYear agrees with daysOfYear for every day of a year', () => {
  const days = daysOfYear(2026);
  days.forEach((day, index) => {
    assert.equal(daysLeftInYear(day.date), days.length - index);
  });
});

test('formatLong produces a readable date containing the parts', () => {
  const text = formatLong(new Date(2026, 2, 3));
  assert.match(text, /March/);
  assert.match(text, /2026/);
  assert.match(text, /\b3\b/);
  assert.match(text, /Tue/);
});
