import assert from 'node:assert/strict';
import test from 'node:test';

import { buildRoadGraph, nearestNode, type LonLat } from '@/entities/road';
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
