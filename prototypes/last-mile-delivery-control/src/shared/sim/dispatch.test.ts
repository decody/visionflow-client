import assert from 'node:assert/strict';
import test from 'node:test';

import { chooseOrder, type Dispatchable } from '@/shared/sim/dispatch';

function cand(id: string, over: Partial<Dispatchable> = {}): Dispatchable {
  return { id, priority: 'NORMAL', createdSec: 0, costToPickup: 0, costTotal: 0, ...over };
}

test('빈 풀이면 null을 반환한다', () => {
  assert.equal(chooseOrder('FIFO', []), null);
});

test('EXPRESS 주문이 있으면 규칙과 무관하게 먼저 고른다', () => {
  const pool = [
    cand('A', { priority: 'NORMAL', costToPickup: 1, costTotal: 1, createdSec: 0 }),
    cand('B', { priority: 'EXPRESS', costToPickup: 100, costTotal: 100, createdSec: 100 }),
  ];
  // 어떤 규칙이든 비용이 크고 늦게 와도 EXPRESS(B)가 선택돼야 한다.
  assert.equal(chooseOrder('NEAREST', pool)!.id, 'B');
  assert.equal(chooseOrder('FASTEST_ETA', pool)!.id, 'B');
  assert.equal(chooseOrder('FIFO', pool)!.id, 'B');
});

test('FIFO는 가장 오래 대기한 주문을 고른다', () => {
  const pool = [cand('A', { createdSec: 30 }), cand('B', { createdSec: 10 }), cand('C', { createdSec: 20 })];
  assert.equal(chooseOrder('FIFO', pool)!.id, 'B');
});

test('NEAREST는 집화지까지 최단거리 주문을 고른다', () => {
  const pool = [cand('A', { costToPickup: 500 }), cand('B', { costToPickup: 120 }), cand('C', { costToPickup: 900 })];
  assert.equal(chooseOrder('NEAREST', pool)!.id, 'B');
});

test('FASTEST_ETA는 총 이동거리 최소 주문을 고른다', () => {
  const pool = [cand('A', { costTotal: 3000 }), cand('B', { costTotal: 1500 }), cand('C', { costTotal: 2200 })];
  assert.equal(chooseOrder('FASTEST_ETA', pool)!.id, 'B');
});

test('동점은 주문 id 사전순으로 끊는다', () => {
  const pool = [cand('ORD-2', { costTotal: 100 }), cand('ORD-1', { costTotal: 100 })];
  assert.equal(chooseOrder('FASTEST_ETA', pool)!.id, 'ORD-1');
});
