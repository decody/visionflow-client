/**
 * 방식 B — 로컬 `ws` 실시간 서버 (단계 7). 포트 3016.
 *
 * 브라우저 Worker와 동일한 SimEngine을 노드에서 구동해 snapshot/delta를 WebSocket으로
 * 브로드캐스트한다. 실제 소켓의 재연결/heartbeat/seq 복구와 서버측 인증·rate limit·구독
 * 필터를 실측하기 위한 옵션 백엔드다(DB 없음).
 *
 * 실행:  pnpm --filter @visionflow/smart-logistics-control-center ws:server
 * 사용:  프론트에서 ?src=ws  또는  NEXT_PUBLIC_WS_URL=ws://localhost:3016
 */
import { appendFileSync } from 'node:fs';
import { WebSocketServer, type WebSocket } from 'ws';

import { HUBS } from '@/entities/logistics/mock';
import type { Actor } from '@/entities/logistics/types';
import { parseClientCommand } from '@/shared/integration/command-contract';
import type { ClientCommand, ServerMessage, ViewSubscription } from '@/shared/realtime/types';
import { SimEngine } from '@/shared/sim/engine';
import { actorFromRequest } from './ws-auth';

const PORT = Number(process.env.WS_PORT ?? 3016);
const MAX_PAYLOAD_BYTES = Number(process.env.WS_MAX_PAYLOAD_BYTES ?? 64 * 1024);
const COMMAND_WINDOW_MS = 10_000;
const COMMANDS_PER_WINDOW = Number(process.env.WS_COMMANDS_PER_WINDOW ?? 60);
const AUDIT_LOG = process.env.WS_AUDIT_LOG?.trim();
const STATE_SCOPE = process.env.WS_STATE_SCOPE === 'isolated' ? 'isolated' : 'shared';

const HUB_REGION: Record<string, string> = Object.fromEntries(HUBS.map((h) => [h.id, h.region]));

const engine = new SimEngine();
let count = 300;
let rateHz = 10;
let running = false;
let timer: ReturnType<typeof setInterval> | null = null;
let clientSeq = 0;

const wss = new WebSocketServer({ port: PORT, maxPayload: MAX_PAYLOAD_BYTES });
const clients = new Set<WebSocket>();
const subscriptions = new Map<WebSocket, ViewSubscription>();

const clamp = (n: number) => Math.min(5000, Math.max(1, Math.floor(n)));
const wire = (m: ServerMessage): string => JSON.stringify(m);

function schedule(): void {
  if (timer) clearInterval(timer);
  timer = setInterval(() => {
    if (running) broadcastMessage(engine.tick(rateHz));
  }, Math.max(1000 / rateHz, 16));
}

function startShared(): void {
  engine.ensureSpawned(count);
  running = true;
  schedule();
}

wss.on('connection', (ws: WebSocket, request) => {
  const authenticatedActor = actorFromRequest(request.url);
  if (!authenticatedActor) {
    ws.close(1008, '인증되지 않은 WebSocket 연결입니다.');
    return;
  }
  clients.add(ws);
  let commandWindowStarted = Date.now();
  let commandCount = 0;
  let subscription: ViewSubscription = {};
  subscriptions.set(ws, subscription);
  const sendError = (code: string, reason: string) => ws.send(JSON.stringify({ type: 'error', code, reason }));
  const sendMessage = (message: ServerMessage) => ws.send(wire(filterMessage(message, subscription)));

  // 토큰이 설정되면 actor는 서버가 결정한다. 토큰 없을 때(OP-DEMO)만 세션 역할 전환 허용.
  const actor: Actor =
    authenticatedActor.id === 'OP-DEMO' ? { id: `OP-${++clientSeq}`, role: authenticatedActor.role } : authenticatedActor;

  const sessionEngine = STATE_SCOPE === 'isolated' ? new SimEngine() : engine;
  let sessionCount = STATE_SCOPE === 'isolated' ? 300 : count;
  let sessionRateHz = STATE_SCOPE === 'isolated' ? 10 : rateHz;
  let sessionRunning = false;
  let sessionTimer: ReturnType<typeof setInterval> | null = null;
  sessionEngine.ensureSpawned(sessionCount);
  sendMessage(sessionEngine.snapshot());
  const publish = (m: ServerMessage) => (STATE_SCOPE === 'isolated' ? sendMessage(m) : broadcastMessage(m));

  const startSession = () => {
    if (STATE_SCOPE !== 'isolated') {
      startShared();
      return;
    }
    sessionEngine.ensureSpawned(sessionCount);
    sessionRunning = true;
    if (sessionTimer) clearInterval(sessionTimer);
    sessionTimer = setInterval(() => {
      if (sessionRunning) sendMessage(sessionEngine.tick(sessionRateHz));
    }, Math.max(1000 / sessionRateHz, 16));
  };
  const stopSession = () => {
    if (STATE_SCOPE !== 'isolated') {
      running = false;
      return;
    }
    sessionRunning = false;
    if (sessionTimer) clearInterval(sessionTimer);
    sessionTimer = null;
  };

  ws.on('message', (raw: Buffer | string) => {
    if (Buffer.byteLength(raw.toString(), 'utf8') > MAX_PAYLOAD_BYTES) {
      sendError('PAYLOAD_TOO_LARGE', `payload는 ${MAX_PAYLOAD_BYTES} bytes 이하이어야 합니다.`);
      return;
    }
    let rawCommand: unknown;
    try {
      rawCommand = JSON.parse(raw.toString()) as unknown;
    } catch {
      sendError('BAD_REQUEST', 'JSON payload가 올바르지 않습니다.');
      return;
    }
    if (!rawCommand || typeof rawCommand !== 'object') {
      sendError('BAD_REQUEST', '명령 payload가 객체여야 합니다.');
      return;
    }
    const rawType = (rawCommand as { type?: unknown }).type;

    if (rawType === 'ping') {
      ws.send(JSON.stringify({ type: 'pong' }));
      return;
    }
    const now = Date.now();
    if (now - commandWindowStarted >= COMMAND_WINDOW_MS) {
      commandWindowStarted = now;
      commandCount = 0;
    }
    commandCount += 1;
    if (commandCount > COMMANDS_PER_WINDOW) {
      sendError('RATE_LIMITED', `${COMMANDS_PER_WINDOW}개/${COMMAND_WINDOW_MS / 1000}초 명령 제한을 초과했습니다.`);
      return;
    }
    if (rawType === 'setRole') {
      if (process.env.WS_AUTH_TOKENS?.trim()) {
        sendError('FORBIDDEN', '인증된 세션에서는 역할을 변경할 수 없습니다.');
        return;
      }
      const role = (rawCommand as { role?: unknown }).role;
      if (role === 'viewer' || role === 'dispatcher' || role === 'supervisor') actor.role = role;
      else sendError('BAD_REQUEST', 'role이 올바르지 않습니다.');
      return;
    }
    if (rawType === 'setSubscription') {
      const next = (rawCommand as { subscription?: unknown }).subscription;
      if (!isSubscription(next)) {
        sendError('BAD_REQUEST', 'subscription이 올바르지 않습니다.');
        return;
      }
      subscription = next;
      subscriptions.set(ws, subscription);
      sendMessage(sessionEngine.snapshot());
      return;
    }
    const parsed = parseClientCommand(rawCommand);
    if (!parsed.command) {
      sendError('BAD_REQUEST', parsed.reason ?? '명령이 올바르지 않습니다.');
      return;
    }
    const cmd: ClientCommand = parsed.command;
    if (cmd.type === 'snapshot') {
      sendMessage(sessionEngine.snapshot());
      return;
    }
    const refError = validateReferences(cmd, sessionEngine);
    if (refError) {
      sendError('BAD_REQUEST', refError);
      return;
    }

    // 연동 경계: 역할 인증 + 감사. 도메인 명령은 applyCommand가 실행.
    const result = sessionEngine.applyCommand(cmd, actor);
    persistAudit(cmd, actor, result);
    if (!result.accepted) {
      sendMessage(sessionEngine.snapshot());
      return;
    }
    switch (cmd.type) {
      case 'start':
        if (typeof cmd.count === 'number' && Number.isFinite(cmd.count)) {
          if (STATE_SCOPE === 'isolated') sessionCount = clamp(cmd.count);
          else count = clamp(cmd.count);
          sessionEngine.spawn(STATE_SCOPE === 'isolated' ? sessionCount : count);
        }
        if (typeof cmd.rateHz === 'number' && Number.isFinite(cmd.rateHz)) {
          if (STATE_SCOPE === 'isolated') sessionRateHz = Math.min(60, Math.max(1, cmd.rateHz));
          else rateHz = Math.min(60, Math.max(1, cmd.rateHz));
        }
        if (STATE_SCOPE === 'isolated' ? !sessionRunning : !running) startSession();
        publish(sessionEngine.snapshot());
        break;
      case 'stop':
        stopSession();
        publish(sessionEngine.snapshot());
        break;
      case 'setCount':
        if (typeof cmd.count === 'number' && Number.isFinite(cmd.count)) {
          if (STATE_SCOPE === 'isolated') sessionCount = clamp(cmd.count);
          else count = clamp(cmd.count);
          sessionEngine.spawn(STATE_SCOPE === 'isolated' ? sessionCount : count);
        }
        publish(sessionEngine.snapshot());
        break;
      default:
        publish(sessionEngine.snapshot());
        break;
    }
  });

  ws.on('close', () => {
    clients.delete(ws);
    subscriptions.delete(ws);
    if (sessionTimer) clearInterval(sessionTimer);
  });
  ws.on('error', () => {
    clients.delete(ws);
    subscriptions.delete(ws);
    if (sessionTimer) clearInterval(sessionTimer);
  });
});

function broadcastMessage(message: ServerMessage): void {
  if (STATE_SCOPE === 'isolated') return;
  for (const client of clients) {
    if (client.readyState !== client.OPEN) continue;
    client.send(wire(filterMessage(message, subscriptions.get(client) ?? {})));
  }
}

function isSafeId(value: unknown): value is string {
  return typeof value === 'string' && value.length > 0 && value.length <= 128;
}

function validateReferences(cmd: ClientCommand, currentEngine: SimEngine): string | undefined {
  if ((cmd.type === 'promoteExpedite' || cmd.type === 'rerouteShipment') && !currentEngine.hasShipment(cmd.shipmentId)) {
    return `존재하지 않는 shipmentId입니다: ${cmd.shipmentId}`;
  }
  if (cmd.type === 'ackAlert' && !currentEngine.hasAlert(cmd.alertId)) {
    return `존재하지 않는 alertId입니다: ${cmd.alertId}`;
  }
  return undefined;
}

function isSubscription(value: unknown): value is ViewSubscription {
  if (!value || typeof value !== 'object') return false;
  const r = value as Record<string, unknown>;
  if (r.region !== undefined && (!isSafeId(r.region) || (r.region as string).length > 64)) return false;
  if (r.extent !== undefined) {
    if (!Array.isArray(r.extent) || r.extent.length !== 4 || r.extent.some((v) => typeof v !== 'number' || !Number.isFinite(v))) return false;
  }
  return true;
}

/** 구독(권역·extent)에 맞춰 outbound 메시지를 축소한다. */
function filterMessage(message: ServerMessage, sub: ViewSubscription): ServerMessage {
  if (!sub.region && !sub.extent) return message;
  const inExtent = (lon: number, lat: number) => {
    if (!sub.extent) return true;
    const [minLon, minLat, maxLon, maxLat] = sub.extent;
    return lon >= minLon && lon <= maxLon && lat >= minLat && lat <= maxLat;
  };
  const convOk = (c: { region: string; lon: number; lat: number }) =>
    (!sub.region || c.region === sub.region) && inExtent(c.lon, c.lat);
  const shipOk = (s: { legs: { from: string; to: string }[] }) =>
    !sub.region || s.legs.some((l) => HUB_REGION[l.from] === sub.region || HUB_REGION[l.to] === sub.region);

  if (message.type === 'snapshot') {
    return { ...message, conveyances: message.conveyances.filter(convOk), shipments: message.shipments.filter(shipOk) };
  }
  return {
    ...message,
    upd: message.upd.filter(convOk),
    add: message.add?.filter(convOk),
    shipmentsAdd: message.shipmentsAdd?.filter(shipOk),
    shipmentsUpd: message.shipmentsUpd?.filter(shipOk),
  };
}

function persistAudit(cmd: ClientCommand, actor: Actor, result: { accepted: boolean; code: string; reason?: string; auditId?: string }): void {
  if (!AUDIT_LOG) return;
  appendFileSync(
    AUDIT_LOG,
    `${JSON.stringify({ ts: new Date().toISOString(), auditId: result.auditId, actor, command: cmd.type, accepted: result.accepted, code: result.code, reason: result.reason })}\n`,
    'utf8',
  );
}

wss.on('listening', () => {
  const address = wss.address();
  // eslint-disable-next-line no-console
  console.log(`[smart-logistics] ws server listening on ws://localhost:${address && typeof address === 'object' ? address.port : PORT} (scope=${STATE_SCOPE})`);
});
