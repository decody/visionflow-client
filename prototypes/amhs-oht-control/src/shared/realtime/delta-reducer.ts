import type {
  Alarm,
  Job,
  OperationsState,
  ServerMessage,
  VehicleDelta,
  VehicleState,
} from '@/entities/oht/types';

export interface BatchResult {
  /** 이번 프레임에 반영할 id별 최신 델타 */
  updates: VehicleDelta[];
  snapshot?: VehicleState[];
  alarms: Alarm[];
  jobs: Job[];
  additions?: VehicleState[];
  deletions?: string[];
  operations?: OperationsState;
  ts?: number;
}

export interface IngestResult {
  /** seq gap으로 스냅샷 재동기가 필요한지 */
  needResync: boolean;
  /** 이번 메시지의 개별 upd 개수(메트릭용) */
  updCount: number;
}

/**
 * 실시간 게이트웨이의 순수 코어.
 *  - seq 순서/gap 감지 (Recovery 트리거)
 *  - 델타를 id 기준으로 코얼레싱(최신값만 유지) → 프레임 단위 flush
 *
 * 브라우저 API(worker/rAF/performance)에 의존하지 않으므로 단위 테스트가 쉽다.
 */
export class DeltaReducer {
  private pending = new Map<string, VehicleDelta>();
  private pendingSnapshot: VehicleState[] | undefined;
  private pendingAlarms: Alarm[] = [];
  private pendingJobs: Job[] = [];
  private expectedSeq: number | null = null;
  private additions = new Map<string, VehicleState>();
  private deletions = new Set<string>();
  private operations: OperationsState | undefined;
  private ts: number | undefined;

  ingest(msg: ServerMessage): IngestResult {
    if (msg.type === 'snapshot') {
      this.expectedSeq = msg.seq + 1;
      this.pending.clear();
      this.additions.clear();
      this.deletions.clear();
      this.operations = msg.operations;
      this.ts = msg.ts;
      this.pendingJobs = [];
      this.pendingSnapshot = msg.vehicles;
      return { needResync: false, updCount: 0 };
    }

    // Ignore deltas until an initial/recovery snapshot arrives; duplicates are harmless.
    if (this.expectedSeq === null)
      return { needResync: false, updCount: 0 };
    if (msg.seq < this.expectedSeq)
      return { needResync: false, updCount: 0 };
    if (msg.seq > this.expectedSeq) {
      this.expectedSeq = null; // 다음 스냅샷에서 재설정
      this.pending.clear();
      this.pendingSnapshot = undefined;
      this.pendingJobs = [];
      this.pendingAlarms = [];
      this.additions.clear();
      this.deletions.clear();
      this.operations = undefined;
      return { needResync: true, updCount: 0 };
    }

    this.expectedSeq = msg.seq + 1;
    this.ts = msg.ts;
    if (msg.operations) this.operations = msg.operations;
    if (msg.add)
      for (const a of msg.add) {
        this.additions.set(a.id, { ...a });
        this.pending.delete(a.id);
        this.deletions.delete(a.id);
      }
    for (const u of msg.upd) {
      const prev = this.pending.get(u.id);
      if (prev)
        Object.assign(prev, u); // 같은 프레임 내 최신값으로 병합
      else this.pending.set(u.id, { ...u });
    }
    if (msg.del)
      for (const id of msg.del) {
        this.pending.delete(id);
        this.additions.delete(id);
        this.deletions.add(id);
      }
    if (msg.alarms) this.pendingAlarms.push(...msg.alarms);
    if (msg.jobs) this.pendingJobs.push(...msg.jobs);
    return { needResync: false, updCount: msg.upd.length };
  }

  hasPending(): boolean {
    return (
      this.pending.size > 0 ||
      this.pendingSnapshot !== undefined ||
      this.pendingAlarms.length > 0 ||
      this.pendingJobs.length > 0 ||
      this.additions.size > 0 ||
      this.deletions.size > 0 ||
      this.operations !== undefined
    );
  }

  /** 현재 버퍼에 몇 개의 id가 대기 중인지(코얼레싱 결과 크기) */
  pendingSize(): number {
    return this.pending.size;
  }

  drain(): BatchResult {
    const res: BatchResult = {
      updates: Array.from(this.pending.values()),
      snapshot: this.pendingSnapshot,
      alarms: this.pendingAlarms,
      jobs: this.pendingJobs,
      additions: [...this.additions.values()],
      deletions: [...this.deletions],
      operations: this.operations,
      ts: this.ts,
    };
    this.pending.clear();
    this.pendingSnapshot = undefined;
    this.pendingAlarms = [];
    this.pendingJobs = [];
    this.additions.clear();
    this.deletions.clear();
    this.operations = undefined;
    return res;
  }
}
