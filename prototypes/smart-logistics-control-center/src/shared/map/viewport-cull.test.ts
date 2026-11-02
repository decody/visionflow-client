import assert from 'node:assert/strict';
import { test } from 'node:test';

import { diffVisibility, expandExtent, withinExtent, withinHemisphere, type Extent } from './viewport-cull';

const ext: Extent = [0, 0, 10, 10];

test('expandExtent: 비율만큼 확장', () => {
  assert.deepEqual(expandExtent(ext, 0.1), [-1, -1, 11, 11]);
});

test('withinExtent: 경계 포함', () => {
  assert.equal(withinExtent(5, 5, ext), true);
  assert.equal(withinExtent(0, 10, ext), true);
  assert.equal(withinExtent(-1, 5, ext), false);
  assert.equal(withinExtent(5, 11, ext), false);
});

test('withinHemisphere: 중심 근처는 앞면, 반대편은 뒷면', () => {
  // 중심 (0,0). 같은 지점은 앞면.
  assert.equal(withinHemisphere(0, 0, 0, 0), true);
  // 경도 반대편(180°)은 뒷면.
  assert.equal(withinHemisphere(180, 0, 0, 0), false);
  // 70° 떨어진 지점은 앞면(90°+여유 안).
  assert.equal(withinHemisphere(70, 0, 0, 0), true);
  // 120° 떨어진 지점은 뒷면.
  assert.equal(withinHemisphere(120, 0, 0, 0), false);
});

test('diffVisibility: add/remove 계산', () => {
  const rendered = new Set(['a', 'b', 'c']);
  const visible = new Set(['b', 'c', 'd']);
  const { add, remove } = diffVisibility(rendered, visible);
  assert.deepEqual(add.sort(), ['d']);
  assert.deepEqual(remove.sort(), ['a']);
});
