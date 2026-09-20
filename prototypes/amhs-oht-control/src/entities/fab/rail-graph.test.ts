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

test('복수 로드포트: 각 LP는 개별 rail 정차 노드를 가진다', () => {
  const g = buildRailGraph();
  const tool = g.equipment.find((e) => e.kind === 'process')!;
  const lps = g.ports.filter((p) => p.equipmentId === tool.id);
  assert.ok(lps.length >= 2);
  // 각 LP의 정차 노드(at)는 서로 다르다.
  const nodes = new Set(lps.map((p) => nodeKeyOf(p.at)));
  assert.equal(nodes.size, lps.length, 'LP마다 개별 정차 노드');
  // 각 정차 노드는 그래프의 실제 노드(나가는 간선 존재)여야 라우팅이 성립한다.
  for (const p of lps)
    assert.ok(
      (g.adjacency.get(nodeKeyOf(p.at)) ?? []).length > 0,
      `${p.id} 정차 노드가 그래프에 연결됨`,
    );
});

test('layout: extent가 fab-layout.json과 일치', () => {
  const g = buildRailGraph();
  assert.deepEqual(g.extent, [0, 0, 200, 140]);
});

test('railGraphToGeoJSON: 피처 수가 소스와 일치', () => {
  const g = buildRailGraph();
  const geo = railGraphToGeoJSON(g);
  assert.equal(geo.rails.features.length, g.segments.length);
  assert.equal(geo.zones.features.length, g.zones.length);
  assert.equal(geo.ports.features.length, g.ports.length);
  assert.equal(geo.equipment.features.length, g.equipment.length);
  assert.equal(geo.turntables.features.length, g.turntables.length);
});

test('다중 interbay 루프: 교차 코리도가 북/남 방향 순환을 형성', () => {
  const g = buildRailGraph();
  // 교차 코리도 두 레인(MID-HI: L→R, MID-LO: R→L)이 존재한다.
  const midHi = g.segments.filter((s) => s.id.startsWith('MID-HI'));
  const midLo = g.segments.filter((s) => s.id.startsWith('MID-LO'));
  assert.ok(midHi.length > 0 && midLo.length > 0, '교차 코리도 두 레인 존재');
  // HI 레인은 좌→우, LO 레인은 우→좌 단방향이다.
  assert.ok(midHi.every((s) => s.b[0] > s.a[0]), 'MID-HI는 좌→우');
  assert.ok(midLo.every((s) => s.b[0] < s.a[0]), 'MID-LO는 우→좌');

  // 각 코리도는 되돌아오려면 루프를 한 바퀴 돌아야 하는 진짜 단방향 순환이다.
  const hiL = nodeKeyOf(midHi[0]!.a); // LEFT@MID_HI
  const hiR = nodeKeyOf(midHi[midHi.length - 1]!.b); // RIGHT@MID_HI
  assert.ok(findRoute(g, hiL, hiR).length > 0 && findRoute(g, hiR, hiL).length > 0, '북루프 양방향 도달(순환)');
  assert.ok(
    findRoute(g, hiR, hiL).length > findRoute(g, hiL, hiR).length,
    '역방향은 코리도 직행이 아니라 루프 우회',
  );
});

test('turntable: 루프 전환·코너 노드가 실제 rail 노드에 위치', () => {
  const g = buildRailGraph();
  assert.ok(g.turntables.length > 0);
  assert.ok(g.turntables.some((t) => t.kind === 'transfer'));
  assert.ok(g.turntables.some((t) => t.kind === 'corner'));
  // 모든 turntable은 세그먼트가 연결된 실제 그래프 노드여야 한다.
  for (const t of g.turntables) {
    const k = nodeKeyOf(t.at);
    assert.ok(
      (g.adjacency.get(k)?.length ?? 0) > 0,
      `${t.id} 노드에 나가는 간선 존재`,
    );
  }
});
