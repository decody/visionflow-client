/**
 * 권역별 집계(순수) — 단계 5
 *
 * 라이더·주문을 권역 기준으로 묶어 관제 상단/좌측 KPI와 권역 선택 동기화에 쓴다.
 * 브라우저 API에 의존하지 않아 단위 테스트가 쉽다(dispatch·alerts와 동일한 패턴).
 */

export interface ZoneKpiRow {
  zone: string;
  riders: number; // 담당 라이더 수
  delivering: number; // 배송 중 라이더
  delayed: number; // 지연(DELAYED) 주문
  queued: number; // 미배차(QUEUED) 주문
  express: number; // 특급 주문(터미널 제외)
}

interface RiderView {
  zone: string;
  status: string;
}

interface OrderView {
  zone: string;
  status: string;
  priority: string;
}

const TERMINAL = new Set(['DELIVERED', 'FAILED']);

/**
 * zones 순서대로 권역 KPI를 만든다. 알 수 없는 권역의 라이더/주문은 무시한다.
 * (지도 권역과 일치하는 고정 목록을 넘겨 결정론적 순서를 보장한다.)
 */
export function zoneSummary(
  zones: string[],
  riders: RiderView[],
  orders: OrderView[],
): ZoneKpiRow[] {
  const rows = new Map<string, ZoneKpiRow>();
  for (const zone of zones) {
    rows.set(zone, { zone, riders: 0, delivering: 0, delayed: 0, queued: 0, express: 0 });
  }

  for (const r of riders) {
    const row = rows.get(r.zone);
    if (!row) continue;
    row.riders += 1;
    if (r.status === 'DELIVERING') row.delivering += 1;
  }

  for (const o of orders) {
    const row = rows.get(o.zone);
    if (!row) continue;
    if (o.status === 'DELAYED') row.delayed += 1;
    if (o.status === 'QUEUED') row.queued += 1;
    if (o.priority === 'EXPRESS' && !TERMINAL.has(o.status)) row.express += 1;
  }

  return zones.map((z) => rows.get(z)!);
}
