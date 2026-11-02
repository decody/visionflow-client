/**
 * 실시간 수신 코어(순수) — 단계 2(기획서 §4).
 *
 * AMHS·last-mile의 DeltaReducer를 복합운송 도메인으로 옮긴 축약판(conveyance 채널).
 *  - seq 순서/gap 감지 → 스냅샷 재동기 트리거
 *  - 델타를 id 기준으로 코얼레싱(최신값만 유지) → 프레임 단위 flush
 * 브라우저 API에 의존하지 않아 단위 테스트가 쉽다.
 */

import type { AuditEntry } from '@/entities/logistics/types';
import type { AlertWire, BatchResult, ConveyanceWire, ServerMessage, ShipmentWire, SimMeta } from './types';

const AUDIT_MAX = 20;

export interface IngestResult {
  needResync: boolean;
  updCount: number;
}

export class DeltaReducer {
  private pending = new Map<string, ConveyanceWire>();
  private pendingSnapshot: ConveyanceWire[] | undefined;
  private additions = new Map<string, ConveyanceWire>();
  private deletions = new Set<string>();
  // 화물 채널(단계 3) — 운송수단과 대칭 구조
  private pendingShipments = new Map<string, ShipmentWire>();
  private pendingShipmentSnapshot: ShipmentWire[] | undefined;
  private shipmentAdditions = new Map<string, ShipmentWire>();
  private shipmentDeletions = new Set<string>();
  // 알람 채널(단계 5) — 화물과 대칭 구조
  private pendingAlerts = new Map<string, AlertWire>();
  private pendingAlertSnapshot: AlertWire[] | undefined;
  private alertAdditions = new Map<string, AlertWire>();
  private alertDeletions = new Set<string>();
  // 감사 채널(단계 7) — append-only, 상한, 변경 시 dirty
  private auditLog: AuditEntry[] = [];
  private auditIds = new Set<string>();
  private auditDirty = false;
  private pendingMeta: SimMeta | undefined;
  private expectedSeq: number | null = null;
  private tick: number | undefined;

  private clearConveyance(): void {
    this.pending.clear();
    this.pendingSnapshot = undefined;
    this.additions.clear();
    this.deletions.clear();
  }

  private clearShipment(): void {
    this.pendingShipments.clear();
    this.pendingShipmentSnapshot = undefined;
    this.shipmentAdditions.clear();
    this.shipmentDeletions.clear();
  }

  private clearAlert(): void {
    this.pendingAlerts.clear();
    this.pendingAlertSnapshot = undefined;
    this.alertAdditions.clear();
    this.alertDeletions.clear();
  }

  ingest(msg: ServerMessage): IngestResult {
    if (msg.type === 'snapshot') {
      this.expectedSeq = msg.seq + 1;
      this.clearConveyance();
      this.clearShipment();
      this.clearAlert();
      this.pendingSnapshot = msg.conveyances;
      this.pendingShipmentSnapshot = msg.shipments;
      this.pendingAlertSnapshot = msg.alerts;
      this.resetAudit(msg.audit);
      this.pendingMeta = msg.meta;
      this.tick = msg.tick;
      return { needResync: false, updCount: 0 };
    }

    // 초기/복구 스냅샷 전의 델타는 버린다.
    if (this.expectedSeq === null) return { needResync: false, updCount: 0 };
    if (msg.seq < this.expectedSeq) return { needResync: false, updCount: 0 };
    if (msg.seq > this.expectedSeq) {
      // gap: 다음 스냅샷까지 수용 중단
      this.expectedSeq = null;
      this.clearConveyance();
      this.clearShipment();
      this.clearAlert();
      return { needResync: true, updCount: 0 };
    }

    this.expectedSeq = msg.seq + 1;
    this.tick = msg.tick;
    this.pendingMeta = msg.meta;
    if (msg.auditAdd) for (const a of msg.auditAdd) this.appendAudit(a);
    if (msg.add)
      for (const a of msg.add) {
        this.additions.set(a.id, { ...a });
        this.pending.delete(a.id);
        this.deletions.delete(a.id);
      }
    for (const u of msg.upd) {
      const prevAdd = this.additions.get(u.id);
      if (prevAdd) Object.assign(prevAdd, u); // 같은 배치의 신규는 add에 병합
      else {
        const prev = this.pending.get(u.id);
        if (prev) Object.assign(prev, u);
        else this.pending.set(u.id, { ...u });
      }
    }
    if (msg.del)
      for (const id of msg.del) {
        this.pending.delete(id);
        this.additions.delete(id);
        this.deletions.add(id);
      }

    // 화물 채널 — 운송수단과 동일한 add/upd/del 코얼레싱
    if (msg.shipmentsAdd)
      for (const a of msg.shipmentsAdd) {
        this.shipmentAdditions.set(a.id, { ...a });
        this.pendingShipments.delete(a.id);
        this.shipmentDeletions.delete(a.id);
      }
    if (msg.shipmentsUpd)
      for (const u of msg.shipmentsUpd) {
        const prevAdd = this.shipmentAdditions.get(u.id);
        if (prevAdd) Object.assign(prevAdd, u);
        else {
          const prev = this.pendingShipments.get(u.id);
          if (prev) Object.assign(prev, u);
          else this.pendingShipments.set(u.id, { ...u });
        }
      }
    if (msg.shipmentsDel)
      for (const id of msg.shipmentsDel) {
        this.pendingShipments.delete(id);
        this.shipmentAdditions.delete(id);
        this.shipmentDeletions.add(id);
      }

    // 알람 채널 — 화물과 동일한 add/upd/del 코얼레싱
    if (msg.alertsAdd)
      for (const a of msg.alertsAdd) {
        this.alertAdditions.set(a.id, { ...a });
        this.pendingAlerts.delete(a.id);
        this.alertDeletions.delete(a.id);
      }
    if (msg.alertsUpd)
      for (const u of msg.alertsUpd) {
        const prevAdd = this.alertAdditions.get(u.id);
        if (prevAdd) Object.assign(prevAdd, u);
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

  private resetAudit(entries: AuditEntry[]): void {
    this.auditLog = entries.slice(-AUDIT_MAX);
    this.auditIds = new Set(this.auditLog.map((a) => a.id));
    this.auditDirty = true;
  }

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
      this.pendingShipments.size > 0 ||
      this.pendingShipmentSnapshot !== undefined ||
      this.shipmentAdditions.size > 0 ||
      this.shipmentDeletions.size > 0 ||
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
      shipmentUpdates: Array.from(this.pendingShipments.values()),
      shipmentSnapshot: this.pendingShipmentSnapshot,
      shipmentAdditions: [...this.shipmentAdditions.values()],
      shipmentDeletions: [...this.shipmentDeletions],
      alertUpdates: Array.from(this.pendingAlerts.values()),
      alertSnapshot: this.pendingAlertSnapshot,
      alertAdditions: [...this.alertAdditions.values()],
      alertDeletions: [...this.alertDeletions],
      audit: this.auditDirty ? [...this.auditLog] : undefined,
      meta: this.pendingMeta,
      tick: this.tick,
    };
    this.clearConveyance();
    this.clearShipment();
    this.clearAlert();
    this.auditDirty = false;
    this.pendingMeta = undefined;
    return res;
  }
}
