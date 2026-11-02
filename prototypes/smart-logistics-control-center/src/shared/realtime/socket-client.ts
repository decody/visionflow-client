/**
 * 방식 B — 실제 `ws` 서버(포트 3016)에 연결하는 실시간 소스. 단계 7.
 *
 * 코어 파이프라인(DeltaReducer·rAF flush·메트릭)은 Worker 버전과 동일하고, 여기서는
 * 진짜 소켓의 견고성(재연결·exponential backoff·heartbeat·seq 재동기)을 다룬다.
 * 재연결 후 마지막 세션 상태(대수·규칙·시나리오·역할·일시정지)를 다시 적용한다.
 */

import type { Role, RoutingRule, ScenarioKind } from '@/entities/logistics/types';
import { DeltaReducer } from './delta-reducer';
import type {
  BatchResult,
  RealtimeSource,
  RealtimeSourceOptions,
  ServerMessage,
  SourceMetrics,
} from './types';

const HEARTBEAT_MS = 10000;
const MAX_BACKOFF_MS = 8000;

export class SocketClient implements RealtimeSource {
  readonly label: string;
  private ws: WebSocket | null = null;
  private readonly reducer = new DeltaReducer();
  private readonly onBatch: (b: BatchResult) => void;

  private rafId = 0;
  private running = false;
  private disposed = false;
  private backoff = 500;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private heartbeatTimer: ReturnType<typeof setInterval> | null = null;
  private lastReceived = 0;

  private readonly metrics: SourceMetrics = { msgCount: 0, rawUpd: 0, drainedUpd: 0, batchCount: 0, resyncCount: 0 };

  // 재연결 후 재적용할 세션 상태
  private count: number;
  private rateHz: number;
  private rule: RoutingRule;
  private role: Role = 'supervisor';
  private paused = false;
  private readonly scenarios = new Set<ScenarioKind>();
  private demoOn = false;

  constructor(
    private readonly url: string,
    private readonly opts: RealtimeSourceOptions,
  ) {
    this.label = `ws · ${url.replace(/^wss?:\/\//, '')}`;
    this.onBatch = opts.onBatch;
    this.count = opts.count ?? 300;
    this.rateHz = opts.rateHz ?? 10;
    this.rule = opts.rule ?? 'FASTEST_ETA';
  }

  start(): void {
    if (this.running) return;
    this.running = true;
    this.connect();
    this.loop();
  }

  private connect(): void {
    if (this.disposed) return;
    let ws: WebSocket;
    try {
      const token = process.env.NEXT_PUBLIC_WS_TOKEN;
      const url = token ? `${this.url}${this.url.includes('?') ? '&' : '?'}token=${encodeURIComponent(token)}` : this.url;
      ws = new WebSocket(url);
    } catch {
      this.scheduleReconnect();
      return;
    }
    this.ws = ws;

    ws.onopen = () => {
      this.lastReceived = Date.now();
      this.backoff = 500;
      if (this.role !== 'supervisor') this.send({ type: 'setRole', role: this.role });
      this.send({ type: 'start', count: this.count, rateHz: this.rateHz });
      this.send({ type: 'setRule', rule: this.rule });
      for (const sc of this.scenarios) this.send({ type: 'inject', scenario: sc, on: true });
      if (this.demoOn) this.send({ type: 'demo', on: true });
      this.requestSnapshot();
      if (this.paused) this.send({ type: 'stop' });
      this.startHeartbeat();
    };
    ws.onmessage = (ev) => {
      this.lastReceived = Date.now();
      let msg: ServerMessage | { type: string };
      try {
        msg = JSON.parse(ev.data as string);
      } catch {
        return;
      }
      if (!msg || typeof msg !== 'object') return;
      if ((msg as { type: string }).type === 'pong') return;
      if (msg.type !== 'snapshot' && msg.type !== 'delta') return;
      this.handleMessage(msg as ServerMessage);
    };
    ws.onerror = () => this.opts.onError?.(`ws 연결 오류: ${this.url}`);
    ws.onclose = () => {
      this.stopHeartbeat();
      if (!this.disposed && this.running) this.scheduleReconnect();
    };
  }

  private scheduleReconnect(): void {
    if (this.reconnectTimer || this.disposed) return;
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
      if (Date.now() - this.lastReceived > HEARTBEAT_MS * 3) this.ws?.close();
      else this.send({ type: 'ping' });
    }, HEARTBEAT_MS);
  }
  private stopHeartbeat(): void {
    if (this.heartbeatTimer) clearInterval(this.heartbeatTimer);
    this.heartbeatTimer = null;
  }

  private send(obj: Record<string, unknown>): void {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) this.ws.send(JSON.stringify(obj));
  }

  setCount(count: number): void {
    this.count = count;
    this.send({ type: 'setCount', count });
  }
  setRule(rule: RoutingRule): void {
    this.rule = rule;
    this.send({ type: 'setRule', rule });
  }
  setPaused(paused: boolean): void {
    this.paused = paused;
    this.send(paused ? { type: 'stop' } : { type: 'start', count: this.count, rateHz: this.rateHz });
    if (!paused) this.requestSnapshot();
  }
  inject(scenario: ScenarioKind, on = true): void {
    if (scenario === 'reset') this.scenarios.clear();
    else if (on) this.scenarios.add(scenario);
    else this.scenarios.delete(scenario);
    this.send({ type: 'inject', scenario, on });
  }
  ackAlert(alertId: string): void {
    this.send({ type: 'ackAlert', alertId });
  }
  setDemo(on: boolean): void {
    this.demoOn = on;
    this.send({ type: 'demo', on });
  }
  promoteExpedite(shipmentId: string): void {
    this.send({ type: 'promoteExpedite', shipmentId });
  }
  rerouteShipment(shipmentId: string): void {
    this.send({ type: 'rerouteShipment', shipmentId });
  }
  setRole(role: Role): void {
    this.role = role;
    this.send({ type: 'setRole', role });
  }
  requestSnapshot(): void {
    this.send({ type: 'snapshot' });
  }
  getMetrics(): SourceMetrics {
    return { ...this.metrics };
  }

  dispose(): void {
    this.disposed = true;
    this.running = false;
    if (this.rafId) cancelAnimationFrame(this.rafId);
    if (this.reconnectTimer) clearTimeout(this.reconnectTimer);
    this.stopHeartbeat();
    this.ws?.close();
    this.ws = null;
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
