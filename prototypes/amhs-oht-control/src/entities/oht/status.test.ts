import test from 'node:test';
import assert from 'node:assert/strict';

import { CODE_STATUS, STATUS_CODE, filterCodeOf } from '@/entities/oht/status';
import type { OhtStatus } from '@/entities/oht/types';

test('filterCodeOf: ALL은 -1', () => {
  assert.equal(filterCodeOf('ALL'), -1);
});

test('filterCodeOf: DELAYED_ONLY는 DELAYED 코드', () => {
  assert.equal(filterCodeOf('DELAYED_ONLY'), STATUS_CODE.DELAYED);
  assert.equal(filterCodeOf('DELAYED_ONLY'), 5);
});

test('filterCodeOf: 개별 상태 코드', () => {
  assert.equal(filterCodeOf('MOVING'), 0);
  assert.equal(filterCodeOf('IDLE'), 1);
  assert.equal(filterCodeOf('LOADING'), 2);
  assert.equal(filterCodeOf('DOWN'), 6);
});

test('STATUS_CODE ↔ CODE_STATUS 역매핑 일관성', () => {
  (Object.keys(STATUS_CODE) as OhtStatus[]).forEach((s) => {
    assert.equal(CODE_STATUS[STATUS_CODE[s]], s);
  });
  assert.equal(CODE_STATUS.length, Object.keys(STATUS_CODE).length);
});
