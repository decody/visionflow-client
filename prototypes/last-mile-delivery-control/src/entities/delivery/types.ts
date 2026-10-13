export type CourierStatus = 'DELIVERING' | 'PICKUP' | 'IDLE' | 'DELAYED' | 'CHARGING';
export type OrderStatus = 'DELIVERING' | 'READY' | 'DELAYED' | 'COMPLETED';

export type OrderPriority = 'NORMAL' | 'EXPRESS';

/**
 * 주문 생명주기 — 단계 3.
 * QUEUED(대기) → ASSIGNED(배차) → TO_PICKUP(집화 이동) → PICKED_UP(집화 완료)
 * → DELIVERING(배송 이동) → DELIVERED(완료). SLA 초과 시 DELAYED, 배송 실패 시 FAILED.
 */
export type OrderLifecycle =
  | 'QUEUED'
  | 'ASSIGNED'
  | 'TO_PICKUP'
  | 'PICKED_UP'
  | 'DELIVERING'
  | 'DELIVERED'
  | 'DELAYED'
  | 'FAILED';

/** 배차 규칙 — ETA 최소 / 최근접(라이더→집화 최단거리) / 선입선출. */
export type DispatchRule = 'FASTEST_ETA' | 'NEAREST' | 'FIFO';

/** 패널 표시용 라이더 뷰모델. 실시간 좌표(lon/lat)는 지도에서 RiderWire로 직접 다룬다. */
export type Courier = {
  id: string;
  name: string;
  status: CourierStatus;
  zone: string;
  completed: number;
  total: number;
  eta: string;
};

export type DeliveryOrder = {
  id: string;
  customer: string;
  zone: string;
  status: OrderStatus;
  eta: string;
  priority: 'NORMAL' | 'EXPRESS';
};

export type DeliveryAlert = {
  id: string;
  severity: 'critical' | 'warning' | 'info';
  status: 'OPEN' | 'ACKNOWLEDGED' | 'MITIGATING' | 'RESOLVED';
  title: string;
  detail: string;
  time: string;
};

/** 라이브 알람 분류 — 단계 4. 지연·미배차·지오펜스 이탈·저배터리. */
export type AlertKind = 'DELAY' | 'BACKLOG' | 'GEOFENCE' | 'BATTERY';
export type AlertSeverity = 'critical' | 'warning' | 'info';
/** 라이브 알람 생명주기: 미확인 → 확인 → (조건 해소 시) 복구. */
export type AlertStatus = 'OPEN' | 'ACKNOWLEDGED' | 'RESOLVED';

/** 수동 주입·자동 데모가 토글하는 시나리오. */
export type ScenarioKind = 'incident' | 'surge' | 'battery' | 'reset';

export type AuditEvent = {
  id: string;
  actor: string;
  action: string;
  target: string;
  time: string;
  result: 'SUCCESS' | 'PENDING' | 'FAILED';
};

// ---- 연동 경계: 역할 인증 + 감사 (integration boundary) — 단계 6 ----

/**
 * 명령 실행 권한 등급. 관제 UI가 보내는 명령을 역할로 인증한다.
 *  viewer    = 읽기 전용(조회)
 *  dispatcher= 배차·운영 조치(재배차·연락·특급 승격·규칙·알람 확인·데모)
 *  supervisor= 시나리오 주입(교통정체·수요서지·저배터리·초기화)까지
 *  system    = 내부(자동 데모 스크립트 등)
 */
export type Role = 'viewer' | 'dispatcher' | 'supervisor' | 'system';

/** 명령을 낸 주체. 실제 시스템에서는 인증 토큰에서 도출한다(클라이언트가 주장하지 않음). */
export interface Actor {
  id: string;
  role: Role;
}

/** 역할 인증·감사 대상이 되는 명령. 세션 전용(setRole)·프로토콜(ping)은 제외. */
export type CommandType =
  | 'snapshot'
  | 'start'
  | 'stop'
  | 'setCount'
  | 'setRule'
  | 'ackAlert'
  | 'demo'
  | 'reassign'
  | 'contactCourier'
  | 'promoteExpress'
  | 'inject';

export type CommandOutcome = 'accepted' | 'rejected';

/** 연동 경계가 명령을 인증한 결과. */
export interface CommandResult {
  accepted: boolean;
  code: 'OK' | 'FORBIDDEN' | 'BAD_REQUEST';
  reason?: string;
  auditId?: string;
}

/** 불변 감사 로그 항목: 누가·언제·무엇을·결과. 승인/거부 모두 남는다. */
export interface AuditEntry {
  id: string;
  ts: number;
  actor: Actor;
  action: CommandType;
  detail: string;
  outcome: CommandOutcome;
  code: CommandResult['code'];
  reason?: string;
}
