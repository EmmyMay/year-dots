import { daysOfYear, dayStatus, formatLong } from './dates.js';
import { createStore } from './storage.js';
import { initHeader } from './header.js';

const monthName = new Intl.DateTimeFormat('en-GB', { month: 'long' });

// One store and one click listener per grid element, so calling renderYear
// again cannot stack listeners or lose track of which store a grid uses.
const stores = new WeakMap();
const wired = new WeakSet();

function createMonth(doc, date) {
  const section = doc.createElement('section');
  section.className = 'month';

  const heading = doc.createElement('h2');
  heading.className = 'month-name';
  heading.id = `month-${date.getMonth() + 1}`;
  heading.textContent = monthName.format(date);
  section.setAttribute('aria-labelledby', heading.id);

  const dots = doc.createElement('div');
  dots.className = 'month-dots';

  section.append(heading, dots);
  return { section, dots };
}

function createDot(doc, day, today, achieved) {
  const status = dayStatus(day.date, today);
  const dot = doc.createElement('button');
  dot.type = 'button';
  dot.className = 'dot';
  dot.dataset.key = day.key;

  let label = formatLong(day.date);
  if (status === 'past') {
    dot.classList.add('is-past');
  } else {
    dot.classList.add('is-future');
  }
  if (status === 'today') {
    dot.classList.add('is-today');
    dot.setAttribute('aria-current', 'date');
    label += ', today';
  }
  dot.setAttribute('aria-label', label);

  // A fresh dot never carries .is-achieved, so restoring only ever adds it.
  if (achieved) dot.classList.add('is-achieved');
  dot.setAttribute('aria-pressed', String(achieved));
  return dot;
}

function setAchieved(dot, achieved) {
  dot.classList.toggle('is-achieved', achieved);
  dot.setAttribute('aria-pressed', String(achieved));
}

/**
 * Toggle one day's "goal achieved" state, update that dot only, and announce
 * the change on the grid. This is the single persistence path shared with the
 * keyboard handler, so it is never reimplemented.
 */
export function toggleDot(container, key) {
  const store = stores.get(container);
  if (!store) return;

  const achieved = store.toggle(key);
  const dot = container.querySelector(`.dot[data-key="${key}"]`);
  if (dot) setAchieved(dot, achieved);

  container.dispatchEvent(
    new CustomEvent('yeardots:change', {
      detail: { key, achieved, count: store.getAchieved().size },
    }),
  );
}

function handleGridClick(event) {
  const dot = event.target.closest?.('.dot');
  if (!dot || !dot.dataset.key) return;
  toggleDot(event.currentTarget, dot.dataset.key);
}

/** Attach the one delegated click listener. Safe to call more than once. */
export function wireToggle(container) {
  if (wired.has(container)) return;
  wired.add(container);
  container.addEventListener('click', handleGridClick);
}

export function renderYear(
  container,
  today,
  doc = container.ownerDocument,
  store = createStore(today.getFullYear()),
) {
  stores.set(container, store);
  const achieved = store.getAchieved();

  const fragment = doc.createDocumentFragment();
  let month = -1;
  let dots;

  for (const day of daysOfYear(today.getFullYear())) {
    if (day.date.getMonth() !== month) {
      month = day.date.getMonth();
      const group = createMonth(doc, day.date);
      fragment.append(group.section);
      dots = group.dots;
    }
    dots.append(createDot(doc, day, today, achieved.has(day.key)));
  }

  container.replaceChildren(fragment);
  return store;
}

const grid = globalThis.document?.getElementById('js-grid');
if (grid) {
  const today = new Date();
  // renderYear owns the one store for this container and hands it back, so
  // the header counts the same instance the toggle mutates. Building a second
  // store here would drift: each one caches its own Set, and with localStorage
  // blocked the dots would show achieved while the header still read zero.
  const store = renderYear(grid, today);
  wireToggle(grid);
  initHeader(globalThis.document, grid, today, store);
}
