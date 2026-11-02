/**
 * 정적 합성 데이터 — 단계 0(기획서 §1/§2).
 *
 * 공개 Natural Earth 국가 경계 외의 허브·레인·화물은 전부 합성이다. 특정 물류사의
 * 실제 운송망이 아니다(화면·README 고지). 단계 2부터 SimEngine이 이 네트워크 위에서
 * conveyance를 움직이고 snapshot/delta를 송출한다.
 */

import { haversineKm, samplePath, type LonLat } from '@/shared/geo/great-circle';
import { CRUISE_SPEED_KMH } from '@/shared/config';
import type { Hub, Leg, Mode, Shipment } from './types';

/** 전세계 허브(합성, 좌표는 대략치). */
export const HUBS: Hub[] = [
  { id: 'SGSIN', kind: 'PORT', name: 'Singapore', lon: 103.8, lat: 1.26, region: 'APAC', dwellCap: 40 },
  { id: 'CNSHA', kind: 'PORT', name: 'Shanghai', lon: 121.8, lat: 31.0, region: 'APAC', dwellCap: 48 },
  { id: 'KRICN', kind: 'AIRPORT', name: 'Incheon', lon: 126.45, lat: 37.46, region: 'APAC', dwellCap: 30 },
  { id: 'AEJEA', kind: 'PORT', name: 'Jebel Ali', lon: 55.06, lat: 25.0, region: 'MEA', dwellCap: 36 },
  { id: 'NLRTM', kind: 'PORT', name: 'Rotterdam', lon: 4.1, lat: 51.95, region: 'EMEA', dwellCap: 44 },
  { id: 'DEFRA', kind: 'AIRPORT', name: 'Frankfurt', lon: 8.57, lat: 50.05, region: 'EMEA', dwellCap: 28 },
  { id: 'CNCTU', kind: 'RAIL_TERMINAL', name: 'Chengdu', lon: 104.07, lat: 30.57, region: 'APAC', dwellCap: 20 },
  { id: 'USLAX', kind: 'PORT', name: 'Los Angeles', lon: -118.26, lat: 33.73, region: 'AMER', dwellCap: 42 },
  { id: 'USMEM', kind: 'AIRPORT', name: 'Memphis', lon: -89.98, lat: 35.04, region: 'AMER', dwellCap: 26 },
  { id: 'USCHI', kind: 'DC', name: 'Chicago DC', lon: -87.63, lat: 41.88, region: 'AMER', dwellCap: 24 },
];

export const HUB_BY_ID: Record<string, Hub> = Object.fromEntries(HUBS.map((h) => [h.id, h]));

/** 허브 조회(없으면 데이터 정의 오류). */
export function hub(id: string): Hub {
  const h = HUB_BY_ID[id];
  if (!h) throw new Error(`unknown hub: ${id}`);
  return h;
}

/** 합성 레인(링크) — 모드별 허브 간 연결. */
export interface LaneDef {
  from: string;
  to: string;
  mode: Mode;
}

export const LANES: LaneDef[] = [
  { from: 'CNSHA', to: 'SGSIN', mode: 'SEA' },
  { from: 'SGSIN', to: 'AEJEA', mode: 'SEA' },
  { from: 'AEJEA', to: 'NLRTM', mode: 'SEA' },
  { from: 'CNSHA', to: 'USLAX', mode: 'SEA' },
  { from: 'KRICN', to: 'DEFRA', mode: 'AIR' },
  { from: 'KRICN', to: 'USMEM', mode: 'AIR' },
  { from: 'DEFRA', to: 'USMEM', mode: 'AIR' },
  { from: 'CNCTU', to: 'DEFRA', mode: 'RAIL' },
  { from: 'CNSHA', to: 'CNCTU', mode: 'RAIL' },
  { from: 'USLAX', to: 'USCHI', mode: 'ROAD' },
  { from: 'USMEM', to: 'USCHI', mode: 'ROAD' },
  { from: 'NLRTM', to: 'DEFRA', mode: 'ROAD' },
];

/** 레인의 대권항로 폴리라인(해/공) 또는 직선 근사(육/철). 단계 2에서 그래프 경로로 대체. */
export function lanePath(lane: LaneDef, segments = 48): LonLat[] {
  const a = hub(lane.from);
  const b = hub(lane.to);
  // 해/공은 대권 보간, 육/철은 완만한 샘플을 사용한다(현재 합성 데이터 정책).
  return samplePath([a.lon, a.lat], [b.lon, b.lat], segments);
}

/** 레인 거리(km). */
export function laneKm(lane: LaneDef): number {
  const a = hub(lane.from);
  const b = hub(lane.to);
  return haversineKm([a.lon, a.lat], [b.lon, b.lat]);
}

/** 모드별 순항 중앙값(km/h). */
export function cruiseKmh(mode: Mode): number {
  const [lo, hi] = CRUISE_SPEED_KMH[mode];
  return (lo + hi) / 2;
}

/**
 * KPI와 초기 목록에 사용하는 결정론 샘플 화물. 실시간 운송 상태는 SimEngine이 생성한다.
 * ts0 기준(sim time, epoch ms)으로 leg 계획 시각을 채운다.
 */
export function findLane(from: string, to: string): LaneDef {
  const lane = LANES.find((l) => l.from === from && l.to === to);
  if (!lane) throw new Error(`unknown lane: ${from}->${to}`);
  return lane;
}

export function sampleShipments(ts0: number): Shipment[] {
  const routes: { id: string; priority: 0 | 1 | 2 | 3; legs: LaneDef[] }[] = [
    { id: 'SHP-1001', priority: 3, legs: [findLane('CNSHA', 'SGSIN'), findLane('SGSIN', 'AEJEA'), findLane('AEJEA', 'NLRTM')] },
    { id: 'SHP-1002', priority: 1, legs: [findLane('KRICN', 'DEFRA'), findLane('DEFRA', 'USMEM')] },
    { id: 'SHP-1003', priority: 0, legs: [findLane('CNSHA', 'USLAX'), findLane('USLAX', 'USCHI')] },
  ];

  return routes.map((r) => {
    let t = ts0;
    const legs: Leg[] = r.legs.map((lane) => {
      const hours = laneKm(lane) / cruiseKmh(lane.mode);
      const departPlan = t;
      const arrivePlan = t + hours * 3600 * 1000;
      t = arrivePlan;
      return {
        mode: lane.mode,
        fromHub: lane.from,
        toHub: lane.to,
        conveyanceId: null,
        path: lanePath(lane),
        departPlan,
        arrivePlan,
        status: 'PLANNED',
      };
    });
    return {
      id: r.id,
      priority: r.priority,
      legs,
      legIndex: 0,
      status: 'BOOKED',
      etaFinal: t,
      slaDue: t + 12 * 3600 * 1000, // 12h 여유(합성)
      milestones: [{ code: 'BOOKED', ts: ts0 }],
    };
  });
}
