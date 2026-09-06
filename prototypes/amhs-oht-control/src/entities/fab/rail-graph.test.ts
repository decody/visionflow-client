import test from 'node:test';
import assert from 'node:assert/strict';

import { buildRailGraph, findRoute, nodeKeyOf, railGraphToGeoJSON } from '@/entities/fab/rail-graph';

test('buildRailGraph: 세그먼트/존/포트 생성', () => {
  const g = buildRailGraph();
  assert.ok(g.segments.length > 0);
  assert.ok(g.zones.length > 0);
  assert.ok(g.ports.length > 0);
  assert.ok(g.ports.some((p) => p.kind === 'stocker'));
  assert.ok(g.ports.some((p) => p.kind === 'tool'));
  assert.ok(g.ports.some((p) => p.kind === 'buffer'));
  assert.ok(g.equipment.length >= 30);
  assert.deepEqual(new Set(g.zones.filter((z) => z.type === 'intrabay').map((z) => z.process)), new Set(['PHOTO', 'ETCH', 'CVD', 'CMP']));
});

test('buildRailGraph: 결정론적(두 번 호출 동일)', () => {
  const a = buildRailGraph();
  const b = buildRailGraph();
  assert.equal(a.segments.length, b.segments.length);
  a.segments.forEach((s, i) => {
    const t = b.segments[i]!;
    assert.equal(s.id, t.id);
    assert.deepEqual(s.a, t.a);
    assert.deepEqual(s.b, t.b);
    assert.equal(s.kind, t.kind);
  });
});

test('adjacency: 나가는 간선의 시작 노드가 세그먼트 a와 일치', () => {
  const g = buildRailGraph();
  g.adjacency.forEach((segIdxs, key) => {
    for (const si of segIdxs) {
      assert.equal(nodeKeyOf(g.segments[si]!.a), key);
    }
  });
});

test('findRoute: 같은 노드는 빈 경로', () => {
  const g = buildRailGraph();
  const k = nodeKeyOf(g.ports[0]!.at);
  assert.deepEqual(findRoute(g, k, k), []);
});

test('findRoute: 방향성 경로 + 연속성(이전 seg.b == 다음 seg.a)', () => {
  const g = buildRailGraph();
  const startKey = nodeKeyOf(g.ports[0]!.at);
  const goalKey = nodeKeyOf(g.ports[g.ports.length - 1]!.at);
  const route = findRoute(g, startKey, goalKey);
  assert.ok(route.length > 0);

  assert.equal(nodeKeyOf(g.segments[route[0]!]!.a), startKey);
  assert.equal(nodeKeyOf(g.segments[route[route.length - 1]!]!.b), goalKey);
  for (let i = 1; i < route.length; i += 1) {
    const prev = g.segments[route[i - 1]!]!;
    const cur = g.segments[route[i]!]!;
    assert.equal(nodeKeyOf(prev.b), nodeKeyOf(cur.a)); // 방향 연속
  }
});

test('연결성: 모든 툴이 첫 포트에서 도달 가능', () => {
  const g = buildRailGraph();
  const startKey = nodeKeyOf(g.ports[0]!.at);
  for (const p of g.ports) {
    const goalKey = nodeKeyOf(p.at);
    if (goalKey === startKey) continue;
    assert.ok(findRoute(g, startKey, goalKey).length > 0, `unreachable: ${p.id}`);
  }
});

test('railGraphToGeoJSON: 피처 수가 소스와 일치', () => {
  const g = buildRailGraph();
  const geo = railGraphToGeoJSON(g);
  assert.equal(geo.rails.features.length, g.segments.length);
  assert.equal(geo.zones.features.length, g.zones.length);
  assert.equal(geo.ports.features.length, g.ports.length);
  assert.equal(geo.equipment.features.length, g.equipment.length);
});
