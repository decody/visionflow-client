import type {
  DeltaMessage,
  SnapshotMessage,
} from '@/entities/oht/types';
import assert from 'node:assert/strict';
import test from 'node:test';

import {
  decodeVehicleId,
  decodeWireMessage,
  encodeVehicleId,
  encodeWireMessage,
  type WireDelta,
} from './wire-codec';

test('vehicle id encodes to integer and decodes back with padding', () => {
  for (const id of ['OHT-0001', 'OHT-0042', 'OHT-5000']) {
    assert.equal(decodeVehicleId(encodeVehicleId(id)), id);
  }
  assert.equal(encodeVehicleId('OHT-0001'), 1);
  assert.equal(decodeVehicleId(42), 'OHT-0042');
});

test('delta round-trips through wire encoding without loss', () => {
  const delta: DeltaMessage = {
    type: 'delta',
    seq: 7,
    ts: 1000,
    upd: [
      { id: 'OHT-0001', x: 38.27, y: 41.24 },
      { id: 'OHT-0125', x: 10.5, y: 20.1, blockedBy: 'OHT-0126' },
    ],
    add: [
      {
        id: 'OHT-0300',
        x: 1,
        y: 2,
        heading: 0,
        status: 'MOVING',
        jobId: null,
        speed: 1.2,
      },
    ],
    del: ['OHT-0002', 'OHT-4999'],
    alarms: [],
  };
  const decoded = decodeWireMessage(encodeWireMessage(delta));
  assert.deepEqual(decoded, delta);
});

test('wire delta uses numeric i and drops the id string on upd', () => {
  const delta: DeltaMessage = {
    type: 'delta',
    seq: 1,
    ts: 0,
    upd: [{ id: 'OHT-0001', x: 1, y: 2 }],
    alarms: [],
  };
  const wire = encodeWireMessage(delta) as WireDelta;
  assert.equal(wire.upd[0]!.i, 1);
  assert.ok(!('id' in wire.upd[0]!));
  // 압축 후 JSON이 실제로 더 짧다.
  assert.ok(
    JSON.stringify(wire).length < JSON.stringify(delta).length,
  );
});

test('snapshot round-trips and preserves operations untouched', () => {
  const snap: SnapshotMessage = {
    type: 'snapshot',
    seq: 3,
    ts: 500,
    vehicles: [
      {
        id: 'OHT-0001',
        x: 1,
        y: 2,
        heading: 90,
        status: 'IDLE',
        jobId: null,
        speed: 0,
        route: [],
      },
    ],
    operations: {
      rule: 'priority',
      jobs: [],
      carriers: [],
      ports: [],
      completed: 0,
      averageTransportSec: 0,
    },
  };
  const decoded = decodeWireMessage(encodeWireMessage(snap));
  assert.deepEqual(decoded, snap);
});
