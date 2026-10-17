/**
 * 배송 시뮬레이션 엔진 (Worker·ws 공용) — 단계 3
 *
 * 간선도로로 만든 도로 그래프 위에서 라이더가 주문을 집화·배송한다.
 *  - 주문 풀: 시간에 따라 QUEUED 주문이 도착하고, 배차로 유휴 라이더에 배정된다.
 *  - 생명주기: QUEUED → ASSIGNED → TO_PICKUP → PICKED_UP → DELIVERING → DELIVERED.
 *    SLA(배송 제한시간) 초과 시 DELAYED(감속), 배송 실패 시 FAILED.
 *  - 배차: EXPRESS 우선 + 규칙(ETA최소·최근접·선입선출). 선택 로직은 순수 dispatch.ts.
 *  - 경로: Dijkstra 최단 경로(entities/road), 이동은 폴리라인을 따라 진행(teleport 없음).
 * 결정론: 고정 seed RNG + 안정적 생성 순서로 스냅샷이 재현된다.
 */

import {
  bearing,
  buildRoadGraph,
  edgeKey,
  lerp,
  metersBetween,
  nearestNode,
  nodesWithin,
  pathDistance,
  shortestPath,
  type LonLat,
  type RoadGraph,
} from '@/entities/road';
import type {
  Actor,
  AuditEntry,
  CommandResult,
  CommandType,
  DispatchRule,
  DockPhase,
  OrderLifecycle,
  OrderPriority,
  ScenarioKind,
} from '@/entities/delivery/types';
import { arterials, closureSites, hubs, signalSites, zones } from '@/shared/map/seoul-layout';
import {
  authorizeCommand,
  buildAuditEntry,
  isAuditable,
} from '@/shared/integration/command-contract';
import type {
  AlertWire,
  ClientCommand,
  DeltaMessage,
  OrderWire,
  RiderStatus,
  RiderWire,
  ScenarioMeta,
  SignalWire,
  SnapshotMessage,
} from '@/shared/realtime/types';
import { chooseOrder, type Dispatchable } from './dispatch';
import { deriveAlerts, type AlertThresholds, type DesiredAlert } from './alerts';
import { signalStateAt, type SignalState } from './signals';

const NAMES = [
  '김민준', '박서연', '이도윤', '최하은', '정지훈', '강서준',
  '윤지우', '임하준', '한예준', '오서아', '신지호', '배수아',
];

const MAX_RIDERS = 5000;
const DISPATCH_POOL_CAP = 256; // 1회 배차에서 검토·배정하는 최대 대기 주문 수(대규모 함대 비용 상한)
const EXPRESS_PROB = 0.2; // 특급 주문 비율
const HANDOFF_SEC = 1.5; // 도킹 HANDOFF(인수·인계) 체류 시간
const DOCK_SETTLE_SEC = 0.6; // 도착 후 DOCKED(정차·정렬) 시간
const RELEASE_SEC = 0.6; // RELEASING(출차 준비) 시간
const APPROACH_DIST_M = 18; // 목적지 이 거리 안이면 APPROACHING(최종 접근)으로 표시
const FAIL_PROB = 0.03; // 배송지 도착 시 실패(수취 불가) 확률
const DISPATCH_EVERY = 5; // 배차 주기(틱)
const ARRIVAL_EVERY = 12; // 신규 주문 도착 주기(틱)
const ORDERS_PER_ARRIVAL = 2;
const POOL_FACTOR = 2; // 활성 주문 상한 = 라이더 수 × 2
const TERMINAL_GRACE_SEC = 20; // 완료/실패 주문을 스냅샷에 남겨두는 시간
const AVG_CRUISE = 8; // QUEUED ETA 추정용 평균 순항 속도(m/s)
const SLA_MIN: Record<OrderPriority, number> = { EXPRESS: 15, NORMAL: 25 };

// 가·감속 프로파일(기획서 §5): 순간 속도 변경 대신 가속/감속 한계를 둔다.
const MAX_ACCEL = 2.8; // 가속 상한(m/s²)
const MAX_DECEL = 3.8; // 감속 상한(m/s²) — 정지거리 계산에도 사용
const STOP_LOOKAHEAD_M = 30; // 정지 대상(목적지·적신호)을 탐색하는 전방 거리 상한

// --- 단계 4: 배터리·알람·시나리오 ---
const BATTERY_DRAIN_PER_M = 0.0045; // 이동 거리 비례 방전(%/m) ≈ 완충 22km
const BATTERY_LOW = 25; // 경고 임계(%)
const BATTERY_CRITICAL = 12; // 위험 임계(%) — 허브 복귀·배차 제외
const BATTERY_RESERVE = 20; // 이 값 미만이면 신규 배차 보류(여유 확보)
const CHARGE_PER_SEC = 9; // 충전 속도(%/s)
const INCIDENT_SPEED_FACTOR = 0.45; // 교통 정체 시 순항 속도 계수
const SURGE_BURST = 10; // 수요 서지 1회 주입량
const GEOFENCE_M = 1800; // 담당 권역 중심에서 이 거리 밖이면 지오펜스 알람
const BACKLOG_THRESHOLD = 12; // 미배차가 이보다 많으면 BACKLOG 알람
const ALERT_EVERY = 5; // 알람 재평가 주기(틱)
const ALERT_GRACE_SEC = 8; // 복구된 알람을 스냅샷에 남겨두는 시간

const ALERT_THRESHOLDS: AlertThresholds = {
  backlog: BACKLOG_THRESHOLD,
  batteryLow: BATTERY_LOW,
  batteryCritical: BATTERY_CRITICAL,
  geofenceM: GEOFENCE_M,
};

/** 자동 데모 스크립트(고정 seed). simSec 도달 시 해당 액션을 1회 적용. */
interface DemoStep {
  at: number;
  label: string;
  run: () => void;
}

type Leg = 'PICKUP' | 'DELIVER';
type AlertStatus = 'OPEN' | 'ACKNOWLEDGED' | 'RESOLVED';

interface Alert {
  id: string;
  kind: DesiredAlert['kind'];
  severity: DesiredAlert['severity'];
  status: AlertStatus;
  title: string;
  detail: string;
  zone?: string;
  riderId?: string | null;
  orderId?: string | null;
  createdSec: number;
  terminalSec: number | null; // RESOLVED가 된 시각(프루닝 기준)
  dirty: boolean;
}

interface Rider {
  id: string;
  name: string;
  zone: string;
  status: RiderStatus;
  orderId: string | null;
  path: string[];
  idx: number;
  edgeDist: number; // 현재 세그먼트에서 진행한 거리(m)
  cruise: number; // m/s
  currentSpeed: number;
  dock: DockPhase | null; // 도킹 상태기계(null=주행/유휴)
  dockSec: number; // 현재 도킹 단계 잔여 시간(s)
  lon: number;
  lat: number;
  heading: number;
  completed: number;
  total: number;
  battery: number; // 잔량 %
  charging: boolean; // 허브 복귀·충전 중(배차 제외)
}

interface Order {
  id: string;
  zone: string;
  customer: string;
  priority: OrderPriority;
  status: OrderLifecycle;
  leg: Leg; // 배정 후 진행 구간(집화/배송) — DELAYED 중에도 경로 판단에 쓴다
  riderId: string | null;
  pickupNode: string;
  dropoffNode: string;
  createdSec: number;
  slaSec: number;
  terminalSec: number | null;
  dirty: boolean; // 이번 틱에 변경되어 델타로 보낼지
}

/** 고정 seed mulberry32 — 결정론적 재현. */
function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function isTerminal(order: Order): boolean {
  return order.status === 'DELIVERED' || order.status === 'FAILED';
}

export class SimEngine {
  private readonly graph: RoadGraph;
  private readonly hubNodes: string[];
  private readonly zoneNodes: Record<string, string[]>;
  private readonly riders = new Map<string, Rider>();
  private readonly orders = new Map<string, Order>();
  private rng = mulberry32(20260101);
  private seq = 0;
  private tickCount = 0;
  private simSec = 0;
  private orderSeq = 0;
  private rule: DispatchRule = 'FASTEST_ETA';
  private readonly newOrderIds = new Set<string>();
  private readonly removedOrderIds = new Set<string>();

  // 단계 4: 알람·시나리오·데모
  private readonly alerts = new Map<string, Alert>();
  private readonly newAlertIds = new Set<string>();
  private readonly removedAlertIds = new Set<string>();
  private readonly zoneCentroid: Record<string, LonLat>;
  private incident = false; // 교통 정체
  private surge = false; // 수요 서지
  private closure = false; // 도로 통제·폐쇄(우회)
  private demoActive = false;
  private demoLabel: string | undefined;
  private demoStarted = -1; // 데모 시작 simSec(-1=비활성)
  private nextDemoStep = 0;
  private metaDirty = false;
  private readonly demoScript: DemoStep[];

  // 단계 6: 연동 경계 — 감사 트레일(append-only, 상한). newAuditIds는 이번 틱 신규.
  private auditTrail: AuditEntry[] = [];
  private readonly newAuditIds = new Set<string>();

  // 단계 7: 성능 — 경로/거리 메모(그래프는 정적이라 항상 유효, spawn·통제 변경에서 비움).
  private readonly pathMemo = new Map<string, { path: string[] | null; dist: number }>();
  // 단계 7: 추적선은 포커스된 라이더에게만 스트리밍한다(델타 바이트·연산 상한).
  private focusId: string | null = null;

  // 보강: 신호 교차로 — 신호 노드와 역인덱스, 직전 상태(flip 감지).
  private readonly signalNodes: string[];
  private readonly signalIndexByNode = new Map<string, number>();
  private prevSignalState: SignalState[];
  // 보강: 도로 통제 — 통제 지점별 차단 간선 집합(정적 사전계산)과 현재 활성 차단 간선.
  private readonly closureEdgeSets: Set<string>[];
  private blockedEdges = new Set<string>();

  constructor(private readonly clock: () => number = () => Date.now()) {
    this.graph = buildRoadGraph(arterials.map((a) => a.path));
    this.hubNodes = hubs.map((h) => nearestNode(this.graph, h.at));
    this.zoneNodes = Object.fromEntries(
      zones.map((z) => {
        const within = nodesWithin(this.graph, z.centroid, 1500);
        return [z.name, within.length ? within.slice(0, 8) : [nearestNode(this.graph, z.centroid)]];
      }),
    );
    this.zoneCentroid = Object.fromEntries(zones.map((z) => [z.name, z.centroid]));

    // 신호 교차로: 각 지점에서 가장 가까운 그래프 노드를 신호 노드로(중복 제거).
    const nodes: string[] = [];
    signalSites.forEach((site) => {
      const node = nearestNode(this.graph, site.at);
      this.signalIndexByNode.set(node, nodes.length);
      nodes.push(node);
    });
    this.signalNodes = nodes;
    this.prevSignalState = signalSites.map((_, i) => signalStateAt(i, 0));

    // 도로 통제: 지점별로 중심 반경 안의 간선(양끝 모두 포함)을 차단 집합으로 사전계산.
    this.closureEdgeSets = closureSites.map((site) => {
      const inside = new Set(
        this.graph.nodes
          .filter((n) => metersBetween([n.lon, n.lat], site.center) <= site.radiusM)
          .map((n) => n.id),
      );
      const edges = new Set<string>();
      for (const id of inside) {
        for (const e of this.graph.adjacency.get(id) ?? []) {
          if (inside.has(e.to)) edges.add(edgeKey(id, e.to));
        }
      }
      return edges;
    });

    // 약 60초 고정 데모: 서지 → 정체 → 통제·우회 → 저배터리 → 해소 → 정상 복귀.
    this.demoScript = [
      { at: 0, label: '정상 운행', run: () => this.resetScenarios() },
      { at: 8, label: '수요 서지', run: () => this.applyScenario('surge', true) },
      { at: 16, label: '교통 정체', run: () => this.applyScenario('incident', true) },
      { at: 24, label: '도로 통제·우회', run: () => this.applyScenario('closure', true) },
      { at: 32, label: '정체 해제', run: () => this.applyScenario('incident', false) },
      { at: 40, label: '통제 해제', run: () => this.applyScenario('closure', false) },
      { at: 44, label: '라이더 저배터리', run: () => this.applyScenario('battery', true) },
      { at: 52, label: '서지 해소', run: () => this.applyScenario('surge', false) },
      { at: 58, label: '정상 복귀', run: () => this.demoFinish() },
    ];
  }

  setRule(rule: DispatchRule): void {
    this.rule = rule;
  }

  riderCount(): number {
    return this.riders.size;
  }

  ensureSpawned(count: number): void {
    if (this.riders.size === 0) this.spawn(count);
  }

  setFocus(riderId: string | null): void {
    this.focusId = riderId;
  }

  spawn(count: number): void {
    this.riders.clear();
    this.orders.clear();
    this.pathMemo.clear();
    this.newOrderIds.clear();
    this.removedOrderIds.clear();
    this.alerts.clear();
    this.newAlertIds.clear();
    this.removedAlertIds.clear();
    this.incident = false;
    this.surge = false;
    this.closure = false;
    this.blockedEdges = new Set();
    this.prevSignalState = signalSites.map((_, i) => signalStateAt(i, 0));
    this.demoActive = false;
    this.demoLabel = undefined;
    this.demoStarted = -1;
    this.nextDemoStep = 0;
    this.metaDirty = false;
    this.rng = mulberry32(20260101);
    this.seq = 0;
    this.tickCount = 0;
    this.simSec = 0;
    this.orderSeq = 0;

    const n = Math.max(1, Math.min(MAX_RIDERS, Math.floor(count)));
    for (let i = 0; i < n; i += 1) {
      const zone = zones[i % zones.length]!;
      const startNode = this.hubNodes[i % this.hubNodes.length]!;
      const start = this.graph.nodeById.get(startNode)!;
      const rider: Rider = {
        id: `RDR-${1000 + i}`,
        name: NAMES[i % NAMES.length]!,
        zone: zone.name,
        status: 'IDLE',
        orderId: null,
        path: [startNode],
        idx: 0,
        edgeDist: 0,
        cruise: 6 + this.rng() * 5,
        currentSpeed: 0,
        dock: null,
        dockSec: 0,
        lon: start.lon,
        lat: start.lat,
        heading: 0,
        completed: Math.floor(this.rng() * 6),
        total: 18 + Math.floor(this.rng() * 12),
        // 초기 배터리를 30~100%로 흩뿌려 일부는 금방 경고권에 든다.
        battery: 30 + this.rng() * 70,
        charging: false,
      };
      this.riders.set(rider.id, rider);
    }

    // 초기 백로그를 쌓고 한 번 배차해 스냅샷이 비어 보이지 않게 한다.
    const backlog = Math.ceil(n * 1.5);
    for (let i = 0; i < backlog; i += 1) this.createOrder();
    this.dispatch();

    // 배정된 라이더를 경로 상에 흩뿌려 동시 출발을 피한다.
    for (const rider of this.riders.values()) {
      if (rider.path.length > 1) {
        rider.idx = Math.floor(this.rng() * (rider.path.length - 1));
        rider.edgeDist = this.rng() * this.segLen(rider, rider.idx);
      }
      this.updatePosition(rider);
    }
    // 초기 상태로 알람을 한 번 평가해 스냅샷이 현황을 반영하게 한다.
    this.evaluateAlerts();

    // 신규 플래그는 초기 스냅샷에 모두 담기므로 비운다.
    this.newOrderIds.clear();
    this.newAlertIds.clear();
    this.removedAlertIds.clear();
    for (const order of this.orders.values()) order.dirty = false;
    for (const alert of this.alerts.values()) alert.dirty = false;
  }

  tick(rateHz: number): DeltaMessage {
    this.tickCount += 1;
    const dt = 1 / Math.max(1, rateHz);
    this.simSec += dt;

    this.runDemo();
    this.maybeSpawnOrders();
    if (this.tickCount % DISPATCH_EVERY === 0) this.dispatch();
    for (const rider of this.riders.values()) this.advance(rider, dt);
    this.pruneTerminal();
    if (this.tickCount % ALERT_EVERY === 0) this.evaluateAlerts();
    this.pruneAlerts();
    const signalsUpd = this.collectSignalChanges();

    this.seq += 1;

    const ordersAdd: OrderWire[] = [];
    const ordersUpd: OrderWire[] = [];
    for (const order of this.orders.values()) {
      if (this.newOrderIds.has(order.id)) ordersAdd.push(this.toWireOrder(order));
      else if (order.dirty) ordersUpd.push(this.toWireOrder(order));
      order.dirty = false;
    }
    const ordersDel = [...this.removedOrderIds];
    this.newOrderIds.clear();
    this.removedOrderIds.clear();

    const alertsAdd: AlertWire[] = [];
    const alertsUpd: AlertWire[] = [];
    for (const alert of this.alerts.values()) {
      if (this.newAlertIds.has(alert.id)) alertsAdd.push(this.toWireAlert(alert));
      else if (alert.dirty) alertsUpd.push(this.toWireAlert(alert));
      alert.dirty = false;
    }
    const alertsDel = [...this.removedAlertIds];
    this.newAlertIds.clear();
    this.removedAlertIds.clear();

    const msg: DeltaMessage = {
      type: 'delta',
      seq: this.seq,
      tick: this.tickCount,
      upd: [...this.riders.values()].map((r) => this.toWire(r)),
    };
    if (ordersAdd.length) msg.ordersAdd = ordersAdd;
    if (ordersUpd.length) msg.ordersUpd = ordersUpd;
    if (ordersDel.length) msg.ordersDel = ordersDel;
    if (alertsAdd.length) msg.alertsAdd = alertsAdd;
    if (alertsUpd.length) msg.alertsUpd = alertsUpd;
    if (alertsDel.length) msg.alertsDel = alertsDel;
    if (signalsUpd.length) msg.signalsUpd = signalsUpd;
    if (this.metaDirty) {
      msg.meta = this.meta();
      this.metaDirty = false;
    }
    if (this.newAuditIds.size) {
      msg.auditAdd = this.auditTrail.filter((a) => this.newAuditIds.has(a.id));
      this.newAuditIds.clear();
    }
    return msg;
  }

  snapshot(): SnapshotMessage {
    return {
      type: 'snapshot',
      seq: this.seq,
      tick: this.tickCount,
      riders: [...this.riders.values()].map((r) => this.toWire(r)),
      orders: [...this.orders.values()].map((o) => this.toWireOrder(o)),
      alerts: [...this.alerts.values()].map((a) => this.toWireAlert(a)),
      signals: this.signalSnapshot(),
      meta: this.meta(),
      audit: this.auditTrail.slice(-8),
    };
  }

  /** 신호 교차로 전체 상태(스냅샷용). 위치는 정적이라 id+상태만 흐른다. */
  private signalSnapshot(): SignalWire[] {
    return signalSites.map((site, i) => ({ id: site.id, state: signalStateAt(i, this.simSec) }));
  }

  /** 직전 틱 대비 상태가 바뀐 신호만 추려 내고 prev를 갱신한다(델타 스트리밍). */
  private collectSignalChanges(): SignalWire[] {
    const changed: SignalWire[] = [];
    for (let i = 0; i < signalSites.length; i += 1) {
      const state = signalStateAt(i, this.simSec);
      if (state !== this.prevSignalState[i]) {
        this.prevSignalState[i] = state;
        changed.push({ id: signalSites[i]!.id, state });
      }
    }
    return changed;
  }

  private meta(): ScenarioMeta {
    return {
      incident: this.incident,
      surge: this.surge,
      closure: this.closure,
      demoActive: this.demoActive,
      demoLabel: this.demoLabel,
      demoSec: this.demoActive ? Math.max(0, Math.round(this.simSec - this.demoStarted)) : undefined,
    };
  }

  // --- 주문 생성·배차 ---

  private createOrder(): Order {
    const zone = zones[Math.floor(this.rng() * zones.length)]!;
    const pickupNode = this.hubNodes[Math.floor(this.rng() * this.hubNodes.length)]!;
    const candidates = this.zoneNodes[zone.name] ?? [pickupNode];
    const dropoffNode = candidates[Math.floor(this.rng() * candidates.length)]!;
    const priority: OrderPriority = this.rng() < EXPRESS_PROB ? 'EXPRESS' : 'NORMAL';
    const street = zone.label.split(' · ')[1] ?? zone.name;
    const order: Order = {
      id: `ORD-${10000 + this.orderSeq++}`,
      zone: zone.name,
      customer: `${street} ${1 + Math.floor(this.rng() * 998)}`,
      priority,
      status: 'QUEUED',
      leg: 'PICKUP',
      riderId: null,
      pickupNode,
      dropoffNode,
      createdSec: this.simSec,
      slaSec: SLA_MIN[priority] * 60,
      terminalSec: null,
      dirty: false,
    };
    this.orders.set(order.id, order);
    this.newOrderIds.add(order.id);
    return order;
  }

  private maybeSpawnOrders(): void {
    if (this.tickCount % ARRIVAL_EVERY !== 0) return;
    // 수요 서지 중에는 도착량과 풀 상한을 끌어올려 미배차 대기열을 쌓는다.
    const cap = this.riders.size * (this.surge ? POOL_FACTOR * 2 : POOL_FACTOR);
    const per = this.surge ? ORDERS_PER_ARRIVAL * 3 : ORDERS_PER_ARRIVAL;
    let active = 0;
    for (const o of this.orders.values()) if (!isTerminal(o)) active += 1;
    for (let i = 0; i < per && active < cap; i += 1) {
      this.createOrder();
      active += 1;
    }
  }

  /** 수요 서지 등에서 즉시 주문 묶음을 주입한다(상한 보호). */
  private spawnBurst(n: number): void {
    const cap = this.riders.size * POOL_FACTOR * 2;
    let active = 0;
    for (const o of this.orders.values()) if (!isTerminal(o)) active += 1;
    for (let i = 0; i < n && active < cap; i += 1) {
      this.createOrder();
      active += 1;
    }
  }

  private dispatch(): void {
    const idle: Rider[] = [];
    // 충전 중이거나 배터리 여유가 없는 라이더는 배차 대상에서 제외한다.
    for (const r of this.riders.values()) {
      if (!r.orderId && !r.charging && r.battery >= BATTERY_RESERVE) idle.push(r);
    }
    if (idle.length === 0) return;
    idle.sort((a, b) => a.id.localeCompare(b.id)); // 결정론적 처리 순서

    let queued: Order[] = [];
    for (const o of this.orders.values()) if (o.status === 'QUEUED') queued.push(o);
    if (queued.length === 0) return;
    // 대규모 함대: 긴급도(특급·오래 대기) 상위 일부만 후보로 두어 1회 배차 비용을 상한.
    if (queued.length > DISPATCH_POOL_CAP) {
      queued.sort((a, b) => {
        const pa = a.priority === 'EXPRESS' ? 0 : 1;
        const pb = b.priority === 'EXPRESS' ? 0 : 1;
        return pa - pb || a.createdSec - b.createdSec || a.id.localeCompare(b.id);
      });
      queued = queued.slice(0, DISPATCH_POOL_CAP);
    }
    const assigned = new Set<string>();

    for (const rider of idle) {
      const riderNode = this.currentNode(rider);
      const pool: Dispatchable[] = [];
      for (const o of queued) {
        if (assigned.has(o.id)) continue;
        const toPickup = this.roadDist(riderNode, o.pickupNode);
        pool.push({
          id: o.id,
          priority: o.priority,
          createdSec: o.createdSec,
          costToPickup: toPickup,
          costTotal: toPickup + this.roadDist(o.pickupNode, o.dropoffNode),
        });
      }
      const choice = chooseOrder(this.rule, pool);
      if (!choice) break; // 남은 주문 없음
      assigned.add(choice.id);
      this.assign(rider, this.orders.get(choice.id)!);
    }
  }

  private assign(rider: Rider, order: Order): void {
    order.riderId = rider.id;
    order.leg = 'PICKUP';
    order.status = 'TO_PICKUP';
    order.dirty = true;
    rider.orderId = order.id;
    rider.status = 'PICKUP';
    this.routeRider(rider, order.pickupNode);
  }

  // --- 이동·생명주기 ---

  private advance(rider: Rider, dt: number): void {
    if (rider.charging) {
      this.advanceCharging(rider, dt);
      return;
    }

    const order = rider.orderId ? this.orders.get(rider.orderId) : undefined;
    if (!order) {
      // 유휴 라이더가 배터리 경고권에 들면 스스로 허브로 복귀해 충전한다.
      if (rider.battery < BATTERY_LOW) {
        this.startCharging(rider);
        return;
      }
      rider.status = 'IDLE';
      rider.currentSpeed = 0;
      return;
    }
    this.checkDelay(order);

    // 도킹 시퀀스(DOCKED·HANDOFF·RELEASING) 진행 중이면 타이머만 돌린다.
    // APPROACHING은 주행 중 라벨이라 여기서 가로채지 않는다(계속 접근·감속).
    if (rider.dock && rider.dock !== 'APPROACHING') {
      this.advanceDocking(rider, order, dt);
      return;
    }

    if (rider.path.length < 2) {
      this.onArrival(rider);
      this.updatePosition(rider);
      this.syncStatus(rider);
      return;
    }

    // 정체(전역)·지연(주문별) 계수를 함께 적용한 순항 목표 속도.
    const delayFactor = order.status === 'DELAYED' ? 0.35 : 1;
    const trafficFactor = this.incident ? INCIDENT_SPEED_FACTOR : 1;
    this.stepSpeed(rider, rider.cruise * delayFactor * trafficFactor, dt);
    const moved = this.travel(rider, rider.currentSpeed * dt);
    this.drainBattery(rider, moved);
    // 목적지에 충분히 가까워지면 최종 접근(APPROACHING)으로 표시한다.
    rider.dock = this.distanceToEnd(rider) <= APPROACH_DIST_M ? 'APPROACHING' : null;
    if (rider.idx >= rider.path.length - 1) this.onArrival(rider);
    this.updatePosition(rider);
    this.syncStatus(rider);
  }

  /**
   * 도킹 상태기계 한 틱(정차 상태). 단계 타이머가 끝나면 다음 단계로 전이한다.
   *  DOCKED → HANDOFF(집화면 이 시점에 PICKED_UP) → RELEASING → (집화: 배송구간 라우팅 / 배송: 완료·실패 후 해제)
   */
  private advanceDocking(rider: Rider, order: Order, dt: number): void {
    rider.currentSpeed = 0;
    this.updatePosition(rider); // 도크 노드에 스냅
    rider.dockSec = Math.max(0, rider.dockSec - dt);
    if (rider.dockSec > 0) {
      this.syncStatus(rider);
      return;
    }

    if (rider.dock === 'DOCKED') {
      rider.dock = 'HANDOFF';
      rider.dockSec = HANDOFF_SEC;
      if (order.leg === 'PICKUP') {
        order.status = 'PICKED_UP';
        order.dirty = true;
      }
    } else if (rider.dock === 'HANDOFF') {
      rider.dock = 'RELEASING';
      rider.dockSec = RELEASE_SEC;
    } else {
      // RELEASING 완료 → 출차
      rider.dock = null;
      rider.dockSec = 0;
      if (order.leg === 'PICKUP') {
        order.leg = 'DELIVER';
        order.status = 'DELIVERING';
        order.dirty = true;
        rider.status = 'DELIVERING';
        this.routeRider(rider, order.dropoffNode);
      } else {
        // 배송 구간 도착 처리: 완료 또는 실패(수취 불가)
        const failed = this.rng() < FAIL_PROB;
        order.status = failed ? 'FAILED' : 'DELIVERED';
        order.terminalSec = this.simSec;
        order.dirty = true;
        if (!failed) rider.completed += 1;
        this.release(rider);
        return;
      }
    }
    this.syncStatus(rider);
  }

  /** 현재 위치에서 경로 종점(목적지)까지 남은 거리(m). APPROACH_DIST_M 초과 시 조기 종료. */
  private distanceToEnd(rider: Rider): number {
    if (rider.idx >= rider.path.length - 1) return 0;
    let d = this.segLen(rider, rider.idx) - rider.edgeDist;
    for (let n = rider.idx + 1; n < rider.path.length - 1; n += 1) {
      if (d > APPROACH_DIST_M) return d; // 이미 충분히 멀다
      d += this.segLen(rider, n);
    }
    return Math.max(0, d);
  }

  /**
   * 가·감속 프로파일(기획서 §5). 목표 순항속도(vCruise)와 "전방 정지점까지의
   * 정지거리 제약"의 최솟값을 목표로, 가속/감속 상한 내에서 현재 속도를 한 틱 전진한다.
   * 정지선(적신호)·목적지 접근 시 자연스럽게 감속하고, 출발 시 서서히 가속한다.
   */
  private stepSpeed(rider: Rider, vCruise: number, dt: number): void {
    const stopDist = this.distanceToNextStop(rider);
    // v = sqrt(2·a·d): 정지거리 d에서 멈추려면 현재 속도가 이 값을 넘지 않아야 한다.
    const vStop = Math.sqrt(2 * MAX_DECEL * stopDist);
    const vTarget = Math.min(vCruise, vStop);
    if (rider.currentSpeed < vTarget) {
      rider.currentSpeed = Math.min(vTarget, rider.currentSpeed + MAX_ACCEL * dt);
    } else {
      rider.currentSpeed = Math.max(vTarget, rider.currentSpeed - MAX_DECEL * dt);
    }
    if (rider.currentSpeed < 0) rider.currentSpeed = 0;
  }

  /**
   * 전방에서 처음 만나는 "정지점"까지의 거리(m). 정지점 = 경로 종점(목적지) 또는
   * 현재 STOP인 신호 노드. 반응 거리(STOP_LOOKAHEAD_M) 밖이면 제약 없음(Infinity).
   */
  private distanceToNextStop(rider: Rider): number {
    if (rider.idx >= rider.path.length - 1) return 0;
    let dist = this.segLen(rider, rider.idx) - rider.edgeDist; // 다음 노드까지 남은 거리
    let n = rider.idx + 1;
    while (true) {
      if (n >= rider.path.length - 1) return Math.max(0, dist); // 목적지에서 정지
      if (this.isSignalStop(rider.path[n]!)) return Math.max(0, dist); // 적신호에서 정지
      if (dist >= STOP_LOOKAHEAD_M) return Infinity; // 반응 거리 밖 → 순항 유지
      dist += this.segLen(rider, n);
      n += 1;
    }
  }

  /** 충전 모드: 허브까지 이동 → 도착 후 충전 → 완충 시 유휴 복귀. */
  private advanceCharging(rider: Rider, dt: number): void {
    rider.status = 'CHARGING';
    if (rider.path.length >= 2 && rider.idx < rider.path.length - 1) {
      this.stepSpeed(rider, rider.cruise * (this.incident ? INCIDENT_SPEED_FACTOR : 1), dt);
      const moved = this.travel(rider, rider.currentSpeed * dt);
      this.drainBattery(rider, moved);
      this.updatePosition(rider);
      return;
    }
    // 허브 도착 → 충전
    rider.currentSpeed = 0;
    rider.battery = Math.min(100, rider.battery + CHARGE_PER_SEC * dt);
    this.updatePosition(rider);
    if (rider.battery >= 100) {
      rider.charging = false;
      this.release(rider); // 유휴로 복귀(이후 배차 대상)
    }
  }

  /**
   * 경로를 따라 move(m)만큼 진행하고 실제 이동 거리(m)를 돌려준다.
   * 중간 신호 노드가 STOP이면 정지선(현재 세그먼트 끝)에서 대기한다 — 목적지 노드는 통과.
   */
  private travel(rider: Rider, move: number): number {
    let remaining = move;
    while (remaining > 0 && rider.idx < rider.path.length - 1) {
      const len = this.segLen(rider, rider.idx);
      const remain = len - rider.edgeDist;
      if (remaining < remain) {
        rider.edgeDist += remaining;
        remaining = 0;
      } else {
        const nextId = rider.path[rider.idx + 1]!;
        const isFinal = rider.idx + 1 >= rider.path.length - 1;
        if (!isFinal && this.isSignalStop(nextId)) {
          rider.edgeDist = len; // 정지선 대기 — 이번 틱 남은 이동량은 소멸
          break;
        }
        remaining -= remain;
        rider.idx += 1;
        rider.edgeDist = 0;
      }
    }
    return move - remaining;
  }

  /** 노드가 신호 교차로이고 현재 STOP이면 true. */
  private isSignalStop(nodeId: string): boolean {
    const i = this.signalIndexByNode.get(nodeId);
    return i !== undefined && signalStateAt(i, this.simSec) === 'STOP';
  }

  private drainBattery(rider: Rider, movedM: number): void {
    if (movedM > 0) rider.battery = Math.max(0, rider.battery - movedM * BATTERY_DRAIN_PER_M);
  }

  private onArrival(rider: Rider): void {
    const order = rider.orderId ? this.orders.get(rider.orderId) : undefined;
    if (!order) {
      this.release(rider);
      return;
    }

    // 통제로 경로가 끊겨 목표에 아직 못 닿았으면(경로 truncation) 재경로 시도 후 대기 —
    // 엉뚱한 지점에서 집화/완료 처리되는 것을 막는다.
    const target = order.leg === 'PICKUP' ? order.pickupNode : order.dropoffNode;
    if (this.currentNode(rider) !== target) {
      this.routeRider(rider, target); // routeRider가 dock을 비운다
      rider.currentSpeed = 0;
      return;
    }

    // 도크에 도착 → 도킹 시퀀스 시작(DOCKED). 집화/배송 공통.
    rider.dock = 'DOCKED';
    rider.dockSec = DOCK_SETTLE_SEC;
    rider.currentSpeed = 0;
  }

  /** 라이더를 유휴 상태로 되돌린다(다음 배차 대상). 배터리가 위험하면 충전으로 전환. */
  private release(rider: Rider): void {
    const here = rider.path[Math.min(rider.idx, rider.path.length - 1)]!;
    rider.orderId = null;
    rider.currentSpeed = 0;
    rider.dock = null;
    rider.dockSec = 0;
    rider.path = [here];
    rider.idx = 0;
    rider.edgeDist = 0;
    if (rider.battery < BATTERY_CRITICAL) {
      this.startCharging(rider);
      return;
    }
    rider.charging = false;
    rider.status = 'IDLE';
  }

  /** 가장 가까운 허브로 경로를 잡고 충전 모드로 전환한다. */
  private startCharging(rider: Rider): void {
    rider.orderId = null;
    rider.dock = null;
    rider.dockSec = 0;
    rider.charging = true;
    rider.status = 'CHARGING';
    rider.currentSpeed = 0;
    const hub = this.nearestHubNode(this.currentNode(rider));
    this.routeRider(rider, hub);
  }

  private nearestHubNode(from: string): string {
    let best = this.hubNodes[0]!;
    let bestDist = Infinity;
    for (const hub of this.hubNodes) {
      const d = this.roadDist(from, hub);
      if (d < bestDist) {
        bestDist = d;
        best = hub;
      }
    }
    return best;
  }

  /** 표시 상태를 현재 주문/구간에서 파생한다. */
  private syncStatus(rider: Rider): void {
    const order = rider.orderId ? this.orders.get(rider.orderId) : undefined;
    if (!order) {
      rider.status = 'IDLE';
      return;
    }
    if (order.status === 'DELAYED') rider.status = 'DELAYED';
    else rider.status = order.leg === 'PICKUP' ? 'PICKUP' : 'DELIVERING';
  }

  private checkDelay(order: Order): void {
    if (
      order.status === 'TO_PICKUP' ||
      order.status === 'PICKED_UP' ||
      order.status === 'DELIVERING'
    ) {
      if (this.simSec - order.createdSec > order.slaSec) {
        order.status = 'DELAYED';
        order.dirty = true;
      }
    }
  }

  private pruneTerminal(): void {
    for (const order of this.orders.values()) {
      if (isTerminal(order) && order.terminalSec !== null) {
        if (this.simSec - order.terminalSec > TERMINAL_GRACE_SEC) {
          this.orders.delete(order.id);
          this.newOrderIds.delete(order.id);
          this.removedOrderIds.add(order.id);
        }
      }
    }
  }

  // --- 단계 4: 알람 평가·조정 ---

  /** 담당 권역 중심에서의 거리(m). 배정되어 이동 중일 때만, 아니면 null. */
  private riderZoneDist(rider: Rider): number | null {
    if (!rider.orderId || rider.charging) return null;
    const c = this.zoneCentroid[rider.zone];
    if (!c) return null;
    return metersBetween([rider.lon, rider.lat], c);
  }

  /** 현재 상태를 순수 deriveAlerts에 넘겨 "켜져 있어야 할 알람"을 얻고, 생명주기를 조정한다. */
  private evaluateAlerts(): void {
    const desired = deriveAlerts({
      riders: [...this.riders.values()].map((r) => ({
        id: r.id,
        zone: r.zone,
        battery: r.battery,
        zoneDistM: this.riderZoneDist(r),
      })),
      orders: [...this.orders.values()].map((o) => ({ id: o.id, zone: o.zone, status: o.status })),
      thresholds: ALERT_THRESHOLDS,
    });
    this.reconcileAlerts(desired);
  }

  private reconcileAlerts(desired: DesiredAlert[]): void {
    const desiredIds = new Set(desired.map((d) => d.id));
    for (const d of desired) {
      const ex = this.alerts.get(d.id);
      if (!ex) {
        this.alerts.set(d.id, {
          ...d,
          status: 'OPEN',
          createdSec: this.simSec,
          terminalSec: null,
          dirty: true,
        });
        this.newAlertIds.add(d.id);
        this.removedAlertIds.delete(d.id);
        continue;
      }
      // 복구됐던 알람이 다시 조건을 만족하면 재개방.
      if (ex.status === 'RESOLVED') {
        ex.status = 'OPEN';
        ex.createdSec = this.simSec;
        ex.terminalSec = null;
        ex.dirty = true;
      }
      if (ex.severity !== d.severity || ex.detail !== d.detail || ex.title !== d.title) {
        ex.severity = d.severity;
        ex.detail = d.detail;
        ex.title = d.title;
        ex.dirty = true;
      }
    }
    // 조건이 사라진 알람은 복구 처리(확인 여부와 무관).
    for (const a of this.alerts.values()) {
      if (!desiredIds.has(a.id) && a.status !== 'RESOLVED') {
        a.status = 'RESOLVED';
        a.terminalSec = this.simSec;
        a.dirty = true;
      }
    }
  }

  private pruneAlerts(): void {
    for (const a of this.alerts.values()) {
      if (a.status === 'RESOLVED' && a.terminalSec !== null) {
        if (this.simSec - a.terminalSec > ALERT_GRACE_SEC) {
          this.alerts.delete(a.id);
          this.newAlertIds.delete(a.id);
          this.removedAlertIds.add(a.id);
        }
      }
    }
  }

  // --- 단계 6: 연동 경계 — 명령의 단일 실행 지점 ---

  /**
   * 운영 명령의 단일 실행 지점.
   * 역할 기반 인증 → 감사 기록(승인·거부 모두) → (승인 시) 엔진 도메인 명령 실행.
   * start/stop/setCount 같은 루프 제어는 여기서 인증·감사만 하고, 실제 실행은
   * 결과(accepted)를 보고 호출측(worker/ws)이 수행한다. snapshot/setRole은 경계
   * 밖(어댑터 처리)이라 여기로 오지 않는다.
   */
  applyCommand(cmd: ClientCommand, actor: Actor): CommandResult {
    const type = cmd.type as CommandType;
    const result = authorizeCommand(actor, type);
    if (isAuditable(type)) {
      const entry = buildAuditEntry(cmd, actor, result, this.clock());
      this.auditTrail.push(entry);
      if (this.auditTrail.length > 20) this.auditTrail = this.auditTrail.slice(-20);
      this.newAuditIds.add(entry.id);
      result.auditId = entry.id;
    }
    if (!result.accepted) return result;
    switch (type) {
      case 'setRule':
        if (cmd.rule) this.setRule(cmd.rule);
        break;
      case 'inject':
        if (cmd.scenario) this.applyScenario(cmd.scenario, cmd.on ?? true);
        break;
      case 'ackAlert':
        if (cmd.alertId) this.ackAlert(cmd.alertId);
        break;
      case 'demo':
        this.setDemo(cmd.on ?? true);
        break;
      case 'reassign':
        if (cmd.riderId) this.reassign(cmd.riderId);
        break;
      case 'promoteExpress':
        if (cmd.orderId) this.promoteExpress(cmd.orderId);
        break;
      // contactCourier: 상태 변화 없이 감사만 남긴다.
      // start/stop/setCount: 루프 제어라 호출측이 실행.
      default:
        break;
    }
    return result;
  }

  /** 라이더의 현재 주문을 대기열로 되돌리고 라이더를 유휴로 — 다음 배차에서 재배정. */
  private reassign(riderId: string): void {
    const rider = this.riders.get(riderId);
    if (!rider || !rider.orderId) return;
    const order = this.orders.get(rider.orderId);
    if (order && !isTerminal(order)) {
      order.status = 'QUEUED';
      order.leg = 'PICKUP';
      order.riderId = null;
      order.dirty = true;
    }
    this.release(rider);
  }

  /** 주문을 특급(EXPRESS)으로 승격하고 SLA를 당긴다. */
  private promoteExpress(orderId: string): void {
    const order = this.orders.get(orderId);
    if (!order || isTerminal(order) || order.priority === 'EXPRESS') return;
    order.priority = 'EXPRESS';
    order.slaSec = SLA_MIN.EXPRESS * 60;
    order.dirty = true;
  }

  // --- 단계 4: 명령(fault injection·ack·데모) ---

  /** 시나리오 주입. reset은 on을 무시하고 전부 해제한다. */
  inject(scenario: ScenarioKind, on = true): void {
    this.applyScenario(scenario, on);
  }

  /** 알람 확인(ack). 미확인(OPEN) 알람만 상태 전이한다. */
  ackAlert(alertId: string): void {
    const a = this.alerts.get(alertId);
    if (a && a.status === 'OPEN') {
      a.status = 'ACKNOWLEDGED';
      a.dirty = true;
    }
  }

  /** 자동 데모 토글. */
  setDemo(on: boolean): void {
    if (on) this.startDemo();
    else this.stopDemo();
  }

  private applyScenario(kind: ScenarioKind, on: boolean): void {
    switch (kind) {
      case 'incident':
        if (this.incident !== on) {
          this.incident = on;
          this.metaDirty = true;
        }
        break;
      case 'surge':
        if (this.surge !== on) {
          this.surge = on;
          this.metaDirty = true;
        }
        if (on) this.spawnBurst(SURGE_BURST);
        break;
      case 'battery':
        if (on) this.forceBatteryDrain();
        break;
      case 'closure':
        this.setClosure(on);
        break;
      case 'reset':
        this.resetScenarios();
        break;
    }
  }

  /**
   * 도로 통제·폐쇄 토글. 통제 지점의 간선을 차단 집합에 넣고/빼고, 경로 메모를 비워
   * 이후 Dijkstra가 차단을 반영하게 한 뒤, 운행 중 라이더를 즉시 재경로(우회)한다.
   */
  private setClosure(on: boolean): void {
    if (this.closure === on) return;
    this.closure = on;
    const blocked = new Set<string>();
    if (on) for (const set of this.closureEdgeSets) for (const k of set) blocked.add(k);
    this.blockedEdges = blocked;
    this.pathMemo.clear(); // 차단 반영을 위해 (from,to) 메모 무효화
    this.rerouteAll();
    this.metaDirty = true;
  }

  /** 운행 중(배정·충전) 라이더를 현재 목표로 재경로. 통제 전환 시 우회를 즉시 반영. */
  private rerouteAll(): void {
    for (const rider of this.riders.values()) {
      // 도크에 정차 중(DOCKED·HANDOFF·RELEASING)인 라이더는 건너뛴다 — 현재 경로가
      // 0길이라 통제와 무관하고, 도킹이 끝난 뒤 다음 구간 라우팅이 최신 차단을 반영한다.
      if (rider.dock && rider.dock !== 'APPROACHING') continue;
      const goal = this.riderGoalNode(rider);
      if (goal) this.routeRider(rider, goal);
    }
  }

  /** 라이더가 지금 향하는 목표 노드(집화/배송/허브). 유휴면 null. */
  private riderGoalNode(rider: Rider): string | null {
    if (rider.charging) return this.nearestHubNode(this.currentNode(rider));
    const order = rider.orderId ? this.orders.get(rider.orderId) : undefined;
    if (!order || isTerminal(order)) return null;
    return order.leg === 'PICKUP' ? order.pickupNode : order.dropoffNode;
  }

  private resetScenarios(): void {
    if (this.incident || this.surge || this.closure) this.metaDirty = true;
    this.incident = false;
    this.surge = false;
    this.setClosure(false);
  }

  /** 운행 중인 라이더 한 명을 위험 배터리로 떨어뜨려 저배터리 시나리오를 재현한다. */
  private forceBatteryDrain(): void {
    const sorted = [...this.riders.values()].sort((a, b) => a.id.localeCompare(b.id));
    let target = sorted.find((r) => !r.charging && r.orderId && r.battery > BATTERY_RESERVE);
    if (!target) target = sorted.find((r) => !r.charging);
    if (target) target.battery = BATTERY_CRITICAL - 2;
  }

  private startDemo(): void {
    this.demoActive = true;
    this.demoStarted = this.simSec;
    this.nextDemoStep = 0;
    this.demoLabel = undefined;
    this.metaDirty = true;
  }

  private stopDemo(): void {
    this.demoActive = false;
    this.demoStarted = -1;
    this.demoLabel = undefined;
    this.resetScenarios();
    this.metaDirty = true;
  }

  private demoFinish(): void {
    this.resetScenarios();
    this.demoActive = false;
    this.demoStarted = -1;
    this.metaDirty = true;
  }

  private runDemo(): void {
    if (!this.demoActive) return;
    const elapsed = this.simSec - this.demoStarted;
    while (
      this.nextDemoStep < this.demoScript.length &&
      elapsed >= this.demoScript[this.nextDemoStep]!.at
    ) {
      const step = this.demoScript[this.nextDemoStep]!;
      this.demoLabel = step.label;
      this.metaDirty = true;
      step.run();
      this.nextDemoStep += 1;
    }
  }

  // --- 경로·기하 ---

  private currentNode(rider: Rider): string {
    return rider.path[Math.min(rider.idx, rider.path.length - 1)]!;
  }

  /**
   * 경로+거리 메모(단계 7). 그래프가 정적이라 (from,to)별로 한 번만 Dijkstra를 돌리고
   * 이후 O(1)로 재사용한다 — 대규모 함대의 배차/경로 비용을 상수에 가깝게 눌러준다.
   */
  private pathInfo(from: string, to: string): { path: string[] | null; dist: number } {
    if (from === to) return { path: [from], dist: 0 };
    const key = `${from}>${to}`;
    const cached = this.pathMemo.get(key);
    if (cached) return cached;
    const path = shortestPath(this.graph, from, to, this.blockedEdges.size ? this.blockedEdges : undefined);
    const dist = path && path.length > 1 ? pathDistance(this.graph, path) : Infinity;
    const info = { path, dist };
    this.pathMemo.set(key, info);
    return info;
  }

  private routeRider(rider: Rider, target: string): void {
    const start = this.currentNode(rider);
    const info = this.pathInfo(start, target);
    // 메모된 배열을 라이더가 직접 변형하지 않도록 복사해 넘긴다.
    rider.path = info.path && info.path.length >= 2 ? [...info.path] : [start];
    rider.idx = 0;
    rider.edgeDist = 0;
    rider.dock = null; // 새 경로로 주행 시작 — 도킹 상태 해제
  }

  private roadDist(from: string, to: string): number {
    return this.pathInfo(from, to).dist;
  }

  private segLen(rider: Rider, i: number): number {
    const a = this.graph.nodeById.get(rider.path[i]!)!;
    const b = this.graph.nodeById.get(rider.path[i + 1]!)!;
    return metersBetween([a.lon, a.lat], [b.lon, b.lat]);
  }

  private updatePosition(rider: Rider): void {
    if (rider.path.length < 2 || rider.idx >= rider.path.length - 1) {
      // 경로 끝(집화 체류 등)에서는 마지막 노드에 스냅한다.
      const n = this.graph.nodeById.get(rider.path[Math.min(rider.idx, rider.path.length - 1)]!)!;
      rider.lon = n.lon;
      rider.lat = n.lat;
      return;
    }
    const a = this.graph.nodeById.get(rider.path[rider.idx]!)!;
    const b = this.graph.nodeById.get(rider.path[rider.idx + 1]!)!;
    const len = metersBetween([a.lon, a.lat], [b.lon, b.lat]);
    const t = len > 0 ? Math.min(1, Math.max(0, rider.edgeDist / len)) : 0;
    const p: LonLat = lerp([a.lon, a.lat], [b.lon, b.lat], t);
    rider.lon = p[0];
    rider.lat = p[1];
    rider.heading = bearing([a.lon, a.lat], [b.lon, b.lat]);
  }

  private etaMin(rider: Rider): number {
    if (rider.status === 'IDLE' || rider.path.length < 2) return 0;
    const remaining = Math.max(0, pathDistance(this.graph, rider.path.slice(rider.idx)) - rider.edgeDist);
    return Math.max(1, Math.round(remaining / rider.cruise / 60));
  }

  // --- 와이어 직렬화 ---

  private toWire(rider: Rider): RiderWire {
    return {
      id: rider.id,
      name: rider.name,
      zone: rider.zone,
      status: rider.status,
      lon: Math.round(rider.lon * 1e6) / 1e6,
      lat: Math.round(rider.lat * 1e6) / 1e6,
      heading: Math.round(rider.heading),
      speed: Math.round(rider.currentSpeed * 100) / 100,
      completed: rider.completed,
      total: rider.total,
      etaMin: this.etaMin(rider),
      orderId: rider.orderId,
      // 단계 7: 추적선은 포커스된 라이더에게만(그 외는 생략해 델타·연산 절감).
      route: rider.id === this.focusId ? this.routeCoords(rider) : undefined,
      battery: Math.round(rider.battery),
      // 보강: 도킹 단계(진행 중일 때만 — 생략해 델타 바이트 절감).
      dock: rider.dock ?? undefined,
    };
  }

  private toWireAlert(alert: Alert): AlertWire {
    return {
      id: alert.id,
      kind: alert.kind,
      severity: alert.severity,
      status: alert.status,
      title: alert.title,
      detail: alert.detail,
      zone: alert.zone,
      riderId: alert.riderId,
      orderId: alert.orderId,
      ageSec: Math.max(0, Math.round(this.simSec - alert.createdSec)),
    };
  }

  /** 현재 위치 → 목적지까지 남은 경로 폴리라인(lon/lat). 선택 라이더 추적선 표시용. */
  private routeCoords(rider: Rider): [number, number][] | undefined {
    if (rider.status === 'IDLE' || rider.path.length < 2 || rider.idx >= rider.path.length - 1) {
      return undefined;
    }
    const round = (v: number) => Math.round(v * 1e6) / 1e6;
    const coords: [number, number][] = [[round(rider.lon), round(rider.lat)]];
    for (let i = rider.idx + 1; i < rider.path.length; i += 1) {
      const n = this.graph.nodeById.get(rider.path[i]!)!;
      coords.push([round(n.lon), round(n.lat)]);
    }
    return coords.length > 1 ? coords : undefined;
  }

  private toWireOrder(order: Order): OrderWire {
    let etaMin = 0;
    if (order.status === 'QUEUED') {
      etaMin = Math.max(1, Math.round(this.roadDist(order.pickupNode, order.dropoffNode) / AVG_CRUISE / 60));
    } else if (order.riderId) {
      const rider = this.riders.get(order.riderId);
      if (rider) etaMin = this.etaMin(rider);
    }
    return {
      id: order.id,
      zone: order.zone,
      customer: order.customer,
      priority: order.priority,
      status: order.status,
      riderId: order.riderId,
      etaMin,
      waitMin: order.status === 'QUEUED' ? Math.round((this.simSec - order.createdSec) / 60) : 0,
    };
  }
}
