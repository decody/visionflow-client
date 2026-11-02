/**
 * 라이브 알람 도출(순수) — 단계 5(기획서 §8).
 *
 * 집계 신호에서 결정론적 알람 목록을 만든다(안정적 id). 상태 보관·ack·자동 해제는
 * 엔진의 reconcile이 담당하고, 여기서는 "현재 떠 있어야 할 알람"만 계산한다.
 */

import type { AlertKind, AlertSeverity, ScenarioKind } from '@/entities/logistics/types';

export interface AlertSpec {
  id: string;
  kind: AlertKind;
  severity: AlertSeverity;
  title: string;
  detail: string;
  /** 포커스 대상(허브 id 등). 없으면 null. */
  focus: string | null;
}

export interface AlertSignals {
  atRisk: number; // SLA 위험 화물 수
  customsHold: number; // 통관 보류 화물 수
  exceptions: number; // 누적 예외 수
  prevExceptions: number; // 직전 집계(증가분 판단)
  congestedHubs: { id: string; name: string; used: number; cap: number; queued: number }[];
  scenarios: ScenarioKind[];
}

const SLA_CRITICAL = 12;

export function deriveAlerts(s: AlertSignals): AlertSpec[] {
  const out: AlertSpec[] = [];

  if (s.atRisk > 0) {
    out.push({
      id: 'SLA',
      kind: 'SLA',
      severity: s.atRisk >= SLA_CRITICAL ? 'critical' : 'warning',
      title: 'SLA 위반 위험',
      detail: `${s.atRisk}건의 화물이 SLA 기한을 초과할 전망입니다.`,
      focus: null,
    });
  }

  if (s.customsHold > 0) {
    out.push({
      id: 'CUSTOMS',
      kind: 'CUSTOMS',
      severity: s.customsHold >= 6 ? 'critical' : 'warning',
      title: '통관 보류 급증',
      detail: `${s.customsHold}건이 통관 보류 상태입니다.`,
      focus: null,
    });
  }

  if (s.exceptions > s.prevExceptions) {
    out.push({
      id: 'EXCEPTION',
      kind: 'EXCEPTION',
      severity: 'warning',
      title: '예외 발생',
      detail: `누적 예외 ${s.exceptions}건(신규 ${s.exceptions - s.prevExceptions}건).`,
      focus: null,
    });
  }

  // 허브 혼잡 — 대기열이 있으면 CAPACITY(위험), 포화 근접이면 DWELL(경고).
  for (const h of s.congestedHubs) {
    if (h.queued > 0) {
      out.push({
        id: `HUB-${h.id}`,
        kind: 'CAPACITY',
        severity: h.queued >= 4 ? 'critical' : 'warning',
        title: `${h.name} 허브 혼잡`,
        detail: `슬롯 ${h.used}/${h.cap} 포화 · 대기 ${h.queued}건.`,
        focus: h.id,
      });
    } else if (h.used >= h.cap) {
      out.push({
        id: `HUB-${h.id}`,
        kind: 'DWELL',
        severity: 'warning',
        title: `${h.name} 허브 포화`,
        detail: `슬롯 ${h.used}/${h.cap} 사용 중.`,
        focus: h.id,
      });
    }
  }

  if (s.scenarios.includes('canalClosure')) {
    out.push({
      id: 'CLOSURE',
      kind: 'CLOSURE',
      severity: 'critical',
      title: '운하 폐쇄',
      detail: '주요 해상 레인이 폐쇄되어 영향 화물을 재경로합니다.',
      focus: null,
    });
  }
  if (s.scenarios.includes('weather')) {
    out.push({
      id: 'WEATHER',
      kind: 'WEATHER',
      severity: 'warning',
      title: '기상 회피',
      detail: '태풍 회피로 해상 구간이 지연됩니다.',
      focus: null,
    });
  }

  // 결정론 정렬(심각도 → id).
  const rank: Record<AlertSeverity, number> = { critical: 0, warning: 1, info: 2 };
  out.sort((a, b) => rank[a.severity] - rank[b.severity] || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));
  return out;
}
