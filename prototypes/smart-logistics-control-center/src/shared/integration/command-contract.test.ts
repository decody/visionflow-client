import assert from 'node:assert/strict';
import { test } from 'node:test';

import type { Actor } from '@/entities/logistics/types';
import {
  authorizeCommand,
  buildAuditEntry,
  describeCommand,
  isAuditable,
  parseClientCommand,
} from './command-contract';

const viewer: Actor = { id: 'V', role: 'viewer' };
const dispatcher: Actor = { id: 'D', role: 'dispatcher' };
const supervisor: Actor = { id: 'S', role: 'supervisor' };

test('authorizeCommand: 역할 등급', () => {
  assert.equal(authorizeCommand(viewer, 'snapshot').accepted, true);
  assert.equal(authorizeCommand(viewer, 'setRule').accepted, false);
  assert.equal(authorizeCommand(dispatcher, 'setRule').accepted, true);
  assert.equal(authorizeCommand(dispatcher, 'inject').accepted, false);
  assert.equal(authorizeCommand(supervisor, 'inject').accepted, true);
});

test('authorizeCommand: 거부 코드 FORBIDDEN', () => {
  const r = authorizeCommand(viewer, 'promoteExpedite');
  assert.equal(r.accepted, false);
  assert.equal(r.code, 'FORBIDDEN');
});

test('parseClientCommand: 유효/무효', () => {
  assert.ok(parseClientCommand({ type: 'setRule', rule: 'FASTEST_ETA' }).command);
  assert.equal(parseClientCommand({ type: 'setRule', rule: 'BOGUS' }).command, null);
  assert.equal(parseClientCommand({ type: 'nope' }).command, null);
  assert.equal(parseClientCommand({ type: 'start', count: 99999 }).command, null);
  assert.equal(parseClientCommand({ type: 'promoteExpedite' }).command, null);
  assert.ok(parseClientCommand({ type: 'inject', scenario: 'canalClosure', on: true }).command);
  assert.equal(parseClientCommand({ type: 'inject', scenario: 'bad' }).command, null);
});

test('isAuditable: snapshot만 제외', () => {
  assert.equal(isAuditable('snapshot'), false);
  assert.equal(isAuditable('inject'), true);
});

test('buildAuditEntry: 승인/거부 반영', () => {
  const a = buildAuditEntry({ type: 'inject', scenario: 'canalClosure', on: true }, supervisor, { accepted: true, code: 'OK' }, 1000);
  assert.equal(a.outcome, 'ACCEPTED');
  assert.equal(a.actor.id, 'S');
  assert.ok(a.detail.includes('운하 폐쇄'));
  const r = buildAuditEntry({ type: 'inject', scenario: 'surge', on: true }, viewer, { accepted: false, code: 'FORBIDDEN' }, 1000);
  assert.equal(r.outcome, 'REJECTED');
});

test('describeCommand: 사람이 읽는 상세', () => {
  assert.ok(describeCommand({ type: 'setRule', rule: 'LOWEST_COST' }).includes('최저 비용'));
  assert.ok(describeCommand({ type: 'promoteExpedite', shipmentId: 'SHP-1' }).includes('SHP-1'));
});
