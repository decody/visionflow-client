/**
 * 실시간 프로토콜·소스 계약 — 단계 2(기획서 §4).
 *
 * 렌더 엔진(deck.gl)과 독립적인 snapshot/delta 수신 계층. conveyances·shipments·alerts·audit을
 * 동일한 실시간 계약으로 전달하며, 명령 인증은 integration 계약과 서버에서 처리한다.
 */

import type {
  AlertKind,
  AlertSeverity,
  AlertStatus,
  AuditEntry,
  Mode,
  Role,
  RoutingRule,
  ScenarioKind,
  ShipmentStatus,
} from '@/entities/logistics/types';

/** 와이어로 흐르는 운송수단 상태(지도·패널 공통). */
export interface ConveyanceWire {
  id: string;
  mode: Mode;
  lon: number;
  lat: number;
  heading: number; // deg
  speed: number; // km/h
  region: string; // 현재 목적 허브 권역(뷰포트 컬링용)
  laneFrom: string; // 현재 주행 중 엣지의 출발 허브
  laneTo: string; // 현재 주행 중 엣지의 도착 허브
  progress: number; // 0..1 현재 엣지 진행률
}

/** leg 요약(화물 상세 Drawer 타임라인용). */
export interface LegWire {
  mode: Mode;
  from: string;
  to: string;
  done: boolean;
  active: boolean;
}

/** 와이어로 흐르는 화물 요약(저빈도 채널 — 마일스톤/상태 변경 시에만). 단계 3. */
export interface ShipmentWire {
  id: string;
  priority: 0 | 1 | 2 | 3; // 3 = Expedite
  status: ShipmentStatus;
  legIndex: number;
  legCount: number;
  originHub: string;
  destHub: string;
  /** 체류 중인 허브(AT_HUB/CUSTOMS_HOLD일 때). 주행 중이면 null. */
  atHub: string | null;
  mode: Mode; // 현재 leg 모드
  etaFinal: number; // sim time
  slaDue: number; // sim time
  atRisk: boolean;
  progress: number; // 전체 진행률 0..1
  legs: LegWire[]; // leg 타임라인(§8 Drawer)
}

/** Executive KPI용 화물 집계(기획서 §8). */
export interface ShipmentStats {
  active: number;
  inTransit: number;
  atHub: number;
  delayed: number; // atRisk 활성
  customsHold: number;
  delivered: number; // 누적 완료
  exceptions: number; // 누적 예외
  onTimePct: number; // 완료분 중 정시 %(0~100)
}

/** 와이어로 흐르는 라이브 알람(단계 5). */
export interface AlertWire {
  id: string;
  kind: AlertKind;
  severity: AlertSeverity;
  status: AlertStatus;
  title: string;
  detail: string;
  focus: string | null;
  ts: number; // 최초 발생 sim time
}

/** 자동 데모 진행(단계 5). */
export interface DemoMeta {
  running: boolean;
  phase: string;
  elapsedSec: number;
}

/** 시뮬레이션 메타(진행 상태). */
export interface SimMeta {
  count: number; // 운송수단 수
  running: boolean;
  rateHz: number;
  simTime: number; // Unix epoch ms(§15.3)
  rule: RoutingRule;
  shipments: ShipmentStats;
  scenarios: ScenarioKind[];
  demo: DemoMeta | null;
}

export type ServerMessage =
  | {
      type: 'snapshot';
      seq: number;
      tick: number;
      conveyances: ConveyanceWire[];
      shipments: ShipmentWire[];
      alerts: AlertWire[];
      audit: AuditEntry[];
      meta: SimMeta;
    }
  | {
      type: 'delta';
      seq: number;
      tick: number;
      upd: ConveyanceWire[];
      add?: ConveyanceWire[];
      del?: string[];
      // 화물 저빈도 채널 — 변경분만.
      shipmentsAdd?: ShipmentWire[];
      shipmentsUpd?: ShipmentWire[];
      shipmentsDel?: string[];
      // 알람 채널 — 변경분만.
      alertsAdd?: AlertWire[];
      alertsUpd?: AlertWire[];
      alertsDel?: string[];
      // 감사 채널 — 신규 항목만(append-only).
      auditAdd?: AuditEntry[];
      meta: SimMeta;
    };

/** 연결/뷰별 구독 필터(방식 B outbound 축소). */
export interface ViewSubscription {
  region?: string;
  extent?: [number, number, number, number]; // [minLon, minLat, maxLon, maxLat]
}

/** 클라이언트 → 시뮬레이터 명령(단계 2~5: 루프·규칙·시나리오·알람). 역할 인증은 단계 7. */
export type ClientCommand =
  | { type: 'start'; count?: number; rateHz?: number }
  | { type: 'stop' }
  | { type: 'setCount'; count: number }
  | { type: 'setRule'; rule: RoutingRule }
  | { type: 'inject'; scenario: ScenarioKind; on?: boolean }
  | { type: 'ackAlert'; alertId: string }
  | { type: 'demo'; on: boolean }
  | { type: 'promoteExpedite'; shipmentId: string }
  | { type: 'rerouteShipment'; shipmentId: string }
  | { type: 'setRole'; role: Role } // 세션 전용(연동 경계 밖, 인증/감사 대상 아님)
  | { type: 'setSubscription'; subscription: ViewSubscription } // 방식 B 전용
  | { type: 'snapshot' };

export interface SourceMetrics {
  msgCount: number;
  rawUpd: number;
  drainedUpd: number;
  batchCount: number;
  resyncCount: number;
}

export interface BatchResult {
  updates: ConveyanceWire[];
  snapshot?: ConveyanceWire[];
  additions?: ConveyanceWire[];
  deletions?: string[];
  // 화물 채널(단계 3)
  shipmentUpdates: ShipmentWire[];
  shipmentSnapshot?: ShipmentWire[];
  shipmentAdditions?: ShipmentWire[];
  shipmentDeletions?: string[];
  // 알람 채널(단계 5)
  alertUpdates: AlertWire[];
  alertSnapshot?: AlertWire[];
  alertAdditions?: AlertWire[];
  alertDeletions?: string[];
  // 감사 채널(단계 7) — 변경 시 최신 전체 목록
  audit?: AuditEntry[];
  meta?: SimMeta;
  tick?: number;
}

export interface RealtimeSourceOptions {
  onBatch: (batch: BatchResult) => void;
  onError?: (message: string) => void;
  count?: number;
  rateHz?: number;
  rule?: RoutingRule;
}

/** 전송 수단(Worker A / ws B)을 추상화한 공통 인터페이스. */
export interface RealtimeSource {
  readonly label: string;
  start(): void;
  setPaused(paused: boolean): void;
  setCount(count: number): void;
  setRule(rule: RoutingRule): void;
  inject(scenario: ScenarioKind, on?: boolean): void;
  ackAlert(alertId: string): void;
  setDemo(on: boolean): void;
  promoteExpedite(shipmentId: string): void;
  rerouteShipment(shipmentId: string): void;
  setRole(role: Role): void;
  requestSnapshot(): void;
  getMetrics(): SourceMetrics;
  dispose(): void;
}
