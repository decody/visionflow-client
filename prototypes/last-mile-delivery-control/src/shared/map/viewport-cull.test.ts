import assert from 'node:assert/strict';
import test from 'node:test';

import { diffVisibility, expandExtent, withinExtent, type Extent } from './viewport-cull';

const box: Extent = [0, 0, 100, 100];

test('withinExtent: 경계 포함 판정', () => {
  assert.equal(withinExtent(50, 50, box), true);
  assert.equal(withinExtent(0, 0, box), true);
  assert.equal(withinExtent(100, 100, box), true);
  assert.equal(withinExtent(-1, 50, box), false);
  assert.equal(withinExtent(50, 101, box), false);
});

test('expandExtent: 폭/높이 비율만큼 확장', () => {
  const e = expandExtent(box, 0.1);
  assert.deepEqual(e, [-10, -10, 110, 110]);
});

test('diffVisibility: add/remove 차집합', () => {
  const rendered = new Set(['a', 'b', 'c']);
  const visible = new Set(['b', 'c', 'd']);
  const { add, remove } = diffVisibility(rendered, visible);
  assert.deepEqual(add.sort(), ['d']);
  assert.deepEqual(remove.sort(), ['a']);
});

test('diffVisibility: 변화 없으면 빈 배열', () => {
  const s = new Set(['x', 'y']);
  const { add, remove } = diffVisibility(s, new Set(['x', 'y']));
  assert.equal(add.length, 0);
  assert.equal(remove.length, 0);
});
