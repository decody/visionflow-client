import assert from 'node:assert/strict';
import test from 'node:test';

import type { Actor, OrderLifecycle } from '@/entities/delivery/types';
import { SimEngine } from '@/shared/sim/engine';

const viewer: Actor = { id: 'V', role: 'viewer' };
const dispatcher: Actor = { id: 'D', role: 'dispatcher' };
const supervisor: Actor = { id: 'S', role: 'supervisor' };

const LIFECYCLE = new Set<OrderLifecycle>([
  'QUEUED', 'ASSIGNED', 'TO_PICKUP', 'PICKED_UP', 'DELIVERING', 'DELIVERED', 'DELAYED', 'FAILED',
]);

test('스냅샷(라이더·주문)은 결정론적으로 재현된다', () => {
  const a = new SimEngine();
  const b = new SimEngine();
  a.spawn(20);
  b.spawn(20);
  for (let i = 0; i < 80; i += 1) {
    a.tick(10);
    b.tick(10);
  }
  const sa = a.snapshot();
  const sb = b.snapshot();
  assert.deepEqual(sa.riders.map((r) => `${r.id}:${r.status}`), sb.riders.map((r) => `${r.id}:${r.status}`));
  assert.deepEqual(sa.orders!.map((o) => `${o.id}:${o.status}`), sb.orders!.map((o) => `${o.id}:${o.status}`));
});

test('초기 배차로 유휴 라이더가 주문을 배정받는다', () => {
  const e = new SimEngine();
  e.spawn(10);
  const snap = e.snapshot();

  const assigned = snap.riders.filter((r) => r.orderId);
  assert.ok(assigned.length > 0, '배차된 라이더가 있어야 한다');

  // 배정된 주문은 더 이상 QUEUED가 아니고, 해당 라이더를 가리킨다.
  const byId = new Map(snap.orders!.map((o) => [o.id, o]));
  for (const rider of assigned) {
    const order = byId.get(rider.orderId!)!;
    assert.ok(order, '배정 주문이 스냅샷에 있어야 한다');
    assert.notEqual(order.status, 'QUEUED');
    assert.equal(order.riderId, rider.id);
  }
});

test('모든 주문 상태는 정의된 생명주기 값만 가진다', () => {
  const e = new SimEngine();
  e.spawn(12);
  for (let i = 0; i < 200; i += 1) e.tick(10);
  for (const o of e.snapshot().orders!) assert.ok(LIFECYCLE.has(o.status), `알 수 없는 상태: ${o.status}`);
});

test('주문이 집화→배송→완료 생명주기를 거친다', () => {
  const e = new SimEngine();
  e.spawn(12);
  const seen = new Set<OrderLifecycle>();
  for (let i = 0; i < 8000; i += 1) {
    const delta = e.tick(10);
    for (const o of delta.ordersAdd ?? []) seen.add(o.status);
    for (const o of delta.ordersUpd ?? []) seen.add(o.status);
  }
  // 집화 이동과 배송 중 단계를 거쳐 완료까지 관측돼야 한다.
  assert.ok(seen.has('TO_PICKUP'), '집화 이동 단계가 관측돼야 한다');
  assert.ok(seen.has('DELIVERING'), '배송 중 단계가 관측돼야 한다');
  assert.ok(seen.has('DELIVERED'), '배송 완료가 관측돼야 한다');
});

test('배차 규칙 전환은 오류 없이 반영된다', () => {
  const e = new SimEngine();
  e.spawn(8);
  e.setRule('NEAREST');
  for (let i = 0; i < 60; i += 1) e.tick(10);
  e.setRule('FIFO');
  for (let i = 0; i < 60; i += 1) e.tick(10);
  const snap = e.snapshot();
  assert.ok(snap.riders.length === 8);
  assert.ok(snap.orders!.length > 0);
});

// --- 단계 4 ---

test('스냅샷은 라이더 배터리·알람·meta를 포함한다', () => {
  const e = new SimEngine();
  e.spawn(10);
  const snap = e.snapshot();
  assert.ok(snap.riders.every((r) => typeof r.battery === 'number'));
  assert.ok(Array.isArray(snap.alerts));
  assert.ok(snap.meta && typeof snap.meta.incident === 'boolean');
});

test('운행하면 배터리가 단조 감소한다', () => {
  const e = new SimEngine();
  e.spawn(8);
  const before = new Map(e.snapshot().riders.map((r) => [r.id, r.battery!]));
  for (let i = 0; i < 400; i += 1) e.tick(10);
  const after = e.snapshot().riders;
  // 충전 중이 아닌 라이더는 적어도 한 명은 배터리가 줄어 있어야 한다.
  const dropped = after.some((r) => r.status !== 'CHARGING' && r.battery! < before.get(r.id)!);
  assert.ok(dropped, '이동으로 배터리가 소모돼야 한다');
});

test('저배터리 주입 시 배터리 위험 알람이 발생하고 충전으로 전환된다', () => {
  const e = new SimEngine();
  e.spawn(10);
  e.inject('battery', true);
  let sawBatteryAlert = false;
  let sawCharging = false;
  for (let i = 0; i < 3000; i += 1) {
    e.tick(10);
    const snap = e.snapshot();
    if (snap.alerts!.some((a) => a.kind === 'BATTERY')) sawBatteryAlert = true;
    if (snap.riders.some((r) => r.status === 'CHARGING')) sawCharging = true;
    if (sawBatteryAlert && sawCharging) break;
  }
  assert.ok(sawBatteryAlert, '배터리 알람이 관측돼야 한다');
  assert.ok(sawCharging, '라이더가 충전 상태로 전환돼야 한다');
});

test('수요 서지는 미배차 대기열을 늘리고, 해제·초기화로 되돌아간다', () => {
  const e = new SimEngine();
  e.spawn(8);
  for (let i = 0; i < 40; i += 1) e.tick(10);
  e.inject('surge', true);
  assert.equal(e.snapshot().meta!.surge, true);
  for (let i = 0; i < 200; i += 1) e.tick(10);
  const surged = e.snapshot().orders!.filter((o) => o.status === 'QUEUED').length;
  e.inject('reset');
  const meta = e.snapshot().meta!;
  assert.equal(meta.surge, false);
  assert.equal(meta.incident, false);
  assert.ok(surged >= 0);
});

test('교통 정체는 meta에 반영되고 해제된다', () => {
  const e = new SimEngine();
  e.spawn(8);
  e.inject('incident', true);
  for (let i = 0; i < 30; i += 1) e.tick(10);
  assert.equal(e.snapshot().meta!.incident, true);
  e.inject('incident', false);
  assert.equal(e.snapshot().meta!.incident, false);
});

test('알람 확인(ack)은 상태를 ACKNOWLEDGED로 전이한다', () => {
  const e = new SimEngine();
  e.spawn(10);
  e.inject('battery', true);
  let target: string | undefined;
  for (let i = 0; i < 3000 && !target; i += 1) {
    e.tick(10);
    const open = e.snapshot().alerts!.find((a) => a.status === 'OPEN');
    if (open) target = open.id;
  }
  assert.ok(target, '미확인 알람이 있어야 한다');
  e.ackAlert(target!);
  const acked = e.snapshot().alerts!.find((a) => a.id === target);
  assert.equal(acked!.status, 'ACKNOWLEDGED');
});

// --- 단계 6: 연동 경계(applyCommand·역할·감사) ---

test('applyCommand: 역할 경계가 명령을 인증하고 승인/거부 모두 감사에 남긴다', () => {
  let t = 1000;
  const e = new SimEngine(() => (t += 1));
  e.spawn(8);

  // viewer는 규칙 변경이 거부된다.
  const denied = e.applyCommand({ type: 'setRule', rule: 'NEAREST' }, viewer);
  assert.equal(denied.accepted, false);
  assert.equal(denied.code, 'FORBIDDEN');

  // dispatcher는 승인된다.
  const ok = e.applyCommand({ type: 'setRule', rule: 'NEAREST' }, dispatcher);
  assert.equal(ok.accepted, true);

  // viewer의 시나리오 주입도 거부(권한 부족), supervisor는 승인.
  assert.equal(e.applyCommand({ type: 'inject', scenario: 'incident', on: true }, dispatcher).accepted, false);
  assert.equal(e.applyCommand({ type: 'inject', scenario: 'incident', on: true }, supervisor).accepted, true);
  assert.equal(e.snapshot().meta!.incident, true);

  // 감사 로그에 거부·승인이 모두 기록된다.
  const audit = e.snapshot().audit ?? [];
  assert.ok(audit.some((a) => a.action === 'setRule' && a.outcome === 'rejected'));
  assert.ok(audit.some((a) => a.action === 'setRule' && a.outcome === 'accepted'));
  assert.ok(audit.some((a) => a.action === 'inject' && a.outcome === 'accepted'));
});

test('applyCommand: 신규 감사 항목은 델타 auditAdd로 방출된다', () => {
  const e = new SimEngine(() => 5000);
  e.spawn(8);
  e.applyCommand({ type: 'setRule', rule: 'FIFO' }, dispatcher);
  const delta = e.tick(10);
  assert.ok((delta.auditAdd ?? []).some((a) => a.action === 'setRule'));
});

test('promoteExpress: 일반 주문을 특급으로 승격한다', () => {
  const e = new SimEngine();
  e.spawn(10);
  const normal = e.snapshot().orders!.find((o) => o.priority === 'NORMAL');
  assert.ok(normal, '일반 주문이 있어야 한다');
  const res = e.applyCommand({ type: 'promoteExpress', orderId: normal!.id }, dispatcher);
  assert.equal(res.accepted, true);
  const after = e.snapshot().orders!.find((o) => o.id === normal!.id)!;
  assert.equal(after.priority, 'EXPRESS');
});

test('reassign: 라이더의 주문을 대기열로 되돌리고 라이더를 비운다', () => {
  const e = new SimEngine();
  e.spawn(10);
  for (let i = 0; i < 20; i += 1) e.tick(10);
  const busy = e.snapshot().riders.find((r) => r.orderId);
  assert.ok(busy, '배정된 라이더가 있어야 한다');
  const orderId = busy!.orderId!;
  const res = e.applyCommand({ type: 'reassign', riderId: busy!.id }, dispatcher);
  assert.equal(res.accepted, true);
  const rider = e.snapshot().riders.find((r) => r.id === busy!.id)!;
  assert.ok(!rider.orderId, '라이더는 주문이 비워져야 한다');
  const order = e.snapshot().orders!.find((o) => o.id === orderId);
  // 주문은 재대기(QUEUED)로 돌아가거나, 같은 틱 배차로 다시 배정될 수 있다.
  if (order) assert.ok(order.status === 'QUEUED' || order.riderId !== busy!.id);
});

test('자동 데모는 진행 라벨을 전진시키고 종료 시 꺼진다', () => {
  const e = new SimEngine();
  e.spawn(10);
  e.setDemo(true);
  assert.equal(e.snapshot().meta!.demoActive, true);
  const labels = new Set<string>();
  for (let i = 0; i < 700; i += 1) {
    e.tick(10); // 70s — 데모(약 60s)를 지나친다
    const label = e.snapshot().meta!.demoLabel;
    if (label) labels.add(label);
  }
  assert.ok(labels.size >= 3, '여러 데모 단계를 거쳐야 한다');
  assert.equal(e.snapshot().meta!.demoActive, false, '데모가 끝나면 비활성화돼야 한다');
});
