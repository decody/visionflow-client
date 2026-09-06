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

const HEARTBEAT_MS = 10000;
const MAX_BACKOFF_MS = 8000;

/**
 * 방식 B — 실제 `ws` 서버에 연결하는 실시간 소스.
 * 코어 파이프라인(DeltaReducer·rAF flush·메트릭)은 Worker 버전과 동일하고,
 * 여기서는 진짜 소켓의 견고성(재연결·exponential backoff·heartbeat)을 다룬다.
 */
export class SocketClient implements RealtimeSource {
  readonly label: string;
  private ws: WebSocket | null = null;
  private readonly reducer = new DeltaReducer();

  private rafId = 0;
  private running = false;
  private disposed = false;
  private backoff = 500;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private heartbeatTimer: ReturnType<typeof setInterval> | null =
    null;

  private msgCount = 0;
  private updCount = 0;
  private appliedCount = 0;
  private resyncs = 0;
  private lastMsgTs = 0;
  private applyLatency = 0;
  private metricsTimer: ReturnType<typeof setInterval> | null = null;

  // 재연결 후 서버에 재적용할 최신 파라미터
  private count: number;
  private rateHz: number;
  private paused = false;
  private rule: DispatchRule = 'priority';
  private portIncident = false;
  private lastReceived = 0;

  constructor(
    private readonly url: string,
    private readonly opts: RealtimeSourceOptions,
  ) {
    this.label = `ws · ${url.replace(/^wss?:\/\//, '')}`;
    this.count = opts.count ?? 1000;
    this.rateHz = opts.rateHz ?? 10;
  }

  start(): void {
    if (this.running) return;
    this.running = true;
    this.connect();
    this.loop();
    if (this.opts.onMetrics)
      this.metricsTimer = setInterval(
        () => this.flushMetrics(),
        1000,
      );
  }

  private connect(): void {
    if (this.disposed) return;
    this.opts.onStatus?.(
      this.backoff > 500 ? 'reconnecting' : 'connecting',
    );
    let ws: WebSocket;
    try {
      ws = new WebSocket(this.url);
    } catch {
      this.scheduleReconnect();
      return;
    }
    this.ws = ws;

    ws.onopen = () => {
      this.lastReceived = Date.now();
      this.backoff = 500;
      this.opts.onStatus?.('open');
      this.send({
        type: 'start',
        count: this.count,
        rateHz: this.rateHz,
      });
      this.send({ type: 'setDispatch', rule: this.rule });
      if (this.portIncident)
        this.send({ type: 'setPortIncident', enabled: true });
      this.requestSnapshot();
      if (this.paused) this.send({ type: 'stop' });
      this.startHeartbeat();
    };
    ws.onmessage = (ev) => {
      this.lastReceived = Date.now();
      let msg: ServerMessage;
      try {
        msg = JSON.parse(ev.data as string) as ServerMessage;
      } catch {
        return;
      }
      if (msg && (msg as { type: string }).type === 'pong') return;
      if (!msg || (msg.type !== 'snapshot' && msg.type !== 'delta'))
        return;
      if (!Number.isSafeInteger(msg.seq) || !Number.isFinite(msg.ts))
        return;
      if (
        msg.type === 'snapshot'
          ? !Array.isArray(msg.vehicles)
          : !Array.isArray(msg.upd)
      )
        return;
      this.handleMessage(msg);
    };
    ws.onerror = () =>
      this.opts.onError?.(`ws 연결 오류: ${this.url}`);
    ws.onclose = () => {
      this.stopHeartbeat();
      if (!this.disposed && this.running) {
        this.opts.onStatus?.('reconnecting');
        this.scheduleReconnect();
      }
    };
  }

  private scheduleReconnect(): void {
    if (this.reconnectTimer) return;
    const delay = this.backoff;
    this.backoff = Math.min(this.backoff * 2, MAX_BACKOFF_MS);
    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;
      this.connect();
    }, delay);
  }

  private startHeartbeat(): void {
    this.stopHeartbeat();
    this.heartbeatTimer = setInterval(() => {
      if (Date.now() - this.lastReceived > HEARTBEAT_MS * 3)
        this.ws?.close();
      else this.send({ type: 'ping' });
    }, HEARTBEAT_MS);
  }
  private stopHeartbeat(): void {
    if (this.heartbeatTimer) clearInterval(this.heartbeatTimer);
    this.heartbeatTimer = null;
  }

  private send(obj: Record<string, unknown>): void {
    if (this.ws && this.ws.readyState === WebSocket.OPEN)
      this.ws.send(JSON.stringify(obj));
  }

  setCount(count: number): void {
    this.count = count;
    this.send({ type: 'setCount', count });
  }
  setRate(rateHz: number): void {
    this.rateHz = rateHz;
    this.send({ type: 'setRate', rateHz });
  }
  setDispatch(rule: DispatchRule): void {
    this.rule = rule;
    this.send({ type: 'setDispatch', rule });
  }
  setPortIncident(enabled: boolean): void {
    this.portIncident = enabled;
    this.send({ type: 'setPortIncident', enabled });
  }
  requestSnapshot(): void {
    this.send({ type: 'snapshot' });
  }
  setPaused(paused: boolean): void {
    this.paused = paused;
    this.send({ type: paused ? 'stop' : 'start' });
  }

  dispose(): void {
    this.disposed = true;
    this.running = false;
    if (this.rafId) cancelAnimationFrame(this.rafId);
    if (this.metricsTimer) clearInterval(this.metricsTimer);
    if (this.reconnectTimer) clearTimeout(this.reconnectTimer);
    this.stopHeartbeat();
    this.ws?.close();
    this.ws = null;
  }

  private handleMessage(msg: ServerMessage): void {
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
    const batch: BatchResult = this.reducer.drain();
    this.appliedCount += batch.updates.length;
    if (this.lastMsgTs)
      this.applyLatency = performance.now() - this.lastMsgTs;
    this.opts.onBatch(batch);
  }

  private flushMetrics(): void {
    const coalesced = Math.max(this.updCount - this.appliedCount, 0);
    const m: ClientMetrics = {
      messageRate: this.msgCount,
      updateRate: this.updCount,
      coalesced,
      resyncs: this.resyncs,
      applyLatency: Math.round(this.applyLatency),
    };
    this.opts.onMetrics?.(m);
    this.msgCount = 0;
    this.updCount = 0;
    this.appliedCount = 0;
  }
}
