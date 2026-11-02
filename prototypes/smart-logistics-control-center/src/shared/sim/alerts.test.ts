import assert from 'node:assert/strict';
import { test } from 'node:test';

import { deriveAlerts, type AlertSignals } from './alerts';

const base: AlertSignals = {
  atRisk: 0,
  customsHold: 0,
  exceptions: 0,
  prevExceptions: 0,
  congestedHubs: [],
  scenarios: [],
};

test('신호 없으면 알람 없음', () => {
  assert.equal(deriveAlerts(base).length, 0);
});

test('SLA: 임계값에 따라 심각도', () => {
  assert.equal(deriveAlerts({ ...base, atRisk: 3 })[0]?.severity, 'warning');
  assert.equal(deriveAlerts({ ...base, atRisk: 20 })[0]?.severity, 'critical');
});

test('허브 혼잡: 대기열 있으면 CAPACITY', () => {
  const a = deriveAlerts({
    ...base,
    congestedHubs: [{ id: 'SGSIN', name: 'Singapore', used: 40, cap: 40, queued: 5 }],
  });
  const hub = a.find((x) => x.id === 'HUB-SGSIN');
  assert.equal(hub?.kind, 'CAPACITY');
  assert.equal(hub?.severity, 'critical');
  assert.equal(hub?.focus, 'SGSIN');
});

test('허브 포화(대기열 없음) → DWELL 경고', () => {
  const a = deriveAlerts({
    ...base,
    congestedHubs: [{ id: 'NLRTM', name: 'Rotterdam', used: 44, cap: 44, queued: 0 }],
  });
  assert.equal(a.find((x) => x.id === 'HUB-NLRTM')?.kind, 'DWELL');
});

test('운하 폐쇄 시나리오 → CLOSURE critical', () => {
  const a = deriveAlerts({ ...base, scenarios: ['canalClosure'] });
  assert.equal(a.find((x) => x.id === 'CLOSURE')?.severity, 'critical');
});

test('예외 증가분만 알람', () => {
  assert.equal(deriveAlerts({ ...base, exceptions: 5, prevExceptions: 5 }).length, 0);
  assert.equal(deriveAlerts({ ...base, exceptions: 6, prevExceptions: 5 }).length, 1);
});

test('결정론 정렬: critical 먼저', () => {
  const a = deriveAlerts({ ...base, atRisk: 20, scenarios: ['weather'] });
  assert.equal(a[0]?.severity, 'critical');
});
