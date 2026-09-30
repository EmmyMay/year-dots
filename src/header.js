/**
 * Header counters: year, days left, goals achieved.
 *
 * Kept out of main.js so the toggle wiring and the header can evolve without
 * fighting over one file. All user-visible text comes from the pure helpers in
 * stats.js, which carry the test coverage.
 */

import { buildStats, formatAchieved } from './stats.js';
import { createStore } from './storage.js';

/**
 * Which achieved-count to believe after a toggle.
 *
 * The toggle event carries `count`, but a detail that is missing, negative or
 * not an integer means the emitter got it wrong, and a wrong number on screen
 * is worse than recounting. Falling back to the store keeps the header honest.
 */
export function resolveCount(detail, fallback) {
  const count = detail?.count;
  return Number.isInteger(count) && count >= 0 ? count : fallback;
}

export function initHeader(doc, grid, today, store = createStore(today.getFullYear())) {
  const yearEl = doc.getElementById('js-year');
  const daysLeftEl = doc.getElementById('js-days-left');
  const achievedEl = doc.getElementById('js-achieved');
  if (!yearEl && !daysLeftEl && !achievedEl) return null;

  const stats = buildStats(today, store.getAchieved());
  if (yearEl) yearEl.textContent = String(stats.year);
  if (daysLeftEl) daysLeftEl.textContent = stats.daysLeftText;

  const showAchieved = (count) => {
    if (achievedEl) achievedEl.textContent = formatAchieved(count);
  };
  showAchieved(stats.achieved);

  // Task 4 dispatches this after each toggle. Update the count only; never
  // re-render the grid, which would drop focus mid-interaction.
  grid?.addEventListener('yeardots:change', (event) => {
    const current = buildStats(today, store.getAchieved()).achieved;
    showAchieved(resolveCount(event.detail, current));
  });

  return { showAchieved };
}
