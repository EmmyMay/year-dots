import test from 'node:test';
import assert from 'node:assert/strict';
import { nextIndexFor } from '../src/keyboard.js';

test('Left and Right move to adjacent days across month boundaries', () => {
  assert.equal(nextIndexFor('ArrowLeft', 365, 31), 30);
  assert.equal(nextIndexFor('ArrowRight', 365, 30), 31);
});

test('Up and Down move exactly one week', () => {
  assert.equal(nextIndexFor('ArrowUp', 365, 60), 53);
  assert.equal(nextIndexFor('ArrowDown', 365, 60), 67);
});

test('Home and End select year boundaries in common and leap years', () => {
  for (const count of [365, 366]) {
    assert.equal(nextIndexFor('Home', count, 60), 0);
    assert.equal(nextIndexFor('End', count, 60), count - 1);
  }
});

test('movement clamps to the ends of the year without wrapping', () => {
  for (const count of [365, 366]) {
    assert.equal(nextIndexFor('ArrowLeft', count, 0), 0);
    assert.equal(nextIndexFor('ArrowRight', count, count - 1), count - 1);
    assert.equal(nextIndexFor('ArrowUp', count, 3), 0);
    assert.equal(nextIndexFor('ArrowDown', count, count - 4), count - 1);
  }
});

test('activation and tab keys keep their native button behavior', () => {
  for (const key of ['Enter', ' ', 'Tab', 'Escape', 'a']) {
    assert.equal(nextIndexFor(key, 365, 60), null);
  }
  assert.equal(nextIndexFor('ArrowRight', 0, 0), null);
});
