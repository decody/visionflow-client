/**
 * SimEngine — 복합운송 시뮬레이터 코어(순수). 단계 2~3(기획서 §4/§5/§6).
 *
 * 두 개의 풀을 굴린다.
 *  - Conveyance(운송수단, 고빈도): 네트워크 그래프 위를 모드별 속도로 순회. 매 틱 위치 델타.
 *  - Shipment(복합운송 화물, 저빈도): origin→dest 다중 leg 경로를 따라 이동하며 환적(dwell)·
 *    통관·누적 ETA·SLA at-risk·터미널(DELIVERED/EXCEPTION)을 겪는다. 상태/leg 변경 시에만 델타.
 *
 * 고정 seed(mulberry32)로 결정론적이라 Worker·ws가 공유하고 벤치·단위 테스트가 가능하다.
 * 시간: tick(rateHz) 1회 = 실제 1/rateHz초 → sim time은 §15.3 압축(1 real-sec = 10 sim-min).
 */

import { HUBS, HUB_BY_ID, LANES, cruiseKmh } from '@/entities/logistics/mock';
import type { Mode, RoutingRule, ScenarioKind, ShipmentStatus } from '@/entities/logistics/types';
import {
  buildNetwork,
  edgesFrom,
  modesInNetwork,
  type NetEdge,
  type Network,
} from '@/entities/network/build-network';
import { edgeDistKm, shortestRoute } from '@/entities/network/path';
import type { Actor, AuditEntry, CommandResult } from '@/entities/logistics/types';
import { authorizeCommand, buildAuditEntry, isAuditable } from '@/shared/integration/command-contract';
import { haversineKm, initialBearing, interpolate, type LonLat } from '@/shared/geo/great-circle';
import { REAL_SEC_TO_SIM_MIN } from '@/shared/config';
import { deriveAlerts, type AlertSpec } from './alerts';
import {
  CUSTOMS_EXTRA_MS,
  DWELL_MS,
  remainingEtaMs,
  routeTravelMs,
} from './shipments';
import type {
  AlertWire,
  ClientCommand,
  ConveyanceWire,
  ServerMessage,
  ShipmentStats,
  ShipmentWire,
  SimMeta,
} from '@/shared/realtime/types';

const AUDIT_MAX = 20;

const SIM_EPOCH = Date.UTC(2026, 9, 18, 0, 0, 0); // 고정 기준 시각(결정론)
const MAX_CONVEYANCES = 5000;
const SPEED_JITTER = 0.25;

const SHIP_TARGET_DEFAULT = 400;
const MAX_SHIPMENTS = 60000;
const DELIVERED_TTL_MS = 30 * 60 * 1000; // 완료/예외 후 목록 유지(sim ms)
const EXPEDITE_RATE = 0.15;
const CUSTOMS_RATE = 0.08;
const EXCEPTION_RATE = 0.03;

// 시나리오 효과 상수(기획서 §7).
const CANAL_LANE_INDEX = 2; // AEJEA↔NLRTM(수에즈 대표 해상 레인)
const SURGE_FACTOR = 1.6; // 수요 서지 시 목표 화물 수
const CONGESTION_DWELL_FACTOR = 2.4; // 항만 혼잡 시 PORT 체류 배수
const WEATHER_SEA_FACTOR = 0.5; // 기상 회피 시 해상 속도 배수
const CUSTOMS_SURGE_RATE = 0.5; // 통관 급증 시 통관 대상 비율

/** 자동 데모 타임라인(기획서 §7) — 실제 경과초 기준 시나리오 토글. */
const DEMO_SCRIPT: { at: number; label: string; scenarios: ScenarioKind[] }[] = [
  { at: 0, label: '정상 운송', scenarios: [] },
  { at: 10, label: '항만 혼잡', scenarios: ['congestion'] },
  { at: 22, label: '운하 폐쇄', scenarios: ['congestion', 'canalClosure'] },
  { at: 34, label: '기상 회피', scenarios: ['canalClosure', 'weather'] },
  { at: 46, label: '통관 지연 급증', scenarios: ['weather', 'customs'] },
  { at: 56, label: '수요 서지', scenarios: ['customs', 'surge'] },
  { at: 66, label: '복구', scenarios: [] },
];
const DEMO_LOOP_SEC = 76;

/** 결정론 난수 — mulberry32. */
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

interface CState {
  id: string;
  mode: Mode;
  edge: NetEdge;
  fromLL: LonLat;
  toLL: LonLat;
  distKm: number;
  traveledKm: number;
  speed: number;
}

type ShipPhase = 'RIDING' | 'DWELL' | 'QUEUED' | 'DONE';

interface AlertRuntime {
  spec: AlertSpec;
  status: 'OPEN' | 'ACKNOWLEDGED' | 'RESOLVED';
  ts: number;
}

interface SState {
  id: string;
  priority: 0 | 1 | 2 | 3;
  origin: string;
  dest: string;
  edges: NetEdge[];
  legIndex: number;
  legProgressKm: number;
  legDistKm: number;
  speed: number; // 현재 leg km/h
  phase: ShipPhase;
  dwellRemainingMs: number;
  dwellHub: string | null;
  hasSlot: boolean;
  customs: boolean; // 통관 보류 대상
  customsApplied: boolean;
  terminalStatus: 'DELIVERED' | 'EXCEPTION' | null;
  ttlMs: number; // 터미널 후 잔존
  createdAt: number;
  slaDue: number;
}

export class SimEngine {
  private readonly net: Network;
  private readonly modes: Mode[];
  private readonly rng: () => number;
  private readonly conveyances: CState[] = [];
  private readonly shipments: SState[] = [];
  private readonly hubDwellUsed = new Map<string, number>();
  private readonly shipSig = new Map<string, string>();
  private shipTarget = 0;
  private shipTargetBase = SHIP_TARGET_DEFAULT;
  private shipCounter = 0;
  private delivered = 0;
  private onTime = 0;
  private exceptions = 0;
  private rule: RoutingRule = 'FASTEST_ETA';
  private seq = 0;
  private tickCount = 0;
  private simTime = SIM_EPOCH;
  private running = false;
  private rateHz = 10;
  // 시나리오/알람/데모(단계 5)
  private readonly scenarios = new Set<ScenarioKind>();
  private readonly blocked = new Set<number>();
  private customsRate = CUSTOMS_RATE;
  private readonly alerts = new Map<string, AlertRuntime>();
  private readonly alertSig = new Map<string, string>();
  private prevExceptions = 0;
  private demoRunning = false;
  private demoStartSec = 0;
  private demoPhase = '정상 운송';
  // 감사 로그(단계 7)
  private readonly auditLog: AuditEntry[] = [];
  private readonly auditEmitted = new Set<string>();

  constructor(seed = 0x5109) {
    this.net = buildNetwork(HUBS, LANES);
    this.modes = modesInNetwork(this.net);
    this.rng = mulberry32(seed);
    for (const h of HUBS) this.hubDwellUsed.set(h.id, 0);
  }

  // ---------------- 수명주기 / 명령 ----------------

  ensureSpawned(count: number): void {
    if (this.conveyances.length === 0) this.spawn(count);
    if (this.shipments.length === 0) this.seedShipments(SHIP_TARGET_DEFAULT);
  }

  spawn(count: number): void {
    const target = Math.max(0, Math.min(MAX_CONVEYANCES, Math.floor(count)));
    while (this.conveyances.length > target) this.conveyances.pop();
    while (this.conveyances.length < target) {
      const idx = this.conveyances.length;
      const mode = this.modes[idx % this.modes.length] as Mode;
      const edge = this.randomEdgeOfMode(mode);
      const state = this.makeConveyance(`CV-${idx.toString().padStart(4, '0')}`, mode, edge);
      state.traveledKm = this.rng() * state.distKm;
      this.conveyances.push(state);
    }
  }

  setRule(rule: RoutingRule): void {
    this.rule = rule; // 신규 화물 라우팅에만 적용(진행 중 화물은 경로 유지)
  }

  /** 화물 목표 수 설정 + 즉시 시드(벤치·대규모 부하용). 단계 8. */
  setShipmentTarget(n: number): void {
    this.shipTargetBase = Math.max(0, Math.min(MAX_SHIPMENTS, Math.floor(n)));
    this.seedShipments(this.shipTargetBase);
  }

  /** fault injection — 시나리오 on/off(기획서 §7). reset은 전체 해제. */
  inject(scenario: ScenarioKind, on = true): void {
    if (scenario === 'reset') {
      this.scenarios.clear();
      this.applyScenarioEffects();
      return;
    }
    if (on) this.scenarios.add(scenario);
    else this.scenarios.delete(scenario);
    this.applyScenarioEffects();
  }

  /** 알람 ack(기획서 §8). */
  ackAlert(alertId: string): void {
    const a = this.alerts.get(alertId);
    if (a && a.status === 'OPEN') a.status = 'ACKNOWLEDGED';
  }

  /** 운영 조치 — Expedite 승격(우선순위 3). 단계 6(2단계 확인 UI로 호출). */
  promoteExpedite(shipmentId: string): boolean {
    const s = this.shipments.find((x) => x.id === shipmentId && !x.terminalStatus);
    if (!s) return false;
    s.priority = 3;
    return true;
  }

  /** 운영 조치 — 현재 허브 기준 재경로(현 규칙·폐쇄 반영). 단계 6. */
  rerouteShipment(shipmentId: string): boolean {
    const s = this.shipments.find((x) => x.id === shipmentId && !x.terminalStatus);
    if (!s) return false;
    const from = s.edges[s.legIndex]?.to ?? s.origin;
    const route = shortestRoute(this.net, from, s.dest, this.rule, this.blocked);
    if (!route || route.edges.length === 0) return false;
    if (s.phase === 'RIDING') {
      s.edges = [s.edges[s.legIndex]!, ...route.edges];
      s.legIndex = 0;
    } else {
      if (s.hasSlot && s.dwellHub) {
        const used = this.hubDwellUsed.get(s.dwellHub) ?? 0;
        this.hubDwellUsed.set(s.dwellHub, Math.max(0, used - 1));
      }
      s.hasSlot = false;
      s.dwellHub = null;
      s.edges = route.edges;
      s.legIndex = 0;
      s.legProgressKm = 0;
      const e = route.edges[0]!;
      s.legDistKm = Math.max(1, edgeDistKm(e));
      s.speed = cruiseKmh(e.mode) * (1 + (this.rng() * 2 - 1) * SPEED_JITTER);
      s.phase = 'RIDING';
    }
    return true;
  }

  /**
   * 연동 경계의 단일 실행 지점(기획서 §9). 역할 인증 → 감사 기록(승인·거부 모두)
   * → 승인 시 도메인 명령 실행. 루프 제어(start/stop/setCount)·snapshot은 인증·감사만
   * 하고 실제 실행은 호출측(worker/ws)이 맡는다.
   */
  applyCommand(cmd: ClientCommand, actor: Actor): CommandResult {
    const type = cmd.type;
    // 세션 전용 명령은 경계 밖(여기 들어오면 BAD_REQUEST).
    if (type === 'setRole' || type === 'setSubscription') {
      return { accepted: false, code: 'BAD_REQUEST', reason: '세션 명령은 경계 밖에서 처리합니다.' };
    }
    const result = authorizeCommand(actor, type);
    if (isAuditable(type)) {
      const entry = buildAuditEntry(cmd, actor, result, Date.now());
      this.pushAudit(entry);
      result.auditId = entry.id;
    }
    if (!result.accepted) return result;

    // 도메인 명령 실행(루프 제어·snapshot은 호출측).
    switch (cmd.type) {
      case 'setRule':
        this.setRule(cmd.rule);
        break;
      case 'inject':
        this.inject(cmd.scenario, cmd.on ?? true);
        break;
      case 'ackAlert':
        this.ackAlert(cmd.alertId);
        break;
      case 'demo':
        this.setDemo(cmd.on);
        break;
      case 'promoteExpedite':
        this.promoteExpedite(cmd.shipmentId);
        break;
      case 'rerouteShipment':
        this.rerouteShipment(cmd.shipmentId);
        break;
      default:
        break; // start/stop/setCount/snapshot → 호출측 실행
    }
    return result;
  }

  hasShipment(id: string): boolean {
    return this.shipments.some((s) => s.id === id);
  }

  hasAlert(id: string): boolean {
    return this.alerts.has(id);
  }

  private pushAudit(entry: AuditEntry): void {
    this.auditLog.push(entry);
    while (this.auditLog.length > AUDIT_MAX) {
      const removed = this.auditLog.shift();
      if (removed) this.auditEmitted.delete(removed.id);
    }
  }

  private drainAuditAdd(): AuditEntry[] {
    const out = this.auditLog.filter((a) => !this.auditEmitted.has(a.id));
    for (const a of out) this.auditEmitted.add(a.id);
    return out;
  }

  /** 자동 데모 on/off(기획서 §7). */
  setDemo(on: boolean): void {
    this.demoRunning = on;
    this.demoStartSec = this.tickCount / this.rateHz;
    if (!on) {
      this.scenarios.clear();
      this.applyScenarioEffects();
      this.demoPhase = '정상 운송';
    }
  }

  private applyScenarioEffects(): void {
    // 운하 폐쇄 → 레인 차단 집합 갱신 + 영향 화물 재경로.
    const wasBlocked = this.blocked.has(CANAL_LANE_INDEX);
    this.blocked.clear();
    if (this.scenarios.has('canalClosure')) this.blocked.add(CANAL_LANE_INDEX);
    const nowBlocked = this.blocked.has(CANAL_LANE_INDEX);
    if (nowBlocked !== wasBlocked) this.rerouteBlocked();
    // 통관 급증 → 통관 대상 비율 상향.
    this.customsRate = this.scenarios.has('customs') ? CUSTOMS_SURGE_RATE : CUSTOMS_RATE;
    // 수요 서지 → 목표 화물 수 상향.
    this.shipTarget = Math.min(
      MAX_SHIPMENTS,
      Math.round(this.shipTargetBase * (this.scenarios.has('surge') ? SURGE_FACTOR : 1)),
    );
  }

  /** 폐쇄된 레인을 남은 경로에 포함한 진행 중 화물을 현재 허브 기준 재경로. */
  private rerouteBlocked(): void {
    for (const s of this.shipments) {
      if (s.phase === 'DONE') continue;
      const remaining = s.edges.slice(s.legIndex);
      if (!remaining.some((e) => this.blocked.has(e.laneIndex))) continue;
      // 주행 중이면 현재 leg 도착 허브, 체류 중이면 그 허브에서 다시 경로를 짠다.
      const from = s.edges[s.legIndex]?.to ?? s.origin;
      const route = shortestRoute(this.net, from, s.dest, this.rule, this.blocked);
      if (route && route.edges.length > 0) {
        if (s.phase === 'RIDING') {
          // 현재 leg는 유지하고 그 뒤를 교체.
          s.edges = [s.edges[s.legIndex]!, ...route.edges];
          s.legIndex = 0;
        } else {
          s.edges = route.edges;
          s.legIndex = 0;
          s.legProgressKm = 0;
          const e = route.edges[0]!;
          s.legDistKm = Math.max(1, edgeDistKm(e));
          s.speed = cruiseKmh(e.mode) * (1 + (this.rng() * 2 - 1) * SPEED_JITTER);
          s.phase = 'RIDING';
          if (s.hasSlot && s.dwellHub) {
            const used = this.hubDwellUsed.get(s.dwellHub) ?? 0;
            this.hubDwellUsed.set(s.dwellHub, Math.max(0, used - 1));
            s.hasSlot = false;
            s.dwellHub = null;
          }
        }
      }
    }
  }

  /** 데모 타임라인에 따라 활성 시나리오를 결정론으로 토글. */
  private stepDemo(): void {
    const sec = this.tickCount / this.rateHz - this.demoStartSec;
    const loopSec = sec % DEMO_LOOP_SEC;
    let step = DEMO_SCRIPT[0]!;
    for (const s of DEMO_SCRIPT) if (loopSec >= s.at) step = s;
    this.demoPhase = step.label;
    const want = new Set(step.scenarios);
    // 데모가 지정한 집합으로 수렴.
    for (const k of [...this.scenarios]) if (!want.has(k)) this.inject(k, false);
    for (const k of want) if (!this.scenarios.has(k)) this.inject(k, true);
  }

  private speedFactor(mode: Mode): number {
    return this.scenarios.has('weather') && mode === 'SEA' ? WEATHER_SEA_FACTOR : 1;
  }

  setRunning(running: boolean): void {
    this.running = running;
  }

  setRateHz(rateHz: number): void {
    this.rateHz = Math.min(60, Math.max(1, rateHz));
  }

  // ---------------- 틱 / 메시지 ----------------

  tick(rateHz = this.rateHz): ServerMessage {
    this.rateHz = Math.min(60, Math.max(1, rateHz));
    const simDtHours = ((1 / this.rateHz) * REAL_SEC_TO_SIM_MIN) / 60;
    const dtMs = simDtHours * 3600 * 1000;
    this.simTime += dtMs;
    this.tickCount += 1;

    if (this.demoRunning) this.stepDemo();
    for (const c of this.conveyances) this.advanceConveyance(c, simDtHours);
    for (const s of this.shipments) this.advanceShipment(s, simDtHours, dtMs);
    this.topUpShipments();
    this.reconcileAlerts();

    const ship = this.diffShipments();
    const alert = this.diffAlerts();
    const auditAdd = this.drainAuditAdd();

    this.seq += 1;
    return {
      type: 'delta',
      seq: this.seq,
      tick: this.tickCount,
      upd: this.conveyances.map((c) => this.toConveyanceWire(c)),
      shipmentsAdd: ship.add.length ? ship.add : undefined,
      shipmentsUpd: ship.upd.length ? ship.upd : undefined,
      shipmentsDel: ship.del.length ? ship.del : undefined,
      alertsAdd: alert.add.length ? alert.add : undefined,
      alertsUpd: alert.upd.length ? alert.upd : undefined,
      alertsDel: alert.del.length ? alert.del : undefined,
      auditAdd: auditAdd.length ? auditAdd : undefined,
      meta: this.meta(),
    };
  }

  snapshot(): ServerMessage {
    this.seq += 1;
    this.reconcileAlerts();
    // 스냅샷은 전체를 보내고, 시그니처를 현재 상태로 재설정한다.
    const shipments = this.shipments.map((s) => this.toShipmentWire(s));
    this.shipSig.clear();
    for (const s of this.shipments) this.shipSig.set(s.id, this.signature(s));
    const alerts = [...this.alerts.values()].map((a) => this.toAlertWire(a));
    this.alertSig.clear();
    for (const a of this.alerts.values()) this.alertSig.set(a.spec.id, this.alertSignature(a));
    for (const a of this.auditLog) this.auditEmitted.add(a.id); // 스냅샷에 전체 포함 → 모두 emitted 처리
    return {
      type: 'snapshot',
      seq: this.seq,
      tick: this.tickCount,
      conveyances: this.conveyances.map((c) => this.toConveyanceWire(c)),
      shipments,
      alerts,
      audit: [...this.auditLog],
      meta: this.meta(),
    };
  }

  count(): number {
    return this.conveyances.length;
  }

  shipmentCount(): number {
    return this.shipments.length;
  }

  simClock(): number {
    return this.simTime;
  }

  // ---------------- 운송수단 내부 ----------------

  private advanceConveyance(c: CState, simDtHours: number): void {
    c.traveledKm += c.speed * this.speedFactor(c.mode) * simDtHours;
    let guard = 0;
    while (c.traveledKm >= c.distKm && guard < 8) {
      c.traveledKm -= c.distKm;
      this.hopNextEdge(c);
      guard += 1;
    }
  }

  private hopNextEdge(c: CState): void {
    const atHub = c.edge.to;
    const candidates = edgesFrom(this.net, atHub, c.mode);
    const forward = candidates.filter((e) => e.to !== c.edge.from);
    const pool = forward.length > 0 ? forward : candidates;
    const next = pool[Math.floor(this.rng() * pool.length)] ?? c.edge;
    this.assignConveyanceEdge(c, next);
  }

  private assignConveyanceEdge(c: CState, edge: NetEdge): void {
    const a = HUB_BY_ID[edge.from];
    const b = HUB_BY_ID[edge.to];
    if (!a || !b) throw new Error(`edge references unknown hub: ${edge.from}->${edge.to}`);
    c.edge = edge;
    c.fromLL = [a.lon, a.lat];
    c.toLL = [b.lon, b.lat];
    c.distKm = Math.max(1, haversineKm(c.fromLL, c.toLL));
  }

  private makeConveyance(id: string, mode: Mode, edge: NetEdge): CState {
    const jitter = 1 + (this.rng() * 2 - 1) * SPEED_JITTER;
    const state: CState = {
      id,
      mode,
      edge,
      fromLL: [0, 0],
      toLL: [0, 0],
      distKm: 1,
      traveledKm: 0,
      speed: cruiseKmh(mode) * jitter,
    };
    this.assignConveyanceEdge(state, edge);
    return state;
  }

  private randomEdgeOfMode(mode: Mode): NetEdge {
    for (const hub of this.net.hubs) {
      const edges = edgesFrom(this.net, hub, mode);
      if (edges.length > 0) {
        const pick = edges[Math.floor(this.rng() * edges.length)];
        if (pick) return pick;
      }
    }
    throw new Error(`no edge for mode: ${mode}`);
  }

  private toConveyanceWire(c: CState): ConveyanceWire {
    const t = c.distKm > 0 ? c.traveledKm / c.distKm : 0;
    const pos = interpolate(c.fromLL, c.toLL, t);
    return {
      id: c.id,
      mode: c.mode,
      lon: pos[0],
      lat: pos[1],
      heading: initialBearing(c.fromLL, c.toLL),
      speed: Math.round(c.speed),
      region: HUB_BY_ID[c.edge.to]?.region ?? 'GLOBAL',
      laneFrom: c.edge.from,
      laneTo: c.edge.to,
      progress: Number(t.toFixed(4)),
    };
  }

  // ---------------- 화물 내부 ----------------

  private seedShipments(target: number): void {
    this.shipTarget = Math.max(0, Math.min(MAX_SHIPMENTS, Math.floor(target)));
    while (this.shipments.length < this.shipTarget) {
      const s = this.makeShipment(true);
      if (s) this.shipments.push(s);
      else break;
    }
  }

  private topUpShipments(): void {
    // 터미널 TTL 만료분 제거 + 목표 수 유지(결정론 대체).
    for (let i = this.shipments.length - 1; i >= 0; i -= 1) {
      const s = this.shipments[i];
      if (s && s.phase === 'DONE' && s.ttlMs <= 0) {
        this.shipments.splice(i, 1);
      }
    }
    let guard = 0;
    while (this.shipments.length < this.shipTarget && guard < 64) {
      const s = this.makeShipment(false);
      if (s) this.shipments.push(s);
      guard += 1;
    }
  }

  private makeShipment(seed: boolean): SState | null {
    const hubs = this.net.hubs;
    let origin = '';
    let dest = '';
    let edges: NetEdge[] = [];
    for (let attempt = 0; attempt < 6; attempt += 1) {
      origin = hubs[Math.floor(this.rng() * hubs.length)] ?? hubs[0]!;
      dest = hubs[Math.floor(this.rng() * hubs.length)] ?? hubs[0]!;
      if (origin === dest) continue;
      const route = shortestRoute(this.net, origin, dest, this.rule, this.blocked);
      if (route && route.edges.length > 0) {
        edges = route.edges;
        break;
      }
    }
    if (edges.length === 0) return null;

    this.shipCounter += 1;
    const id = `SHP-${(1000 + this.shipCounter).toString()}`;
    const r = this.rng();
    const priority: 0 | 1 | 2 | 3 = r < EXPEDITE_RATE ? 3 : r < 0.4 ? 2 : r < 0.7 ? 1 : 0;
    const customs = this.rng() < this.customsRate;

    const travel = routeTravelMs(edges);
    const transfers = edges.length - 1;
    const base = travel + transfers * DWELL_MS + (customs ? CUSTOMS_EXTRA_MS : 0);
    // 일부는 촉박한 SLA로 at-risk를 만든다(결정론).
    const factor = this.rng() < 0.18 ? 0.82 : 1.12 + this.rng() * 0.55;
    const createdAt = this.simTime;

    const first = edges[0]!;
    const s: SState = {
      id,
      priority,
      origin,
      dest,
      edges,
      legIndex: 0,
      legProgressKm: 0,
      legDistKm: Math.max(1, edgeDistKm(first)),
      speed: cruiseKmh(first.mode) * (1 + (this.rng() * 2 - 1) * SPEED_JITTER),
      phase: 'RIDING',
      dwellRemainingMs: 0,
      dwellHub: null,
      hasSlot: false,
      customs,
      customsApplied: false,
      terminalStatus: null,
      ttlMs: 0,
      createdAt,
      slaDue: createdAt + base * factor,
    };

    if (seed) {
      // 초기 화물은 수명주기 전반에 분산(모두 주행 상태로 시작).
      const li = Math.floor(this.rng() * edges.length);
      s.legIndex = li;
      const e = edges[li]!;
      s.legDistKm = Math.max(1, edgeDistKm(e));
      s.legProgressKm = this.rng() * s.legDistKm;
      s.speed = cruiseKmh(e.mode) * (1 + (this.rng() * 2 - 1) * SPEED_JITTER);
    }
    return s;
  }

  private advanceShipment(s: SState, simDtHours: number, dtMs: number): void {
    if (s.phase === 'DONE') {
      s.ttlMs -= dtMs;
      return;
    }
    if (s.phase === 'RIDING') {
      const e = s.edges[s.legIndex];
      s.legProgressKm += s.speed * (e ? this.speedFactor(e.mode) : 1) * simDtHours;
      if (s.legProgressKm >= s.legDistKm) {
        this.arriveAtHub(s);
      }
      return;
    }
    if (s.phase === 'QUEUED') {
      this.tryAcquireSlot(s);
      return;
    }
    if (s.phase === 'DWELL') {
      s.dwellRemainingMs -= dtMs;
      if (s.dwellRemainingMs <= 0) this.departNextLeg(s);
    }
  }

  private arriveAtHub(s: SState): void {
    const arrivedEdge = s.edges[s.legIndex]!;
    const hub = arrivedEdge.to;

    // 마지막 leg → 배송 완료(또는 결정론 예외).
    if (s.legIndex >= s.edges.length - 1) {
      const isException = this.rng() < EXCEPTION_RATE;
      s.phase = 'DONE';
      s.ttlMs = DELIVERED_TTL_MS;
      if (isException) {
        s.terminalStatus = 'EXCEPTION';
        this.exceptions += 1;
      } else {
        s.terminalStatus = 'DELIVERED';
        this.delivered += 1;
        if (this.simTime <= s.slaDue) this.onTime += 1;
      }
      return;
    }

    // 환적: 허브 슬롯 확보 시도.
    s.dwellHub = hub;
    s.legProgressKm = s.legDistKm;
    this.tryAcquireSlot(s);
  }

  private tryAcquireSlot(s: SState): void {
    const hub = s.dwellHub;
    if (!hub) return;
    const cap = HUB_BY_ID[hub]?.dwellCap ?? 0;
    const used = this.hubDwellUsed.get(hub) ?? 0;
    if (used < cap) {
      this.hubDwellUsed.set(hub, used + 1);
      s.hasSlot = true;
      s.phase = 'DWELL';
      const applyCustoms = s.customs && !s.customsApplied;
      s.customsApplied = s.customsApplied || applyCustoms;
      // 항만 혼잡 시 PORT 체류 연장.
      const portFactor =
        this.scenarios.has('congestion') && HUB_BY_ID[hub]?.kind === 'PORT' ? CONGESTION_DWELL_FACTOR : 1;
      s.dwellRemainingMs = DWELL_MS * portFactor + (applyCustoms ? CUSTOMS_EXTRA_MS : 0);
    } else {
      s.phase = 'QUEUED'; // 슬롯 없음 — 대기
    }
  }

  private departNextLeg(s: SState): void {
    if (s.hasSlot && s.dwellHub) {
      const used = this.hubDwellUsed.get(s.dwellHub) ?? 0;
      this.hubDwellUsed.set(s.dwellHub, Math.max(0, used - 1));
    }
    s.hasSlot = false;
    s.dwellHub = null;
    s.legIndex += 1;
    const e = s.edges[s.legIndex]!;
    s.legDistKm = Math.max(1, edgeDistKm(e));
    s.legProgressKm = 0;
    s.speed = cruiseKmh(e.mode) * (1 + (this.rng() * 2 - 1) * SPEED_JITTER);
    s.phase = 'RIDING';
  }

  private statusOf(s: SState): ShipmentStatus {
    if (s.terminalStatus) return s.terminalStatus;
    if (s.phase === 'DWELL' || s.phase === 'QUEUED') {
      return s.customsApplied && s.phase === 'DWELL' && s.dwellRemainingMs > DWELL_MS
        ? 'CUSTOMS_HOLD'
        : 'AT_HUB';
    }
    return this.isAtRisk(s) ? 'DELAYED' : 'IN_TRANSIT';
  }

  private etaOf(s: SState): number {
    if (s.terminalStatus) return this.simTime;
    const progress = s.legDistKm > 0 ? s.legProgressKm / s.legDistKm : 0;
    return this.simTime + remainingEtaMs(s.edges, s.legIndex, progress, { customsHold: s.customs && !s.customsApplied });
  }

  private isAtRisk(s: SState): boolean {
    if (s.terminalStatus) return false;
    return this.etaOf(s) > s.slaDue;
  }

  private toShipmentWire(s: SState): ShipmentWire {
    const e = s.edges[Math.min(s.legIndex, s.edges.length - 1)]!;
    const overall = (s.legIndex + (s.legDistKm > 0 ? Math.min(1, s.legProgressKm / s.legDistKm) : 0)) / s.edges.length;
    return {
      id: s.id,
      priority: s.priority,
      status: this.statusOf(s),
      legIndex: s.legIndex,
      legCount: s.edges.length,
      originHub: s.origin,
      destHub: s.dest,
      atHub: s.phase === 'DWELL' || s.phase === 'QUEUED' ? s.dwellHub : null,
      mode: e.mode,
      etaFinal: Math.round(this.etaOf(s)),
      slaDue: Math.round(s.slaDue),
      atRisk: this.isAtRisk(s),
      progress: Number(Math.min(1, overall).toFixed(4)),
      legs: s.edges.map((edge, i) => ({
        mode: edge.mode,
        from: edge.from,
        to: edge.to,
        done: i < s.legIndex || !!s.terminalStatus,
        active: i === s.legIndex && !s.terminalStatus,
      })),
    };
  }

  /** 상태/leg/위험/체류 허브/우선순위/경로가 바뀔 때만 델타로 보낸다(저빈도). */
  private signature(s: SState): string {
    const route = s.edges.map((e) => e.laneIndex).join('.');
    return `${this.statusOf(s)}|${s.legIndex}|${this.isAtRisk(s) ? 1 : 0}|${s.dwellHub ?? ''}|${s.priority}|${route}`;
  }

  private diffShipments(): { add: ShipmentWire[]; upd: ShipmentWire[]; del: string[] } {
    const add: ShipmentWire[] = [];
    const upd: ShipmentWire[] = [];
    const del: string[] = [];
    const alive = new Set<string>();
    for (const s of this.shipments) {
      alive.add(s.id);
      const sig = this.signature(s);
      const prev = this.shipSig.get(s.id);
      if (prev === undefined) {
        add.push(this.toShipmentWire(s));
        this.shipSig.set(s.id, sig);
      } else if (prev !== sig) {
        upd.push(this.toShipmentWire(s));
        this.shipSig.set(s.id, sig);
      }
    }
    for (const id of this.shipSig.keys()) {
      if (!alive.has(id)) {
        del.push(id);
        this.shipSig.delete(id);
      }
    }
    return { add, upd, del };
  }

  // ---------------- 알람 내부(단계 5) ----------------

  /** 현재 혼잡한 허브(슬롯 포화 또는 대기열) 목록. */
  private congestedHubs(): { id: string; name: string; used: number; cap: number; queued: number }[] {
    const queued = new Map<string, number>();
    for (const s of this.shipments) {
      if (s.phase === 'QUEUED' && s.dwellHub) queued.set(s.dwellHub, (queued.get(s.dwellHub) ?? 0) + 1);
    }
    const out: { id: string; name: string; used: number; cap: number; queued: number }[] = [];
    for (const h of HUBS) {
      const used = this.hubDwellUsed.get(h.id) ?? 0;
      const q = queued.get(h.id) ?? 0;
      if (q > 0 || used >= h.dwellCap) out.push({ id: h.id, name: h.name, used, cap: h.dwellCap, queued: q });
    }
    return out;
  }

  /** 현재 떠 있어야 할 알람을 도출해 상태를 reconcile(ack 보존·자동 해제·최초 ts 유지). */
  private reconcileAlerts(): void {
    const stats = this.shipmentStats();
    const specs = deriveAlerts({
      atRisk: stats.delayed,
      customsHold: stats.customsHold,
      exceptions: this.exceptions,
      prevExceptions: this.prevExceptions,
      congestedHubs: this.congestedHubs(),
      scenarios: [...this.scenarios],
    });
    const present = new Set(specs.map((s) => s.id));
    for (const spec of specs) {
      const existing = this.alerts.get(spec.id);
      if (!existing) {
        this.alerts.set(spec.id, { spec, status: 'OPEN', ts: this.simTime });
      } else {
        existing.spec = spec; // 심각도/문구 갱신
        if (existing.status === 'RESOLVED') existing.status = 'OPEN'; // 재발 → 재개
      }
    }
    for (const [id, a] of this.alerts) {
      if (!present.has(id)) {
        if (a.status === 'RESOLVED') this.alerts.delete(id); // 이미 해제된 건 프루닝
        else a.status = 'RESOLVED';
      }
    }
    this.prevExceptions = this.exceptions;
  }

  private alertSignature(a: AlertRuntime): string {
    return `${a.status}|${a.spec.severity}|${a.spec.detail}`;
  }

  private toAlertWire(a: AlertRuntime): AlertWire {
    return {
      id: a.spec.id,
      kind: a.spec.kind,
      severity: a.spec.severity,
      status: a.status,
      title: a.spec.title,
      detail: a.spec.detail,
      focus: a.spec.focus,
      ts: Math.round(a.ts),
    };
  }

  private diffAlerts(): { add: AlertWire[]; upd: AlertWire[]; del: string[] } {
    const add: AlertWire[] = [];
    const upd: AlertWire[] = [];
    const del: string[] = [];
    const alive = new Set<string>();
    for (const a of this.alerts.values()) {
      alive.add(a.spec.id);
      const sig = this.alertSignature(a);
      const prev = this.alertSig.get(a.spec.id);
      if (prev === undefined) {
        add.push(this.toAlertWire(a));
        this.alertSig.set(a.spec.id, sig);
      } else if (prev !== sig) {
        upd.push(this.toAlertWire(a));
        this.alertSig.set(a.spec.id, sig);
      }
    }
    for (const id of this.alertSig.keys()) {
      if (!alive.has(id)) {
        del.push(id);
        this.alertSig.delete(id);
      }
    }
    return { add, upd, del };
  }

  private meta(): SimMeta {
    return {
      count: this.conveyances.length,
      running: this.running,
      rateHz: this.rateHz,
      simTime: this.simTime,
      rule: this.rule,
      shipments: this.shipmentStats(),
      scenarios: [...this.scenarios],
      demo: this.demoRunning
        ? { running: true, phase: this.demoPhase, elapsedSec: Math.round((this.tickCount / this.rateHz - this.demoStartSec) % DEMO_LOOP_SEC) }
        : null,
    };
  }

  private shipmentStats(): ShipmentStats {
    let inTransit = 0;
    let atHub = 0;
    let delayed = 0;
    let customsHold = 0;
    let active = 0;
    for (const s of this.shipments) {
      if (s.terminalStatus) continue;
      active += 1;
      const st = this.statusOf(s);
      if (st === 'IN_TRANSIT' || st === 'DELAYED') inTransit += 1;
      if (st === 'AT_HUB' || st === 'CUSTOMS_HOLD') atHub += 1;
      if (st === 'CUSTOMS_HOLD') customsHold += 1;
      if (this.isAtRisk(s)) delayed += 1;
    }
    const onTimePct = this.delivered > 0 ? Math.round((this.onTime / this.delivered) * 100) : 100;
    return {
      active,
      inTransit,
      atHub,
      delayed,
      customsHold,
      delivered: this.delivered,
      exceptions: this.exceptions,
      onTimePct,
    };
  }
}
