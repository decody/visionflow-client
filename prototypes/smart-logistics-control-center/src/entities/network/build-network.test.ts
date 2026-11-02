import assert from 'node:assert/strict';
import { test } from 'node:test';

import { HUBS, LANES } from '@/entities/logistics/mock';
import { buildNetwork, edgesFrom, modesInNetwork, reachable } from './build-network';

test('buildNetwork: 각 레인이 양방향 2엣지로 전개', () => {
  const net = buildNetwork(HUBS, LANES);
  let total = 0;
  for (const list of net.adjacency.values()) total += list.length;
  assert.equal(total, LANES.length * 2);
  assert.equal(net.hubs.length, HUBS.length);
});

test('buildNetwork: 역방향 엣지 존재', () => {
  const net = buildNetwork(HUBS, LANES);
  // CNSHA→SGSIN(SEA)과 그 역방향 SGSIN→CNSHA가 모두 있어야 한다.
  const fwd = edgesFrom(net, 'CNSHA', 'SEA').some((e) => e.to === 'SGSIN');
  const rev = edgesFrom(net, 'SGSIN', 'SEA').some((e) => e.to === 'CNSHA');
  assert.ok(fwd && rev);
});

test('edgesFrom: 모드로 필터', () => {
  const net = buildNetwork(HUBS, LANES);
  const air = edgesFrom(net, 'KRICN', 'AIR');
  assert.ok(air.length >= 1);
  assert.ok(air.every((e) => e.mode === 'AIR'));
});

test('reachable: 전체 허브 연결(단일 컴포넌트)', () => {
  const net = buildNetwork(HUBS, LANES);
  const seen = reachable(net, 'CNSHA');
  assert.equal(seen.size, HUBS.length);
});

test('modesInNetwork: 4개 모드 모두 존재', () => {
  const net = buildNetwork(HUBS, LANES);
  const modes = modesInNetwork(net).sort();
  assert.deepEqual(modes, ['AIR', 'RAIL', 'ROAD', 'SEA']);
});
