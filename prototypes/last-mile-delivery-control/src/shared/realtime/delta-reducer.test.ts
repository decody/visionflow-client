import assert from 'node:assert/strict';
import test from 'node:test';

import type { OrderLifecycle } from '@/entities/delivery/types';
import { DeltaReducer } from '@/shared/realtime/delta-reducer';
import type { AlertWire, DeltaMessage, OrderWire, RiderWire, SnapshotMessage } from '@/shared/realtime/types';

function rider(id: string, lon = 127, lat = 37.5): RiderWire {
  return {
    id, name: '라이더', zone: '강남 A', status: 'DELIVERING',
    lon, lat, heading: 0, speed: 5, completed: 0, total: 20, etaMin: 10,
  };
}

function order(id: string, status: OrderLifecycle = 'QUEUED'): OrderWire {
  return {
    id, zone: '강남 A', customer: '역삼 1', priority: 'NORMAL',
    status, riderId: null, etaMin: 12, waitMin: 0,
  };
}

function alert(id: string, status: AlertWire['status'] = 'OPEN'): AlertWire {
  return { id, kind: 'DELAY', severity: 'critical', status, title: '배송 지연', detail: '강남 A', ageSec: 1 };
}

function snapshot(seq: number, riders: RiderWire[]): SnapshotMessage {
  return { type: 'snapshot', seq, tick: seq, riders };
}

function delta(seq: number, upd: RiderWire[], extra: Partial<DeltaMessage> = {}): DeltaMessage {
  return { type: 'delta', seq, tick: seq, upd, ...extra };
}

test('스냅샷 후 순차 델타를 수용하고 코얼레싱한다', () => {
  const r = new DeltaReducer();
  r.ingest(snapshot(0, [rider('RDR-1000')]));
  r.ingest(delta(1, [rider('RDR-1000', 127.01)]));
  r.ingest(delta(2, [rider('RDR-1000', 127.02)])); // 같은 id → 최신값만
  assert.equal(r.pendingSize(), 1);
  const batch = r.drain();
  assert.equal(batch.updates.length, 1);
  assert.equal(batch.updates[0]!.lon, 127.02);
  assert.ok(batch.snapshot);
});

test('중복/과거 seq는 무시한다', () => {
  const r = new DeltaReducer();
  r.ingest(snapshot(5, [rider('RDR-1000')]));
  const res = r.ingest(delta(5, [rider('RDR-1000', 999)])); // seq <= expected-1
  assert.equal(res.needResync, false);
  assert.equal(res.updCount, 0);
});

test('seq gap은 재동기를 트리거하고 버퍼를 비운다', () => {
  const r = new DeltaReducer();
  r.ingest(snapshot(0, [rider('RDR-1000')]));
  r.ingest(delta(1, [rider('RDR-1000', 127.01)]));
  const res = r.ingest(delta(3, [rider('RDR-1000', 127.09)])); // 2를 건너뜀
  assert.equal(res.needResync, true);
  // gap 이후 스냅샷 전까지 델타는 버려진다
  const after = r.ingest(delta(4, [rider('RDR-1000', 127.1)]));
  assert.equal(after.needResync, false);
  assert.equal(after.updCount, 0);
});

test('add/del이 반영된다', () => {
  const r = new DeltaReducer();
  r.ingest(snapshot(0, [rider('RDR-1000')]));
  r.ingest(delta(1, [], { add: [rider('RDR-2000')], del: ['RDR-1000'] }));
  const batch = r.drain();
  assert.deepEqual(batch.additions?.map((a) => a.id), ['RDR-2000']);
  assert.deepEqual(batch.deletions, ['RDR-1000']);
});

test('주문 채널도 스냅샷·코얼레싱·add/del을 처리한다', () => {
  const r = new DeltaReducer();
  r.ingest({ type: 'snapshot', seq: 0, tick: 0, riders: [], orders: [order('ORD-1')] });
  r.ingest(
    delta(1, [], {
      ordersUpd: [order('ORD-1', 'TO_PICKUP')],
      ordersAdd: [order('ORD-2')],
      ordersDel: ['ORD-9'],
    }),
  );
  r.ingest(delta(2, [], { ordersUpd: [order('ORD-1', 'DELIVERING')] })); // 같은 id → 최신값만
  const batch = r.drain();
  assert.deepEqual(batch.orders?.map((o) => o.id), ['ORD-1']);
  assert.equal(batch.orderUpdates.length, 1);
  assert.equal(batch.orderUpdates[0]!.status, 'DELIVERING');
  assert.deepEqual(batch.orderAdditions?.map((o) => o.id), ['ORD-2']);
  assert.deepEqual(batch.orderDeletions, ['ORD-9']);
});

test('같은 배치에서 add된 주문의 후속 upd는 add에 병합된다', () => {
  const r = new DeltaReducer();
  r.ingest({ type: 'snapshot', seq: 0, tick: 0, riders: [], orders: [] });
  r.ingest(delta(1, [], { ordersAdd: [order('ORD-2')], ordersUpd: [order('ORD-2', 'ASSIGNED')] }));
  const batch = r.drain();
  assert.equal(batch.orderUpdates.length, 0);
  assert.deepEqual(batch.orderAdditions?.map((o) => o.status), ['ASSIGNED']);
});

test('알람 채널도 스냅샷·코얼레싱·add/del을 처리한다', () => {
  const r = new DeltaReducer();
  r.ingest({ type: 'snapshot', seq: 0, tick: 0, riders: [], alerts: [alert('ALT-1')] });
  r.ingest(
    delta(1, [], {
      alertsUpd: [alert('ALT-1', 'ACKNOWLEDGED')],
      alertsAdd: [alert('ALT-2')],
      alertsDel: ['ALT-9'],
    }),
  );
  r.ingest(delta(2, [], { alertsUpd: [alert('ALT-1', 'RESOLVED')] })); // 같은 id → 최신값만
  const batch = r.drain();
  assert.deepEqual(batch.alerts?.map((a) => a.id), ['ALT-1']);
  assert.equal(batch.alertUpdates.length, 1);
  assert.equal(batch.alertUpdates[0]!.status, 'RESOLVED');
  assert.deepEqual(batch.alertAdditions?.map((a) => a.id), ['ALT-2']);
  assert.deepEqual(batch.alertDeletions, ['ALT-9']);
});

test('시나리오 meta는 최신값으로 전달된다', () => {
  const r = new DeltaReducer();
  r.ingest(snapshot(0, []));
  r.ingest(delta(1, [], { meta: { incident: true, surge: false, closure: false, demoActive: false } }));
  r.ingest(delta(2, [], { meta: { incident: false, surge: true, closure: true, demoActive: true, demoLabel: '수요 서지' } }));
  const batch = r.drain();
  assert.equal(batch.meta?.surge, true);
  assert.equal(batch.meta?.incident, false);
  assert.equal(batch.meta?.closure, true);
  assert.equal(batch.meta?.demoLabel, '수요 서지');
});

test('신호 채널은 스냅샷 전체·델타 flip을 id별 최신으로 전달한다', () => {
  const r = new DeltaReducer();
  r.ingest({ type: 'snapshot', seq: 0, tick: 0, riders: [], signals: [{ id: 'SIG-A', state: 'GO' }, { id: 'SIG-B', state: 'STOP' }] });
  r.ingest(delta(1, [], { signalsUpd: [{ id: 'SIG-A', state: 'STOP' }] }));
  r.ingest(delta(2, [], { signalsUpd: [{ id: 'SIG-A', state: 'GO' }] })); // 같은 id → 최신값만
  const batch = r.drain();
  assert.deepEqual(batch.signals?.map((s) => s.id), ['SIG-A', 'SIG-B']);
  assert.equal(batch.signalUpdates.length, 1);
  assert.equal(batch.signalUpdates[0]!.state, 'GO');
});
