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

test('복수 로드포트: 공정 툴은 다중 LP, 계측 툴은 단일 LP', () => {
  const g = buildRailGraph();
  const process = g.equipment.filter((e) => e.kind === 'process');
  const metrology = g.equipment.filter((e) => e.kind === 'metrology');
  assert.ok(process.length > 0 && metrology.length > 0);
  assert.ok(
    process.every((e) => e.portIds.length >= 2),
    '공정 툴은 로드포트가 2개 이상',
  );
  assert.ok(
    metrology.every((e) => e.portIds.length === 1),
    '계측 툴은 로드포트가 1개',
  );
  // 로드포트 id는 -LP{n} 규약을 따르고 각 포트는 용량 1이다.
  for (const e of process) {
    for (let i = 0; i < e.portIds.length; i += 1)
      assert.equal(e.portIds[i], `${e.id}-LP${i + 1}`);
    const eqpPorts = g.ports.filter((p) => p.equipmentId === e.id);
    assert.ok(eqpPorts.every((p) => p.capacity === 1));
  }
});

test('복수 로드포트: 같은 툴의 LP는 rail 노드를 공유하고 마커만 오프셋', () => {
  const g = buildRailGraph();
  const tool = g.equipment.find((e) => e.kind === 'process')!;
  const lps = g.ports.filter((p) => p.equipmentId === tool.id);
  assert.ok(lps.length >= 2);
  // 경로탐색 노드(at)는 동일해야 라우팅이 성립한다.
  const nodes = new Set(lps.map((p) => nodeKeyOf(p.at)));
  assert.equal(nodes.size, 1, 'LP들은 동일 rail 노드를 공유');
  // 이 노드는 그래프의 실제 노드(나가는 간선 존재)여야 한다.
  assert.ok((g.adjacency.get([...nodes][0]!) ?? []).length > 0);
  // 마커(renderAt)는 서로 달라 겹치지 않는다.
  const marks = new Set(lps.map((p) => (p.renderAt ?? p.at).join(',')));
  assert.equal(marks.size, lps.length, '마커는 서로 다른 위치');
});

test('layout: extent가 fab-layout.json과 일치', () => {
  const g = buildRailGraph();
  assert.deepEqual(g.extent, [0, 0, 120, 80]);
});

test('railGraphToGeoJSON: 피처 수가 소스와 일치', () => {
  const g = buildRailGraph();
  const geo = railGraphToGeoJSON(g);
  assert.equal(geo.rails.features.length, g.segments.length);
  assert.equal(geo.zones.features.length, g.zones.length);
  assert.equal(geo.ports.features.length, g.ports.length);
  assert.equal(geo.equipment.features.length, g.equipment.length);
});
