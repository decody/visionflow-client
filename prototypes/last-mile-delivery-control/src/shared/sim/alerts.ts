/**
 * 알람 도출 로직(순수) — 단계 4
 *
 * "지금 켜져 있어야 할 알람 집합"만 상태로부터 계산한다(ack/복구/프루닝은 엔진이 조정).
 * dispatch.ts·delta-reducer.ts와 동일하게 브라우저 API에 의존하지 않아 테스트가 쉽다.
 *  - DELAY    : 주문이 SLA를 넘겨 DELAYED가 됨
 *  - BACKLOG  : 미배차(QUEUED) 주문이 임계치를 초과
 *  - GEOFENCE : 배정된 라이더가 담당 권역 중심에서 반경 밖으로 벗어남
 *  - BATTERY  : 라이더 배터리가 경고/위험 임계 미만
 * 알람 id는 조건 주체로 결정론적으로 만들어, 틱마다 같은 조건이면 같은 알람으로 코얼레싱된다.
 */

import type { AlertKind, AlertSeverity } from '@/entities/delivery/types';

/** deriveAlerts가 보는 라이더 최소 정보. */
export interface AlertRiderView {
  id: string;
  zone: string;
  battery: number;
  /** 담당 권역 중심에서의 거리(m). 배정되어 이동 중일 때만 유효(아니면 null). */
  zoneDistM: number | null;
}

/** deriveAlerts가 보는 주문 최소 정보. */
export interface AlertOrderView {
  id: string;
  zone: string;
  status: string; // OrderLifecycle. 'DELAYED'·'QUEUED'만 사용
}

export interface AlertThresholds {
  /** 미배차 주문이 이 수를 넘으면 BACKLOG 알람. */
  backlog: number;
  /** 배터리 경고(warning) 임계 %. */
  batteryLow: number;
  /** 배터리 위험(critical) 임계 %. */
  batteryCritical: number;
  /** 담당 권역 중심에서 이 거리(m)를 벗어나면 GEOFENCE 알람. */
  geofenceM: number;
}

/** ack/복구 상태가 없는, 조건만 담은 알람 원형. 엔진이 생명주기를 붙인다. */
export interface DesiredAlert {
  id: string;
  kind: AlertKind;
  severity: AlertSeverity;
  title: string;
  detail: string;
  zone?: string;
  riderId?: string | null;
  orderId?: string | null;
}

export interface AlertInput {
  riders: AlertRiderView[];
  orders: AlertOrderView[];
  thresholds: AlertThresholds;
}

/**
 * 현재 상태에서 켜져 있어야 할 알람 목록을 결정론적 순서(id 사전순)로 반환한다.
 * 같은 라이더에 배터리·지오펜스가 동시에 걸릴 수 있어 id에 종류 접두사를 둔다.
 */
export function deriveAlerts(input: AlertInput): DesiredAlert[] {
  const { riders, orders, thresholds } = input;
  const out: DesiredAlert[] = [];

  let queued = 0;
  for (const o of orders) {
    if (o.status === 'QUEUED') queued += 1;
    else if (o.status === 'DELAYED') {
      out.push({
        id: `ALT-DELAY-${o.id}`,
        kind: 'DELAY',
        severity: 'critical',
        title: '배송 지연',
        detail: `${o.zone} · ${o.id.replace('ORD-', '#')} SLA 초과`,
        zone: o.zone,
        orderId: o.id,
      });
    }
  }

  if (queued > thresholds.backlog) {
    out.push({
      id: 'ALT-BACKLOG',
      kind: 'BACKLOG',
      severity: 'warning',
      title: '배차 대기 급증',
      detail: `미배차 ${queued}건 (임계 ${thresholds.backlog})`,
    });
  }

  for (const r of riders) {
    if (r.battery < thresholds.batteryCritical) {
      out.push({
        id: `ALT-BATT-${r.id}`,
        kind: 'BATTERY',
        severity: 'critical',
        title: '배터리 위험',
        detail: `${r.id} · ${Math.round(r.battery)}% 허브 복귀`,
        zone: r.zone,
        riderId: r.id,
      });
    } else if (r.battery < thresholds.batteryLow) {
      out.push({
        id: `ALT-BATT-${r.id}`,
        kind: 'BATTERY',
        severity: 'warning',
        title: '배터리 경고',
        detail: `${r.id} · ${Math.round(r.battery)}%`,
        zone: r.zone,
        riderId: r.id,
      });
    }
    if (r.zoneDistM !== null && r.zoneDistM > thresholds.geofenceM) {
      out.push({
        id: `ALT-GEO-${r.id}`,
        kind: 'GEOFENCE',
        severity: 'warning',
        title: '권역 이탈',
        detail: `${r.id} · ${r.zone} 경계 밖 ${Math.round(r.zoneDistM)}m`,
        zone: r.zone,
        riderId: r.id,
      });
    }
  }

  out.sort((a, b) => a.id.localeCompare(b.id));
  return out;
}
