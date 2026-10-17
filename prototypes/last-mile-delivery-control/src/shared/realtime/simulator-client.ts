/**
 * 방식 A — Web Worker 시뮬레이터를 실시간 소스로 감싼다. (단계 2)
 * 순수 코어(DeltaReducer)에 seq/코얼레싱을 위임하고, 여기서는 Worker 연결과
 * requestAnimationFrame flush만 담당한다.
 */

import type { DispatchRule, Role, ScenarioKind } from '@/entities/delivery/types';
import { DeltaReducer, type BatchResult } from './delta-reducer';
import type { RealtimeSource, RealtimeSourceOptions, ServerMessage, SourceMetrics } from './types';

export type { BatchResult } from './delta-reducer';

export class SimulatorClient implements RealtimeSource {
  readonly label = 'worker';
  private worker: Worker;
  private readonly reducer = new DeltaReducer();
  private readonly onBatch: (b: BatchResult) => void;
  private rafId = 0;
  private running = false;
  private readonly metrics: SourceMetrics = {
    msgCount: 0,
    rawUpd: 0,
    drainedUpd: 0,
    batchCount: 0,
    resyncCount: 0,
  };

  constructor(private readonly opts: RealtimeSourceOptions) {
    this.onBatch = opts.onBatch;
    this.worker = new Worker(
      new URL('../../workers/simulator.worker.ts', import.meta.url),
      { type: 'module' },
    );
    this.worker.onmessage = (ev: MessageEvent) => this.handleMessage(ev.data as ServerMessage);
    this.worker.onerror = (ev: ErrorEvent) =>
      this.opts.onError?.(ev.message || '시뮬레이터 워커 오류');
  }

  start(): void {
    if (this.running) return;
    this.running = true;
    this.worker.postMessage({
      type: 'start',
      count: this.opts.count ?? 40,
      rateHz: this.opts.rateHz ?? 10,
      rule: this.opts.rule ?? 'FASTEST_ETA',
    });
    this.loop();
  }

  setCount(count: number): void {
    this.worker.postMessage({ type: 'setCount', count });
  }

  setRule(rule: DispatchRule): void {
    this.worker.postMessage({ type: 'setRule', rule });
  }

  setPaused(paused: boolean): void {
    this.worker.postMessage({ type: paused ? 'stop' : 'start' });
  }

  inject(scenario: ScenarioKind, on = true): void {
    this.worker.postMessage({ type: 'inject', scenario, on });
  }

  ackAlert(alertId: string): void {
    this.worker.postMessage({ type: 'ackAlert', alertId });
  }

  setDemo(on: boolean): void {
    this.worker.postMessage({ type: 'demo', on });
  }

  setRole(role: Role): void {
    this.worker.postMessage({ type: 'setRole', role });
  }

  reassign(riderId: string): void {
    this.worker.postMessage({ type: 'reassign', riderId });
  }

  contactCourier(riderId: string): void {
    this.worker.postMessage({ type: 'contactCourier', riderId });
  }

  promoteExpress(orderId: string): void {
    this.worker.postMessage({ type: 'promoteExpress', orderId });
  }

  setFocus(riderId: string | null): void {
    this.worker.postMessage({ type: 'setFocus', riderId: riderId ?? undefined });
  }

  getMetrics(): SourceMetrics {
    return { ...this.metrics };
  }

  requestSnapshot(): void {
    this.worker.postMessage({ type: 'snapshot' });
  }

  dispose(): void {
    this.running = false;
    if (this.rafId) cancelAnimationFrame(this.rafId);
    this.worker.postMessage({ type: 'stop' });
    this.worker.terminate();
  }

  private handleMessage(msg: ServerMessage): void {
    this.metrics.msgCount += 1;
    const { needResync, updCount } = this.reducer.ingest(msg);
    this.metrics.rawUpd += updCount;
    if (needResync) {
      this.metrics.resyncCount += 1;
      this.requestSnapshot();
    }
  }

  private loop = (): void => {
    if (!this.running) return;
    if (this.reducer.hasPending()) {
      const batch = this.reducer.drain();
      this.metrics.batchCount += 1;
      this.metrics.drainedUpd += batch.updates.length;
      this.onBatch(batch);
    }
    this.rafId = requestAnimationFrame(this.loop);
  };
}
