/**
 * 연동 경계(integration boundary)의 명령 계약 — 단계 6.
 *
 * 실제 배송 플랫폼(TMS/OMS) 백엔드와 이어질 지점을 형식화한다: 관제 UI가 보내는
 * 명령을 **역할 기반으로 인증**하고, 승인/거부를 **감사 로그**로 남긴다. 여기서는
 * 정책만 순수 함수로 정의하고, 실행·기록은 엔진(단일 실행 지점 applyCommand)이 맡는다.
 *
 * 주체(actor)의 역할은 클라이언트가 주장하지 않는다 — 연결(세션) 컨텍스트에서
 * 어댑터(worker/ws)가 주입한다. 실제 시스템에서는 인증 토큰에서 도출한다.
 */

import type {
  Actor,
  AuditEntry,
  CommandResult,
  CommandType,
  DispatchRule,
  Role,
  ScenarioKind,
} from '@/entities/delivery/types';
import type { ClientCommand } from '@/shared/realtime/types';

const commandTypes = new Set<string>([
  'snapshot', 'start', 'stop', 'setCount', 'setRule', 'ackAlert', 'demo',
  'reassign', 'contactCourier', 'promoteExpress', 'inject',
]);
const dispatchRules = new Set<DispatchRule>(['FASTEST_ETA', 'NEAREST', 'FIFO']);
const scenarios = new Set<ScenarioKind>(['incident', 'surge', 'battery', 'closure', 'reset']);

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
  const type = value.type as ClientCommand['type'];
  if (type === 'setRule' && !dispatchRules.has(value.rule as DispatchRule)) return { command: null, reason: '배차 규칙이 올바르지 않습니다.' };
  if (type === 'inject' && (!scenarios.has(value.scenario as ScenarioKind) || (value.on !== undefined && typeof value.on !== 'boolean'))) {
    return { command: null, reason: '시나리오 payload가 올바르지 않습니다.' };
  }
  if (['setCount', 'start'].includes(type) && value.count !== undefined && (!isFiniteNumber(value.count) || value.count < 1 || value.count > 5000)) {
    return { command: null, reason: 'count는 1~5000 범위의 숫자여야 합니다.' };
  }
  if (type === 'start' && value.rateHz !== undefined && (!isFiniteNumber(value.rateHz) || value.rateHz < 1 || value.rateHz > 60)) {
    return { command: null, reason: 'rateHz는 1~60 범위의 숫자여야 합니다.' };
  }
  if (type === 'ackAlert' && !isNonEmptyString(value.alertId)) return { command: null, reason: 'alertId가 필요합니다.' };
  if (['reassign', 'contactCourier'].includes(type) && !isNonEmptyString(value.riderId)) return { command: null, reason: 'riderId가 필요합니다.' };
  if (type === 'promoteExpress' && !isNonEmptyString(value.orderId)) return { command: null, reason: 'orderId가 필요합니다.' };
  return { command: value as unknown as ClientCommand };
}

/** 역할 등급(높을수록 강한 권한). */
export const ROLE_RANK: Record<Role, number> = {
  viewer: 0,
  dispatcher: 1,
  supervisor: 2,
  system: 3,
};

/** 명령별 최소 요구 역할. */
export const COMMAND_MIN_ROLE: Record<CommandType, Role> = {
  // 읽기
  snapshot: 'viewer',
  // 배차·운영 조치(배차팀)
  start: 'dispatcher',
  stop: 'dispatcher',
  setCount: 'dispatcher',
  setRule: 'dispatcher',
  ackAlert: 'dispatcher',
  demo: 'dispatcher',
  reassign: 'dispatcher',
  contactCourier: 'dispatcher',
  promoteExpress: 'dispatcher',
  // 시나리오 주입(감독자 전용): 교통정체·수요서지·저배터리·초기화
  inject: 'supervisor',
};

/** 감사 대상(상태를 바꾸거나 운영 의미가 있는) 명령인지. 순수 읽기(snapshot)는 제외. */
export function isAuditable(type: CommandType): boolean {
  return type !== 'snapshot';
}

/** 역할 기반 인증(순수). 권한이 없으면 FORBIDDEN, 알 수 없는 명령은 BAD_REQUEST. */
export function authorizeCommand(actor: Actor, type: CommandType): CommandResult {
  const required = COMMAND_MIN_ROLE[type];
  if (required === undefined)
    return { accepted: false, code: 'BAD_REQUEST', reason: `알 수 없는 명령: ${type}` };
  if (ROLE_RANK[actor.role] >= ROLE_RANK[required]) return { accepted: true, code: 'OK' };
  return {
    accepted: false,
    code: 'FORBIDDEN',
    reason: `${type}에는 ${required} 이상 권한 필요(현재 ${actor.role})`,
  };
}

const scenarioLabel: Record<string, string> = {
  incident: '교통 정체',
  surge: '수요 서지',
  battery: '저배터리',
  closure: '도로 통제',
  reset: '시나리오 초기화',
};

/** 명령을 사람이 읽을 수 있는 감사 상세 문자열로. */
export function describeCommand(cmd: ClientCommand): string {
  switch (cmd.type) {
    case 'setRule':
      return `배차 규칙 → ${cmd.rule ?? '-'}`;
    case 'inject': {
      const name = scenarioLabel[cmd.scenario ?? ''] ?? cmd.scenario ?? '-';
      if (cmd.scenario === 'battery' || cmd.scenario === 'reset') return `${name} 주입`;
      return `${name} ${cmd.on === false ? '해제' : '주입'}`;
    }
    case 'reassign':
      return `재배차 요청${cmd.riderId ? ` · ${cmd.riderId}` : ''}`;
    case 'contactCourier':
      return `라이더 연락${cmd.riderId ? ` · ${cmd.riderId}` : ''}`;
    case 'promoteExpress':
      return `특급 승격${cmd.orderId ? ` · ${cmd.orderId}` : ''}`;
    case 'ackAlert':
      return `알람 확인${cmd.alertId ? ` · ${cmd.alertId}` : ''}`;
    case 'demo':
      return `자동 데모 ${cmd.on === false ? '중단' : '시작'}`;
    case 'setCount':
      return `라이더 수 변경 → ${cmd.count ?? '-'}`;
    case 'start':
      return '시뮬레이션 시작';
    case 'stop':
      return '시뮬레이션 일시정지';
    case 'snapshot':
      return '스냅샷 요청';
    default:
      return cmd.type;
  }
}

/** 인증 결과로부터 감사 항목을 만든다. */
export function buildAuditEntry(
  cmd: ClientCommand,
  actor: Actor,
  result: CommandResult,
  ts: number,
): AuditEntry {
  return {
    id: `AUD-${Math.round(ts)}-${actor.id}-${cmd.type}`,
    ts,
    actor,
    action: cmd.type as CommandType,
    detail: describeCommand(cmd),
    outcome: result.accepted ? 'accepted' : 'rejected',
    code: result.code,
    reason: result.reason,
  };
}
