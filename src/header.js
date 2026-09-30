/**
 * Header counters: year, days left, goals achieved.
 *
 * Kept out of main.js so the toggle wiring and the header can evolve without
 * fighting over one file. All user-visible text comes from the pure helpers in
 * stats.js, which carry the test coverage.
 */

import { buildStats, formatAchieved } from './stats.js';

/**
 * Wire the header to a grid and the store that grid's toggles mutate.
 *
 * `store` is required and must be the instance `renderYear` returned. Two
 * stores for the same year drift, because each caches its own Set: with
 * localStorage blocked the dots would show achieved while the header read
 * zero. There is deliberately no default to fall back on.
 */
export function initHeader(doc, grid, today, store) {
  if (!store || typeof store.getAchieved !== 'function') {
    throw new TypeError('initHeader needs the store returned by renderYear');
  }

  const yearEl = doc.getElementById('js-year');
  const daysLeftEl = doc.getElementById('js-days-left');
  const achievedEl = doc.getElementById('js-achieved');
  if (!yearEl && !daysLeftEl && !achievedEl) return null;

  const showAchieved = () => {
    if (achievedEl) achievedEl.textContent = formatAchieved(buildStats(today, store.getAchieved()).achieved);
  };

  const stats = buildStats(today, store.getAchieved());
  if (yearEl) yearEl.textContent = String(stats.year);
  if (daysLeftEl) daysLeftEl.textContent = stats.daysLeftText;
  showAchieved();

  // Recount from the store rather than trusting the event's `count`. That
  // count is the raw Set size, but the header filters by year, so a stored key
  // from another year makes the two disagree and the number jump on the first
  // toggle. Recounting keeps first paint and every update on the same rule.
  //
  // Only the achieved span changes; the grid is never re-rendered, which would
  // drop focus mid-interaction.
  grid?.addEventListener('yeardots:change', showAchieved);

  return { showAchieved };
}
