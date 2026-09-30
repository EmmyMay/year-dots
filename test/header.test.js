import test from 'node:test';
import assert from 'node:assert/strict';

import { initHeader } from '../src/header.js';
import { createStore } from '../src/storage.js';

// Just enough DOM for initHeader: no jsdom, no dependencies.
function fakeDoc(ids = ['js-year', 'js-days-left', 'js-achieved']) {
  const els = Object.fromEntries(ids.map((id) => [id, { textContent: '' }]));
  return { getElementById: (id) => els[id] ?? null, els };
}

function fakeGrid() {
  const handlers = {};
  return {
    addEventListener: (type, fn) => { (handlers[type] ??= []).push(fn); },
    emit(type, detail) {
      for (const fn of handlers[type] ?? []) fn({ type, detail });
    },
    handlers,
  };
}

function memoryStorage() {
  const m = new Map();
  return { getItem: (k) => m.get(k) ?? null, setItem: (k, v) => m.set(k, v), removeItem: (k) => m.delete(k) };
}

test('header paints year, days left and achieved on load', () => {
  const doc = fakeDoc();
  const store = createStore(2026, memoryStorage());
  store.toggle('2026-01-01');
  store.toggle('2026-02-02');

  initHeader(doc, fakeGrid(), new Date(2026, 11, 31), store);

  assert.equal(doc.els['js-year'].textContent, '2026');
  assert.equal(doc.els['js-days-left'].textContent, '1 day left');
  assert.equal(doc.els['js-achieved'].textContent, '2 goals achieved');
});

test('days left is inclusive of today and pluralises', () => {
  const doc = fakeDoc();
  initHeader(doc, fakeGrid(), new Date(2026, 0, 1), createStore(2026, memoryStorage()));
  assert.equal(doc.els['js-days-left'].textContent, '365 days left');
  assert.equal(doc.els['js-achieved'].textContent, 'no goals achieved');
});

test('the toggle event updates only the achieved count', () => {
  const doc = fakeDoc();
  const grid = fakeGrid();
  const store = createStore(2026, memoryStorage());
  initHeader(doc, grid, new Date(2026, 11, 31), store);
  assert.equal(doc.els['js-achieved'].textContent, 'no goals achieved');

  store.toggle('2026-05-05');
  grid.emit('yeardots:change', { key: '2026-05-05', achieved: true, count: 1 });
  assert.equal(doc.els['js-achieved'].textContent, '1 goal achieved');
  // Year and days-left must not be disturbed by a toggle.
  assert.equal(doc.els['js-year'].textContent, '2026');
  assert.equal(doc.els['js-days-left'].textContent, '1 day left');

  store.toggle('2026-05-05');
  grid.emit('yeardots:change', { key: '2026-05-05', achieved: false, count: 0 });
  assert.equal(doc.els['js-achieved'].textContent, 'no goals achieved');
});

test('a wrong count on the event is ignored; the store is the source of truth', () => {
  const doc = fakeDoc();
  const grid = fakeGrid();
  const store = createStore(2026, memoryStorage());
  initHeader(doc, grid, new Date(2026, 5, 15), store);

  store.toggle('2026-03-03');
  store.toggle('2026-04-04');
  grid.emit('yeardots:change', { key: '2026-04-04', achieved: true, count: -5 });
  assert.equal(doc.els['js-achieved'].textContent, '2 goals achieved');
});

test('the header subscribes to the grid exactly once', () => {
  const grid = fakeGrid();
  initHeader(fakeDoc(), grid, new Date(2026, 5, 15), createStore(2026, memoryStorage()));
  assert.equal(grid.handlers['yeardots:change'].length, 1);
});

test('initHeader is a no-op when the header spans are absent', () => {
  const grid = fakeGrid();
  assert.equal(initHeader(fakeDoc([]), grid, new Date(2026, 5, 15), createStore(2026, memoryStorage())), null);
  assert.equal(grid.handlers['yeardots:change'], undefined);
});

test('a persisted store is reflected on first paint without any event', () => {
  const storage = memoryStorage();
  createStore(2026, storage).toggle('2026-07-07');
  const doc = fakeDoc();
  initHeader(doc, fakeGrid(), new Date(2026, 5, 15), createStore(2026, storage));
  assert.equal(doc.els['js-achieved'].textContent, '1 goal achieved');
});

test('the header reflects a shared store even when localStorage is blocked', () => {
  // Regression guard for the integration between task 4's toggle and the
  // header. Each createStore call caches its own Set, so if the toggle and the
  // header build separate instances they drift: with storage blocked nothing
  // round-trips and the header would count zero while the dot shows achieved.
  const blocked = {
    getItem() { throw new Error('blocked'); },
    setItem() { throw new Error('blocked'); },
    removeItem() { throw new Error('blocked'); },
  };
  const doc = fakeDoc();
  const grid = fakeGrid();
  const shared = createStore(2026, blocked);

  initHeader(doc, grid, new Date(2026, 5, 15), shared);
  shared.toggle('2026-05-05');
  grid.emit('yeardots:change', { key: '2026-05-05', achieved: true, count: 1 });
  assert.equal(doc.els['js-achieved'].textContent, '1 goal achieved');

  // Same event against a store the header does not share: the recount fallback
  // cannot see the toggle, which is exactly why main.js passes one instance.
  const other = createStore(2026, blocked);
  const doc2 = fakeDoc();
  const grid2 = fakeGrid();
  initHeader(doc2, grid2, new Date(2026, 5, 15), other);
  shared.toggle('2026-06-06');
  grid2.emit('yeardots:change', { key: '2026-06-06', achieved: true });
  assert.equal(doc2.els['js-achieved'].textContent, 'no goals achieved');
});

test('the achieved count never jumps when storage holds another year\'s key', () => {
  // Regression: first paint filters achieved keys by the current year, but the
  // toggle event's `count` is the raw Set size. Trusting that count made the
  // header read "1 goal achieved" and then "3 goals achieved" after a single
  // toggle. The header must apply one counting rule everywhere.
  const storage = memoryStorage();
  storage.setItem('year-dots:v1:2026', JSON.stringify(['2025-12-31', '2026-01-01']));
  const doc = fakeDoc();
  const grid = fakeGrid();
  const store = createStore(2026, storage);

  initHeader(doc, grid, new Date(2026, 5, 15), store);
  assert.equal(doc.els['js-achieved'].textContent, '1 goal achieved');

  store.toggle('2026-03-03');
  grid.emit('yeardots:change', { key: '2026-03-03', achieved: true, count: store.getAchieved().size });
  assert.equal(doc.els['js-achieved'].textContent, '2 goals achieved');
});

test('initHeader refuses to run without the store from renderYear', () => {
  // No default: a forgotten argument would silently build a second store and
  // reintroduce the drift this module exists to avoid.
  for (const bad of [undefined, null, {}]) {
    assert.throws(() => initHeader(fakeDoc(), fakeGrid(), new Date(2026, 5, 15), bad), TypeError);
  }
});
