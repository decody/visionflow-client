export type OhtStatus =
  | 'MOVING'
  | 'IDLE'
  | 'LOADING'
  | 'UNLOADING'
  | 'BLOCKED'
  | 'DELAYED'
  | 'DOWN';

export type Coord = [number, number];

export type DispatchRule = 'nearest' | 'oldest' | 'priority';
export type TransportPhase =
  | 'QUEUED'
  | 'TO_PICKUP'
  | 'LOADING'
  | 'DELIVERING'
  | 'WAITING_PORT'
  | 'UNLOADING'
  | 'DONE';
export interface TransportJob {
  id: string;
  carrierId: string;
  lotId: string;
  priority: number;
  from: string;
  to: string;
  phase: TransportPhase;
  vehicleId: string | null;
  createdTs: number;
  deadlineTs: number;
  completedTs?: number;
}
export interface Carrier {
  id: string;
  lotId: string;
  portId: string | null;
  vehicleId: string | null;
}
export interface PortState {
  id: string;
  capacity: number;
  occupied: number;
  reserved: number;
  status: 'AVAILABLE' | 'DOWN';
}
export interface PortIncident {
  active: boolean;
  portId: string;
  equipmentId?: string;
  startedTs: number;
  affectedJobIds: string[];
  queueVehicleIds: string[];
}
export interface OperationsState {
  rule: DispatchRule;
  jobs: TransportJob[];
  carriers: Carrier[];
  ports: PortState[];
  completed: number;
  averageTransportSec: number;
  incident?: PortIncident;
  traffic?: {
    blockedVehicleIds: string[];
    occupiedSegments: number;
    junctionReservations: number;
    reroutedVehicles: number;
    activeDeadlocks: number;
    resolvedDeadlocks: number;
  };
}

/** 반송 Job: From→To 설비와 계획 경로(폴리라인) */
export interface Job {
  id: string;
  jobId: string;
  from: string;
  to: string;
  /** 계획 경로의 노드 폴리라인(실내 좌표) */
  route: Coord[];
  /** 목표 완료 시각(ms) — 초과 시 DELAYED */
  deadlineTs: number;
}

/** 지도/스토어가 유지하는 OHT 런타임 상태 */
export interface VehicleState {
  id: string;
  x: number;
  y: number;
  /** 진행 방향(도, 0=동쪽, 반시계) */
  heading: number;
  status: OhtStatus;
  jobId: string | null;
  /** m/s */
  speed: number;
  /** 현재 Job의 계획 경로(스냅샷에 포함) */
  route?: Coord[];
  phase?: TransportPhase | 'IDLE' | 'REPOSITIONING';
  loaded?: boolean;
  carrierId?: string | null;
  lotId?: string | null;
  priority?: number;
  from?: string;
  to?: string;
  deadlineTs?: number;
  blockedBy?: string | null;
  rerouteCount?: number;
}

export type AlarmKind = 'JAM' | 'DELAY' | 'EQP_DOWN' | 'BLOCKED';
export type AlarmSeverity = 'info' | 'warn' | 'critical';

export interface Alarm {
  id: string;
  kind: AlarmKind;
  severity: AlarmSeverity;
  ts: number;
  vehicleId?: string;
  zoneId?: string;
  message: string;
  state?: 'ACTIVE' | 'ACKNOWLEDGED' | 'RECOVERED';
  acknowledgedTs?: number;
  recoveredTs?: number;
}

// ---- 시뮬레이터 ↔ 클라이언트 프로토콜 (WebSocket 델타를 흉내) ----

export interface SnapshotMessage {
  type: 'snapshot';
  seq: number;
  ts: number;
  vehicles: VehicleState[];
  operations?: OperationsState;
}

export type VehicleDelta = Pick<VehicleState, 'id'> &
  Partial<Omit<VehicleState, 'id'>>;

export interface DeltaMessage {
  type: 'delta';
  seq: number;
  ts: number;
  upd: VehicleDelta[];
  add?: VehicleState[];
  del?: string[];
  alarms?: Alarm[];
  /** 이번 틱에 (재)배정된 Job — 선택 시 경로 표시에 사용 */
  jobs?: Job[];
  operations?: OperationsState;
}

export type ServerMessage = SnapshotMessage | DeltaMessage;

export interface ClientCommand {
  type:
    | 'start'
    | 'stop'
    | 'snapshot'
    | 'setCount'
    | 'setRate'
    | 'setDispatch'
    | 'setPortIncident';
  rule?: DispatchRule;
  count?: number;
  rateHz?: number;
  enabled?: boolean;
}

export const STATUS_COLORS: Record<OhtStatus, string> = {
  MOVING: '#4da3ff',
  IDLE: '#8b97ab',
  LOADING: '#ffd166',
  UNLOADING: '#ffd166',
  BLOCKED: '#f4795b',
  DELAYED: '#ff5470',
  DOWN: '#9b5de5',
};
