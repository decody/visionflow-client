/**
 * 데모 공통 상수 — 기획서 §15.3(시간·단위)·§15.4(성능)의 확정값.
 *
 * 이 값들은 시뮬레이터·관제 UI·벤치가 공유하는 단일 출처다.
 */

/** 시간 압축: 실제 1초 = sim 10분(기획서 §15.3 데모 기본값). */
export const REAL_SEC_TO_SIM_MIN = 10;

/** 실제 1ms → sim time(ms) 변환 계수. */
export const REAL_MS_TO_SIM_MS = (REAL_SEC_TO_SIM_MIN * 60 * 1000) / 1000;

/** 송신 주기(Hz) — 틱 예산 50~100ms(기획서 §10). MVP 합격 기준은 10Hz(§15.4). */
export const DEFAULT_TICK_HZ = 10;

/** 모드별 순항 속도(km/h) 범위 — 합성·데모 가속(기획서 §5). */
export const CRUISE_SPEED_KMH: Record<'SEA' | 'AIR' | 'ROAD' | 'RAIL', [number, number]> = {
  SEA: [22, 44], // ~12–24 kn
  AIR: [800, 900],
  ROAD: [60, 90],
  RAIL: [80, 120],
};

/** MVP 합격 기준(기획서 §15.4) — 고정 테스트 환경 기준. */
export const MVP_TARGET = {
  conveyances: 1000,
  shipments: 10000,
  tickHz: 10,
  minAvgFps: 50,
  maxP95LatencyMs: 200,
} as const;

/** 스트레스(별도 보고) 규모. */
export const STRESS_SCALE = { conveyances: 5000, shipments: 50000 } as const;

/** 포트 할당. */
export const PORTS = { dev: 3015, ws: 3016 } as const;
