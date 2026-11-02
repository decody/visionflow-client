/**
 * 연동 경계(integration boundary)의 명령 계약 — 단계 7(기획서 §9).
 *
 * 실제 TMS/WMS 백엔드와 이어질 지점을 형식화한다: 관제 UI가 보내는 명령을 역할 기반으로
 * 인증하고, 승인/거부를 감사 로그로 남긴다. 여기서는 정책만 순수 함수로 정의하고,
 * 실행·기록은 엔진(단일 실행 지점 applyCommand)이 맡는다. actor의 역할은 클라이언트가
 * 주장하지 않는다 — 연결(세션) 컨텍스트에서 어댑터(worker/ws)가 주입한다.
 */

import type {
  Actor,
  AuditEntry,
  CommandResult,
  CommandType,
  Role,
  RoutingRule,
  ScenarioKind,
} from '@/entities/logistics/types';
import type { ClientCommand } from '@/shared/realtime/types';

const commandTypes = new Set<string>([
  'snapshot', 'start', 'stop', 'setCount', 'setRule', 'inject', 'ackAlert', 'demo',
  'promoteExpedite', 'rerouteShipment',
]);
const routingRules = new Set<RoutingRule>(['FASTEST_ETA', 'FEWEST_TRANSFERS', 'LOWEST_COST']);
const scenarios = new Set<ScenarioKind>(['congestion', 'canalClosure', 'weather', 'customs', 'surge', 'reset']);

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}
function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.length > 0 && value.length <= 128;
}
function isFiniteNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}

/** WebSocket/Worker 경계에서 JSON payload를 런타임 검증한다. */
export function parseClientCommand(value: unknown): { command: ClientCommand | null; reason?: string } {
  if (!isRecord(value) || typeof value.type !== 'string' || !commandTypes.has(value.type)) {
    return { command: null, reason: '지원하지 않는 명령 형식입니다.' };
  }
  const type = value.type;
  if (type === 'setRule' && !routingRules.has(value.rule as RoutingRule)) {
    return { command: null, reason: '라우팅 규칙이 올바르지 않습니다.' };
  }
  if (type === 'inject' && (!scenarios.has(value.scenario as ScenarioKind) || (value.on !== undefined && typeof value.on !== 'boolean'))) {
    return { command: null, reason: '시나리오 payload가 올바르지 않습니다.' };
  }
  if ((type === 'setCount' || type === 'start') && value.count !== undefined && (!isFiniteNumber(value.count) || value.count < 1 || value.count > 5000)) {
    return { command: null, reason: 'count는 1~5000 범위의 숫자여야 합니다.' };
  }
  if (type === 'start' && value.rateHz !== undefined && (!isFiniteNumber(value.rateHz) || value.rateHz < 1 || value.rateHz > 60)) {
    return { command: null, reason: 'rateHz는 1~60 범위의 숫자여야 합니다.' };
  }
  if (type === 'demo' && typeof value.on !== 'boolean') return { command: null, reason: 'demo.on이 필요합니다.' };
  if (type === 'ackAlert' && !isNonEmptyString(value.alertId)) return { command: null, reason: 'alertId가 필요합니다.' };
  if ((type === 'promoteExpedite' || type === 'rerouteShipment') && !isNonEmptyString(value.shipmentId)) {
    return { command: null, reason: 'shipmentId가 필요합니다.' };
  }
  return { command: value as unknown as ClientCommand };
}

/** 역할 등급(높을수록 강한 권한). */
export const ROLE_RANK: Record<Role, number> = { viewer: 0, dispatcher: 1, supervisor: 2, system: 3 };

/** 명령별 최소 요구 역할(기획서 §9/§15.2). */
export const COMMAND_MIN_ROLE: Record<CommandType, Role> = {
  snapshot: 'viewer',
  // 운영 조치(배차·관제)
  start: 'dispatcher',
  stop: 'dispatcher',
  setCount: 'dispatcher',
  setRule: 'dispatcher',
  ackAlert: 'dispatcher',
  promoteExpedite: 'dispatcher',
  rerouteShipment: 'dispatcher',
  // 시나리오 주입·자동 데모(감독자 전용)
  inject: 'supervisor',
  demo: 'supervisor',
};

/** 감사 대상(순수 읽기 snapshot 제외). */
export function isAuditable(type: CommandType): boolean {
  return type !== 'snapshot';
}

/** 역할 기반 인증(순수). 권한 없으면 FORBIDDEN, 알 수 없는 명령은 BAD_REQUEST. */
export function authorizeCommand(actor: Actor, type: CommandType): CommandResult {
  const required = COMMAND_MIN_ROLE[type];
  if (required === undefined) return { accepted: false, code: 'BAD_REQUEST', reason: `알 수 없는 명령: ${type}` };
  if (ROLE_RANK[actor.role] >= ROLE_RANK[required]) return { accepted: true, code: 'OK' };
  return { accepted: false, code: 'FORBIDDEN', reason: `${type}에는 ${required} 이상 권한 필요(현재 ${actor.role})` };
}

const scenarioLabel: Record<string, string> = {
  congestion: '항만 혼잡',
  canalClosure: '운하 폐쇄',
  weather: '기상 회피',
  customs: '통관 지연',
  surge: '수요 서지',
  reset: '시나리오 초기화',
};

const ruleLabel: Record<string, string> = {
  FASTEST_ETA: '최단 ETA',
  FEWEST_TRANSFERS: '최소 환적',
  LOWEST_COST: '최저 비용',
};

/** 명령을 사람이 읽을 수 있는 감사 상세 문자열로. */
export function describeCommand(cmd: ClientCommand): string {
  switch (cmd.type) {
    case 'setRule':
      return `라우팅 규칙 → ${ruleLabel[cmd.rule] ?? cmd.rule}`;
    case 'inject': {
      const name = scenarioLabel[cmd.scenario] ?? cmd.scenario;
      if (cmd.scenario === 'reset') return `${name}`;
      return `${name} ${cmd.on === false ? '해제' : '주입'}`;
    }
    case 'promoteExpedite':
      return `Expedite 승격 · ${cmd.shipmentId}`;
    case 'rerouteShipment':
      return `재경로 지시 · ${cmd.shipmentId}`;
    case 'ackAlert':
      return `알람 확인 · ${cmd.alertId}`;
    case 'demo':
      return `자동 데모 ${cmd.on ? '시작' : '중단'}`;
    case 'setCount':
      return `운송수단 수 → ${cmd.count}`;
    case 'start':
      return '시뮬레이션 시작';
    case 'stop':
      return '시뮬레이션 일시정지';
    case 'snapshot':
      return '스냅샷 요청';
    default:
      return (cmd as { type: string }).type;
  }
}

/** 인증 결과로부터 감사 항목을 만든다. */
export function buildAuditEntry(cmd: ClientCommand, actor: Actor, result: CommandResult, ts: number): AuditEntry {
  const action = cmd.type as CommandType;
  return {
    id: `AUD-${Math.round(ts)}-${actor.id}-${action}`,
    ts,
    actor,
    action,
    detail: describeCommand(cmd),
    outcome: result.accepted ? 'ACCEPTED' : 'REJECTED',
    code: result.code,
    reason: result.reason,
  };
}
