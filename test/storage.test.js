import test from 'node:test';
import assert from 'node:assert/strict';
import { createStore } from '../src/storage.js';

function memoryStorage() {
  const values = new Map();
  return {
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, value),
    removeItem: (key) => values.delete(key),
  };
}

test('an empty store has no achieved days', () => {
  const store = createStore(2026, memoryStorage());
  assert.deepEqual(store.getAchieved(), new Set());
  assert.equal(store.has('2026-09-30'), false);
});

test('toggle writes the new state through and a new store restores it', () => {
  const storage = memoryStorage();
  const store = createStore(2026, storage);
  assert.equal(store.toggle('2026-09-30'), true);
  assert.equal(store.has('2026-09-30'), true);
  assert.equal(storage.getItem('year-dots:v1:2026'), '["2026-09-30"]');
  assert.deepEqual(createStore(2026, storage).getAchieved(), new Set(['2026-09-30']));

  assert.equal(store.toggle('2026-09-30'), false);
  assert.equal(store.has('2026-09-30'), false);
  assert.equal(storage.getItem('year-dots:v1:2026'), '[]');
  assert.deepEqual(createStore(2026, storage).getAchieved(), new Set());
});

test('toggling one day preserves other achieved days', () => {
  const storage = memoryStorage();
  const store = createStore(2026, storage);
  store.toggle('2026-01-01');
  store.toggle('2026-12-31');
  store.toggle('2026-01-01');
  assert.deepEqual(createStore(2026, storage).getAchieved(), new Set(['2026-12-31']));
});

test('getAchieved returns an independent snapshot', () => {
  const store = createStore(2026, memoryStorage());
  store.toggle('2026-09-30');
  const snapshot = store.getAchieved();
  snapshot.clear();
  snapshot.add('2026-01-01');
  assert.deepEqual(store.getAchieved(), new Set(['2026-09-30']));
});

test('years are isolated and clear removes only the current year', () => {
  const storage = memoryStorage();
  const previous = createStore(2025, storage);
  previous.toggle('2025-12-31');
  const current = createStore(2026, storage);
  assert.deepEqual(current.getAchieved(), new Set());
  current.toggle('2026-01-01');
  previous.clear();

  assert.deepEqual(previous.getAchieved(), new Set());
  assert.equal(storage.getItem('year-dots:v1:2025'), null);
  assert.deepEqual(createStore(2025, storage).getAchieved(), new Set());
  assert.deepEqual(createStore(2026, storage).getAchieved(), new Set(['2026-01-01']));
});

test('corrupt JSON or a value other than an array of strings starts empty', () => {
  for (const saved of ['{broken', 'null', '{}', '42', '"2026-01-01"', '[null]', '["2026-01-01", 1]']) {
    const storage = memoryStorage();
    storage.setItem('year-dots:v1:2026', saved);
    const store = createStore(2026, storage);
    assert.deepEqual(store.getAchieved(), new Set(), saved);
    assert.equal(store.toggle('2026-09-30'), true);
    assert.deepEqual(createStore(2026, storage).getAchieved(), new Set(['2026-09-30']));
  }
});

test('duplicate stored keys count as one achieved day', () => {
  const storage = memoryStorage();
  storage.setItem('year-dots:v1:2026', '["2026-09-30", "2026-09-30"]');
  assert.deepEqual(createStore(2026, storage).getAchieved(), new Set(['2026-09-30']));
});

test('throwing reads and writes do not escape and session state still works', () => {
  const fail = () => { throw new Error('Storage unavailable'); };
  const store = createStore(2026, { getItem: fail, setItem: fail, removeItem: fail });
  assert.deepEqual(store.getAchieved(), new Set());
  assert.equal(store.toggle('2026-09-30'), true);
  assert.equal(store.has('2026-09-30'), true);
  assert.equal(store.toggle('2026-09-30'), false);
  store.toggle('2026-01-01');
  store.clear();
  assert.deepEqual(store.getAchieved(), new Set());
});

test('quota failures preserve restored data and allow session changes', () => {
  const storage = memoryStorage();
  storage.setItem('year-dots:v1:2026', '["2026-01-01"]');
  storage.setItem = () => { throw new Error('Quota exceeded'); };
  const store = createStore(2026, storage);
  assert.equal(store.toggle('2026-09-30'), true);
  assert.deepEqual(store.getAchieved(), new Set(['2026-01-01', '2026-09-30']));
  assert.equal(storage.getItem('year-dots:v1:2026'), '["2026-01-01"]');
});

test('omitting storage uses globalThis.localStorage and catches a blocked getter', (t) => {
  const original = Object.getOwnPropertyDescriptor(globalThis, 'localStorage');
  t.after(() => {
    if (original) Object.defineProperty(globalThis, 'localStorage', original);
    else delete globalThis.localStorage;
  });

  const storage = memoryStorage();
  Object.defineProperty(globalThis, 'localStorage', { configurable: true, value: storage });
  createStore(2026).toggle('2026-09-30');
  assert.equal(storage.getItem('year-dots:v1:2026'), '["2026-09-30"]');

  Object.defineProperty(globalThis, 'localStorage', {
    configurable: true,
    get() { throw new Error('Storage blocked'); },
  });
  const blocked = createStore(2026);
  assert.deepEqual(blocked.getAchieved(), new Set());
  assert.equal(blocked.toggle('2026-09-30'), true);
  blocked.clear();
  assert.deepEqual(blocked.getAchieved(), new Set());
});
