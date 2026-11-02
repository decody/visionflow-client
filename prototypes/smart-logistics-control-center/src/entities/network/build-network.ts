/**
 * 운송 네트워크 그래프 — 단계 2(순수, 기획서 §2/§5).
 *
 * 허브(노드)와 레인(링크)으로 양방향 인접 그래프를 만든다. 각 레인은 정방향·역방향
 * 두 엣지로 전개해, 운송수단이 허브에서 같은 모드의 인접 엣지를 타고 순회할 수 있다.
 * 렌더/시뮬에 의존하지 않아 단위 테스트한다.
 */

import type { Hub, Mode } from '@/entities/logistics/types';
import type { LaneDef } from '@/entities/logistics/mock';

/** 운송수단이 탈 수 있는 방향성 엣지(레인의 한 방향). */
export interface NetEdge {
  from: string;
  to: string;
  mode: Mode;
  /** 원본 레인 인덱스(정/역 구분은 from/to로). */
  laneIndex: number;
}

export interface Network {
  hubs: string[];
  /** 허브 id → 그 허브에서 출발하는 엣지들. */
  adjacency: Map<string, NetEdge[]>;
}

export function buildNetwork(hubs: Hub[], lanes: LaneDef[]): Network {
  const adjacency = new Map<string, NetEdge[]>();
  for (const h of hubs) adjacency.set(h.id, []);

  const push = (edge: NetEdge) => {
    const list = adjacency.get(edge.from);
    if (!list) throw new Error(`lane references unknown hub: ${edge.from}`);
    list.push(edge);
  };

  lanes.forEach((lane, laneIndex) => {
    push({ from: lane.from, to: lane.to, mode: lane.mode, laneIndex });
    push({ from: lane.to, to: lane.from, mode: lane.mode, laneIndex });
  });

  return { hubs: hubs.map((h) => h.id), adjacency };
}

/** 허브에서 특정 모드로 나가는 엣지들. */
export function edgesFrom(net: Network, hubId: string, mode: Mode): NetEdge[] {
  return (net.adjacency.get(hubId) ?? []).filter((e) => e.mode === mode);
}

/** start에서 (모드 무관) 도달 가능한 허브 집합 — BFS. */
export function reachable(net: Network, start: string): Set<string> {
  const seen = new Set<string>([start]);
  const queue = [start];
  while (queue.length > 0) {
    const cur = queue.shift() as string;
    for (const e of net.adjacency.get(cur) ?? []) {
      if (!seen.has(e.to)) {
        seen.add(e.to);
        queue.push(e.to);
      }
    }
  }
  return seen;
}

/** 네트워크에 실제로 존재하는 모드 목록(레인이 하나라도 있는 모드). */
export function modesInNetwork(net: Network): Mode[] {
  const set = new Set<Mode>();
  for (const list of net.adjacency.values()) for (const e of list) set.add(e.mode);
  return [...set];
}
