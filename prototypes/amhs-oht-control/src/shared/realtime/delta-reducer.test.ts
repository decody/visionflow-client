import assert from 'node:assert/strict';
import test from 'node:test';

import type {
  DeltaMessage,
  SnapshotMessage,
  VehicleState,
} from '@/entities/oht/types';
import { DeltaReducer } from '@/shared/realtime/delta-reducer';

function vehicle(id: string, x = 0, y = 0): VehicleState {
  return {
    id,
    x,
    y,
    heading: 0,
    status: 'MOVING',
    jobId: null,
    speed: 1,
  };
}

function snapshot(
  seq: number,
  vehicles: VehicleState[],
): SnapshotMessage {
  return { type: 'snapshot', seq, ts: 0, vehicles };
}

function delta(
  seq: number,
  upd: DeltaMessage['upd'],
  extra: Partial<DeltaMessage> = {},
): DeltaMessage {
  return { type: 'delta', seq, ts: 0, upd, ...extra };
}

test('snapshot 수신 → drain에 스냅샷 포함', () => {
  const r = new DeltaReducer();
  r.ingest(snapshot(1, [vehicle('OHT-1')]));
  assert.ok(r.hasPending());
  const b = r.drain();
  assert.equal(b.snapshot?.length, 1);
  assert.equal(r.hasPending(), false); // drain이 비움
});

test('델타 코얼레싱: 같은 id 최신값만 유지', () => {
  const r = new DeltaReducer();
  r.ingest(snapshot(1, []));
  r.ingest(delta(2, [{ id: 'OHT-1', x: 10 }]));
  r.ingest(delta(3, [{ id: 'OHT-1', x: 20 }])); // 같은 id 갱신
  const b = r.drain();
  assert.equal(b.updates.length, 1);
  assert.equal(b.updates[0]?.x, 20); // 최신값
});

test('updCount는 개별 upd 개수를 보고', () => {
  const r = new DeltaReducer();
  r.ingest(snapshot(1, []));
  const res = r.ingest(
    delta(2, [
      { id: 'A', x: 1 },
      { id: 'B', x: 2 },
    ]),
  );
  assert.equal(res.updCount, 2);
  assert.equal(res.needResync, false);
});

test('seq gap 감지 → needResync, 버퍼 폐기', () => {
  const r = new DeltaReducer();
  r.ingest(snapshot(1, [])); // expected 2
  r.ingest(delta(2, [{ id: 'A', x: 1 }])); // ok, expected 3
  const res = r.ingest(delta(5, [{ id: 'B', x: 9 }])); // gap!
  assert.equal(res.needResync, true);
  assert.equal(r.pendingSize(), 0); // 폐기됨
});

test('gap 이후 스냅샷으로 재동기 정상화', () => {
  const r = new DeltaReducer();
  r.ingest(snapshot(1, []));
  r.ingest(delta(5, [{ id: 'A', x: 1 }])); // gap → 폐기, expected=null
  r.ingest(snapshot(10, [vehicle('A')])); // 재동기
  const next = r.ingest(delta(11, [{ id: 'A', x: 7 }]));
  assert.equal(next.needResync, false);
});

test('알람 누적', () => {
  const r = new DeltaReducer();
  r.ingest(snapshot(1, []));
  r.ingest(
    delta(2, [], {
      alarms: [
        {
          id: 'AL-1',
          kind: 'DELAY',
          severity: 'warn',
          ts: 0,
          message: 'x',
        },
      ],
    }),
  );
  const b = r.drain();
  assert.equal(b.alarms.length, 1);
  assert.equal(b.alarms[0]?.kind, 'DELAY');
});

test('duplicate seq is ignored and recovery rejects deltas until snapshot', () => {
  const r = new DeltaReducer();
  r.ingest(snapshot(1, [vehicle('A')]));
  r.drain();
  r.ingest(delta(2, [{ id: 'A', x: 2 }]));
  assert.equal(
    r.ingest(delta(2, [{ id: 'A', x: 99 }])).needResync,
    false,
  );
  assert.equal(r.drain().updates[0]?.x, 2);
  assert.equal(r.ingest(delta(5, [])).needResync, true);
  r.ingest(delta(6, [{ id: 'A', x: 6 }]));
  assert.equal(r.hasPending(), false);
  r.ingest(snapshot(6, [vehicle('A', 6)]));
  r.ingest(delta(7, [{ id: 'A', x: 7 }]));
  assert.equal(r.drain().updates[0]?.x, 7);
});

test('add/update/delete order survives frame coalescing', () => {
  const r = new DeltaReducer();
  r.ingest(snapshot(1, []));
  r.drain();
  r.ingest(delta(2, [], { add: [vehicle('A')] }));
  r.ingest(delta(3, [{ id: 'A', x: 3 }]));
  let batch = r.drain();
  assert.equal(batch.additions?.[0]?.id, 'A');
  assert.equal(batch.updates[0]?.x, 3);
  r.ingest(delta(4, [], { del: ['A'] }));
  r.ingest(delta(5, [], { add: [vehicle('A', 5)] }));
  batch = r.drain();
  assert.deepEqual(batch.deletions, []);
  assert.equal(batch.additions?.[0]?.x, 5);
  r.ingest(delta(6, [], { add: [vehicle('B')] }));
  r.ingest(delta(7, [], { del: ['B'] }));
  batch = r.drain();
  assert.deepEqual(batch.additions, []);
  assert.deepEqual(batch.deletions, ['B']);
});
