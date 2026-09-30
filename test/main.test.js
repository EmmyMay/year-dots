import test from 'node:test';
import assert from 'node:assert/strict';
import { daysInYear } from '../src/dates.js';
import { renderYear } from '../src/main.js';

// Just enough of the DOM API for renderYear, so the test runs in plain node.
class FakeElement {
  constructor(tagName) {
    this.tagName = tagName.toUpperCase();
    this.children = [];
    this.attributes = {};
    this.dataset = {};
    this.className = '';
    this.classList = {
      add: (name) => {
        this.className = `${this.className} ${name}`.trim();
      },
      contains: (name) => this.className.split(' ').includes(name),
    };
  }

  append(...nodes) {
    this.children.push(...nodes);
  }

  replaceChildren(...nodes) {
    this.children = nodes.flatMap((node) => (node.tagName === '#FRAGMENT' ? node.children : [node]));
  }

  setAttribute(name, value) {
    this.attributes[name] = String(value);
  }

  descendants() {
    return this.children.flatMap((child) => [child, ...child.descendants()]);
  }
}

const fakeDocument = {
  createElement: (tagName) => new FakeElement(tagName),
  createDocumentFragment: () => new FakeElement('#fragment'),
};

function render(today) {
  const grid = new FakeElement('div');
  renderYear(grid, today, fakeDocument);
  const dots = grid.descendants().filter((el) => el.tagName === 'BUTTON');
  return { grid, dots, byKey: Object.fromEntries(dots.map((dot) => [dot.dataset.key, dot])) };
}

for (const year of [2025, 2026, 2024]) {
  test(`renders one button per day of ${year}, grouped into 12 months`, () => {
    const { grid, dots } = render(new Date(year, 5, 15, 13, 45));
    assert.equal(dots.length, daysInYear(year));
    assert.equal(grid.children.length, 12);
    assert.equal(dots[0].dataset.key, `${year}-01-01`);
    assert.equal(dots.at(-1).dataset.key, `${year}-12-31`);
  });
}

test('every dot is a button with a date key and a full-date accessible name', () => {
  const { dots } = render(new Date(2026, 8, 30));
  for (const dot of dots) {
    assert.equal(dot.type, 'button');
    assert.ok(dot.classList.contains('dot'));
    assert.match(dot.dataset.key, /^2026-\d{2}-\d{2}$/);
    assert.match(dot.attributes['aria-label'], /2026/);
  }
});

test('past, today and future status classes', () => {
  const { dots, byKey } = render(new Date(2026, 8, 30, 23, 59));
  const today = byKey['2026-09-30'];
  assert.ok(today.classList.contains('is-today'));
  assert.ok(today.classList.contains('is-future'));
  assert.ok(!today.classList.contains('is-past'));
  assert.equal(today.attributes['aria-current'], 'date');
  assert.match(today.attributes['aria-label'], /today$/);

  assert.ok(byKey['2026-09-29'].classList.contains('is-past'));
  assert.ok(!byKey['2026-09-29'].classList.contains('is-future'));
  assert.ok(byKey['2026-10-01'].classList.contains('is-future'));
  assert.ok(!byKey['2026-10-01'].classList.contains('is-today'));

  assert.equal(dots.filter((dot) => dot.classList.contains('is-today')).length, 1);
  assert.equal(dots.filter((dot) => dot.classList.contains('is-past')).length, 272);
});
