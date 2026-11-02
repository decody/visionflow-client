/**
 * 복합운송 ETA·환적 순수 헬퍼 — 단계 3(기획서 §6).
 *
 * leg 소요·허브 체류(dwell)·통관 가중을 합산한 누적 ETA와 SLA at-risk 판정. 상태 전이의
 * 순수 규칙만 둔다(상태 보관·틱 진행은 SimEngine). 렌더 비의존 → 단위 테스트.
 */

import { cruiseKmh } from '@/entities/logistics/mock';
import type { Mode } from '@/entities/logistics/types';
import type { NetEdge } from '@/entities/network/build-network';
import { edgeDistKm } from '@/entities/network/path';

/** 환적 1회 기본 체류(sim ms) — 허브 분류/적재. */
export const DWELL_MS = 90 * 60 * 1000; // 90 sim-min
/** 통관 보류 추가 가중(sim ms). */
export const CUSTOMS_EXTRA_MS = 180 * 60 * 1000; // 180 sim-min

/** leg 1개 소요 시간(sim ms) = 거리/모드속도. */
export function legDurationMs(edge: NetEdge): number {
  const hours = edgeDistKm(edge) / cruiseKmh(edge.mode);
  return hours * 3600 * 1000;
}

/** 경로 전체 주행 시간(환적 dwell 제외, sim ms). */
export function routeTravelMs(edges: NetEdge[]): number {
  return edges.reduce((sum, e) => sum + legDurationMs(e), 0);
}

/**
 * 남은 ETA(sim ms): 현재 leg의 잔여 주행 + 이후 leg 주행 + (환적 횟수 × dwell) + 통관 가중.
 * legProgress는 현재 leg 진행률(0..1).
 */
export function remainingEtaMs(
  edges: NetEdge[],
  legIndex: number,
  legProgress: number,
  opts: { customsHold?: boolean } = {},
): number {
  if (legIndex >= edges.length) return 0;
  const cur = edges[legIndex];
  if (!cur) return 0;
  let ms = legDurationMs(cur) * (1 - Math.min(1, Math.max(0, legProgress)));
  for (let i = legIndex + 1; i < edges.length; i += 1) {
    const e = edges[i];
    if (e) ms += legDurationMs(e);
  }
  const transfersLeft = Math.max(0, edges.length - 1 - legIndex);
  ms += transfersLeft * DWELL_MS;
  if (opts.customsHold) ms += CUSTOMS_EXTRA_MS;
  return ms;
}

/** 절대 ETA(sim time). */
export function etaFinal(
  now: number,
  edges: NetEdge[],
  legIndex: number,
  legProgress: number,
  opts: { customsHold?: boolean } = {},
): number {
  return now + remainingEtaMs(edges, legIndex, legProgress, opts);
}

/** SLA 초과 위험 여부. */
export function isAtRisk(etaFinalMs: number, slaDue: number): boolean {
  return etaFinalMs > slaDue;
}

/** 모드 구성 요약(경로가 거친 모드 집합). */
export function routeModes(edges: NetEdge[]): Mode[] {
  const set = new Set<Mode>();
  for (const e of edges) set.add(e.mode);
  return [...set];
}
