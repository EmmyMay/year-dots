import test from 'node:test';
import assert from 'node:assert/strict';
import { renderYear, toggleDot, wireToggle } from '../src/main.js';

// Just enough DOM for the toggle wiring, so this runs in plain node. This is
// not browser QA: it checks class/aria/state/event wiring, not rendering.
class FakeElement {
  constructor(tagName) {
    this.tagName = tagName.toUpperCase();
    this.children = [];
    this.attributes = {};
    this.dataset = {};
    this.listeners = new Map();
    this.replaceCount = 0;
    const classes = new Set();
    this._classes = classes;
    this.classList = {
      add: (...names) => names.forEach((name) => classes.add(name)),
      remove: (...names) => names.forEach((name) => classes.delete(name)),
      toggle: (name, force) => {
        const want = force === undefined ? !classes.has(name) : Boolean(force);
        if (want) classes.add(name);
        else classes.delete(name);
        return want;
      },
      contains: (name) => classes.has(name),
    };
  }

  set className(value) {
    this._classes.clear();
    for (const name of String(value).split(/\s+/).filter(Boolean)) this._classes.add(name);
  }

  get className() {
    return [...this._classes].join(' ');
  }

  append(...nodes) {
    for (const node of nodes) {
      node.parentNode = this;
      this.children.push(node);
    }
  }

  replaceChildren(...nodes) {
    this.replaceCount += 1;
    this.children = [];
    this.append(...nodes.flatMap((node) => (node.tagName === '#FRAGMENT' ? node.children : [node])));
  }

  setAttribute(name, value) {
    this.attributes[name] = String(value);
  }

  getAttribute(name) {
    return this.attributes[name] ?? null;
  }

  addEventListener(type, listener) {
    if (!this.listeners.has(type)) this.listeners.set(type, []);
    this.listeners.get(type).push(listener);
  }

  listenerCount(type) {
    return (this.listeners.get(type) ?? []).length;
  }

  dispatchEvent(event) {
    const wrapped = { type: event.type, detail: event.detail, target: this, currentTarget: this };
    for (const listener of this.listeners.get(wrapped.type) ?? []) listener.call(this, wrapped);
    return true;
  }

  emit(type, target) {
    const event = { type, target, currentTarget: this };
    for (const listener of this.listeners.get(type) ?? []) listener.call(this, event);
  }

  closest(selector) {
    const name = selector.replace(/^\./, '');
    let node = this;
    while (node) {
      if (node.classList?.contains(name)) return node;
      node = node.parentNode;
    }
    return null;
  }

  findAll(selector) {
    const name = selector.replace(/^\./, '');
    const out = [];
    const visit = (node) => {
      for (const child of node.children) {
        if (child.classList?.contains(name)) out.push(child);
        visit(child);
      }
    };
    visit(this);
    return out;
  }

  querySelector(selector) {
    const match = /^\.([\w-]+)\[data-key="([^"]+)"\]$/.exec(selector);
    if (!match) return null;
    return this.findAll(`.${match[1]}`).find((el) => el.dataset.key === match[2]) ?? null;
  }
}

const fakeDocument = {
  createElement: (tagName) => new FakeElement(tagName),
  createDocumentFragment: () => new FakeElement('#fragment'),
};

function memoryStorage(initial = {}) {
  const values = new Map(Object.entries(initial));
  return {
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, value),
    removeItem: (key) => values.delete(key),
  };
}

function setup(today = new Date(2026, 8, 30)) {
  const grid = new FakeElement('div');
  renderYear(grid, today, fakeDocument);
  wireToggle(grid);
  const dots = grid.findAll('.dot');
  return { grid, byKey: Object.fromEntries(dots.map((dot) => [dot.dataset.key, dot])) };
}

test('the persisted set is applied to the dots when the grid is built', () => {
  globalThis.localStorage = memoryStorage({ 'year-dots:v1:2026': '["2026-09-30"]' });
  const grid = new FakeElement('div');
  renderYear(grid, new Date(2026, 8, 30), fakeDocument);

  const byKey = Object.fromEntries(grid.findAll('.dot').map((dot) => [dot.dataset.key, dot]));
  assert.ok(byKey['2026-09-30'].classList.contains('is-achieved'));
  assert.equal(byKey['2026-09-30'].getAttribute('aria-pressed'), 'true');

  assert.ok(!byKey['2026-09-29'].classList.contains('is-achieved'));
  assert.equal(byKey['2026-09-29'].getAttribute('aria-pressed'), 'false');
});

test('one delegated click toggles the dot, persists it and announces the change', () => {
  globalThis.localStorage = memoryStorage();
  const { grid, byKey } = setup();
  const dot = byKey['2026-03-03'];
  const events = [];
  grid.addEventListener('yeardots:change', (event) => events.push(event.detail));

  grid.emit('click', dot);
  assert.ok(dot.classList.contains('is-achieved'));
  assert.equal(dot.getAttribute('aria-pressed'), 'true');
  assert.equal(globalThis.localStorage.getItem('year-dots:v1:2026'), '["2026-03-03"]');
  assert.deepEqual(events.at(-1), { key: '2026-03-03', achieved: true, count: 1 });

  grid.emit('click', dot);
  assert.ok(!dot.classList.contains('is-achieved'));
  assert.equal(dot.getAttribute('aria-pressed'), 'false');
  assert.equal(globalThis.localStorage.getItem('year-dots:v1:2026'), '[]');
  assert.deepEqual(events.at(-1), { key: '2026-03-03', achieved: false, count: 0 });
});

test('toggling updates only the clicked dot and never re-renders the grid', () => {
  globalThis.localStorage = memoryStorage();
  const { grid, byKey } = setup();
  const dot = byKey['2026-04-04'];
  const replaces = grid.replaceCount;

  grid.emit('click', dot);

  assert.equal(grid.replaceCount, replaces);
  assert.equal(grid.querySelector('.dot[data-key="2026-04-04"]'), dot);
  assert.equal(grid.querySelector('.dot[data-key="2026-04-05"]'), byKey['2026-04-05']);
});

test('wireToggle attaches exactly one click listener no matter how often it runs', () => {
  globalThis.localStorage = memoryStorage();
  const { grid, byKey } = setup();
  wireToggle(grid);
  wireToggle(grid);
  assert.equal(grid.listenerCount('click'), 1);

  const events = [];
  grid.addEventListener('yeardots:change', (event) => events.push(event.detail));
  grid.emit('click', byKey['2026-05-05']);
  assert.equal(events.length, 1);
});

test('toggleDot is the reusable toggle path for a day', () => {
  globalThis.localStorage = memoryStorage();
  const { grid, byKey } = setup();
  toggleDot(grid, '2026-07-07');
  assert.ok(byKey['2026-07-07'].classList.contains('is-achieved'));
  toggleDot(grid, '2026-07-07');
  assert.ok(!byKey['2026-07-07'].classList.contains('is-achieved'));
});
