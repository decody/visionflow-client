/**
 * 네트워크 경로 탐색 — 단계 3(순수, 기획서 §6 배정/라우팅 규칙).
 *
 * 허브 그래프에서 origin→dest 최적 경로를 Dijkstra로 찾는다. 엣지 비용은 라우팅 규칙에
 * 따라 달라진다: 최단 ETA(시간)·최소 환적(홉 수)·최저 비용(모드별 $/km). 동점은 도착 허브
 * id 사전순으로 깨서 결정론을 보장한다(last-mile path.ts 패턴의 일반화).
 */

import { HUB_BY_ID, cruiseKmh } from '@/entities/logistics/mock';
import type { Mode, RoutingRule } from '@/entities/logistics/types';
import { haversineKm, type LonLat } from '@/shared/geo/great-circle';
import type { NetEdge, Network } from './build-network';

/** 모드별 합성 운임($/km) — 최저 비용 규칙용. */
const COST_PER_KM: Record<Mode, number> = { SEA: 0.05, RAIL: 0.12, ROAD: 0.3, AIR: 1.2 };

function hubLL(id: string): LonLat {
  const h = HUB_BY_ID[id];
  if (!h) throw new Error(`unknown hub: ${id}`);
  return [h.lon, h.lat];
}

export function edgeDistKm(edge: NetEdge): number {
  return haversineKm(hubLL(edge.from), hubLL(edge.to));
}

/** 엣지 1개의 규칙별 비용. */
export function edgeCost(edge: NetEdge, rule: RoutingRule): number {
  const dist = edgeDistKm(edge);
  switch (rule) {
    case 'FASTEST_ETA':
      return dist / cruiseKmh(edge.mode); // hours
    case 'FEWEST_TRANSFERS':
      return 1 + dist / cruiseKmh(edge.mode) / 1e6; // 홉 수 우선, 미세 시간 타이브레이크
    case 'LOWEST_COST':
      return dist * COST_PER_KM[edge.mode];
  }
}

export interface Route {
  hubs: string[];
  edges: NetEdge[];
  cost: number;
}

/** origin→dest 최적 경로. 도달 불가 시 null. 동점은 도착 허브 id 사전순.
 * blocked에 든 laneIndex 엣지는 제외(운하 폐쇄 우회, §7). */
export function shortestRoute(
  net: Network,
  origin: string,
  dest: string,
  rule: RoutingRule,
  blocked?: ReadonlySet<number>,
): Route | null {
  if (origin === dest) return { hubs: [origin], edges: [], cost: 0 };

  const dist = new Map<string, number>();
  const prev = new Map<string, { hub: string; edge: NetEdge }>();
  const visited = new Set<string>();
  for (const h of net.hubs) dist.set(h, Infinity);
  dist.set(origin, 0);

  while (visited.size < net.hubs.length) {
    // 미방문 중 최소 비용(동점은 허브 id 사전순).
    let cur: string | null = null;
    let best = Infinity;
    for (const h of net.hubs) {
      if (visited.has(h)) continue;
      const d = dist.get(h) ?? Infinity;
      if (d < best || (d === best && cur !== null && h < cur)) {
        best = d;
        cur = h;
      }
    }
    if (cur === null || best === Infinity) break;
    if (cur === dest) break;
    visited.add(cur);

    const edges = [...(net.adjacency.get(cur) ?? [])].sort((a, b) => (a.to < b.to ? -1 : a.to > b.to ? 1 : 0));
    for (const edge of edges) {
      if (visited.has(edge.to)) continue;
      if (blocked?.has(edge.laneIndex)) continue;
      const nd = best + edgeCost(edge, rule);
      const cru = dist.get(edge.to) ?? Infinity;
      if (nd < cru) {
        dist.set(edge.to, nd);
        prev.set(edge.to, { hub: cur, edge });
      }
    }
  }

  if (!prev.has(dest) && origin !== dest) return null;

  const hubs: string[] = [dest];
  const edges: NetEdge[] = [];
  let node = dest;
  while (node !== origin) {
    const step = prev.get(node);
    if (!step) return null;
    edges.unshift(step.edge);
    hubs.unshift(step.hub);
    node = step.hub;
  }
  return { hubs, edges, cost: dist.get(dest) ?? Infinity };
}
