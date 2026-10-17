import assert from 'node:assert/strict';
import test from 'node:test';

import { buildRoadGraph, edgeKey, nearestNode, type LonLat } from '@/entities/road';
import { shortestPath, pathDistance } from '@/entities/road';

// 두 도로가 교차하는 최소 입력: 수평선과 수직선이 (0,0) 부근에서 만난다.
const crossing: LonLat[][] = [
  [[127.00, 37.50], [127.02, 37.50]], // 동서
  [[127.01, 37.49], [127.01, 37.51]], // 남북
];

test('그래프는 결정론적으로 생성된다(동일 입력 → 동일 노드 수)', () => {
  const a = buildRoadGraph(crossing);
  const b = buildRoadGraph(crossing);
  assert.equal(a.nodes.length, b.nodes.length);
  assert.ok(a.nodes.length > 0);
});

test('교차하는 두 도로는 하나의 연결 요소를 이룬다', () => {
  const graph = buildRoadGraph(crossing);
  // 첫 노드에서 BFS 도달 노드 수 == 전체 노드 수
  const seen = new Set<string>([graph.nodes[0]!.id]);
  const queue = [graph.nodes[0]!.id];
  while (queue.length) {
    const id = queue.pop()!;
    for (const e of graph.adjacency.get(id) ?? []) {
      if (!seen.has(e.to)) {
        seen.add(e.to);
        queue.push(e.to);
      }
    }
  }
  assert.equal(seen.size, graph.nodes.length);
});

test('분리된 두 도로도 봉합되어 전체가 연결된다', () => {
  // 서로 멀리 떨어진(교차/근접 없음) 두 선 → stitch가 연결해야 한다.
  const disjoint: LonLat[][] = [
    [[127.00, 37.50], [127.01, 37.50]],
    [[127.20, 37.60], [127.21, 37.60]],
  ];
  const graph = buildRoadGraph(disjoint);
  const from = graph.nodes[0]!.id;
  const to = graph.nodes[graph.nodes.length - 1]!.id;
  const path = shortestPath(graph, from, to);
  assert.ok(path, '봉합된 그래프에서 경로가 존재해야 한다');
  assert.ok(path!.length >= 2);
});

test('nearestNode는 좌표에 가장 가까운 노드를 찾는다', () => {
  const graph = buildRoadGraph(crossing);
  const id = nearestNode(graph, [127.0, 37.5]);
  const node = graph.nodeById.get(id)!;
  assert.ok(Math.abs(node.lon - 127.0) < 0.01 && Math.abs(node.lat - 37.5) < 0.01);
});

test('shortestPath/pathDistance는 교차 경로를 연결한다', () => {
  const graph = buildRoadGraph(crossing);
  const from = nearestNode(graph, [127.0, 37.5]);
  const to = nearestNode(graph, [127.01, 37.51]);
  const path = shortestPath(graph, from, to);
  assert.ok(path && path.length >= 2);
  assert.ok(pathDistance(graph, path!) > 0);
});

test('차단 간선(도로 통제)을 피해 우회로를 찾는다', () => {
  // 두 경로가 있는 격자: 직선 최단 경로의 첫 간선을 막으면 다른 경로로 우회해야 한다.
  const grid: LonLat[][] = [
    [[127.00, 37.50], [127.01, 37.50], [127.02, 37.50]], // 아래쪽 가로
    [[127.00, 37.51], [127.01, 37.51], [127.02, 37.51]], // 위쪽 가로
    [[127.00, 37.50], [127.00, 37.51]], // 왼쪽 세로
    [[127.02, 37.50], [127.02, 37.51]], // 오른쪽 세로
  ];
  const graph = buildRoadGraph(grid, { maxSegment: 2000, junctionRadius: 50 });
  const from = nearestNode(graph, [127.00, 37.50]);
  const to = nearestNode(graph, [127.02, 37.50]);
  const open = shortestPath(graph, from, to);
  assert.ok(open && open.length >= 2);

  // 최단 경로의 첫 간선을 통제하면 경로가 바뀌어야 한다(그래도 도달은 가능).
  const blocked = new Set<string>([edgeKey(open![0]!, open![1]!)]);
  const detour = shortestPath(graph, from, to, blocked);
  assert.ok(detour && detour.length >= 2, '우회로가 존재해야 한다');
  assert.notDeepEqual(detour, open, '통제 시 경로가 달라져야 한다');
  for (let i = 1; i < detour!.length; i += 1) {
    assert.ok(!blocked.has(edgeKey(detour![i - 1]!, detour![i]!)), '우회로는 통제 간선을 쓰지 않는다');
  }
});
