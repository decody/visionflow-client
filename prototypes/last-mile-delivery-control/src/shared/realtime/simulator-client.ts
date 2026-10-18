/**
 * 방식 A — Web Worker 시뮬레이터를 실시간 소스로 감싼다. (단계 2)
 * 순수 코어(DeltaReducer)에 seq/코얼레싱을 위임하고, 여기서는 Worker 연결과
 * requestAnimationFrame flush만 담당한다.
 */

import type { Actor, DispatchRule, Role, ScenarioKind } from '@/entities/delivery/types';
import { DeltaReducer, type BatchResult } from './delta-reducer';
import type { ClientCommand, RealtimeSource, RealtimeSourceOptions, ServerMessage, SourceMetrics, ViewSubscription } from './types';
import { SimEngine } from '@/shared/sim/engine';

export type { BatchResult } from './delta-reducer';

export class SimulatorClient implements RealtimeSource {
  readonly label: string;
  private worker: Worker | null = null;
  private inlineEngine: SimEngine | null = null;
  private inlineTimer: ReturnType<typeof setInterval> | null = null;
  private inlineRateHz = 10;
  private inlineRunning = false;
  private readonly inlineActor: Actor = { id: 'OP-INLINE', role: 'supervisor' };
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
    if (typeof Worker === 'undefined') {
      this.label = 'worker · inline fallback';
      this.inlineEngine = new SimEngine();
      return;
    }
    this.label = 'worker';
    try {
      this.worker = new Worker(new URL('../../workers/simulator.worker.ts', import.meta.url), { type: 'module' });
      this.worker.onmessage = (ev: MessageEvent) => this.handleMessage(ev.data as ServerMessage);
      this.worker.onerror = (ev: ErrorEvent) =>
        this.opts.onError?.(ev.message || '시뮬레이터 워커 오류');
    } catch (error) {
      this.label = 'worker · inline fallback';
      this.inlineEngine = new SimEngine();
      this.opts.onError?.(`Web Worker를 사용할 수 없어 inline fallback으로 전환했습니다: ${String(error)}`);
    }
  }

  start(): void {
    if (this.running) return;
    this.running = true;
    this.send({
      type: 'start',
      count: this.opts.count ?? 40,
      rateHz: this.opts.rateHz ?? 10,
      rule: this.opts.rule ?? 'FASTEST_ETA',
    });
    this.loop();
  }

  setCount(count: number): void {
    this.send({ type: 'setCount', count });
  }

  setRule(rule: DispatchRule): void {
    this.send({ type: 'setRule', rule });
  }

  setPaused(paused: boolean): void {
    this.send({ type: paused ? 'stop' : 'start' });
  }

  inject(scenario: ScenarioKind, on = true): void {
    this.send({ type: 'inject', scenario, on });
  }

  ackAlert(alertId: string): void {
    this.send({ type: 'ackAlert', alertId });
  }

  setDemo(on: boolean): void {
    this.send({ type: 'demo', on });
  }

  setRole(role: Role): void {
    this.send({ type: 'setRole', role });
  }

  reassign(riderId: string): void {
    this.send({ type: 'reassign', riderId });
  }

  contactCourier(riderId: string): void {
    this.send({ type: 'contactCourier', riderId });
  }

  promoteExpress(orderId: string): void {
    this.send({ type: 'promoteExpress', orderId });
  }

  setFocus(riderId: string | null): void {
    this.send({ type: 'setFocus', riderId: riderId ?? undefined });
  }

  setSubscription(_subscription: ViewSubscription): void {
    // Worker/inline 모드는 같은 브라우저 안에서 이미 전체 상태를 계산하므로 no-op.
  }

  getMetrics(): SourceMetrics {
    return { ...this.metrics };
  }

  requestSnapshot(): void {
    this.send({ type: 'snapshot' });
  }

  dispose(): void {
    this.running = false;
    if (this.rafId) cancelAnimationFrame(this.rafId);
    this.send({ type: 'stop' });
    this.worker?.terminate();
    if (this.inlineTimer) clearInterval(this.inlineTimer);
    this.inlineTimer = null;
    this.inlineEngine = null;
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

  private send(cmd: ClientCommand): void {
    if (this.worker) {
      this.worker.postMessage(cmd);
      return;
    }
    this.handleInline(cmd);
  }

  private handleInline(cmd: ClientCommand): void {
    const engine = this.inlineEngine;
    if (!engine) return;
    if (cmd.type === 'setRole') {
      if (cmd.role) this.inlineActor.role = cmd.role;
      return;
    }
    if (cmd.type === 'setFocus') {
      engine.setFocus(cmd.riderId ?? null);
      return;
    }
    if (cmd.type === 'snapshot') {
      this.handleMessage(engine.snapshot());
      return;
    }

    const result = engine.applyCommand(cmd, this.inlineActor);
    if (!result.accepted) {
      this.handleMessage(engine.snapshot());
      return;
    }
    switch (cmd.type) {
      case 'start':
        if (typeof cmd.rateHz === 'number' && Number.isFinite(cmd.rateHz)) this.inlineRateHz = Math.min(60, Math.max(1, cmd.rateHz));
        engine.ensureSpawned(typeof cmd.count === 'number' ? cmd.count : this.opts.count ?? 40);
        this.inlineRunning = true;
        if (this.inlineTimer) clearInterval(this.inlineTimer);
        this.inlineTimer = setInterval(() => {
          if (this.inlineRunning) this.handleMessage(engine.tick(this.inlineRateHz));
        }, Math.max(1000 / this.inlineRateHz, 16));
        this.handleMessage(engine.snapshot());
        break;
      case 'stop':
        this.inlineRunning = false;
        if (this.inlineTimer) clearInterval(this.inlineTimer);
        this.inlineTimer = null;
        this.handleMessage(engine.snapshot());
        break;
      case 'setCount':
        if (typeof cmd.count === 'number' && Number.isFinite(cmd.count)) engine.spawn(cmd.count);
        this.handleMessage(engine.snapshot());
        break;
      default:
        this.handleMessage(engine.snapshot());
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
