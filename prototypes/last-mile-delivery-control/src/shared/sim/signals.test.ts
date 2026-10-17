import assert from 'node:assert/strict';
import test from 'node:test';

import { SIGNAL_CYCLE, signalOffset, signalStateAt } from '@/shared/sim/signals';

const PERIOD = SIGNAL_CYCLE.green + SIGNAL_CYCLE.red;

test('신호 위상은 주기적이다(simSec + period = 동일 상태)', () => {
  for (let i = 0; i < 4; i += 1) {
    for (let t = 0; t < PERIOD; t += 1) {
      assert.equal(signalStateAt(i, t), signalStateAt(i, t + PERIOD));
    }
  }
});

test('초록 구간은 GO, 빨강 구간은 STOP이다(오프셋 반영)', () => {
  const i = 0;
  const off = signalOffset(i);
  // 오프셋을 상쇄한 로컬 위상 기준으로 green/red 경계를 확인한다.
  assert.equal(signalStateAt(i, -off + 0), 'GO');
  assert.equal(signalStateAt(i, -off + SIGNAL_CYCLE.green - 1), 'GO');
  assert.equal(signalStateAt(i, -off + SIGNAL_CYCLE.green), 'STOP');
  assert.equal(signalStateAt(i, -off + PERIOD - 1), 'STOP');
});

test('교차로마다 오프셋이 달라 동시 점멸하지 않는다', () => {
  // 서로 다른 인덱스는 적어도 하나의 시각에서 상태가 엇갈려야 한다.
  let differ = false;
  for (let t = 0; t < PERIOD && !differ; t += 1) {
    if (signalStateAt(0, t) !== signalStateAt(1, t)) differ = true;
  }
  assert.ok(differ, '두 신호가 항상 같은 상태면 오프셋이 무의미하다');
});
