import test from 'node:test';
import assert from 'node:assert/strict';

import { distPointToSeg, nearestSegment } from '@/shared/map/geometry';
import type { RailSegment, XY } from '@/entities/fab/rail-graph';

test('distPointToSeg: 수직 거리', () => {
  const d = distPointToSeg([5, 1] as XY, [0, 0], [10, 0]);
  assert.equal(d, 1);
});

test('distPointToSeg: 선분 밖은 끝점으로 클램프', () => {
  const d = distPointToSeg([-5, 0] as XY, [0, 0], [10, 0]);
  assert.equal(d, 5);
});

test('distPointToSeg: 길이 0 선분은 점까지 거리', () => {
  const d = distPointToSeg([3, 4] as XY, [0, 0], [0, 0]);
  assert.equal(d, 5);
});

test('nearestSegment: 가장 가까운 세그먼트 선택', () => {
  const segs: RailSegment[] = [
    { id: 'A', a: [0, 0], b: [10, 0], length: 10, kind: 'intrabay' },
    { id: 'B', a: [0, 20], b: [10, 20], length: 10, kind: 'intrabay' },
  ];
  const near = nearestSegment([5, 2] as XY, segs);
  assert.ok(near);
  assert.equal(near?.id, 'A');
});

test('nearestSegment: 빈 목록은 null', () => {
  assert.equal(nearestSegment([0, 0] as XY, []), null);
});
