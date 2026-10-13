import assert from 'node:assert/strict';
import test from 'node:test';

import { deriveAlerts, type AlertInput, type AlertThresholds } from '@/shared/sim/alerts';

const TH: AlertThresholds = { backlog: 3, batteryLow: 25, batteryCritical: 12, geofenceM: 1800 };

function input(partial: Partial<AlertInput>): AlertInput {
  return { riders: [], orders: [], thresholds: TH, ...partial };
}

test('DELAYED 주문마다 지연 알람을 낸다', () => {
  const out = deriveAlerts(
    input({ orders: [{ id: 'ORD-1', zone: '강남 A', status: 'DELAYED' }] }),
  );
  assert.equal(out.length, 1);
  assert.equal(out[0]!.kind, 'DELAY');
  assert.equal(out[0]!.severity, 'critical');
  assert.equal(out[0]!.orderId, 'ORD-1');
});

test('미배차가 임계를 넘으면 BACKLOG 알람 1건', () => {
  const orders = Array.from({ length: 5 }, (_, i) => ({ id: `ORD-${i}`, zone: '강남 A', status: 'QUEUED' }));
  const out = deriveAlerts(input({ orders }));
  const backlog = out.filter((a) => a.kind === 'BACKLOG');
  assert.equal(backlog.length, 1);
  // 임계 이하이면 나오지 않는다.
  const few = deriveAlerts(input({ orders: orders.slice(0, 3) }));
  assert.equal(few.filter((a) => a.kind === 'BACKLOG').length, 0);
});

test('배터리 임계에 따라 경고/위험 심각도가 갈린다', () => {
  const out = deriveAlerts(
    input({
      riders: [
        { id: 'RDR-1', zone: '강남 A', battery: 20, zoneDistM: null }, // low
        { id: 'RDR-2', zone: '강남 A', battery: 8, zoneDistM: null }, // critical
        { id: 'RDR-3', zone: '강남 A', battery: 80, zoneDistM: null }, // 정상
      ],
    }),
  );
  const batt = out.filter((a) => a.kind === 'BATTERY');
  assert.equal(batt.length, 2);
  assert.equal(batt.find((a) => a.riderId === 'RDR-1')!.severity, 'warning');
  assert.equal(batt.find((a) => a.riderId === 'RDR-2')!.severity, 'critical');
});

test('권역 중심에서 반경 밖이면 지오펜스 알람', () => {
  const out = deriveAlerts(
    input({
      riders: [
        { id: 'RDR-1', zone: '강남 A', battery: 90, zoneDistM: 2500 }, // 이탈
        { id: 'RDR-2', zone: '강남 A', battery: 90, zoneDistM: 500 }, // 권역 내
        { id: 'RDR-3', zone: '강남 A', battery: 90, zoneDistM: null }, // 미배정
      ],
    }),
  );
  const geo = out.filter((a) => a.kind === 'GEOFENCE');
  assert.equal(geo.length, 1);
  assert.equal(geo[0]!.riderId, 'RDR-1');
});

test('결과는 id 사전순으로 결정론적 정렬된다', () => {
  const out = deriveAlerts(
    input({
      riders: [
        { id: 'RDR-9', zone: '강남 A', battery: 5, zoneDistM: null },
        { id: 'RDR-1', zone: '강남 A', battery: 5, zoneDistM: null },
      ],
    }),
  );
  const ids = out.map((a) => a.id);
  assert.deepEqual(ids, [...ids].sort((a, b) => a.localeCompare(b)));
});
