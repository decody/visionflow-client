import type { AuditEvent, DeliveryAlert, DeliveryOrder } from './types';

// 라이더는 실시간 시뮬레이터(shared/sim)가 공급한다. 아래 주문·알람·감사는
// 단계 3/4에서 엔진 연동으로 대체될 때까지 정적 mock으로 둔다.

export const orders: DeliveryOrder[] = [
  { id: 'ORD-84219', customer: '테헤란로 152', zone: '강남 A', status: 'DELIVERING', eta: '12분', priority: 'EXPRESS' },
  { id: 'ORD-84222', customer: '서초대로 74', zone: '서초 B', status: 'DELAYED', eta: '27분', priority: 'NORMAL' },
  { id: 'ORD-84226', customer: '올림픽로 35', zone: '송파 A', status: 'READY', eta: '8분', priority: 'EXPRESS' },
  { id: 'ORD-84230', customer: '천호대로 997', zone: '강동 C', status: 'COMPLETED', eta: '완료', priority: 'NORMAL' },
];

export const alerts: DeliveryAlert[] = [
  { id: 'ALT-01', severity: 'critical', status: 'OPEN', title: '배송 지연', detail: '대치동 · RDR-1042', time: '2분 전' },
  { id: 'ALT-02', severity: 'warning', status: 'ACKNOWLEDGED', title: '배차 대기 증가', detail: '역삼동 · 미배차 6건', time: '6분 전' },
  { id: 'ALT-03', severity: 'info', status: 'OPEN', title: '특급 주문 도착', detail: 'ORD-10231 · 삼성동', time: '9분 전' },
];

export const auditEvents: AuditEvent[] = [
  { id: 'AUD-01', actor: '배차팀 / 이지민', action: '특급 주문 우선순위 확인', target: 'ORD-10231', time: '09:41:12', result: 'SUCCESS' },
  { id: 'AUD-02', actor: '관제 시스템', action: '배송 지연 알람 생성', target: 'ALT-01 · RDR-1042', time: '09:39:44', result: 'PENDING' },
  { id: 'AUD-03', actor: '운영자 / 김현우', action: '배차 대기 알람 확인', target: 'ALT-02 · 역삼동', time: '09:35:08', result: 'SUCCESS' },
];
