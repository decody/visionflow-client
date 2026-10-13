/**
 * 배차 선택 로직(순수) — 단계 3
 *
 * 비용 계산(도로 그래프 Dijkstra)은 SimEngine이 맡고, "어느 주문을 고를지"의
 * 규칙만 여기서 순수 함수로 분리한다(entities/road·delta-reducer와 동일한 패턴).
 *  - EXPRESS(특급) 주문을 항상 우선한다. 특급이 하나라도 남아 있으면 일반은 고르지 않는다.
 *  - 같은 우선순위 안에서 규칙(ETA최소·최근접·선입선출)으로 결정한다.
 *  - 동점은 주문 id 사전순으로 끊어 결정론을 보장한다.
 */

import type { DispatchRule, OrderPriority } from '@/entities/delivery/types';

/** 한 라이더 기준으로 평가된 후보 주문. 비용은 호출부(엔진)가 미리 계산한다. */
export interface Dispatchable {
  id: string;
  priority: OrderPriority;
  /** 생성 시각(초) — FIFO 기준. 작을수록 오래 대기. */
  createdSec: number;
  /** 라이더 현재 위치 → 집화지 최단거리(m) — NEAREST 기준. */
  costToPickup: number;
  /** 라이더 → 집화지 → 배송지 최단거리(m) — FASTEST_ETA 기준. */
  costTotal: number;
}

/** 규칙에 따른 후보의 1차원 비용(작을수록 우선). */
function cost(rule: DispatchRule, o: Dispatchable): number {
  switch (rule) {
    case 'FIFO':
      return o.createdSec;
    case 'NEAREST':
      return o.costToPickup;
    case 'FASTEST_ETA':
      return o.costTotal;
  }
}

/**
 * 대기 주문 풀에서 규칙에 맞는 한 건을 고른다. 풀이 비면 null.
 * EXPRESS가 하나라도 있으면 그 안에서만 고른다.
 */
export function chooseOrder(rule: DispatchRule, pool: Dispatchable[]): Dispatchable | null {
  if (pool.length === 0) return null;
  const express = pool.filter((o) => o.priority === 'EXPRESS');
  const scope = express.length > 0 ? express : pool;

  let best = scope[0]!;
  let bestCost = cost(rule, best);
  for (let i = 1; i < scope.length; i += 1) {
    const cand = scope[i]!;
    const c = cost(rule, cand);
    if (c < bestCost || (c === bestCost && cand.id < best.id)) {
      best = cand;
      bestCost = c;
    }
  }
  return best;
}
