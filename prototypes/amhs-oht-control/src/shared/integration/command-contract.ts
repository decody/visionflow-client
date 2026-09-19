import type {
  Actor,
  AuditEntry,
  ClientCommand,
  CommandResult,
  CommandType,
  Role,
} from '@/entities/oht/types';

/**
 * 연동 경계(integration boundary)의 명령 계약.
 *
 * 실제 MES/AMHS 백엔드와 이어질 지점을 형식화한다: 관제 UI가 보내는 명령을
 * **역할 기반으로 인증**하고, 승인/거부를 **감사 로그**로 남긴다. 여기서는 정책만
 * 순수 함수로 정의하고, 실행·기록은 엔진(단일 실행 지점)이 담당한다.
 *
 * 주체(actor)의 역할은 클라이언트가 주장하지 않는다 — 연결(세션) 컨텍스트에서
 * 서버 측(worker/ws)이 주입한다. 실제 시스템에서는 인증 토큰에서 도출한다.
 */

/** 역할 등급(높을수록 강한 권한). */
export const ROLE_RANK: Record<Role, number> = {
  viewer: 0,
  operator: 1,
  supervisor: 2,
  system: 3,
};

/** 명령별 최소 요구 역할. */
export const COMMAND_MIN_ROLE: Record<CommandType, Role> = {
  // 읽기
  snapshot: 'viewer',
  // 기본 운전(부하·속도·정책·배차)
  start: 'operator',
  stop: 'operator',
  setCount: 'operator',
  setRate: 'operator',
  setDispatch: 'operator',
  promoteHotLot: 'operator',
  // 장애 주입·시나리오 리셋(감독자 전용)
  setPortIncident: 'supervisor',
  setRailClosure: 'supervisor',
  setStorageSaturation: 'supervisor',
  resetScenario: 'supervisor',
};

/** 감사 대상(상태를 바꾸는) 명령인지. 순수 읽기(snapshot)는 제외. */
export function isAuditable(type: CommandType): boolean {
  return type !== 'snapshot';
}

/** 역할 기반 인증(순수). 권한이 없으면 FORBIDDEN, 알 수 없는 명령은 BAD_REQUEST. */
export function authorizeCommand(
  actor: Actor,
  type: CommandType,
): CommandResult {
  const required = COMMAND_MIN_ROLE[type];
  if (required === undefined)
    return { accepted: false, code: 'BAD_REQUEST', reason: `알 수 없는 명령: ${type}` };
  if (ROLE_RANK[actor.role] >= ROLE_RANK[required])
    return { accepted: true, code: 'OK' };
  return {
    accepted: false,
    code: 'FORBIDDEN',
    reason: `${type}에는 ${required} 이상 권한 필요(현재 ${actor.role})`,
  };
}

/** 명령을 사람이 읽을 수 있는 감사 상세 문자열로. */
export function describeCommand(cmd: ClientCommand): string {
  switch (cmd.type) {
    case 'setDispatch':
      return `배차 규칙 → ${cmd.rule}`;
    case 'setPortIncident':
      return `포트 장애 ${cmd.enabled ? '주입' : '해제'}`;
    case 'setRailClosure':
      return `레일 폐쇄 ${cmd.enabled ? '적용' : '해제'}`;
    case 'setStorageSaturation':
      return `저장소 포화 ${cmd.enabled ? '적용' : '해제'}`;
    case 'resetScenario':
      return `시나리오 리셋(${cmd.count ?? '-'}대)`;
    case 'promoteHotLot':
      return `Hot lot 승격${cmd.jobId ? ` · ${cmd.jobId}` : ''}`;
    case 'setCount':
      return `대수 변경 → ${cmd.count ?? '-'}`;
    case 'setRate':
      return `송신율 변경 → ${cmd.rateHz ?? '-'}Hz`;
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
    action: cmd.type,
    detail: describeCommand(cmd),
    outcome: result.accepted ? 'accepted' : 'rejected',
    code: result.code,
    reason: result.reason,
  };
}
