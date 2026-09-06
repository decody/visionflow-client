import type {
  DispatchRule,
  TransportPhase,
} from '@/entities/oht/types';
import assert from 'node:assert/strict';
import test from 'node:test';
import {
  compareJunctionPriority,
  detectWaitCycles,
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
