/**
 * 실시간 수신 코어(순수) — 단계 2
 *
 * AMHS 프로토타입의 DeltaReducer를 배송 도메인(RiderWire)으로 옮긴 축약판.
 *  - seq 순서/gap 감지 → 스냅샷 재동기 트리거
 *  - 델타를 id 기준으로 코얼레싱(최신값만 유지) → 프레임 단위 flush
 * 브라우저 API에 의존하지 않아 단위 테스트가 쉽다.
 */

import type { AuditEntry } from '@/entities/delivery/types';
import type { AlertWire, OrderWire, RiderWire, ScenarioMeta, ServerMessage } from './types';

const AUDIT_MAX = 20; // 클라이언트가 보관하는 감사 로그 상한

export interface BatchResult {
  /** 이번 프레임에 반영할 id별 최신 라이더 상태 */
  updates: RiderWire[];
  snapshot?: RiderWire[];
  additions?: RiderWire[];
  deletions?: string[];
  /** 주문 채널(단계 3) — 라이더와 동일한 코얼레싱 규칙 */
  orderUpdates: OrderWire[];
  orders?: OrderWire[];
  orderAdditions?: OrderWire[];
  orderDeletions?: string[];
  /** 알람 채널(단계 4) — 라이더·주문과 동일한 코얼레싱 규칙 */
  alertUpdates: AlertWire[];
  alerts?: AlertWire[];
  alertAdditions?: AlertWire[];
  alertDeletions?: string[];
  /** 시나리오·데모 진행(단계 4) — 최신값만 유지 */
  meta?: ScenarioMeta;
  /** 감사 로그(단계 6) — 변경 시에만 최신 전체 목록 */
  audit?: AuditEntry[];
  tick?: number;
}

export interface IngestResult {
  /** seq gap으로 스냅샷 재동기가 필요한지 */
  needResync: boolean;
  /** 이번 메시지의 개별 upd 개수(메트릭용) */
  updCount: number;
}

export class DeltaReducer {
  private pending = new Map<string, RiderWire>();
  private pendingSnapshot: RiderWire[] | undefined;
  private additions = new Map<string, RiderWire>();
  private deletions = new Set<string>();
  // 주문 채널(단계 3) — 라이더와 대칭 구조
  private pendingOrders = new Map<string, OrderWire>();
  private pendingOrderSnapshot: OrderWire[] | undefined;
  private orderAdditions = new Map<string, OrderWire>();
  private orderDeletions = new Set<string>();
  // 알람 채널(단계 4) — 주문과 대칭 구조
  private pendingAlerts = new Map<string, AlertWire>();
  private pendingAlertSnapshot: AlertWire[] | undefined;
  private alertAdditions = new Map<string, AlertWire>();
  private alertDeletions = new Set<string>();
  private pendingMeta: ScenarioMeta | undefined;
  // 감사 채널(단계 6) — append-only, 상한 유지. 변경 시 dirty로 표시.
  private auditLog: AuditEntry[] = [];
  private auditIds = new Set<string>();
  private auditDirty = false;
  private expectedSeq: number | null = null;
  private tick: number | undefined;

  ingest(msg: ServerMessage): IngestResult {
    if (msg.type === 'snapshot') {
      this.expectedSeq = msg.seq + 1;
      this.pending.clear();
      this.additions.clear();
      this.deletions.clear();
      this.pendingOrders.clear();
      this.orderAdditions.clear();
      this.orderDeletions.clear();
      this.pendingAlerts.clear();
      this.alertAdditions.clear();
      this.alertDeletions.clear();
      this.pendingSnapshot = msg.riders;
      this.pendingOrderSnapshot = msg.orders;
      this.pendingAlertSnapshot = msg.alerts;
      if (msg.meta) this.pendingMeta = msg.meta;
      if (msg.audit) this.resetAudit(msg.audit);
      this.tick = msg.tick;
      return { needResync: false, updCount: 0 };
    }

    // 초기/복구 스냅샷 전의 델타는 버린다(중복은 무해).
    if (this.expectedSeq === null) return { needResync: false, updCount: 0 };
    if (msg.seq < this.expectedSeq) return { needResync: false, updCount: 0 };
    if (msg.seq > this.expectedSeq) {
      // gap: 다음 스냅샷까지 수용 중단
      this.expectedSeq = null;
      this.pending.clear();
      this.pendingSnapshot = undefined;
      this.additions.clear();
      this.deletions.clear();
      this.pendingOrders.clear();
      this.pendingOrderSnapshot = undefined;
      this.orderAdditions.clear();
      this.orderDeletions.clear();
      this.pendingAlerts.clear();
      this.pendingAlertSnapshot = undefined;
      this.alertAdditions.clear();
      this.alertDeletions.clear();
      return { needResync: true, updCount: 0 };
    }

    this.expectedSeq = msg.seq + 1;
    this.tick = msg.tick;
    if (msg.meta) this.pendingMeta = msg.meta;
    if (msg.auditAdd) for (const a of msg.auditAdd) this.appendAudit(a);
    if (msg.add)
      for (const a of msg.add) {
        this.additions.set(a.id, { ...a });
        this.pending.delete(a.id);
        this.deletions.delete(a.id);
      }
    for (const u of msg.upd) {
      const prev = this.pending.get(u.id);
      if (prev) Object.assign(prev, u);
      else this.pending.set(u.id, { ...u });
    }
    if (msg.del)
      for (const id of msg.del) {
        this.pending.delete(id);
        this.additions.delete(id);
        this.deletions.add(id);
      }

    // 주문 채널 — 라이더와 동일한 add/upd/del 코얼레싱
    if (msg.ordersAdd)
      for (const a of msg.ordersAdd) {
        this.orderAdditions.set(a.id, { ...a });
        this.pendingOrders.delete(a.id);
        this.orderDeletions.delete(a.id);
      }
    if (msg.ordersUpd)
      for (const u of msg.ordersUpd) {
        const prevAdd = this.orderAdditions.get(u.id);
        if (prevAdd) Object.assign(prevAdd, u); // 같은 배치의 신규 주문은 add에 병합
        else {
          const prev = this.pendingOrders.get(u.id);
          if (prev) Object.assign(prev, u);
          else this.pendingOrders.set(u.id, { ...u });
        }
      }
    if (msg.ordersDel)
      for (const id of msg.ordersDel) {
        this.pendingOrders.delete(id);
        this.orderAdditions.delete(id);
        this.orderDeletions.add(id);
      }

    // 알람 채널 — 주문과 동일한 add/upd/del 코얼레싱
    if (msg.alertsAdd)
      for (const a of msg.alertsAdd) {
        this.alertAdditions.set(a.id, { ...a });
        this.pendingAlerts.delete(a.id);
        this.alertDeletions.delete(a.id);
      }
    if (msg.alertsUpd)
      for (const u of msg.alertsUpd) {
        const prevAdd = this.alertAdditions.get(u.id);
        if (prevAdd) Object.assign(prevAdd, u); // 같은 배치의 신규 알람은 add에 병합
        else {
          const prev = this.pendingAlerts.get(u.id);
          if (prev) Object.assign(prev, u);
          else this.pendingAlerts.set(u.id, { ...u });
        }
      }
    if (msg.alertsDel)
      for (const id of msg.alertsDel) {
        this.pendingAlerts.delete(id);
        this.alertAdditions.delete(id);
        this.alertDeletions.add(id);
      }
    return { needResync: false, updCount: msg.upd.length };
  }

  /** 스냅샷으로 감사 로그 전체 교체(상한 유지). */
  private resetAudit(entries: AuditEntry[]): void {
    this.auditLog = entries.slice(-AUDIT_MAX);
    this.auditIds = new Set(this.auditLog.map((a) => a.id));
    this.auditDirty = true;
  }

  /** 델타로 들어온 신규 감사 항목을 append(중복 id 무시, 상한 유지). */
  private appendAudit(entry: AuditEntry): void {
    if (this.auditIds.has(entry.id)) return;
    this.auditLog.push(entry);
    this.auditIds.add(entry.id);
    if (this.auditLog.length > AUDIT_MAX) {
      const removed = this.auditLog.shift();
      if (removed) this.auditIds.delete(removed.id);
    }
    this.auditDirty = true;
  }

  hasPending(): boolean {
    return (
      this.auditDirty ||
      this.pending.size > 0 ||
      this.pendingSnapshot !== undefined ||
      this.additions.size > 0 ||
      this.deletions.size > 0 ||
      this.pendingOrders.size > 0 ||
      this.pendingOrderSnapshot !== undefined ||
      this.orderAdditions.size > 0 ||
      this.orderDeletions.size > 0 ||
      this.pendingAlerts.size > 0 ||
      this.pendingAlertSnapshot !== undefined ||
      this.alertAdditions.size > 0 ||
      this.alertDeletions.size > 0 ||
      this.pendingMeta !== undefined
    );
  }

  pendingSize(): number {
    return this.pending.size;
  }

  drain(): BatchResult {
    const res: BatchResult = {
      updates: Array.from(this.pending.values()),
      snapshot: this.pendingSnapshot,
      additions: [...this.additions.values()],
      deletions: [...this.deletions],
      orderUpdates: Array.from(this.pendingOrders.values()),
      orders: this.pendingOrderSnapshot,
      orderAdditions: [...this.orderAdditions.values()],
      orderDeletions: [...this.orderDeletions],
      alertUpdates: Array.from(this.pendingAlerts.values()),
      alerts: this.pendingAlertSnapshot,
      alertAdditions: [...this.alertAdditions.values()],
      alertDeletions: [...this.alertDeletions],
      meta: this.pendingMeta,
      audit: this.auditDirty ? [...this.auditLog] : undefined,
      tick: this.tick,
    };
    this.pending.clear();
    this.pendingSnapshot = undefined;
    this.additions.clear();
    this.deletions.clear();
    this.pendingOrders.clear();
    this.pendingOrderSnapshot = undefined;
    this.orderAdditions.clear();
    this.orderDeletions.clear();
    this.pendingAlerts.clear();
    this.pendingAlertSnapshot = undefined;
    this.alertAdditions.clear();
    this.alertDeletions.clear();
    this.pendingMeta = undefined;
    this.auditDirty = false;
    return res;
  }
}
