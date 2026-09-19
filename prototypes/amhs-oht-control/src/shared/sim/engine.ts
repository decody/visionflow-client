import {
  buildRailGraph,
  nodeKeyOf,
  type XY,
} from '@/entities/fab/rail-graph';
import type {
  Alarm,
  Carrier,
  Coord,
  DeltaMessage,
  DispatchRule,
  OperationsState,
  SnapshotMessage,
  TransportJob,
  VehicleDelta,
  VehicleState,
} from '@/entities/oht/types';

/**
 * 델타·스냅샷의 좌표 정밀도를 낮춰 전송 페이로드를 줄인다.
 *
 * 저장 물리 상태(v.state)는 full precision을 유지하고, 직렬화되는 와이어 값에서만
 * 양자화한다. 위치의 대부분 바이트는 `38.26508793633431` 같은 17자리 부동소수이며,
 * 렌더·표시에는 x/y 1cm(소수 2자리), heading 0.1도, speed 0.01m/s면 충분하다.
 * 스냅샷과 델타가 같은 상태에서 동일하게 양자화하므로 재현(reproduce) 불변식이 유지된다.
 */
export function quantizeWireFields<T extends Partial<VehicleState>>(
  o: T,
): T {
  if (typeof o.x === 'number') o.x = Math.round(o.x * 100) / 100;
  if (typeof o.y === 'number') o.y = Math.round(o.y * 100) / 100;
  if (typeof o.heading === 'number')
    o.heading = Math.round(o.heading * 10) / 10;
  if (typeof o.speed === 'number')
    o.speed = Math.round(o.speed * 100) / 100;
  if (o.route)
    o.route = o.route.map(
      ([x, y]) =>
        [Math.round(x * 100) / 100, Math.round(y * 100) / 100] as Coord,
    );
  return o;
}

interface SimVehicle {
  state: VehicleState;
  node: string;
  route: number[];
  leg: number;
  distance: number;
  dwell: number;
  cruise: number;
  job: TransportJob | null;
  delayedFired: boolean;
  trafficWait: number;
  blockedFired: boolean;
  waitingFor: string | null;
}

export interface JunctionCandidate {
  id: string;
  priority: number;
  waitSec: number;
}

export function compareJunctionPriority(
  a: JunctionCandidate,
  b: JunctionCandidate,
): number {
  return (
    b.priority - a.priority ||
    b.waitSec - a.waitSec ||
    a.id.localeCompare(b.id)
  );
}

/** Hot lot은 항상 우선하되 일반 lot은 15초마다 aging 점수를 얻는다. */
export function dispatchPriorityScore(
  priority: number,
  waitSec: number,
): number {
  if (priority >= 3) return 10_000 + Math.max(0, waitSec);
  return priority * 100 + Math.min(99, Math.floor(Math.max(0, waitSec) / 15));
}

export function detectWaitCycles(
  waitsFor: Map<string, string>,
): string[][] {
  const state = new Map<string, 0 | 1 | 2>();
  const stack: string[] = [];
  const stackIndex = new Map<string, number>();
  const cycles: string[][] = [];
  const visit = (id: string) => {
    if ((state.get(id) ?? 0) !== 0) return;
    state.set(id, 1);
    stackIndex.set(id, stack.length);
    stack.push(id);
    const next = waitsFor.get(id);
    if (next) {
      if ((state.get(next) ?? 0) === 0) visit(next);
      else if (state.get(next) === 1) {
        const start = stackIndex.get(next);
        if (start !== undefined) cycles.push(stack.slice(start));
      }
    }
    stack.pop();
    stackIndex.delete(id);
    state.set(id, 2);
  };
  for (const id of waitsFor.keys()) visit(id);
  return cycles;
}

/** Synthetic transport model. Simulation time advances only on ticks, including deadlines. */
export class SimEngine {
  private static readonly DEFAULT_SEED = 20260905;
  private readonly graph = buildRailGraph();
  private vehicles: SimVehicle[] = [];
  private carriers: Carrier[] = [];
  private jobs: TransportJob[] = [];
  private rule: DispatchRule = 'priority';
  private seq = 0;
  private jobSeq = 0;
  private tickCounter = 0;
  private now = 0;
  private completed = 0;
  private totalTransportMs = 0;
  private blockedPortId: string | null = null;
  private incidentStartedTs = 0;
  private saturatedPortId: string | null = null;
  private saturationStartedTs = 0;
  private saturationCarrierIds = new Set<string>();
  // 운영자가 폐쇄한 rail 세그먼트(경로 계산에서 전역 제외)
  private closedSegments = new Set<number>();
  private closureStartedTs = 0;
  private pendingAlarms: Alarm[] = [];
  private activeDeadlocks = new Set<string>();
  private resolvedDeadlocks = 0;
  private randomState: number;
  private readonly pathCache = new Map<
    string,
    { route: number[]; length: number }
  >();

  constructor(
    seed = 20260905,
    private readonly clock: () => number = Date.now,
  ) {
    this.randomState = seed >>> 0;
  }
  private random(): number {
    this.randomState =
      (Math.imul(this.randomState, 1664525) + 1013904223) >>> 0;
    return this.randomState / 4294967296;
  }
  vehicleCount(): number {
    return this.vehicles.length;
  }
  ensureSpawned(count: number): void {
    if (!this.vehicles.length) this.spawn(count);
  }
  setDispatch(rule: DispatchRule): void {
    this.rule = rule;
  }
  promoteHotLot(jobId?: string): string | null {
    const candidates = this.jobs
      .filter((job) => job.phase !== 'DONE' && job.priority < 3)
      .sort(
        (a, b) =>
          a.createdTs - b.createdTs ||
          Number(a.id.slice(2)) - Number(b.id.slice(2)),
      );
    const target = jobId
      ? candidates.find((job) => job.id === jobId)
      : candidates[0];
    if (!target) return null;
    target.priority = 3;
    target.deadlineTs = Math.min(target.deadlineTs, this.now + 90_000);
    const vehicle = this.vehicles.find(
      (item) => item.state.id === target.vehicleId,
    );
    if (vehicle) {
      vehicle.state.priority = 3;
      vehicle.state.deadlineTs = target.deadlineTs;
    }
    this.pendingAlarms.push({
      id: `AL-HOT-${target.id}-${Math.round(this.now)}`,
      kind: 'HOT_LOT',
      severity: 'info',
      ts: this.now,
      vehicleId: target.vehicleId ?? undefined,
      jobId: target.id,
      message: `${target.id} · ${target.lotId} 긴급 반송 승격`,
    });
    // 공차가 있다면 승격된 queued Job이 다음 dispatch에서 즉시 우선된다.
    this.dispatch();
    return target.id;
  }
  setPortIncident(enabled: boolean): void {
    if (!enabled) {
      const clearedPort = this.blockedPortId;
      this.blockedPortId = null;
      for (const vehicle of this.vehicles) {
        if (
          vehicle.job?.phase === 'WAITING_PORT' &&
          vehicle.job.to === clearedPort
        ) {
          this.setPhase(vehicle, 'UNLOADING');
          vehicle.dwell = 2;
        }
      }
      return;
    }
    if (this.blockedPortId) return;
    const target = this.jobs.find(
      (job) =>
        job.vehicleId &&
        job.phase !== 'DONE' &&
        this.graph.ports.find((port) => port.id === job.to)?.kind === 'tool',
    );
    if (!target) return;
    this.blockedPortId = target.to;
    this.incidentStartedTs = this.now;
    target.deadlineTs = Math.min(target.deadlineTs, this.now + 12_000);
    const vehicle = this.vehicles.find(
      (item) => item.state.id === target.vehicleId,
    );
    if (vehicle) vehicle.state.deadlineTs = target.deadlineTs;
    this.pendingAlarms.push({
      id: 'AL-PORT-' + target.to + '-' + Math.round(this.now),
      kind: 'EQP_DOWN',
      severity: 'critical',
      ts: this.now,
      vehicleId: target.vehicleId ?? undefined,
      jobId: target.id,
      portId: target.to,
      equipmentId: this.graph.ports.find((port) => port.id === target.to)
        ?.equipmentId,
      message: target.to + ' 포트 사용 불가 · 하역 대기 예상',
    });
  }
  resetScenario(count: number, seed = SimEngine.DEFAULT_SEED): void {
    this.randomState = seed >>> 0;
    this.jobSeq = 0;
    this.spawn(count);
  }

  /** Stocker/buffer를 임시 재고로 채워 도착 OHT의 하역 대기를 재현한다. */
  setStorageSaturation(enabled: boolean): void {
    if (!enabled) {
      if (!this.saturatedPortId) return;
      this.carriers = this.carriers.filter(
        (carrier) => !this.saturationCarrierIds.has(carrier.id),
      );
      this.saturationCarrierIds.clear();
      this.saturatedPortId = null;
      this.saturationStartedTs = 0;
      return;
    }
    if (this.saturatedPortId) return;
    const storagePorts = this.graph.ports.filter(
      (port) => port.kind === 'buffer' || port.kind === 'stocker',
    );
    const active = this.jobs.filter(
      (job) => job.phase !== 'DONE' && job.vehicleId,
    );
    const target =
      storagePorts.find((port) =>
        active.some((job) => job.to === port.id),
      ) ?? storagePorts[0];
    if (!target) return;
    this.saturatedPortId = target.id;
    this.saturationStartedTs = this.now;
    const occupied = this.carriers.filter(
      (carrier) => carrier.portId === target.id,
    ).length;
    for (let i = occupied; i < target.capacity; i++) {
      const id = `SAT-${target.id}-${i + 1}`;
      this.saturationCarrierIds.add(id);
      this.carriers.push({
        id,
        lotId: `SATURATION-${i + 1}`,
        portId: target.id,
        vehicleId: null,
      });
    }
    this.pendingAlarms.push({
      id: `AL-SATURATION-${target.id}-${Math.round(this.now)}`,
      kind: 'JAM',
      severity: 'critical',
      ts: this.now,
      portId: target.id,
      equipmentId: target.equipmentId,
      message: `${target.id} ${target.kind === 'stocker' ? 'stocker' : 'buffer'} 포화 · 하역 대기 예상`,
    });
  }

  /**
   * 운영자 rail 구간 폐쇄/해제.
   * 폐쇄 시 대체 경로가 존재하는(gridlock을 유발하지 않는) 혼잡 구간을 하나 골라
   * 경로 계산에서 전역 제외한다. 통과 예정 차량은 접근 시 자동 우회하고, 우회가
   * 불가능하면 폐쇄 구간 앞에서 대기한다.
   */
  setRailClosure(enabled: boolean): void {
    if (!enabled) {
      if (!this.closedSegments.size) return;
      this.closedSegments.clear();
      this.closureStartedTs = 0;
      this.pathCache.clear();
      return;
    }
    if (this.closedSegments.size) return;
    const target = this.pickClosureSegment();
    if (target === undefined) return;
    this.closedSegments.add(target);
    this.closureStartedTs = this.now;
    this.pathCache.clear();
    this.pendingAlarms.push({
      id: 'AL-RAILCLOSE-' + target + '-' + Math.round(this.now),
      kind: 'JAM',
      severity: 'critical',
      ts: this.now,
      segmentId: this.graph.segments[target]!.id,
      message:
        this.graph.segments[target]!.id + ' 레일 폐쇄 · 우회 경로 적용',
    });
  }

  /** 운행 중인 Job 차량이 가장 많이 통과하며 대체 경로가 있는 구간을 고른다. */
  private pickClosureSegment(): number | undefined {
    const usage = new Map<number, number>();
    for (const v of this.vehicles) {
      if (!v.job) continue;
      for (let i = v.leg; i < v.route.length; i++)
        usage.set(v.route[i]!, (usage.get(v.route[i]!) ?? 0) + 1);
    }
    const hasAlternate = (s: number): boolean => {
      const seg = this.graph.segments[s]!;
      const alt = this.path(
        nodeKeyOf(seg.a),
        nodeKeyOf(seg.b),
        new Set([s]),
      );
      return Number.isFinite(alt.length) && alt.route.length > 0;
    };
    const byUsage = [...usage.entries()]
      .sort((a, b) => b[1] - a[1])
      .map((e) => e[0]);
    for (const s of byUsage) if (hasAlternate(s)) return s;
    // fallback: 대체 경로가 있는 임의 구간
    for (let s = 0; s < this.graph.segments.length; s++)
      if (hasAlternate(s)) return s;
    return undefined;
  }

  /** Dijkstra uses physical rail distance and respects directed tracks. */
  private path(
    from: string,
    to: string,
    excluded = new Set<number>(),
  ): { route: number[]; length: number } {
    // 폐쇄 구간은 항상 전역 제외. 캐시는 제외 집합이 완전히 빌 때만 사용한다.
    const cacheable = excluded.size === 0 && this.closedSegments.size === 0;
    const key = from + '>' + to;
    const cached = cacheable ? this.pathCache.get(key) : undefined;
    if (cached) return cached;
    const blocked =
      this.closedSegments.size === 0
        ? excluded
        : new Set<number>([...excluded, ...this.closedSegments]);
    const distances = new Map<string, number>([[from, 0]]);
    const previous = new Map<string, { node: string; seg: number }>();
    const pending = new Set<string>([from]);
    while (pending.size) {
      let current = '';
      let shortest = Infinity;
      for (const node of pending) {
        const d = distances.get(node)!;
        if (d < shortest) {
          current = node;
          shortest = d;
        }
      }
      pending.delete(current);
      if (current === to) break;
      for (const si of this.graph.adjacency.get(current) ?? []) {
        if (blocked.has(si)) continue;
        const seg = this.graph.segments[si]!;
        const next = nodeKeyOf(seg.b);
        const d = shortest + seg.length;
        if (d < (distances.get(next) ?? Infinity)) {
          distances.set(next, d);
          previous.set(next, { node: current, seg: si });
          pending.add(next);
        }
      }
    }
    const route: number[] = [];
    let cursor = to;
    while (cursor !== from && previous.has(cursor)) {
      const p = previous.get(cursor)!;
      route.unshift(p.seg);
      cursor = p.node;
    }
    const result = { route, length: distances.get(to) ?? Infinity };
    if (cacheable) this.pathCache.set(key, result);
    return result;
  }
  private portNode(id: string): string {
    return nodeKeyOf(this.graph.ports.find((p) => p.id === id)!.at);
  }

  spawn(count: number): void {
    this.now = this.clock();
    this.jobSeq = 0;
    this.jobs = [];
    this.carriers = [];
    this.vehicles = [];
    this.completed = 0;
    this.totalTransportMs = 0;
    this.tickCounter = 0;
    this.blockedPortId = null;
    this.saturatedPortId = null;
    this.saturationStartedTs = 0;
    this.saturationCarrierIds.clear();
    this.closedSegments.clear();
    this.closureStartedTs = 0;
    this.pathCache.clear();
    this.pendingAlarms = [];
    this.activeDeadlocks.clear();
    this.resolvedDeadlocks = 0;
    for (const port of this.graph.ports) {
      const stock =
        port.kind === 'stocker' ? 12 : this.random() < 0.5 ? 1 : 0;
      for (let i = 0; i < stock; i++) {
        const n = this.carriers.length + 1;
        this.carriers.push({
          id: 'FOUP-' + String(n).padStart(4, '0'),
          lotId: 'LOT-' + (1000 + n),
          portId: port.id,
          vehicleId: null,
        });
      }
    }
    for (
      let i = 0;
      i < Math.min(5000, Math.max(1, Math.floor(count)));
      i++
    ) {
      const seg =
        this.graph.segments[i % this.graph.segments.length]!;
      this.vehicles.push({
        state: {
          id: 'OHT-' + String(i + 1).padStart(4, '0'),
          x: seg.a[0],
          y: seg.a[1],
          heading: 0,
          status: 'IDLE',
          jobId: null,
          speed: 0,
          phase: 'IDLE',
          loaded: false,
          carrierId: null,
          lotId: null,
          priority: 0,
          route: [],
          blockedBy: null,
          rerouteCount: 0,
        },
        node: nodeKeyOf(seg.a),
        route: [],
        leg: 0,
        distance: 0,
        dwell: 0,
        cruise: 1.5 + this.random() * 1.8,
        job: null,
        delayedFired: false,
        trafficWait: 0,
        blockedFired: false,
        waitingFor: null,
      });
    }
    this.generateJobs();
    this.dispatch();
  }

  private generateJobs(): void {
    const active = this.jobs.filter((j) => j.phase !== 'DONE');
    const busy = new Set(active.map((j) => j.carrierId));
    const occupied = new Map<string, number>();
    for (const c of this.carriers)
      if (c.portId)
        occupied.set(c.portId, (occupied.get(c.portId) ?? 0) + 1);
    for (const job of active)
      occupied.set(job.to, (occupied.get(job.to) ?? 0) + 1);
    let available = 20 - active.length;
    for (const carrier of this.carriers) {
      if (available <= 0) break;
      if (
        !carrier.portId ||
        busy.has(carrier.id) ||
        this.saturationCarrierIds.has(carrier.id)
      )
        continue;
      const destinations = this.graph.ports.filter(
        (p) =>
          p.id !== carrier.portId &&
          p.id !== this.saturatedPortId &&
          (occupied.get(p.id) ?? 0) < p.capacity,
      );
      if (!destinations.length) continue;
      const destination =
        destinations[
          Math.floor(this.random() * destinations.length)
        ]!;
      occupied.set(
        destination.id,
        (occupied.get(destination.id) ?? 0) + 1,
      );
      this.jobs.push({
        id: 'J-' + ++this.jobSeq,
        carrierId: carrier.id,
        lotId: carrier.lotId,
        priority: this.random() < 0.2 ? 3 : 1,
        from: carrier.portId,
        to: destination.id,
        phase: 'QUEUED',
        vehicleId: null,
        createdTs: this.now,
        deadlineTs: this.now + 180000,
      });
      available--;
    }
  }

  private dispatch(): void {
    const waiting = this.jobs.filter((j) => j.phase === 'QUEUED');
    if (!waiting.length) return;
    const idle = this.vehicles.filter(
      (v) => !v.job && v.state.phase === 'IDLE',
    );
    waiting.sort(
      (a, b) =>
        (this.rule === 'priority'
          ? dispatchPriorityScore(
              b.priority,
              (this.now - b.createdTs) / 1000,
            ) -
            dispatchPriorityScore(
              a.priority,
              (this.now - a.createdTs) / 1000,
            )
          : 0) ||
        a.createdTs - b.createdTs ||
        Number(a.id.slice(2)) - Number(b.id.slice(2)),
    );
    while (waiting.length && idle.length) {
      const assigned = this.jobs.filter(
        (item) => item.phase !== 'DONE' && item.vehicleId,
      );
      const maxWip = Math.min(
        12,
        Math.max(8, Math.floor(this.vehicles.length / 2)),
      );
      if (assigned.length >= maxWip) break;
      const inboundToPort = new Map<string, number>();
      const inboundToBay = new Map<string, number>();
      const pressure = new Map<number, number>();
      for (const item of assigned) {
        inboundToPort.set(item.to, (inboundToPort.get(item.to) ?? 0) + 1);
        const port = this.graph.ports.find(
          (candidate) => candidate.id === item.to,
        );
        if (port?.bayId)
          inboundToBay.set(
            port.bayId,
            (inboundToBay.get(port.bayId) ?? 0) + 1,
          );
        const assignedVehicle = this.vehicles.find(
          (candidate) => candidate.job === item,
        );
        for (const segment of
          assignedVehicle?.route.slice(assignedVehicle.leg) ?? [])
          pressure.set(segment, (pressure.get(segment) ?? 0) + 1);
      }
      const routeMemo = new Map<string, number[]>();
      const route = (from: string, to: string): number[] => {
        const key = `${from}>${to}`;
        const cached = routeMemo.get(key);
        if (cached) return cached;
        const value = this.path(from, to).route;
        routeMemo.set(key, value);
        return value;
      };
      let ji = 0,
        vi = 0,
        best = Infinity;
      let found = false;
      for (let j = 0; j < waiting.length; j++) {
        const source = this.portNode(waiting[j]!.from);
        for (let v = 0; v < idle.length; v++) {
          if (
            !this.canAdmit(waiting[j]!, idle[v]!, {
              inboundToPort,
              inboundToBay,
              pressure,
              route,
            })
          )
            continue;
          const distance = this.path(idle[v]!.node, source).length;
          if (
            Number.isFinite(distance) &&
            (!found || distance < best)
          ) {
            best = distance;
            ji = j;
            vi = v;
            found = true;
          }
        }
        // priority/FIFO는 정렬상 첫 번째 입장 가능한 Job을 유지한다.
        if (found && this.rule !== 'nearest') break;
      }
      if (!found || !Number.isFinite(best)) break;
      const job = waiting.splice(ji, 1)[0]!;
      const vehicle = idle.splice(vi, 1)[0]!;
      vehicle.job = job;
      vehicle.delayedFired = false;
      vehicle.trafficWait = 0;
      vehicle.blockedFired = false;
      vehicle.waitingFor = null;
      job.vehicleId = vehicle.state.id;
      Object.assign(vehicle.state, {
        jobId: job.id,
        carrierId: job.carrierId,
        lotId: job.lotId,
        priority: job.priority,
        from: job.from,
        to: job.to,
        deadlineTs: job.deadlineTs,
        loaded: false,
      });
      this.setRoute(vehicle, this.portNode(job.from));
      this.setPhase(vehicle, 'TO_PICKUP');
    }
  }

  /**
   * 목적지/Bay/공유 경로의 처리 용량을 넘는 신규 운행을 queued 상태로 유지한다.
   * 이미 배정된 Job에는 영향을 주지 않아 운행 중 정책 변경도 안전하다.
   */
  private canAdmit(
    job: TransportJob,
    vehicle: SimVehicle,
    context: {
      inboundToPort: Map<string, number>;
      inboundToBay: Map<string, number>;
      pressure: Map<number, number>;
      route: (from: string, to: string) => number[];
    },
  ): boolean {
    const destination = this.graph.ports.find((port) => port.id === job.to)!;
    const portIngressLimit = Math.min(4, destination.capacity + 1);
    if ((context.inboundToPort.get(job.to) ?? 0) >= portIngressLimit)
      return false;

    if (destination.bayId) {
      if ((context.inboundToBay.get(destination.bayId) ?? 0) >= 4)
        return false;
    }
    const candidateRoute = [
      ...context.route(vehicle.node, this.portNode(job.from)),
      ...context.route(this.portNode(job.from), this.portNode(job.to)),
    ];
    return !candidateRoute.some(
      (segment) => (context.pressure.get(segment) ?? 0) >= 4,
    );
  }
  private setRoute(v: SimVehicle, to: string): void {
    this.setRouteSegments(v, this.path(v.node, to).route);
  }
  private setRouteSegments(v: SimVehicle, route: number[]): void {
    v.route = route;
    v.leg = 0;
    v.distance = 0;
    const points: Coord[] = [];
    if (v.route.length) {
      points.push([...this.graph.segments[v.route[0]!]!.a] as XY);
      for (const index of v.route)
        points.push([...this.graph.segments[index]!.b] as XY);
    }
    v.state.route = points;
  }
  private tryReroute(v: SimVehicle): boolean {
    const current = v.route[v.leg];
    const blocked = v.route[v.leg + 1];
    if (
      current === undefined ||
      blocked === undefined ||
      !v.job
    )
      return false;
    const junction = this.graph.segments[current]!.b;
    const alternative = this.path(
      nodeKeyOf(junction),
      this.portNode(v.job.to),
      new Set([blocked]),
    );
    if (!Number.isFinite(alternative.length) || !alternative.route.length)
      return false;
    v.node = nodeKeyOf(junction);
    v.state.x = junction[0];
    v.state.y = junction[1];
    v.state.rerouteCount = (v.state.rerouteCount ?? 0) + 1;
    this.setRouteSegments(v, alternative.route);
    return true;
  }
  private setPhase(
    v: SimVehicle,
    phase: TransportJob['phase'],
  ): void {
    v.job!.phase = phase;
    v.state.phase = phase;
    v.state.status =
      phase === 'LOADING' || phase === 'UNLOADING' ? phase : 'MOVING';
    v.state.speed =
      phase === 'LOADING' || phase === 'UNLOADING' ? 0 : v.cruise;
  }
  private advance(v: SimVehicle, dt: number): boolean {
    let travel = v.cruise * dt;
    while (v.leg < v.route.length) {
      const seg = this.graph.segments[v.route[v.leg]!]!;
      const remaining = seg.length - v.distance;
      v.state.heading =
        (Math.atan2(seg.b[1] - seg.a[1], seg.b[0] - seg.a[0]) * 180) /
        Math.PI;
      if (travel < remaining) {
        v.distance += travel;
        const t = v.distance / seg.length;
        v.state.x = seg.a[0] + (seg.b[0] - seg.a[0]) * t;
        v.state.y = seg.a[1] + (seg.b[1] - seg.a[1]) * t;
        return false;
      }
      travel -= remaining;
      v.state.x = seg.b[0];
      v.state.y = seg.b[1];
      v.node = nodeKeyOf(seg.b);
      v.leg++;
      v.distance = 0;
    }
    return true;
  }
  private operations(): OperationsState {
    const active = this.jobs.filter((j) => j.phase !== 'DONE');
    return {
      rule: this.rule,
      // UI 표시용 필드만 방출한다(내부 계산용 타임스탬프 제외 → 페이로드 축소).
      jobs: this.jobs.map((j) => ({
        id: j.id,
        carrierId: j.carrierId,
        lotId: j.lotId,
        priority: j.priority,
        from: j.from,
        to: j.to,
        phase: j.phase,
        vehicleId: j.vehicleId,
      })),
      carriers: this.carriers.map((c) => ({ ...c })),
      ports: this.graph.ports.map((p) => ({
        id: p.id,
        capacity: p.capacity,
        occupied:
          p.id === this.saturatedPortId
            ? p.capacity
            : this.carriers.filter((c) => c.portId === p.id).length,
        reserved: active.filter((j) => j.to === p.id).length,
        status: p.id === this.blockedPortId ? 'DOWN' : 'AVAILABLE',
      })),
      completed: this.completed,
      averageTransportSec: this.completed
        ? this.totalTransportMs / this.completed / 1000
        : 0,
      incident: this.blockedPortId
        ? {
            active: true,
            portId: this.blockedPortId,
            equipmentId: this.graph.ports.find(
              (port) => port.id === this.blockedPortId,
            )?.equipmentId,
            startedTs: this.incidentStartedTs,
            affectedJobIds: active
              .filter((job) => job.to === this.blockedPortId)
              .map((job) => job.id),
            queueVehicleIds: this.vehicles
              .filter(
                (vehicle) =>
                  vehicle.state.status === 'BLOCKED' ||
                  vehicle.state.phase === 'WAITING_PORT',
              )
              .map((vehicle) => vehicle.state.id),
          }
        : undefined,
      saturation: this.saturatedPortId
        ? {
            active: true,
            portId: this.saturatedPortId,
            equipmentId: this.graph.ports.find(
              (port) => port.id === this.saturatedPortId,
            )?.equipmentId,
            kind: this.graph.ports.find(
              (port) => port.id === this.saturatedPortId,
            )!.kind as 'buffer' | 'stocker',
            startedTs: this.saturationStartedTs,
            queueVehicleIds: this.vehicles
              .filter(
                (vehicle) =>
                  vehicle.job?.to === this.saturatedPortId &&
                  vehicle.job.phase === 'WAITING_PORT',
              )
              .map((vehicle) => vehicle.state.id),
          }
        : undefined,
      closure: this.closedSegments.size
        ? {
            active: true,
            segmentIds: [...this.closedSegments].map(
              (s) => this.graph.segments[s]!.id,
            ),
            startedTs: this.closureStartedTs,
          }
        : undefined,
      traffic: {
        blockedVehicleIds: this.vehicles
          .filter((vehicle) => vehicle.state.status === 'BLOCKED')
          .map((vehicle) => vehicle.state.id),
        occupiedSegments: new Set(
          this.vehicles
            .map((vehicle) => vehicle.route[vehicle.leg])
            .filter((segment): segment is number => segment !== undefined),
        ).size,
        junctionReservations: this.junctionReservationCount(),
        reroutedVehicles: this.vehicles.filter(
          (vehicle) => (vehicle.state.rerouteCount ?? 0) > 0,
        ).length,
        activeDeadlocks: this.activeDeadlocks.size,
        resolvedDeadlocks: this.resolvedDeadlocks,
        admittedJobs: active.filter((job) => job.vehicleId).length,
        backpressuredJobs: active.filter(
          (job) => job.phase === 'QUEUED' && !job.vehicleId,
        ).length,
      },
    };
  }
  private vehicleSnapshot(v: SimVehicle): VehicleState {
    // quantizeWireFields가 route를 새 배열로 다시 만들어 공유 참조도 끊는다.
    return quantizeWireFields({ ...v.state });
  }
  snapshot(): SnapshotMessage {
    // Private snapshots must not consume the shared broadcast sequence.
    return {
      type: 'snapshot',
      seq: this.seq,
      ts: this.now,
      vehicles: this.vehicles.map((v) => this.vehicleSnapshot(v)),
      operations: this.operations(),
    };
  }

  tick(rateHz: number): DeltaMessage {
    const dt = 1 / Math.max(1, rateHz);
    this.now += dt * 1000;
    this.tickCounter++;
    const alarms: Alarm[] = this.pendingAlarms.splice(0);
    const before = new Map<SimVehicle, VehicleState>();
    // 포화/장애가 해제되면 가용 slot 수만큼 대기 차량의 하역을 재개한다.
    const unloadingByPort = new Map<string, number>();
    for (const vehicle of this.vehicles)
      if (vehicle.job?.phase === 'UNLOADING')
        unloadingByPort.set(
          vehicle.job.to,
          (unloadingByPort.get(vehicle.job.to) ?? 0) + 1,
        );
    for (const vehicle of this.vehicles) {
      const job = vehicle.job;
      if (!job || job.phase !== 'WAITING_PORT') continue;
      if (job.to === this.blockedPortId) continue;
      const port = this.graph.ports.find((item) => item.id === job.to)!;
      const occupied = this.carriers.filter(
        (carrier) => carrier.portId === job.to,
      ).length;
      const unloading = unloadingByPort.get(job.to) ?? 0;
      if (occupied + unloading >= port.capacity) continue;
      before.set(vehicle, { ...vehicle.state });
      this.setPhase(vehicle, 'UNLOADING');
      vehicle.dwell = 2;
      unloadingByPort.set(job.to, unloading + 1);
    }
    const segmentOwners = new Map<number, string>();
    for (const vehicle of this.vehicles) {
      // Job 없는 IDLE OHT는 설비 측 대기 포켓에 정차한 것으로 취급한다.
      // 주행 rail 예약을 점유시키면 대규모 fleet에서 미배차 차량이 통행을 막는다.
      if (!vehicle.job && vehicle.state.phase === 'IDLE') continue;
      const segment = vehicle.route[vehicle.leg];
      if (segment !== undefined && !segmentOwners.has(segment))
        segmentOwners.set(segment, vehicle.state.id);
    }
    const junctionWinners = this.junctionWinners(dt);
    const blockReason = (vehicle: SimVehicle): string | null => {
      vehicle.waitingFor = null;
      const segment = vehicle.route[vehicle.leg];
      if (segment !== undefined) {
        const rail = this.graph.segments[segment]!;
        const crossesJunction =
          vehicle.distance + vehicle.cruise * dt >= rail.length;
        const nextSegment = vehicle.route[vehicle.leg + 1];
        if (
          crossesJunction &&
          nextSegment !== undefined &&
          this.closedSegments.has(nextSegment)
        )
          return `${this.graph.segments[nextSegment]!.id} 레일 폐쇄`;
        const owner =
          nextSegment === undefined
            ? undefined
            : segmentOwners.get(nextSegment);
        if (
          crossesJunction &&
          nextSegment !== undefined &&
          owner &&
          owner !== vehicle.state.id
        )
          {
            vehicle.waitingFor = owner;
            return `${this.graph.segments[nextSegment]!.id} 구간 점유`;
          }
        const winner =
          nextSegment === undefined
            ? undefined
            : junctionWinners.get(nextSegment);
        if (
          crossesJunction &&
          nextSegment !== undefined &&
          winner &&
          winner !== vehicle.state.id
        )
          {
            vehicle.waitingFor = winner;
            return `${this.graph.segments[nextSegment]!.id} 합류 예약 · ${winner} 우선`;
          }
      }
      const probe: SimVehicle = {
        ...vehicle,
        state: { ...vehicle.state },
        route: [...vehicle.route],
      };
      this.advance(probe, dt);
      const leader = this.vehicles.find((other) => {
        if (other === vehicle) return false;
        if (!other.job && other.state.phase === 'IDLE') return false;
        const currentGap = Math.hypot(
          vehicle.state.x - other.state.x,
          vehicle.state.y - other.state.y,
        );
        const nextGap = Math.hypot(
          probe.state.x - other.state.x,
          probe.state.y - other.state.y,
        );
        return nextGap < 1.6 && nextGap < currentGap;
      });
      if (leader) {
        vehicle.waitingFor = leader.state.id;
        return `${leader.state.id} 안전 간격`;
      }
      return null;
    };
    for (const v of this.vehicles) {
      const job = v.job;
      if (!job) {
        // Large fleets retain a real high-frequency movement workload through empty circulation.
        // Dispatch may take a circulating vehicle only after it reaches a junction.
        if (this.vehicles.length >= 500) {
          before.set(v, { ...v.state });
          if (v.state.phase === 'IDLE') {
            const outgoing = this.graph.adjacency.get(v.node) ?? [];
            const si =
              outgoing[Math.floor(this.random() * outgoing.length)];
            if (si !== undefined) {
              this.setRoute(v, nodeKeyOf(this.graph.segments[si]!.b));
              Object.assign(v.state, {
                phase: 'REPOSITIONING',
                status: 'MOVING',
                speed: v.cruise,
              });
            }
          }
          if (this.advance(v, dt))
            Object.assign(v.state, {
              phase: 'IDLE',
              status: 'IDLE',
              speed: 0,
              route: [],
            });
        }
        continue;
      }
      before.set(v, { ...v.state });
      if (job.phase === 'TO_PICKUP' || job.phase === 'DELIVERING') {
        const reason = blockReason(v);
        if (reason) {
          v.trafficWait += dt;
          v.state.status = 'BLOCKED';
          v.state.speed = 0;
          v.state.blockedBy = reason;
          const isClosure = reason.includes('레일 폐쇄');
          if (
            ((v.trafficWait >= 6 && reason.includes('구간 점유')) ||
              isClosure) &&
            this.tryReroute(v)
          ) {
            alarms.push({
              id: 'AL-REROUTE-' + v.state.id + '-' + Math.round(this.now),
              kind: 'BLOCKED',
              severity: 'info',
              ts: this.now,
              vehicleId: v.state.id,
              jobId: v.job?.id,
              segmentId: this.graph.segments.find((segment) =>
                reason.includes(segment.id),
              )?.id,
              message:
                v.state.id +
                (isClosure
                  ? ' 폐쇄 구간 우회 경로로 전환'
                  : ' 혼잡 구간 회피 경로로 전환'),
            });
            v.trafficWait = 0;
            v.blockedFired = false;
            v.state.status = 'MOVING';
            v.state.speed = v.cruise;
            v.state.blockedBy = null;
            v.waitingFor = null;
            continue;
          }
          if (v.trafficWait >= 4 && !v.blockedFired) {
            v.blockedFired = true;
            alarms.push({
              id: 'AL-BLOCK-' + v.state.id + '-' + Math.round(this.now),
              kind: 'BLOCKED',
              severity: 'warn',
              ts: this.now,
              vehicleId: v.state.id,
              jobId: v.job?.id,
              segmentId: this.graph.segments.find((segment) =>
                reason.includes(segment.id),
              )?.id,
              message: v.state.id + ' · ' + reason + '로 진입 대기',
            });
          }
        } else {
          const previousSegment = v.route[v.leg];
          const arrived = this.advance(v, dt);
          const currentSegment = v.route[v.leg];
          if (
            previousSegment !== currentSegment &&
            segmentOwners.get(previousSegment!) === v.state.id
          )
            segmentOwners.delete(previousSegment!);
          if (currentSegment !== undefined)
            segmentOwners.set(currentSegment, v.state.id);
          if (arrived) {
          v.trafficWait = 0;
          v.blockedFired = false;
          v.state.blockedBy = null;
          v.waitingFor = null;
          const destination = this.graph.ports.find(
            (port) => port.id === job.to,
          )!;
          const destinationOccupied = this.carriers.filter(
            (carrier) => carrier.portId === job.to,
          ).length;
          if (
            job.phase === 'DELIVERING' &&
            (job.to === this.blockedPortId ||
              job.to === this.saturatedPortId ||
              destinationOccupied >= destination.capacity)
          ) {
            this.setPhase(v, 'WAITING_PORT');
            v.state.status = 'BLOCKED';
            v.state.speed = 0;
            v.state.blockedBy =
              job.to === this.blockedPortId
                ? `${job.to} 포트 장애`
                : `${job.to} 저장 용량 포화`;
          } else {
            this.setPhase(
              v,
              job.phase === 'TO_PICKUP' ? 'LOADING' : 'UNLOADING',
            );
            v.dwell = 2;
          }
          } else {
          v.trafficWait = 0;
          v.blockedFired = false;
          v.state.blockedBy = null;
          v.waitingFor = null;
          v.state.status = 'MOVING';
          v.state.speed = v.cruise;
          }
        }
      } else if (job.phase !== 'WAITING_PORT') {
        v.dwell -= dt;
        if (v.dwell <= 0) {
          const carrier = this.carriers.find(
            (c) => c.id === job.carrierId,
          )!;
          if (job.phase === 'LOADING') {
            carrier.portId = null;
            carrier.vehicleId = v.state.id;
            v.state.loaded = true;
            this.setRoute(v, this.portNode(job.to));
            this.setPhase(v, 'DELIVERING');
          } else if (job.phase === 'UNLOADING') {
            carrier.portId = job.to;
            carrier.vehicleId = null;
            job.phase = 'DONE';
            job.completedTs = this.now;
            this.completed++;
            this.totalTransportMs += this.now - job.createdTs;
            v.job = null;
            Object.assign(v.state, {
              status: 'IDLE',
              phase: 'IDLE',
              speed: 0,
              jobId: null,
              loaded: false,
              carrierId: null,
              lotId: null,
              priority: 0,
              from: '',
              to: '',
              deadlineTs: 0,
              route: [],
              blockedBy: null,
              rerouteCount: 0,
            });
          }
        }
      }
      if (v.job && this.now > job.deadlineTs) {
        v.state.status = 'DELAYED';
        if (!v.delayedFired) {
          v.delayedFired = true;
          alarms.push({
            id: 'AL-' + job.id,
            kind: 'DELAY',
            severity: 'warn',
            ts: this.now,
            vehicleId: v.state.id,
            jobId: job.id,
            portId: job.to,
            equipmentId: this.graph.ports.find(
              (port) => port.id === job.to,
            )?.equipmentId,
            message:
              job.id + ' ' + job.from + ' → ' + job.to + ' 반송 지연',
          });
        }
      }
    }
    this.resolveDeadlocks(alarms);
    this.jobs = [
      ...this.jobs.filter((j) => j.phase !== 'DONE'),
      ...this.jobs
        .filter((j) => j.phase === 'DONE')
        .sort((a, b) => a.completedTs! - b.completedTs!)
        .slice(-40),
    ];
    if (this.tickCounter % Math.max(1, Math.round(rateHz * 2)) === 0)
      this.generateJobs();
    const idleBefore = this.jobs.some((j) => j.phase === 'QUEUED')
      ? this.vehicles.filter(
          (v) => !v.job && v.state.phase === 'IDLE',
        )
      : [];
    const idleStates = new Map(
      idleBefore.map((v) => [v, { ...v.state }]),
    );
    this.dispatch();
    for (const v of idleBefore)
      if (v.job && !before.has(v)) before.set(v, idleStates.get(v)!);
    const upd: VehicleDelta[] = [];
    for (const [v, previous] of before) {
      const delta: VehicleDelta = { id: v.state.id };
      for (const key of Object.keys(
        v.state,
      ) as (keyof VehicleState)[]) {
        if (v.state[key] !== previous[key])
          Object.assign(delta, { [key]: v.state[key] });
      }
      if (Object.keys(delta).length > 1)
        upd.push(quantizeWireFields(delta));
    }
    this.seq++;
    if (this.tickCounter % 600 === 0) this.seq++;
    // operations는 UI가 4Hz로만 읽고 대부분 고정 오버헤드(~9.5KB/틱)라, 매 틱이 아니라
    // 약 5Hz 주기(또는 알람이 있는 틱)에만 실어 보낸다. 클라이언트 reducer는 마지막
    // 정의된 operations를 유지하므로 중간 틱에 없어도 최신값이 그대로 표시된다.
    // 계산 자체(operations())도 이때만 수행해 CPU도 함께 절약한다.
    const opsInterval = Math.max(1, Math.round(rateHz / 5));
    const emitOps =
      this.tickCounter % opsInterval === 0 || alarms.length > 0;
    const delta: DeltaMessage = {
      type: 'delta',
      seq: this.seq,
      ts: this.now,
      upd,
      alarms,
    };
    if (emitOps) delta.operations = this.operations();
    return delta;
  }

  private junctionRequests(dt: number): Map<number, SimVehicle[]> {
    const requests = new Map<number, SimVehicle[]>();
    for (const vehicle of this.vehicles) {
      if (
        vehicle.job?.phase !== 'TO_PICKUP' &&
        vehicle.job?.phase !== 'DELIVERING'
      )
        continue;
      const current = vehicle.route[vehicle.leg];
      const next = vehicle.route[vehicle.leg + 1];
      if (current === undefined || next === undefined) continue;
      const rail = this.graph.segments[current]!;
      if (vehicle.distance + vehicle.cruise * dt < rail.length)
        continue;
      const list = requests.get(next) ?? [];
      list.push(vehicle);
      requests.set(next, list);
    }
    return requests;
  }

  private junctionWinners(dt: number): Map<number, string> {
    const winners = new Map<number, string>();
    for (const [segment, vehicles] of this.junctionRequests(dt)) {
      vehicles.sort(
        (a, b) =>
          compareJunctionPriority(
            {
              id: a.state.id,
              priority: a.job?.priority ?? 0,
              waitSec: a.trafficWait,
            },
            {
              id: b.state.id,
              priority: b.job?.priority ?? 0,
              waitSec: b.trafficWait,
            },
          ),
      );
      winners.set(segment, vehicles[0]!.state.id);
    }
    return winners;
  }

  private junctionReservationCount(): number {
    const requests = this.junctionRequests(1 / 10);
    let count = 0;
    for (const vehicles of requests.values())
      if (vehicles.length > 1) count++;
    return count;
  }

  private resolveDeadlocks(alarms: Alarm[]): void {
    const waitsFor = new Map<string, string>();
    for (const vehicle of this.vehicles)
      if (vehicle.waitingFor)
        waitsFor.set(vehicle.state.id, vehicle.waitingFor);
    const cycles = detectWaitCycles(waitsFor);
    const unresolved = new Set<string>();
    for (const cycle of cycles) {
      const signature = [...cycle].sort().join('|');
      if (!this.activeDeadlocks.has(signature))
        alarms.push({
          id: 'AL-DEADLOCK-' + signature + '-' + Math.round(this.now),
          kind: 'JAM',
          severity: 'critical',
          ts: this.now,
          vehicleId: cycle[0],
          jobId: this.vehicles.find(
            (vehicle) => vehicle.state.id === cycle[0],
          )?.job?.id,
          message: '교착 감지 · ' + cycle.join(' → '),
        });
      const candidates = cycle
        .map((id) =>
          this.vehicles.find((vehicle) => vehicle.state.id === id),
        )
        .filter((vehicle): vehicle is SimVehicle => Boolean(vehicle))
        .sort(
          (a, b) =>
            (a.job?.priority ?? 0) - (b.job?.priority ?? 0) ||
            a.trafficWait - b.trafficWait ||
            b.state.id.localeCompare(a.state.id),
        );
      const rerouted = candidates.find((vehicle) =>
        this.tryReroute(vehicle),
      );
      if (rerouted) {
        rerouted.trafficWait = 0;
        rerouted.blockedFired = false;
        rerouted.waitingFor = null;
        rerouted.state.status = 'MOVING';
        rerouted.state.speed = rerouted.cruise;
        rerouted.state.blockedBy = null;
        this.resolvedDeadlocks++;
        alarms.push({
          id: 'AL-DEADLOCK-CLEAR-' + signature + '-' + Math.round(this.now),
          kind: 'JAM',
          severity: 'info',
          ts: this.now,
          vehicleId: rerouted.state.id,
          jobId: rerouted.job?.id,
          message: '교착 자동 해소 · ' + rerouted.state.id + ' 우회',
        });
      } else {
        unresolved.add(signature);
      }
    }
    this.activeDeadlocks = unresolved;
  }
}
