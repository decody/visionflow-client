import assert from 'node:assert/strict';
import { test } from 'node:test';

import {
  diffVisibility,
  expandExtent,
  withinExtent,
  type Extent,
} from './viewport-cull';

test('withinExtent includes boundary and excludes outside points', () => {
  const e: Extent = [0, 0, 10, 10];
  assert.equal(withinExtent(5, 5, e), true);
  assert.equal(withinExtent(0, 0, e), true); // 경계 포함
  assert.equal(withinExtent(10, 10, e), true);
  assert.equal(withinExtent(-0.01, 5, e), false);
  assert.equal(withinExtent(5, 10.01, e), false);
});

test('expandExtent grows by width/height ratio in every direction', () => {
  const e: Extent = [0, 0, 10, 20];
  const grown = expandExtent(e, 0.1); // 폭 10 → ±1, 높이 20 → ±2
  assert.deepEqual(grown, [-1, -2, 11, 22]);
  // 확장 전에는 밖이던 점이 여유 영역 안으로 들어온다.
  assert.equal(withinExtent(10.5, 21, e), false);
  assert.equal(withinExtent(10.5, 21, grown), true);
});

test('expandExtent with zero margin is identity', () => {
  const e: Extent = [3, 4, 7, 9];
  assert.deepEqual(expandExtent(e, 0), e);
});

test('diffVisibility reports newly visible and newly hidden ids', () => {
  const rendered = new Set(['a', 'b', 'c']);
  const visible = new Set(['b', 'c', 'd']);
  const { add, remove } = diffVisibility(rendered, visible);
  assert.deepEqual(add.sort(), ['d']);
  assert.deepEqual(remove.sort(), ['a']);
});

test('diffVisibility is empty when membership is unchanged', () => {
  const set = new Set(['x', 'y']);
  const { add, remove } = diffVisibility(set, new Set(['x', 'y']));
  assert.equal(add.length, 0);
  assert.equal(remove.length, 0);
});

test('diffVisibility handles empty rendered set (initial populate)', () => {
  const { add, remove } = diffVisibility(
    new Set<string>(),
    new Set(['a', 'b']),
  );
  assert.deepEqual(add.sort(), ['a', 'b']);
  assert.equal(remove.length, 0);
});
