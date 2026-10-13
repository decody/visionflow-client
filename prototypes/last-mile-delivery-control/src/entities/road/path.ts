/** 최단 경로(Dijkstra, 순수) — 단계 2 */

import type { RoadGraph } from './build-road-graph';

/**
 * from→to 최단 경로를 노드 id 배열로 반환. 경로 없음/동일 노드는 null/[from].
 * 노드 수가 작아(수백) 선형 탐색 우선순위 큐로 충분하다.
 */
export function shortestPath(graph: RoadGraph, from: string, to: string): string[] | null {
  if (from === to) return [from];
  if (!graph.nodeById.has(from) || !graph.nodeById.has(to)) return null;

  const dist = new Map<string, number>();
  const prev = new Map<string, string>();
  const visited = new Set<string>();
  dist.set(from, 0);

  while (true) {
    // 미방문 중 최소 거리 노드 선택
    let current: string | null = null;
    let currentDist = Infinity;
    for (const [id, d] of dist) {
      if (!visited.has(id) && d < currentDist) {
        current = id;
        currentDist = d;
      }
    }
    if (current === null) return null; // 도달 불가
    if (current === to) break;
    visited.add(current);

    for (const edge of graph.adjacency.get(current) ?? []) {
      if (visited.has(edge.to)) continue;
      const next = currentDist + edge.weight;
      if (next < (dist.get(edge.to) ?? Infinity)) {
        dist.set(edge.to, next);
        prev.set(edge.to, current);
      }
    }
  }

  const path: string[] = [to];
  let step = to;
  while (step !== from) {
    const p = prev.get(step);
    if (p === undefined) return null;
    path.push(p);
    step = p;
  }
  return path.reverse();
}

/** 노드 id 경로의 총 길이(m). */
export function pathDistance(graph: RoadGraph, path: string[]): number {
  let total = 0;
  for (let i = 1; i < path.length; i += 1) {
    const edge = (graph.adjacency.get(path[i - 1]!) ?? []).find((e) => e.to === path[i]);
    if (edge) total += edge.weight;
  }
  return total;
}
