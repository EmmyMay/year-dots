import test from 'node:test';
import assert from 'node:assert/strict';

import { daysInYear } from '../src/dates.js';
import { buildStats, formatAchieved, formatDaysLeft } from '../src/stats.js';

test('formatDaysLeft pluralises', () => {
  assert.equal(formatDaysLeft(0), '0 days left');
  assert.equal(formatDaysLeft(1), '1 day left');
  assert.equal(formatDaysLeft(2), '2 days left');
  assert.equal(formatDaysLeft(365), '365 days left');
});

test('formatAchieved pluralises and has a zero case', () => {
  assert.equal(formatAchieved(0), 'no goals achieved');
  assert.equal(formatAchieved(1), '1 goal achieved');
  assert.equal(formatAchieved(2), '2 goals achieved');
});

test('buildStats reports the year and days left including today', () => {
  const stats = buildStats(new Date(2026, 11, 31, 10, 0, 0));
  assert.equal(stats.year, 2026);
  assert.equal(stats.daysLeft, 1);
  assert.equal(stats.daysLeftText, '1 day left');

  const newYear = buildStats(new Date(2026, 0, 1));
  assert.equal(newYear.daysLeft, daysInYear(2026));
});

test('buildStats counts achieved days', () => {
  const today = new Date(2026, 5, 15);
  assert.equal(buildStats(today).achieved, 0);
  assert.equal(buildStats(today, []).achieved, 0);
  assert.equal(buildStats(today, ['2026-01-02']).achieved, 1);
  assert.equal(buildStats(today, ['2026-01-02', '2026-03-04']).achieved, 2);
});

test('buildStats accepts a Set as well as an array', () => {
  const today = new Date(2026, 5, 15);
  const asSet = buildStats(today, new Set(['2026-01-02', '2026-03-04']));
  const asArray = buildStats(today, ['2026-01-02', '2026-03-04']);
  assert.equal(asSet.achieved, 2);
  assert.deepEqual(asSet, asArray);
});

test('buildStats ignores keys from other years', () => {
  // A store handed the wrong year, or stale keys, must not inflate the count.
  const stats = buildStats(new Date(2026, 5, 15), [
    '2025-12-31',
    '2026-01-01',
    '2027-01-01',
    '2026-12-31',
  ]);
  assert.equal(stats.achieved, 2);
});

test('buildStats ignores non-string junk in the achieved set', () => {
  const stats = buildStats(new Date(2026, 5, 15), [
    '2026-01-01',
    null,
    undefined,
    42,
    { key: '2026-02-02' },
  ]);
  assert.equal(stats.achieved, 1);
});

test('buildStats leap year counts 366 days left on 1 January', () => {
  assert.equal(buildStats(new Date(2024, 0, 1)).daysLeft, daysInYear(2024));
});
