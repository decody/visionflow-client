import assert from 'node:assert/strict';
import test from 'node:test';

import { zoneSummary } from '@/shared/stats/zone-kpi';

const ZONES = ['강남 A', '강남 B', '강남 C'];

test('권역 순서를 그대로 유지하고 라이더·주문을 집계한다', () => {
  const rows = zoneSummary(
    ZONES,
    [
      { zone: '강남 A', status: 'DELIVERING' },
      { zone: '강남 A', status: 'IDLE' },
      { zone: '강남 B', status: 'DELIVERING' },
    ],
    [
      { zone: '강남 A', status: 'QUEUED', priority: 'NORMAL' },
      { zone: '강남 A', status: 'DELAYED', priority: 'EXPRESS' },
      { zone: '강남 B', status: 'DELIVERING', priority: 'EXPRESS' },
    ],
  );
  assert.deepEqual(rows.map((r) => r.zone), ZONES);
  const a = rows[0]!;
  assert.equal(a.riders, 2);
  assert.equal(a.delivering, 1);
  assert.equal(a.queued, 1);
  assert.equal(a.delayed, 1);
  assert.equal(a.express, 1); // DELAYED지만 터미널이 아니므로 특급에 포함
  assert.equal(rows[2]!.riders, 0); // 강남 C는 비어 있어도 행이 존재
});

test('터미널(완료·실패) 특급은 express 집계에서 제외한다', () => {
  const rows = zoneSummary(
    ZONES,
    [],
    [
      { zone: '강남 A', status: 'DELIVERED', priority: 'EXPRESS' },
      { zone: '강남 A', status: 'DELIVERING', priority: 'EXPRESS' },
    ],
  );
  assert.equal(rows[0]!.express, 1);
});

test('알 수 없는 권역의 데이터는 무시한다', () => {
  const rows = zoneSummary(
    ZONES,
    [{ zone: '서초 Z', status: 'DELIVERING' }],
    [{ zone: '서초 Z', status: 'QUEUED', priority: 'NORMAL' }],
  );
  assert.equal(rows.reduce((n, r) => n + r.riders + r.queued, 0), 0);
});
