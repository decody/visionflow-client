/**
 * 복합운송 도메인 모델 — 단계 0 (기획서 §2.2).
 *
 * 설계 의도: Shipment는 "소유권/상태의 서사"를, Conveyance는 "지도 위 움직임"을
 * 담당해 분리한다(AMHS Job↔OHT, last-mile Order↔Rider 분리와 동형). 실시간
 * 고빈도 델타는 주로 Conveyance 위치, 저빈도 델타는 Shipment 마일스톤/상태다.
 *
 * 단위(기획서 §15.3): 좌표 lon/lat(EPSG:4326, 도 단위), speed=km/h, 거리=km,
 * dwellCap·capacity·load=건수, 시각(departPlan/arrivePlan/etaFinal/slaDue/ts)은
 * 모두 동일한 sim time 축(Unix epoch milliseconds)으로 계산한다.
 */

/** 운송 모드 — 해상·항공·육상(도로)·철도. */
export type Mode = 'SEA' | 'AIR' | 'ROAD' | 'RAIL';

/** 허브 종류 — 항만·공항·철도터미널·배송센터(분류/보관/통관). */
export type HubKind = 'PORT' | 'AIRPORT' | 'RAIL_TERMINAL' | 'DC';

/** 화물 전체 상태(서사). */
export type ShipmentStatus =
  | 'BOOKED'
  | 'AT_ORIGIN'
  | 'IN_TRANSIT'
  | 'AT_HUB' // 환적 대기/통관
  | 'CUSTOMS_HOLD'
  | 'DELIVERED'
  | 'DELAYED'
  | 'EXCEPTION';

/** 개별 구간(leg) 상태. */
export type LegStatus = 'PLANNED' | 'ACTIVE' | 'DONE';

/** 라우팅/배정 규칙 — 최단 ETA / 최소 환적 / 최저 비용(가중). */
export type RoutingRule = 'FASTEST_ETA' | 'FEWEST_TRANSFERS' | 'LOWEST_COST';

/** 허브(노드) — 항만·공항·철도터미널·DC. */
export interface Hub {
  id: string;
  kind: HubKind;
  name: string;
  lon: number;
  lat: number;
  region: string; // 아시아·북미·유럽 등 (뷰포트/권역 컬링용)
  dwellCap: number; // 동시 환적 처리 상한(건수)
}

/** 화물의 한 구간(leg) — 특정 모드로 fromHub→toHub를 이동. */
export interface Leg {
  mode: Mode;
  fromHub: string;
  toHub: string;
  conveyanceId: string | null; // 배정된 운송수단(미배정 시 null)
  path: [number, number][]; // 대권항로 보간 폴리라인(lon,lat)
  departPlan: number; // 계획 출발 시각(sim time)
  arrivePlan: number; // 계획 도착 시각(sim time)
  status: LegStatus;
}

/** 복합운송 단위 — 여러 leg로 이어지는 화물. 항상 단일 위치를 가진다. */
export interface Shipment {
  id: string;
  priority: 0 | 1 | 2 | 3; // 3 = Expedite(우선순위)
  legs: Leg[];
  legIndex: number; // 현재 진행 중 leg
  status: ShipmentStatus;
  etaFinal: number; // 누적 ETA(최종 목적지, sim time)
  slaDue: number; // SLA 기한(sim time)
  milestones: Milestone[]; // gate-in/loaded/departed/arrived/customs...
}

export interface Milestone {
  code: string;
  ts: number; // sim time
}

/** 선박/항공기/트럭/열차 — 지도 위에서 움직이는 운송수단. */
export interface Conveyance {
  id: string;
  mode: Mode;
  lon: number;
  lat: number;
  heading: number; // deg
  speed: number; // km/h, 모드별 순항(§5)
  legRef: { shipmentId: string; legIndex: number } | null;
  capacity: number; // 적재 상한(건수)
  load: number; // 현재 적재(건수)
  region: string; // 현재 권역(뷰포트 컬링용)
}

/**
 * 연동 경계 역할 — 기획서 §9/§15.2.
 * viewer(0) < dispatcher(1) < supervisor(2) < system(3).
 */
export type Role = 'viewer' | 'dispatcher' | 'supervisor' | 'system';

export const ROLE_RANK: Record<Role, number> = {
  viewer: 0,
  dispatcher: 1,
  supervisor: 2,
  system: 3,
};

/** 명령 주체. 역할은 클라이언트가 주장하지 않고 세션 컨텍스트에서 주입한다. */
export interface Actor {
  id: string;
  role: Role;
}

/** applyCommand를 거치는(인증·감사 대상) 명령 종류. */
export type CommandType =
  | 'snapshot'
  | 'start'
  | 'stop'
  | 'setCount'
  | 'setRule'
  | 'inject'
  | 'ackAlert'
  | 'demo'
  | 'promoteExpedite'
  | 'rerouteShipment';

/** 인증/실행 결과. */
export interface CommandResult {
  accepted: boolean;
  code: string;
  reason?: string;
  auditId?: string;
}

/** 감사 로그 항목(승인·거부 모두 기록). */
export interface AuditEntry {
  id: string;
  ts: number;
  actor: Actor;
  action: CommandType;
  detail: string;
  outcome: 'ACCEPTED' | 'REJECTED';
  code: string;
  reason?: string;
}

/** fault injection 시나리오 종류 — 기획서 §7. */
export type ScenarioKind =
  | 'congestion' // 항만 혼잡
  | 'canalClosure' // 운하 폐쇄(수에즈/파나마)
  | 'weather' // 기상 회피(태풍)
  | 'customs' // 통관 지연 급증
  | 'surge' // 수요 서지
  | 'reset';

/** 알람 분류 — 기획서 §8. */
export type AlertKind =
  | 'SLA' // ETA/SLA 위반 위험
  | 'DWELL' // 허브 체류 초과
  | 'CAPACITY' // 허브 혼잡(슬롯 포화·대기)
  | 'CUSTOMS' // 통관 보류
  | 'EXCEPTION' // 통관/환적 실패
  | 'CLOSURE' // 운하·항만 폐쇄
  | 'WEATHER'; // 기상 회피

export type AlertSeverity = 'critical' | 'warning' | 'info';
export type AlertStatus = 'OPEN' | 'ACKNOWLEDGED' | 'RESOLVED';
