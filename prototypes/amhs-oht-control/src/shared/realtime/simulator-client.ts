import type {
  DispatchRule,
  ServerMessage,
} from '@/entities/oht/types';
import { DeltaReducer, type BatchResult } from './delta-reducer';
import type {
  ClientMetrics,
  RealtimeSource,
  RealtimeSourceOptions,
} from './types';

export type { BatchResult } from './delta-reducer';
export type { ClientMetrics, RealtimeSourceOptions } from './types';

/**
 * 방식 A — Web Worker 시뮬레이터를 실시간 소스로 감싼다.
 * 순수 코어(DeltaReducer)에 seq/코얼레싱을 위임하고, 여기서는
 * Worker 연결·requestAnimationFrame flush·메트릭만 담당한다.
 */
export class SimulatorClient implements RealtimeSource {
  readonly label = 'worker';
  private worker: Worker;
  private readonly onBatch: (b: BatchResult) => void;
  private readonly onMetrics?: (m: ClientMetrics) => void;
  private readonly reducer = new DeltaReducer();

  private rafId = 0;
  private running = false;
  private outage = false;

  private msgCount = 0;
  private updCount = 0;
  private appliedCount = 0;
  private resyncs = 0;
  private lastMsgTs = 0;
  private applyLatency = 0;
  private metricsTimer: ReturnType<typeof setInterval> | null = null;

  constructor(private readonly opts: RealtimeSourceOptions) {
    this.onBatch = opts.onBatch;
    this.onMetrics = opts.onMetrics;
    this.worker = new Worker(
      new URL('../../workers/simulator.worker.ts', import.meta.url),
      {
        type: 'module',
      },
    );
    this.worker.onmessage = (ev: MessageEvent) =>
      this.handleMessage(ev.data as ServerMessage);
    this.worker.onerror = (ev: ErrorEvent) =>
      this.opts.onError?.(ev.message || '시뮬레이터 워커 오류');
  }

  start(): void {
    if (this.running) return;
    this.running = true;
    this.worker.postMessage({
      type: 'start',
      count: this.opts.count ?? 1000,
      rateHz: this.opts.rateHz ?? 10,
    });
    this.opts.onStatus?.('open');
    this.loop();
    if (this.onMetrics)
      this.metricsTimer = setInterval(
        () => this.flushMetrics(),
        1000,
      );
  }

  setCount(count: number): void {
    this.worker.postMessage({ type: 'setCount', count });
  }

  setRate(rateHz: number): void {
    this.worker.postMessage({ type: 'setRate', rateHz });
  }

  setDispatch(rule: DispatchRule): void {
    this.worker.postMessage({ type: 'setDispatch', rule });
  }

  setPortIncident(enabled: boolean): void {
    this.worker.postMessage({ type: 'setPortIncident', enabled });
  }

  setRailClosure(enabled: boolean): void {
    this.worker.postMessage({ type: 'setRailClosure', enabled });
  }

  setOutage(enabled: boolean): void {
    this.outage = enabled;
    // 단절 중엔 수신 메시지를 버려 UI가 정지한다. 복구 시 스냅샷으로 재동기.
    this.opts.onStatus?.(enabled ? 'reconnecting' : 'open');
    if (!enabled) this.requestSnapshot();
  }

  requestSnapshot(): void {
    this.worker.postMessage({ type: 'snapshot' });
  }

  setPaused(paused: boolean): void {
    this.worker.postMessage({ type: paused ? 'stop' : 'start' });
  }

  dispose(): void {
    this.running = false;
    if (this.rafId) cancelAnimationFrame(this.rafId);
    if (this.metricsTimer) clearInterval(this.metricsTimer);
    this.worker.postMessage({ type: 'stop' });
    this.worker.terminate();
  }

  private handleMessage(msg: ServerMessage): void {
    if (this.outage) return; // 통신 단절 시뮬레이션: 수신 폐기
    this.lastMsgTs = performance.now();
    this.msgCount += 1;
    const { needResync, updCount } = this.reducer.ingest(msg);
    this.updCount += updCount;
    if (needResync) {
      this.resyncs += 1;
      this.requestSnapshot();
    }
  }

  private loop = (): void => {
    if (!this.running) return;
    this.flushFrame();
    this.rafId = requestAnimationFrame(this.loop);
  };

  private flushFrame(): void {
    if (!this.reducer.hasPending()) return;
    const batch = this.reducer.drain();
    this.appliedCount += batch.updates.length;
    if (this.lastMsgTs)
      this.applyLatency = performance.now() - this.lastMsgTs;
    this.onBatch(batch);
  }

  private flushMetrics(): void {
    const coalesced = Math.max(this.updCount - this.appliedCount, 0);
    this.onMetrics?.({
      messageRate: this.msgCount,
      updateRate: this.updCount,
      coalesced,
      resyncs: this.resyncs,
      applyLatency: Math.round(this.applyLatency),
    });
    this.msgCount = 0;
    this.updCount = 0;
    this.appliedCount = 0;
  }
}
