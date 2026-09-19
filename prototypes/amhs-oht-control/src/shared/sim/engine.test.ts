import type {
  DispatchRule,
  TransportPhase,
} from '@/entities/oht/types';
import assert from 'node:assert/strict';
import test from 'node:test';
import {
  compareJunctionPriority,
  detectWaitCycles,
  dispatchPriorityScore,
  quantizeWireFields,
  SimEngine,
} from './engine';

test('wait-for graph detects only circular vehicle dependencies', () => {
  const cycles = detectWaitCycles(
    new Map([
      ['OHT-A', 'OHT-B'],
      ['OHT-B', 'OHT-C'],
      ['OHT-C', 'OHT-A'],
      ['OHT-D', 'OHT-E'],
    ]),
  );
  assert.deepEqual(cycles, [['OHT-A', 'OHT-B', 'OHT-C']]);
  assert.deepEqual(
    detectWaitCycles(
      new Map([
        ['OHT-A', 'OHT-B'],
        ['OHT-B', 'OHT-C'],
      ]),
    ),
    [],
  );
});

test('junction priority favors hot lots, then longest wait, then stable id', () => {
  const candidates = [
    { id: 'OHT-0003', priority: 1, waitSec: 8 },
    { id: 'OHT-0002', priority: 3, waitSec: 1 },
    { id: 'OHT-0001', priority: 3, waitSec: 1 },
    { id: 'OHT-0004', priority: 1, waitSec: 12 },
  ].sort(compareJunctionPriority);
  assert.deepEqual(
    candidates.map((candidate) => candidate.id),
    ['OHT-0001', 'OHT-0002', 'OHT-0004', 'OHT-0003'],
  );
});

test('fleet respawn restarts job ids while preserving the stream sequence', () => {
  const engine = new SimEngine(20260905, () => 1000);
  engine.spawn(1000);
  engine.tick(10);
  const previousSeq = engine.snapshot().seq;
  assert.equal(engine.snapshot().operations!.jobs[0]!.id, 'J-1');

  engine.spawn(32);
  const respawned = engine.snapshot();
  assert.equal(respawned.seq, previousSeq);
  assert.equal(respawned.vehicles.length, 32);
  assert.equal(respawned.operations!.jobs[0]!.id, 'J-1');
});

test('FOUP ownership and destination capacity remain consistent through complete transports', () => {
  const engine = new SimEngine(20260905, () => 1000);
  engine.spawn(8);
  const initial = engine.snapshot();
  const carrierCount = initial.operations!.carriers.length;
  const phases = new Set<TransportPhase>();
  for (let i = 0; i < 2400; i++) {
    engine.tick(5);
    const snapshot = engine.snapshot();
    const ops = snapshot.operations!;
    assert.equal(ops.carriers.length, carrierCount);
    assert.ok(ops.jobs.length <= 60);
    const active = ops.jobs.filter((j) => j.phase !== 'DONE');
    assert.equal(
      new Set(active.map((j) => j.carrierId)).size,
      active.length,
    );
    for (const port of ops.ports) {
      assert.ok(
        port.occupied + port.reserved <= port.capacity,
        port.id,
      );
      assert.equal(
        port.occupied,
        ops.carriers.filter((c) => c.portId === port.id).length,
      );
    }
    for (const carrier of ops.carriers) {
      assert.notEqual(
        carrier.portId === null,
        carrier.vehicleId === null,
      );
      if (carrier.vehicleId) {
        const v = snapshot.vehicles.find(
          (v) => v.id === carrier.vehicleId,
        )!;
        assert.equal(v.carrierId, carrier.id);
        assert.equal(v.loaded, true);
      }
    }
    for (const job of ops.jobs) phases.add(job.phase);
    for (const v of snapshot.vehicles) {
      assert.ok(Number.isFinite(v.x) && Number.isFinite(v.y));
      if (v.phase === 'TO_PICKUP' || v.phase === 'LOADING')
        assert.equal(v.loaded, false);
      if (v.phase === 'DELIVERING' || v.phase === 'UNLOADING')
        assert.equal(v.loaded, true);
    }
  }
  assert.ok(engine.snapshot().operations!.completed > 0);
  for (const phase of [
    'QUEUED',
    'TO_PICKUP',
    'LOADING',
    'DELIVERING',
    'UNLOADING',
    'DONE',
  ] as const)
    assert.ok(phases.has(phase), phase);
});

test('dispatch rules select the next job without changing an assigned transport', () => {
  const firstIds = new Set<string>();
  for (const rule of [
    'nearest',
    'oldest',
    'priority',
  ] as DispatchRule[]) {
    const engine = new SimEngine(42, () => 0);
    engine.setDispatch(rule);
    engine.spawn(1);
    const snapshot = engine.snapshot();
    const assigned = snapshot.operations!.jobs.find(
      (j) => j.vehicleId,
    )!;
    firstIds.add(assigned.id);
    if (rule === 'oldest') assert.equal(assigned.id, 'J-1');
    if (rule === 'priority') assert.equal(assigned.priority, 3);
    engine.setDispatch('oldest');
    assert.equal(engine.snapshot().vehicles[0]!.jobId, assigned.id);
    assert.equal(engine.snapshot().operations!.rule, 'oldest');
  }
  assert.ok(firstIds.size > 1);
});

test('port incident blocks unloading, emits alarms, and resumes after recovery', () => {
  const engine = new SimEngine(42, () => 0);
  engine.spawn(8);
  engine.setPortIncident(true);
  const incident = engine.snapshot().operations!.incident!;
  assert.equal(incident.active, true);
  assert.ok(incident.portId.endsWith('-LP1'));
  assert.equal(
    engine.snapshot().operations!.ports.find(
      (port) => port.id === incident.portId,
    )!.status,
    'DOWN',
  );

  let sawEqpAlarm = false;
  let sawWaiting = false;
  let sawDelay = false;
  for (let i = 0; i < 1800; i++) {
    const delta = engine.tick(10);
    sawEqpAlarm ||= delta.alarms?.some(
      (alarm) => alarm.kind === 'EQP_DOWN',
    ) ?? false;
    sawDelay ||= delta.alarms?.some(
      (alarm) => alarm.kind === 'DELAY',
    ) ?? false;
    sawWaiting ||= engine
      .snapshot()
      .vehicles.some((vehicle) => vehicle.phase === 'WAITING_PORT');
    if (sawWaiting && sawDelay) break;
  }
  assert.equal(sawEqpAlarm, true);
  assert.equal(sawWaiting, true);
  assert.equal(sawDelay, true);

  engine.setPortIncident(false);
  assert.equal(engine.snapshot().operations!.incident, undefined);
  for (let i = 0; i < 50; i++) engine.tick(10);
  assert.equal(
    engine
      .snapshot()
      .vehicles.some((vehicle) => vehicle.phase === 'WAITING_PORT'),
    false,
  );
});

test('dispatch priority keeps hot lots first while aging normal lots', () => {
  assert.ok(dispatchPriorityScore(1, 45) > dispatchPriorityScore(1, 0));
  assert.ok(dispatchPriorityScore(3, 0) > dispatchPriorityScore(1, 10_000));
});

test('operator promotion upgrades a job and its assigned vehicle to hot lot', () => {
  const engine = new SimEngine(42, () => 0);
  engine.spawn(8);
  const normal = engine
    .snapshot()
    .operations!.jobs.find((job) => job.phase !== 'DONE' && job.priority < 3)!;
  assert.ok(normal);
  assert.equal(engine.promoteHotLot(normal.id), normal.id);

  const snapshot = engine.snapshot();
  const promoted = snapshot.operations!.jobs.find(
    (job) => job.id === normal.id,
  )!;
  assert.equal(promoted.priority, 3);
  if (promoted.vehicleId)
    assert.equal(
      snapshot.vehicles.find((vehicle) => vehicle.id === promoted.vehicleId)!
        .priority,
      3,
    );
  assert.ok(
    engine.tick(10).alarms?.some(
      (alarm) => alarm.kind === 'HOT_LOT' && alarm.message.includes(normal.id),
    ),
  );
});

test('incident alarms carry structured navigation context', () => {
  const engine = new SimEngine(42, () => 0);
  engine.spawn(8);
  engine.setPortIncident(true);
  const portAlarm = engine
    .tick(10)
    .alarms?.find((alarm) => alarm.kind === 'EQP_DOWN')!;
  assert.ok(portAlarm.jobId);
  assert.ok(portAlarm.vehicleId);
  assert.ok(portAlarm.portId);
  assert.ok(portAlarm.equipmentId);

  engine.setRailClosure(true);
  const railAlarm = engine
    .tick(10)
    .alarms?.find(
      (alarm) => alarm.kind === 'JAM' && alarm.segmentId,
    )!;
  assert.ok(railAlarm.segmentId);
});

test('storage saturation fills a buffer or stocker, queues unloading, and recovers', () => {
  const engine = new SimEngine(42, () => 0);
  engine.spawn(8);
  engine.setStorageSaturation(true);
  const saturated = engine.snapshot().operations!.saturation!;
  assert.equal(saturated.active, true);
  assert.ok(
    saturated.portId.startsWith('BUF-') ||
      saturated.portId.startsWith('STK-'),
  );
  const fullPort = engine
    .snapshot()
    .operations!.ports.find((port) => port.id === saturated.portId)!;
  assert.equal(fullPort.occupied, fullPort.capacity);

  let sawAlarm = false;
  let sawWaiting = false;
  for (let i = 0; i < 3000; i++) {
    const delta = engine.tick(10);
    sawAlarm ||=
      delta.alarms?.some((alarm) =>
        alarm.message.includes('포화'),
      ) ?? false;
    sawWaiting ||= engine
      .snapshot()
      .vehicles.some(
        (vehicle) =>
          vehicle.to === saturated.portId &&
          vehicle.phase === 'WAITING_PORT',
      );
    if (sawAlarm && sawWaiting) break;
  }
  assert.equal(sawAlarm, true);
  assert.equal(sawWaiting, true);

  engine.setStorageSaturation(false);
  assert.equal(engine.snapshot().operations!.saturation, undefined);
  for (let i = 0; i < 80; i++) engine.tick(10);
  assert.equal(
    engine
      .snapshot()
      .vehicles.some(
        (vehicle) =>
          vehicle.to === saturated.portId &&
          vehicle.phase === 'WAITING_PORT',
      ),
    false,
  );
  for (const port of engine.snapshot().operations!.ports)
    assert.ok(port.occupied <= port.capacity, port.id);
});

test('persistent occupied segments trigger an alternate route and keep transport running', () => {
  const engine = new SimEngine(42, () => 0);
  engine.spawn(32);
  let rerouteAlarms = 0;
  let maxRerouted = 0;
  for (let i = 0; i < 3000; i++) {
    const delta = engine.tick(10);
    rerouteAlarms +=
      delta.alarms?.filter((alarm) =>
        alarm.message.includes('회피 경로'),
      ).length ?? 0;
    maxRerouted = Math.max(
      maxRerouted,
      engine.snapshot().operations!.traffic?.reroutedVehicles ?? 0,
    );
  }
  assert.ok(rerouteAlarms > 0);
  assert.ok(maxRerouted > 0);
  assert.ok(engine.snapshot().operations!.completed > 0);
});

test('rail closure detours traffic around the closed segment and keeps transport running', () => {
  // 과포화되지 않은 부하에서 폐쇄→우회→반송 지속을 검증한다.
  const engine = new SimEngine(42, () => 0);
  engine.spawn(8);
  for (let i = 0; i < 200; i++) engine.tick(10); // 경로가 형성된 뒤 폐쇄
  engine.setRailClosure(true);
  const opsAfter = engine.snapshot().operations!;
  assert.ok(opsAfter.closure?.active, 'closure is reported active');
  assert.equal(opsAfter.closure!.segmentIds.length, 1);
  const startCompleted = opsAfter.completed;

  let closureAlarm = false;
  let detourAlarm = false;
  let maxRerouted = 0;
  for (let i = 0; i < 2500; i++) {
    for (const a of engine.tick(10).alarms ?? []) {
      if (a.kind === 'JAM' && a.message.includes('레일 폐쇄'))
        closureAlarm = true;
      if (a.message.includes('우회 경로로 전환')) detourAlarm = true;
    }
    maxRerouted = Math.max(
      maxRerouted,
      engine.snapshot().operations!.traffic?.reroutedVehicles ?? 0,
    );
  }
  const midCompleted = engine.snapshot().operations!.completed;
  assert.ok(closureAlarm, 'closure emits a JAM alarm');
  assert.ok(detourAlarm, 'affected vehicles detour around the closure');
  assert.ok(maxRerouted > 0, 'reroute counter reflects detours');
  // 폐쇄 중에도 반송이 계속 완료된다(대체 경로가 있어 gridlock이 아님).
  assert.ok(
    midCompleted > startCompleted,
    'transport keeps completing under closure',
  );

  // 재개통하면 폐쇄가 해제되고 반송이 계속 진행된다.
  engine.setRailClosure(false);
  assert.equal(engine.snapshot().operations!.closure, undefined);
  for (let i = 0; i < 1500; i++) engine.tick(10);
  assert.ok(
    engine.snapshot().operations!.completed > midCompleted,
    'transport keeps completing after reopening',
  );
});

test('private snapshots preserve sequence and pausing preserves simulation deadlines', () => {
  let wall = 1000;
  const engine = new SimEngine(42, () => wall);
  engine.spawn(8);
  const first = engine.snapshot();
  wall += 3600000;
  const paused = engine.snapshot();
  assert.deepEqual(paused, first);
  const delta = engine.tick(10);
  assert.equal(delta.seq, first.seq + 1);
  assert.equal(delta.ts, first.ts + 100);
});

test('capacity-aware admission limits WIP and drains a 32 vehicle fleet', () => {
  const engine = new SimEngine(42, () => 0);
  engine.spawn(32);
  let blockedSamples = 0;
  let samples = 0;
  let sawBackpressure = false;
  let maxWip = 0;
  for (let i = 0; i < 3000; i++) {
    engine.tick(10);
    const traffic = engine.snapshot().operations!.traffic!;
    maxWip = Math.max(maxWip, traffic.admittedJobs);
    sawBackpressure ||= traffic.backpressuredJobs > 0;
    if (i >= 1000) {
      blockedSamples += traffic.blockedVehicleIds.length;
      samples++;
    }
  }
  const operations = engine.snapshot().operations!;
  assert.ok(maxWip <= 12, 'global transport WIP stays within capacity');
  assert.equal(sawBackpressure, true);
  assert.ok(operations.completed >= 10, 'backpressure preserves throughput');
  assert.ok(
    blockedSamples / samples < 3,
    'average blocked vehicles remain below three after warm-up',
  );
});

test('resetScenario restores the same seeded fleet and job state', () => {
  const engine = new SimEngine(7, () => 1000);
  engine.resetScenario(8);
  const expected = engine.snapshot();
  for (let i = 0; i < 300; i++) engine.tick(10);
  engine.setPortIncident(true);
  engine.setRailClosure(true);
  engine.setStorageSaturation(true);
  engine.resetScenario(8);
  const actual = engine.snapshot();

  assert.deepEqual(actual.vehicles, expected.vehicles);
  assert.deepEqual(actual.operations, expected.operations);
  assert.equal(actual.ts, expected.ts);
  assert.equal(actual.operations!.incident, undefined);
  assert.equal(actual.operations!.closure, undefined);
  assert.equal(actual.operations!.saturation, undefined);
});

test('quantizeWireFields rounds coordinates, heading, speed, and route', () => {
  const out = quantizeWireFields({
    id: 'OHT-0001',
    x: 38.26508793633431,
    y: 41.2353632704448,
    heading: 179.98765,
    speed: 1.567891,
    route: [
      [10.111111, 20.999999],
      [30.005, 40.004],
    ],
  });
  assert.equal(out.x, 38.27);
  assert.equal(out.y, 41.24);
  assert.equal(out.heading, 180);
  assert.equal(out.speed, 1.57);
  assert.deepEqual(out.route, [
    [10.11, 21],
    [30.01, 40],
  ]);
  // 미포함 필드는 건드리지 않는다.
  assert.equal(out.id, 'OHT-0001');
});

test('delta values carry at most 1cm / 0.1deg wire precision', () => {
  const engine = new SimEngine(7, () => 0);
  engine.spawn(64);
  for (let i = 0; i < 60; i++) {
    for (const u of engine.tick(10).upd) {
      const dec = (n: number) => {
        const s = String(n);
        const dot = s.indexOf('.');
        return dot === -1 ? 0 : s.length - dot - 1;
      };
      if (typeof u.x === 'number') assert.ok(dec(u.x) <= 2, `x=${u.x}`);
      if (typeof u.y === 'number') assert.ok(dec(u.y) <= 2, `y=${u.y}`);
      if (typeof u.heading === 'number')
        assert.ok(dec(u.heading) <= 1, `heading=${u.heading}`);
    }
  }
});

test('operations rides on ~5Hz cadence (or alarm ticks), not every delta', () => {
  const engine = new SimEngine(11, () => 0);
  engine.spawn(64);
  let total = 0;
  let withOps = 0;
  let alarmTicksMissingOps = 0;
  for (let i = 0; i < 60; i++) {
    const d = engine.tick(10); // rateHz 10 → opsInterval 2
    total += 1;
    if (d.operations) withOps += 1;
    if ((d.alarms?.length ?? 0) > 0 && !d.operations)
      alarmTicksMissingOps += 1;
  }
  // 매 틱이 아니라 일부 틱에만 실려 페이로드 빈도가 줄어든다.
  assert.ok(withOps > 0, 'operations must still be delivered periodically');
  assert.ok(
    withOps < total,
    `operations should be throttled, got ${withOps}/${total}`,
  );
  // 알람이 있는 틱에는 항상 operations를 함께 싣는다.
  assert.equal(alarmTicksMissingOps, 0);
});

test('deltas plus snapshots reproduce vehicle state across reassignment and scale reset', () => {
  const engine = new SimEngine(42, () => 0);
  engine.spawn(8);
  const vehicles = new Map(
    engine.snapshot().vehicles.map((v) => [v.id, v]),
  );
  for (let i = 0; i < 1000; i++) {
    for (const u of engine.tick(5).upd)
      Object.assign(vehicles.get(u.id)!, u);
  }
  assert.deepEqual(
    [...vehicles.values()],
    engine.snapshot().vehicles,
  );
  engine.spawn(32);
  assert.equal(engine.snapshot().vehicles.length, 32);
  assert.equal(engine.snapshot().operations!.completed, 0);
});

test('large fleets circulate empty vehicles and keep movement continuous across rail joints', () => {
  const engine = new SimEngine(42, () => 0);
  engine.spawn(500);
  let previous = new Map(
    engine.snapshot().vehicles.map((v) => [v.id, v]),
  );
  for (let i = 0; i < 250; i++) {
    const delta = engine.tick(10);
    assert.ok(delta.upd.length > 400);
    const current = engine.snapshot();
    for (const v of current.vehicles) {
      const old = previous.get(v.id)!;
      assert.ok(
        Math.hypot(v.x - old.x, v.y - old.y) <= 0.34,
        v.id + ' must not teleport',
      );
    }
    previous = new Map(current.vehicles.map((v) => [v.id, v]));
  }
  assert.ok(
    engine
      .snapshot()
      .vehicles.some((v) => v.phase === 'REPOSITIONING'),
  );
});

test('a vehicle accelerates from a stop and decelerates before arriving', () => {
  const engine = new SimEngine(42, () => 0);
  engine.spawn(1);
  const moving: number[] = [];
  let arrivalApproach: number | null = null;
  let peak = 0;
  for (let i = 0; i < 400; i++) {
    engine.tick(10);
    const v = engine.snapshot().vehicles[0]!;
    if (v.status === 'MOVING') {
      moving.push(v.speed);
      peak = Math.max(peak, v.speed);
    }
    // 정지(로딩/언로딩) 직전의 마지막 주행 속도를 잡아 감속을 확인한다.
    if (
      (v.status === 'LOADING' || v.status === 'UNLOADING') &&
      arrivalApproach === null &&
      moving.length
    )
      arrivalApproach = moving[moving.length - 1]!;
    if (arrivalApproach !== null) break;
  }
  // 출발은 정지 상태(0)에서 서서히 오른다: 첫 주행 속도가 작다.
  assert.ok(moving[0]! <= 0.4, `first moving speed ${moving[0]}`);
  // 속도는 순간 점프하지 않는다: 틱당 증가가 가속도 예산(2.0 m/s² · 0.1s) 이내.
  for (let i = 1; i < moving.length; i++) {
    const delta = moving[i]! - moving[i - 1]!;
    if (delta > 0) assert.ok(delta <= 0.21, `accel step ${delta}`);
  }
  // cruise 상한(1.5+1.8)을 넘지 않는다.
  assert.ok(peak <= 3.31, `peak ${peak}`);
  // 도착 직전 속도는 cruise plateau보다 낮다(정지거리만큼 감속).
  assert.ok(arrivalApproach !== null, 'vehicle reached a stop');
  assert.ok(
    arrivalApproach! > 0 && arrivalApproach! < peak,
    `approach ${arrivalApproach} vs peak ${peak}`,
  );
});

test('battery drains while moving, alarms low, and recovers by charging', () => {
  const engine = new SimEngine(42, () => 0);
  engine.spawn(8);
  let minBattery = 100;
  let sawCharging = false;
  let sawBatteryAlarm = false;
  let outOfRange = false;
  for (let i = 0; i < 4000; i++) {
    const delta = engine.tick(10);
    for (const alarm of delta.alarms ?? [])
      if (alarm.kind === 'BATTERY') sawBatteryAlarm = true;
    const snapshot = engine.snapshot();
    if ((snapshot.operations!.traffic!.chargingVehicles ?? 0) > 0)
      sawCharging = true;
    for (const v of snapshot.vehicles) {
      const battery = v.battery ?? 100;
      minBattery = Math.min(minBattery, battery);
      if (battery < 0 || battery > 100) outOfRange = true;
    }
  }
  assert.equal(outOfRange, false, 'battery stays within 0..100');
  assert.ok(minBattery < 100, 'batteries drain while moving');
  assert.equal(sawBatteryAlarm, true, 'low battery raises an alarm');
  assert.equal(sawCharging, true, 'depleted vehicles divert to a charger');
  // 배터리 관리에도 반송 처리량은 유지된다.
  assert.ok(engine.snapshot().operations!.completed > 0);
});

test('applyCommand: 감독자 명령은 실행되고 감사 로그에 승인 기록', () => {
  const engine = new SimEngine(42, () => 1000);
  engine.spawn(8);
  const supervisor = { id: 'S', role: 'supervisor' as const };
  const result = engine.applyCommand(
    { type: 'setPortIncident', enabled: true },
    supervisor,
  );
  assert.equal(result.accepted, true);
  assert.ok(result.auditId);
  // 실제로 실행됐다(장애 활성).
  assert.ok(engine.snapshot().operations!.incident?.active);
  // 감사 로그 마지막 항목이 승인으로 남는다.
  const audit = engine.snapshot().operations!.audit!;
  const last = audit[audit.length - 1]!;
  assert.equal(last.action, 'setPortIncident');
  assert.equal(last.outcome, 'accepted');
  assert.equal(last.actor.role, 'supervisor');
});

test('applyCommand: 권한 없는 명령은 거부되고 실행되지 않으며 거부로 기록', () => {
  const engine = new SimEngine(42, () => 1000);
  engine.spawn(8);
  const operator = { id: 'O', role: 'operator' as const };
  const result = engine.applyCommand(
    { type: 'setPortIncident', enabled: true },
    operator,
  );
  assert.equal(result.accepted, false);
  assert.equal(result.code, 'FORBIDDEN');
  // 장애가 주입되지 않았다.
  assert.equal(engine.snapshot().operations!.incident, undefined);
  // 감사 로그에 거부로 남는다.
  const audit = engine.snapshot().operations!.audit!;
  const last = audit[audit.length - 1]!;
  assert.equal(last.action, 'setPortIncident');
  assert.equal(last.outcome, 'rejected');

  // operator도 배차 규칙 변경은 허용된다.
  const ok = engine.applyCommand(
    { type: 'setDispatch', rule: 'nearest' },
    operator,
  );
  assert.equal(ok.accepted, true);
  assert.equal(engine.snapshot().operations!.rule, 'nearest');
});

test('deadlock breaker keeps a heavy fleet draining without permanent gridlock', () => {
  // 가·감속으로 낮아진 유효 용량에서도 재경로 없는 교착을 우선통과로 끊어
  // 반송이 정체 없이 계속 완료된다(교착 취약 seed 회귀 가드).
  for (const seed of [42, 100, 2026]) {
    const engine = new SimEngine(seed, () => 0);
    engine.spawn(64);
    for (let i = 0; i < 3000; i++) engine.tick(10);
    assert.ok(
      engine.snapshot().operations!.completed >= 10,
      `seed ${seed} kept draining`,
    );
  }
});
