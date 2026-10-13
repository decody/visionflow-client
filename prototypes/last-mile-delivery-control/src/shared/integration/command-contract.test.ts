import type { Actor } from '@/entities/delivery/types';
import assert from 'node:assert/strict';
import test from 'node:test';
import {
  authorizeCommand,
  buildAuditEntry,
  describeCommand,
} from './command-contract';

const viewer: Actor = { id: 'V', role: 'viewer' };
const dispatcher: Actor = { id: 'D', role: 'dispatcher' };
const supervisor: Actor = { id: 'S', role: 'supervisor' };

test('authorizeCommand: 역할 등급별 권한', () => {
  // viewer는 읽기만
  assert.equal(authorizeCommand(viewer, 'snapshot').accepted, true);
  assert.equal(authorizeCommand(viewer, 'setRule').accepted, false);
  assert.equal(authorizeCommand(viewer, 'setRule').code, 'FORBIDDEN');
  assert.equal(authorizeCommand(viewer, 'reassign').accepted, false);

  // dispatcher는 배차·운영 조치까지, 시나리오 주입은 불가
  assert.equal(authorizeCommand(dispatcher, 'setRule').accepted, true);
  assert.equal(authorizeCommand(dispatcher, 'reassign').accepted, true);
  assert.equal(authorizeCommand(dispatcher, 'promoteExpress').accepted, true);
  assert.equal(authorizeCommand(dispatcher, 'ackAlert').accepted, true);
  assert.equal(authorizeCommand(dispatcher, 'inject').accepted, false);

  // supervisor는 시나리오 주입까지
  assert.equal(authorizeCommand(supervisor, 'inject').accepted, true);
  assert.equal(authorizeCommand(supervisor, 'reassign').accepted, true);
});

test('authorizeCommand: 알 수 없는 명령은 BAD_REQUEST', () => {
  const result = authorizeCommand(supervisor, 'nope' as never);
  assert.equal(result.accepted, false);
  assert.equal(result.code, 'BAD_REQUEST');
});

test('buildAuditEntry: 결과를 감사 항목으로 구조화', () => {
  const accepted = buildAuditEntry(
    { type: 'inject', scenario: 'incident', on: true },
    supervisor,
    authorizeCommand(supervisor, 'inject'),
    1000,
  );
  assert.equal(accepted.outcome, 'accepted');
  assert.equal(accepted.action, 'inject');
  assert.equal(accepted.actor.role, 'supervisor');
  assert.equal(accepted.ts, 1000);
  assert.ok(accepted.id.length > 0);

  const rejected = buildAuditEntry(
    { type: 'inject', scenario: 'incident', on: true },
    dispatcher,
    authorizeCommand(dispatcher, 'inject'),
    2000,
  );
  assert.equal(rejected.outcome, 'rejected');
  assert.equal(rejected.code, 'FORBIDDEN');
  assert.ok(rejected.reason);
});

test('describeCommand: 사람이 읽는 상세 문자열', () => {
  assert.match(describeCommand({ type: 'setRule', rule: 'NEAREST' }), /NEAREST/);
  assert.match(describeCommand({ type: 'reassign', riderId: 'RDR-1003' }), /RDR-1003/);
  assert.match(describeCommand({ type: 'promoteExpress', orderId: 'ORD-10231' }), /ORD-10231/);
  assert.match(describeCommand({ type: 'inject', scenario: 'incident', on: true }), /교통 정체/);
  assert.match(describeCommand({ type: 'inject', scenario: 'incident', on: false }), /해제/);
});
