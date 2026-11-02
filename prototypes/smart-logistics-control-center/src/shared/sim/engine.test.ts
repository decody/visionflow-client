import assert from 'node:assert/strict';
import { test } from 'node:test';

import { SimEngine } from './engine';

test('spawn: 운송수단 수를 맞춘다', () => {
  const e = new SimEngine();
  e.spawn(50);
  assert.equal(e.count(), 50);
  e.spawn(20);
  assert.equal(e.count(), 20);
});

test('snapshot: 모든 운송수단이 유한 좌표를 가진다', () => {
  const e = new SimEngine();
  e.spawn(30);
  const snap = e.snapshot();
  assert.equal(snap.type, 'snapshot');
  if (snap.type !== 'snapshot') return;
  assert.equal(snap.conveyances.length, 30);
  for (const c of snap.conveyances) {
    assert.ok(Number.isFinite(c.lon) && c.lon >= -180 && c.lon <= 180);
    assert.ok(Number.isFinite(c.lat) && c.lat >= -90 && c.lat <= 90);
    assert.ok(c.speed > 0);
  }
});

test('tick: seq 증가 + sim time 전진', () => {
  const e = new SimEngine();
  e.spawn(10);
  const t0 = e.simClock();
  const d1 = e.tick(10);
  const d2 = e.tick(10);
  assert.equal(d1.type, 'delta');
  if (d1.type === 'delta' && d2.type === 'delta') {
    assert.equal(d2.seq, d1.seq + 1);
  }
  assert.ok(e.simClock() > t0);
});

test('tick: 운송수단이 실제로 이동한다', () => {
  const e = new SimEngine();
  e.spawn(5);
  const before = e.snapshot();
  for (let i = 0; i < 20; i += 1) e.tick(10);
  const after = e.snapshot();
  if (before.type !== 'snapshot' || after.type !== 'snapshot') throw new Error('type');
  let moved = 0;
  for (let i = 0; i < before.conveyances.length; i += 1) {
    const b = before.conveyances[i]!;
    const a = after.conveyances[i]!;
    if (Math.abs(a.lon - b.lon) > 1e-6 || Math.abs(a.lat - b.lat) > 1e-6) moved += 1;
  }
  assert.ok(moved >= 4, `moved=${moved}`);
});

test('결정론: 같은 seed·같은 틱 수 → 동일 위치', () => {
  const run = () => {
    const e = new SimEngine(0xabcdef);
    e.spawn(8);
    for (let i = 0; i < 15; i += 1) e.tick(10);
    const s = e.snapshot();
    return s.type === 'snapshot' ? s.conveyances.map((c) => `${c.id}:${c.lon.toFixed(5)},${c.lat.toFixed(5)}`) : [];
  };
  assert.deepEqual(run(), run());
});

test('ensureSpawned: 화물 풀도 시드된다', () => {
  const e = new SimEngine();
  e.ensureSpawned(50);
  assert.ok(e.shipmentCount() > 0);
  const snap = e.snapshot();
  if (snap.type === 'snapshot') assert.ok(snap.shipments.length > 0);
});

test('snapshot/meta: 화물 집계 포함', () => {
  const e = new SimEngine();
  e.ensureSpawned(30);
  const snap = e.snapshot();
  if (snap.type !== 'snapshot') throw new Error('type');
  const st = snap.meta.shipments;
  assert.equal(st.active + 0, st.active); // 존재
  assert.ok(st.active > 0);
  assert.ok(st.onTimePct >= 0 && st.onTimePct <= 100);
  assert.ok(['FASTEST_ETA', 'FEWEST_TRANSFERS', 'LOWEST_COST'].includes(snap.meta.rule));
});

test('화물이 진행되어 완료가 누적된다', () => {
  const e = new SimEngine();
  e.ensureSpawned(40);
  e.setRunning(true);
  for (let i = 0; i < 4000; i += 1) e.tick(10);
  const snap = e.snapshot();
  if (snap.type !== 'snapshot') throw new Error('type');
  assert.ok(snap.meta.shipments.delivered > 0, `delivered=${snap.meta.shipments.delivered}`);
  // 목표 수 부근 유지(대체 스폰).
  assert.ok(snap.meta.shipments.active > 0);
});

test('delta: 화물 변경이 저빈도로 흐른다', () => {
  const e = new SimEngine();
  e.ensureSpawned(40);
  let sawShipmentChange = false;
  for (let i = 0; i < 2000 && !sawShipmentChange; i += 1) {
    const d = e.tick(10);
    if (d.type === 'delta' && (d.shipmentsUpd || d.shipmentsAdd || d.shipmentsDel)) sawShipmentChange = true;
  }
  assert.ok(sawShipmentChange);
});

test('setRule: 규칙 변경이 meta에 반영', () => {
  const e = new SimEngine();
  e.ensureSpawned(20);
  e.setRule('LOWEST_COST');
  const snap = e.snapshot();
  if (snap.type === 'snapshot') assert.equal(snap.meta.rule, 'LOWEST_COST');
});

test('inject surge: 목표 화물 수가 늘어난다', () => {
  const e = new SimEngine();
  e.ensureSpawned(30);
  for (let i = 0; i < 50; i += 1) e.tick(10);
  const before = e.shipmentCount();
  e.inject('surge', true);
  for (let i = 0; i < 400; i += 1) e.tick(10);
  assert.ok(e.shipmentCount() > before, `before=${before} after=${e.shipmentCount()}`);
  const snap = e.snapshot();
  if (snap.type === 'snapshot') assert.ok(snap.meta.scenarios.includes('surge'));
});

test('inject canalClosure: 스냅샷 알람에 CLOSURE', () => {
  const e = new SimEngine();
  e.ensureSpawned(30);
  e.inject('canalClosure', true);
  const snap = e.snapshot();
  if (snap.type !== 'snapshot') throw new Error('type');
  assert.ok(snap.meta.scenarios.includes('canalClosure'));
  assert.ok(snap.alerts.some((a) => a.id === 'CLOSURE' && a.severity === 'critical'));
});

test('reset: 모든 시나리오 해제', () => {
  const e = new SimEngine();
  e.ensureSpawned(20);
  e.inject('weather', true);
  e.inject('surge', true);
  e.inject('reset', true);
  const snap = e.snapshot();
  if (snap.type === 'snapshot') assert.equal(snap.meta.scenarios.length, 0);
});

test('ackAlert: OPEN → ACKNOWLEDGED', () => {
  const e = new SimEngine();
  e.ensureSpawned(20);
  e.inject('canalClosure', true);
  let snap = e.snapshot();
  if (snap.type !== 'snapshot') throw new Error('type');
  const closure = snap.alerts.find((a) => a.id === 'CLOSURE');
  assert.equal(closure?.status, 'OPEN');
  e.ackAlert('CLOSURE');
  snap = e.snapshot();
  if (snap.type === 'snapshot') assert.equal(snap.alerts.find((a) => a.id === 'CLOSURE')?.status, 'ACKNOWLEDGED');
});

test('자동 데모: 켜면 meta.demo가 흐르고 시나리오가 토글된다', () => {
  const e = new SimEngine();
  e.ensureSpawned(30);
  e.setDemo(true);
  let sawScenario = false;
  for (let i = 0; i < 3000; i += 1) {
    const d = e.tick(10);
    if (d.type === 'delta' && d.meta.demo && d.meta.scenarios.length > 0) sawScenario = true;
  }
  const snap = e.snapshot();
  if (snap.type === 'snapshot') assert.ok(snap.meta.demo?.running);
  assert.ok(sawScenario);
});

test('ShipmentWire: legs 타임라인 포함', () => {
  const e = new SimEngine();
  e.ensureSpawned(20);
  const snap = e.snapshot();
  if (snap.type !== 'snapshot') throw new Error('type');
  const s = snap.shipments[0]!;
  assert.ok(Array.isArray(s.legs) && s.legs.length >= 1);
  assert.ok(s.legs.every((l) => typeof l.from === 'string' && typeof l.to === 'string'));
});

test('promoteExpedite: 우선순위 3으로', () => {
  const e = new SimEngine();
  e.ensureSpawned(20);
  const snap = e.snapshot();
  if (snap.type !== 'snapshot') throw new Error('type');
  const target = snap.shipments.find((s) => s.priority !== 3);
  assert.ok(target);
  if (!target) return;
  assert.equal(e.promoteExpedite(target.id), true);
  const after = e.snapshot();
  if (after.type === 'snapshot') assert.equal(after.shipments.find((s) => s.id === target.id)?.priority, 3);
});

test('rerouteShipment: 알 수 없는 id는 false', () => {
  const e = new SimEngine();
  e.ensureSpawned(20);
  assert.equal(e.rerouteShipment('SHP-does-not-exist'), false);
});

test('applyCommand: viewer는 inject 거부(FORBIDDEN)·감사 기록', () => {
  const e = new SimEngine();
  e.ensureSpawned(20);
  const r = e.applyCommand({ type: 'inject', scenario: 'canalClosure', on: true }, { id: 'V', role: 'viewer' });
  assert.equal(r.accepted, false);
  assert.equal(r.code, 'FORBIDDEN');
  const snap = e.snapshot();
  if (snap.type !== 'snapshot') throw new Error('type');
  assert.ok(snap.audit.some((a) => a.outcome === 'REJECTED' && a.action === 'inject'));
  assert.ok(!snap.meta.scenarios.includes('canalClosure')); // 실행 안 됨
});

test('applyCommand: supervisor는 inject 승인·실행·감사', () => {
  const e = new SimEngine();
  e.ensureSpawned(20);
  const r = e.applyCommand({ type: 'inject', scenario: 'canalClosure', on: true }, { id: 'S', role: 'supervisor' });
  assert.equal(r.accepted, true);
  assert.ok(r.auditId);
  const snap = e.snapshot();
  if (snap.type !== 'snapshot') throw new Error('type');
  assert.ok(snap.meta.scenarios.includes('canalClosure'));
  assert.ok(snap.audit.some((a) => a.outcome === 'ACCEPTED' && a.action === 'inject'));
});

test('applyCommand: dispatcher는 setRule 승인, viewer는 거부', () => {
  const e = new SimEngine();
  e.ensureSpawned(20);
  assert.equal(e.applyCommand({ type: 'setRule', rule: 'LOWEST_COST' }, { id: 'D', role: 'dispatcher' }).accepted, true);
  assert.equal(e.applyCommand({ type: 'setRule', rule: 'FASTEST_ETA' }, { id: 'V', role: 'viewer' }).accepted, false);
});

test('applyCommand: snapshot은 감사 비대상', () => {
  const e = new SimEngine();
  e.ensureSpawned(10);
  e.applyCommand({ type: 'snapshot' }, { id: 'V', role: 'viewer' });
  const snap = e.snapshot();
  if (snap.type === 'snapshot') assert.equal(snap.audit.some((a) => a.action === 'snapshot'), false);
});

test('auditAdd: 델타로 신규 감사만 흐른다', () => {
  const e = new SimEngine();
  e.ensureSpawned(10);
  e.snapshot(); // 기존 emitted 처리
  e.applyCommand({ type: 'inject', scenario: 'surge', on: true }, { id: 'S', role: 'supervisor' });
  const d = e.tick(10);
  if (d.type === 'delta') assert.ok(d.auditAdd && d.auditAdd.length >= 1);
});

test('hasShipment/hasAlert: 참조 검증', () => {
  const e = new SimEngine();
  e.ensureSpawned(20);
  e.inject('canalClosure', true);
  const snap = e.snapshot();
  if (snap.type !== 'snapshot') throw new Error('type');
  assert.equal(e.hasShipment(snap.shipments[0]!.id), true);
  assert.equal(e.hasShipment('nope'), false);
  assert.equal(e.hasAlert('CLOSURE'), true);
});

test('모드 고정: 운송수단은 자기 모드 레인만 탄다', () => {
  const e = new SimEngine();
  e.spawn(40);
  const modes0 = (e.snapshot().type === 'snapshot'
    ? (e.snapshot() as Extract<ReturnType<SimEngine['snapshot']>, { type: 'snapshot' }>).conveyances
    : []
  ).map((c) => `${c.id}:${c.mode}`);
  for (let i = 0; i < 30; i += 1) e.tick(10);
  const snap = e.snapshot();
  if (snap.type !== 'snapshot') throw new Error('type');
  const modes1 = snap.conveyances.map((c) => `${c.id}:${c.mode}`);
  assert.deepEqual(modes1, modes0);
});
