import assert from 'node:assert/strict';
import { test } from 'node:test';

import { HUBS, LANES } from '@/entities/logistics/mock';
import { buildNetwork } from './build-network';
import { edgeCost, shortestRoute } from './path';

const net = buildNetwork(HUBS, LANES);

test('shortestRoute: 같은 허브는 빈 경로', () => {
  const r = shortestRoute(net, 'CNSHA', 'CNSHA', 'FASTEST_ETA');
  assert.deepEqual(r, { hubs: ['CNSHA'], edges: [], cost: 0 });
});

test('shortestRoute: 연결된 두 허브 경로 발견·연속성', () => {
  const r = shortestRoute(net, 'CNSHA', 'NLRTM', 'FASTEST_ETA');
  assert.ok(r);
  if (!r) return;
  assert.equal(r.hubs[0], 'CNSHA');
  assert.equal(r.hubs[r.hubs.length - 1], 'NLRTM');
  // 엣지 연속성: edge[i].from===hubs[i], edge[i].to===hubs[i+1]
  r.edges.forEach((e, i) => {
    assert.equal(e.from, r.hubs[i]);
    assert.equal(e.to, r.hubs[i + 1]);
  });
});

test('shortestRoute: 규칙에 따라 경로/비용이 달라질 수 있다', () => {
  const fast = shortestRoute(net, 'CNSHA', 'DEFRA', 'FASTEST_ETA');
  const cheap = shortestRoute(net, 'CNSHA', 'DEFRA', 'LOWEST_COST');
  assert.ok(fast && cheap);
  // 최저 비용 경로의 비용은 그 규칙 기준에서 최단 ETA 경로 비용보다 크지 않다.
  if (fast && cheap) {
    const cheapByCostRule = cheap.cost;
    const fastByCostRule = fast.edges.reduce((s, e) => s + edgeCost(e, 'LOWEST_COST'), 0);
    assert.ok(cheapByCostRule <= fastByCostRule + 1e-9);
  }
});

test('shortestRoute: 결정론(반복 호출 동일)', () => {
  const a = shortestRoute(net, 'USLAX', 'DEFRA', 'FEWEST_TRANSFERS');
  const b = shortestRoute(net, 'USLAX', 'DEFRA', 'FEWEST_TRANSFERS');
  assert.deepEqual(a, b);
});

test('edgeCost: 최소 환적은 홉당 ~1', () => {
  const edge = net.adjacency.get('CNSHA')?.[0];
  assert.ok(edge);
  if (edge) assert.ok(edgeCost(edge, 'FEWEST_TRANSFERS') >= 1 && edgeCost(edge, 'FEWEST_TRANSFERS') < 2);
});
