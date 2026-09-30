import test from 'node:test';
import assert from 'node:assert/strict';

import { renderYear, toggleDot, wireToggle } from '../src/main.js';
import { initHeader } from '../src/header.js';
import { createStore } from '../src/storage.js';
import { daysInYear } from '../src/dates.js';

// A fake element that extends EventTarget, so the CustomEvent path between
// the toggle and the header is the real one rather than a stub.
class El extends EventTarget {
  constructor(tagName) {
    super();
    this.tagName = tagName.toUpperCase();
    this.children = [];
    this.attributes = {};
    this.dataset = {};
    this.textContent = '';
    this.className = '';
    this.classList = {
      add: (n) => { if (!this.classList.contains(n)) this.className = `${this.className} ${n}`.trim(); },
      remove: (n) => { this.className = this.className.split(' ').filter((c) => c && c !== n).join(' '); },
      contains: (n) => this.className.split(' ').includes(n),
      toggle: (n, on) => (on ? this.classList.add(n) : this.classList.remove(n)),
    };
  }

  append(...nodes) { this.children.push(...nodes); }

  replaceChildren(...nodes) {
    this.children = nodes.flatMap((n) => (n.tagName === '#FRAGMENT' ? n.children : [n]));
  }

  setAttribute(name, value) { this.attributes[name] = String(value); }
  getAttribute(name) { return this.attributes[name] ?? null; }

  descendants() { return this.children.flatMap((c) => [c, ...c.descendants()]); }

  querySelector(selector) {
    const m = /^\.dot\[data-key="(.+)"\]$/.exec(selector);
    if (!m) throw new Error(`fake querySelector cannot handle: ${selector}`);
    return this.descendants().find((e) => e.classList.contains('dot') && e.dataset.key === m[1]) ?? null;
  }

  dots() { return this.descendants().filter((e) => e.tagName === 'BUTTON'); }
}

const doc = { createElement: (t) => new El(t), createDocumentFragment: () => new El('#fragment') };

function headerDoc() {
  const els = { 'js-year': new El('span'), 'js-days-left': new El('span'), 'js-achieved': new El('span') };
  return { getElementById: (id) => els[id] ?? null, els };
}

function memoryStorage(seed = new Map()) {
  return {
    getItem: (k) => seed.get(k) ?? null,
    setItem: (k, v) => seed.set(k, v),
    removeItem: (k) => seed.delete(k),
    _seed: seed,
  };
}

const TODAY = new Date(2026, 11, 31, 10, 0, 0);

function mount(storage) {
  const grid = new El('div');
  const store = createStore(TODAY.getFullYear(), storage);
  renderYear(grid, TODAY, doc, store);
  wireToggle(grid);
  const hdoc = headerDoc();
  initHeader(hdoc, grid, TODAY, store);
  return { grid, hdoc, store };
}

test('integration: header reflects the grid on first paint', () => {
  const { grid, hdoc } = mount(memoryStorage());
  assert.equal(grid.dots().length, daysInYear(2026));
  assert.equal(hdoc.els['js-year'].textContent, '2026');
  assert.equal(hdoc.els['js-days-left'].textContent, '1 day left');
  assert.equal(hdoc.els['js-achieved'].textContent, 'no goals achieved');
});

test('integration: toggling a dot updates that dot and the header count', () => {
  const { grid, hdoc } = mount(memoryStorage());

  toggleDot(grid, '2026-03-03');
  const dot = grid.querySelector('.dot[data-key="2026-03-03"]');
  assert.ok(dot.classList.contains('is-achieved'), 'dot glows');
  assert.equal(dot.getAttribute('aria-pressed'), 'true');
  assert.equal(hdoc.els['js-achieved'].textContent, '1 goal achieved');

  toggleDot(grid, '2026-04-04');
  assert.equal(hdoc.els['js-achieved'].textContent, '2 goals achieved');

  // Toggling off clears both the dot and the count.
  toggleDot(grid, '2026-03-03');
  assert.ok(!dot.classList.contains('is-achieved'));
  assert.equal(dot.getAttribute('aria-pressed'), 'false');
  assert.equal(hdoc.els['js-achieved'].textContent, '1 goal achieved');
});

test('integration: a toggle does not disturb the year or days-left', () => {
  const { grid, hdoc } = mount(memoryStorage());
  toggleDot(grid, '2026-05-05');
  assert.equal(hdoc.els['js-year'].textContent, '2026');
  assert.equal(hdoc.els['js-days-left'].textContent, '1 day left');
});

test('integration: achieved days survive a remount, dot and header agree', () => {
  const storage = memoryStorage();
  const first = mount(storage);
  toggleDot(first.grid, '2026-07-07');
  toggleDot(first.grid, '2026-08-08');

  // Remount from the same storage, as a page reload would.
  const second = mount(storage);
  assert.equal(second.hdoc.els['js-achieved'].textContent, '2 goals achieved');
  assert.ok(second.grid.querySelector('.dot[data-key="2026-07-07"]').classList.contains('is-achieved'));
  assert.equal(second.grid.querySelector('.dot[data-key="2026-08-08"]').getAttribute('aria-pressed'), 'true');
  assert.equal(second.grid.querySelector('.dot[data-key="2026-09-09"]').getAttribute('aria-pressed'), 'false');
});

test('integration: the dot and the header agree when localStorage is blocked', () => {
  // The bug this guards: a page holding two store instances shows the dot as
  // achieved while the header still counts zero, because nothing round-trips.
  const blocked = {
    getItem() { throw new Error('blocked'); },
    setItem() { throw new Error('blocked'); },
    removeItem() { throw new Error('blocked'); },
  };
  const { grid, hdoc } = mount(blocked);
  toggleDot(grid, '2026-06-06');
  assert.ok(grid.querySelector('.dot[data-key="2026-06-06"]').classList.contains('is-achieved'));
  assert.equal(hdoc.els['js-achieved'].textContent, '1 goal achieved');
});

test('integration: the grid is not re-rendered by a toggle', () => {
  const { grid } = mount(memoryStorage());
  const before = grid.querySelector('.dot[data-key="2026-02-02"]');
  toggleDot(grid, '2026-02-02');
  // Same node object: a re-render would replace it and drop keyboard focus.
  assert.equal(grid.querySelector('.dot[data-key="2026-02-02"]'), before);
});
