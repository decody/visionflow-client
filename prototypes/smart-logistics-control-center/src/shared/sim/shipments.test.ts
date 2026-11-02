import assert from 'node:assert/strict';
import { test } from 'node:test';

import { HUBS, LANES } from '@/entities/logistics/mock';
import { buildNetwork } from '@/entities/network/build-network';
import { shortestRoute } from '@/entities/network/path';
import {
  CUSTOMS_EXTRA_MS,
  DWELL_MS,
  etaFinal,
  isAtRisk,
  legDurationMs,
  remainingEtaMs,
  routeTravelMs,
} from './shipments';

const net = buildNetwork(HUBS, LANES);
const route = shortestRoute(net, 'CNSHA', 'NLRTM', 'FASTEST_ETA');
if (!route) throw new Error('no route');
const edges = route.edges;

test('legDurationMs: 양수', () => {
  for (const e of edges) assert.ok(legDurationMs(e) > 0);
});

test('routeTravelMs: leg 합과 일치', () => {
  const sum = edges.reduce((s, e) => s + legDurationMs(e), 0);
  assert.equal(routeTravelMs(edges), sum);
});

test('remainingEtaMs: 진행할수록 감소', () => {
  const start = remainingEtaMs(edges, 0, 0);
  const mid = remainingEtaMs(edges, 0, 0.5);
  assert.ok(mid < start);
});

test('remainingEtaMs: 환적 dwell 포함', () => {
  // leg가 2개 이상이면 환적이 최소 1회 있다.
  if (edges.length >= 2) {
    const withDwell = remainingEtaMs(edges, 0, 0);
    const travelOnly = routeTravelMs(edges);
    assert.ok(withDwell >= travelOnly + DWELL_MS - 1);
  }
});

test('remainingEtaMs: 통관 보류 가중', () => {
  const base = remainingEtaMs(edges, 0, 0.2);
  const hold = remainingEtaMs(edges, 0, 0.2, { customsHold: true });
  assert.equal(hold - base, CUSTOMS_EXTRA_MS);
});

test('etaFinal/isAtRisk: SLA 비교', () => {
  const now = 1_000_000;
  const eta = etaFinal(now, edges, 0, 0);
  assert.ok(eta > now);
  assert.equal(isAtRisk(eta, now + 10), true); // 촉박한 SLA → 위험
  assert.equal(isAtRisk(eta, eta + 1), false); // 여유 SLA → 안전
});

test('마지막 leg 이후 ETA는 0', () => {
  assert.equal(remainingEtaMs(edges, edges.length, 0), 0);
});
