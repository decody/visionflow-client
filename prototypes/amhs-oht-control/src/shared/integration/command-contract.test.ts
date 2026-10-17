import type { Actor } from '@/entities/oht/types';
import assert from 'node:assert/strict';
import test from 'node:test';
import {
  authorizeCommand,
  buildAuditEntry,
  describeCommand,
} from './command-contract';

const viewer: Actor = { id: 'V', role: 'viewer' };
const operator: Actor = { id: 'O', role: 'operator' };
const supervisor: Actor = { id: 'S', role: 'supervisor' };

test('authorizeCommand: 역할 등급별 권한', () => {
  // viewer는 읽기만
  assert.equal(authorizeCommand(viewer, 'snapshot').accepted, true);
  assert.equal(authorizeCommand(viewer, 'setDispatch').accepted, false);
  assert.equal(authorizeCommand(viewer, 'setDispatch').code, 'FORBIDDEN');

  // operator는 기본 운전·배차, 장애 주입은 불가
  assert.equal(authorizeCommand(operator, 'setDispatch').accepted, true);
  assert.equal(authorizeCommand(operator, 'promoteHotLot').accepted, true);
  assert.equal(authorizeCommand(operator, 'setPortIncident').accepted, false);
  assert.equal(authorizeCommand(operator, 'resetScenario').accepted, false);

  // supervisor는 장애 주입·시나리오 리셋까지
  assert.equal(authorizeCommand(supervisor, 'setPortIncident').accepted, true);
  assert.equal(authorizeCommand(supervisor, 'setRailClosure').accepted, true);
  assert.equal(authorizeCommand(supervisor, 'resetScenario').accepted, true);
});

test('authorizeCommand: 알 수 없는 명령은 BAD_REQUEST', () => {
  const result = authorizeCommand(supervisor, 'nope' as never);
  assert.equal(result.accepted, false);
  assert.equal(result.code, 'BAD_REQUEST');
});

test('buildAuditEntry: 결과를 감사 항목으로 구조화', () => {
  const accepted = buildAuditEntry(
    { type: 'setRailClosure', enabled: true },
    supervisor,
    authorizeCommand(supervisor, 'setRailClosure'),
    1000,
  );
  assert.equal(accepted.outcome, 'accepted');
  assert.equal(accepted.action, 'setRailClosure');
  assert.equal(accepted.actor.role, 'supervisor');
  assert.equal(accepted.ts, 1000);
  assert.ok(accepted.id.length > 0);

  const rejected = buildAuditEntry(
    { type: 'setRailClosure', enabled: true },
    operator,
    authorizeCommand(operator, 'setRailClosure'),
    2000,
  );
  assert.equal(rejected.outcome, 'rejected');
  assert.equal(rejected.code, 'FORBIDDEN');
  assert.ok(rejected.reason);
});

test('describeCommand: 사람이 읽는 상세 문자열', () => {
  assert.match(describeCommand({ type: 'setDispatch', rule: 'nearest' }), /nearest/);
  assert.match(describeCommand({ type: 'resetScenario', count: 8 }), /8/);
});
