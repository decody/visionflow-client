/** 실시간 프로토콜·소스 계약 — 단계 2 (배송 도메인) */

import type {
  AlertKind,
  AlertSeverity,
  AlertStatus,
  AuditEntry,
  CourierStatus,
  DispatchRule,
  DockPhase,
  OrderLifecycle,
  OrderPriority,
  Role,
  ScenarioKind,
} from '@/entities/delivery/types';
import type { BatchResult } from './delta-reducer';

export type RiderStatus = CourierStatus;

/** 와이어로 흐르는 라이더 상태(지도·패널 공통). */
export interface RiderWire {
  id: string;
  name: string;
  zone: string;
  status: RiderStatus;
  lon: number;
  lat: number;
  heading: number; // deg
  speed: number; // m/s
  completed: number;
  total: number;
  etaMin: number; // 현재 목적지까지 예상(분), IDLE은 0
  /** 현재 배정된 주문 id. 없으면 null. (단계 3) */
  orderId?: string | null;
  /** 현재 위치→목적지 남은 경로 폴리라인(lon/lat). 이동 중일 때만. 추적선 표시용. */
  route?: [number, number][];
  /** 배터리 잔량 %. 단계 4. */
  battery?: number;
  /** 집화·배송 도킹 단계(보강). 도킹 중이 아니면 생략. */
  dock?: DockPhase;
}

/** 와이어로 흐르는 라이브 알람(지연·미배차·지오펜스·배터리). 단계 4. */
export interface AlertWire {
  id: string;
  kind: AlertKind;
  severity: AlertSeverity;
  status: AlertStatus;
  title: string;
  detail: string;
  zone?: string;
  riderId?: string | null;
  orderId?: string | null;
  ageSec: number; // 알람 발생 후 경과(초)
}

/** 허브 집화 슬롯 현황(보강). meta에 동봉해 스냅샷·델타로 전달. */
export interface HubWire {
  id: string; // 허브 id(FC-YS 등)
  used: number; // 점유 중인 집화 슬롯
  cap: number; // 슬롯 용량
  queued: number; // 슬롯 대기(QUEUED) 라이더 수
}

/** 시나리오·자동 데모 진행 상태(스냅샷·델타에 동봉). 단계 4. */
export interface ScenarioMeta {
  incident: boolean; // 교통 정체
  surge: boolean; // 수요 서지
  closure: boolean; // 도로 통제·폐쇄(우회)
  demoActive: boolean;
  demoLabel?: string;
  demoSec?: number;
  /** 허브 집화 슬롯 현황(보강). */
  hubs?: HubWire[];
}

/** 신호 교차로 상태(스냅샷=전체, 델타=flip된 것만). 위치는 정적(signalSites)이라 id만 흐른다. */
export interface SignalWire {
  id: string;
  state: 'GO' | 'STOP';
}

/** 와이어로 흐르는 주문 상태(생명주기·배차 패널 공통). 단계 3. */
export interface OrderWire {
  id: string;
  zone: string;
  customer: string;
  priority: OrderPriority;
  status: OrderLifecycle;
  riderId: string | null;
  etaMin: number; // 완료까지 예상(분)
  waitMin: number; // QUEUED 대기 경과(분), 그 외 0
}

export interface SnapshotMessage {
  type: 'snapshot';
  seq: number;
  tick: number;
  riders: RiderWire[];
  /** 단계 3: 주문 전체 상태. 구버전 호환을 위해 선택적. */
  orders?: OrderWire[];
  /** 단계 4: 라이브 알람 전체 상태. */
  alerts?: AlertWire[];
  /** 단계 4: 시나리오·데모 진행. */
  meta?: ScenarioMeta;
  /** 신호 교차로 전체 상태(보강). */
  signals?: SignalWire[];
  /** 단계 6: 최근 감사 로그(연동 경계). 승인/거부 모두 포함. */
  audit?: AuditEntry[];
}

export interface DeltaMessage {
  type: 'delta';
  seq: number;
  tick: number;
  upd: RiderWire[];
  add?: RiderWire[];
  del?: string[];
  /** 단계 3: 주문 델타 채널(라이더와 동일한 코얼레싱 규칙). */
  ordersUpd?: OrderWire[];
  ordersAdd?: OrderWire[];
  ordersDel?: string[];
  /** 단계 4: 알람 델타 채널(동일한 코얼레싱 규칙). */
  alertsUpd?: AlertWire[];
  alertsAdd?: AlertWire[];
  alertsDel?: string[];
  /** 단계 4: 시나리오·데모 진행(변경 시 동봉). */
  meta?: ScenarioMeta;
  /** 신호 교차로 상태 변화(flip된 것만, 보강). */
  signalsUpd?: SignalWire[];
  /** 단계 6: 이번 틱에 추가된 감사 로그(append-only). */
  auditAdd?: AuditEntry[];
}

export type ServerMessage = SnapshotMessage | DeltaMessage;

/**
 * 클라이언트 → 시뮬레이터 명령. 단계 6에서 역할 인증 경계가 추가됐다.
 * `setRole`은 세션 전용(어댑터가 actor 역할을 바꿈)이라 감사/인증 대상이 아니다.
 */
export interface ClientCommand {
  type:
    | 'start'
    | 'stop'
    | 'snapshot'
    | 'setCount'
    | 'setRule'
    | 'inject' // 단계 4: 시나리오 주입(fault injection)
    | 'ackAlert' // 단계 4: 알람 확인
    | 'demo' // 단계 4: 자동 데모 토글
    | 'reassign' // 단계 6: 재배차 요청
    | 'contactCourier' // 단계 6: 라이더 연락(감사 전용)
    | 'promoteExpress' // 단계 6: 특급 승격
    | 'setRole' // 단계 6: 세션 역할 전환(어댑터 처리)
    | 'setFocus'; // 단계 7: 추적선을 스트리밍할 포커스 라이더 지정(세션)
  count?: number;
  rateHz?: number;
  rule?: DispatchRule;
  scenario?: ScenarioKind;
  on?: boolean;
  alertId?: string;
  riderId?: string;
  orderId?: string;
  role?: Role;
}

/** 개발 진단용 누적 카운터(단계 5). 페이지가 초당 차분으로 rate를 계산한다. */
export interface SourceMetrics {
  msgCount: number; // 수신한 서버 메시지 수(스냅샷+델타)
  rawUpd: number; // 코얼레싱 전 수신 upd 합
  drainedUpd: number; // 코얼레싱 후 실제 반영 upd 합
  batchCount: number; // flush(drain)된 배치 수
  resyncCount: number; // seq gap으로 재동기한 횟수
}

export interface RealtimeSourceOptions {
  count?: number;
  rateHz?: number;
  /** 초기 배차 규칙(기본 FASTEST_ETA). 단계 3. */
  rule?: DispatchRule;
  onBatch: (batch: BatchResult) => void;
  onError?: (message: string) => void;
}

/** Worker(방식 A)·ws(방식 B, 단계 6)가 공유하는 공통 인터페이스. */
export interface RealtimeSource {
  start(): void;
  setCount(count: number): void;
  setRule(rule: DispatchRule): void;
  setPaused(paused: boolean): void;
  requestSnapshot(): void;
  /** 단계 4: 시나리오 주입(fault injection). reset은 on 무시. */
  inject(scenario: ScenarioKind, on?: boolean): void;
  /** 단계 4: 알람 확인(ack). */
  ackAlert(alertId: string): void;
  /** 단계 4: 자동 데모 토글. */
  setDemo(on: boolean): void;
  /** 단계 6: 세션 역할 전환(연동 경계 시연). */
  setRole(role: Role): void;
  /** 단계 6: 재배차 요청(dispatcher 이상). */
  reassign(riderId: string): void;
  /** 단계 6: 라이더 연락(감사 전용, dispatcher 이상). */
  contactCourier(riderId: string): void;
  /** 단계 6: 특급 승격(dispatcher 이상). */
  promoteExpress(orderId: string): void;
  /** 단계 7: 추적선을 스트리밍할 포커스 라이더 지정(null이면 없음). */
  setFocus(riderId: string | null): void;
  /** 단계 5: 개발 진단용 누적 카운터 스냅샷. */
  getMetrics(): SourceMetrics;
  dispose(): void;
  readonly label: string;
}
