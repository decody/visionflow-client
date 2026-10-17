/**
 * 방식 B — 로컬 `ws` 실시간 서버 (단계 6). 포트 3014.
 *
 * 브라우저 Worker와 동일한 SimEngine을 노드에서 구동해 snapshot/delta를
 * WebSocket으로 브로드캐스트한다. 실제 소켓의 재연결/heartbeat/seq gap 복구를
 * 프론트에서 실측하기 위한 옵션 백엔드다. (DB 없음, 인증은 세션 역할 모사만)
 *
 * 실행:  pnpm --filter @visionflow/last-mile-delivery-control ws:server
 *        (node --import tsx server/ws-server.ts)
 * 사용:  프론트에서 ?src=ws  또는  NEXT_PUBLIC_WS_URL=ws://localhost:3014
 */
import { WebSocketServer, type WebSocket } from 'ws';

import type { Actor } from '@/entities/delivery/types';
import type { ClientCommand, ServerMessage } from '@/shared/realtime/types';
import { SimEngine } from '@/shared/sim/engine';

const PORT = Number(process.env.WS_PORT ?? 3014);

const engine = new SimEngine();
let count = 60;
let rateHz = 10;
let running = false;
let timer: ReturnType<typeof setInterval> | null = null;
let clientSeq = 0;

const wss = new WebSocketServer({ port: PORT });
const clients = new Set<WebSocket>();

function broadcast(json: string): void {
  for (const ws of clients) {
    if (ws.readyState === ws.OPEN) ws.send(json);
  }
}

const wire = (m: ServerMessage): string => JSON.stringify(m);

function schedule(): void {
  if (timer) clearInterval(timer);
  timer = setInterval(
    () => {
      if (!running) return;
      broadcast(wire(engine.tick(rateHz)));
    },
    Math.max(1000 / rateHz, 16),
  );
}

function start(): void {
  engine.ensureSpawned(count);
  running = true;
  schedule();
}

const clamp = (n: number) => Math.min(5000, Math.max(1, Math.floor(n)));

wss.on('connection', (ws: WebSocket) => {
  clients.add(ws);
  // 연결(세션)마다 주체를 부여한다. 실제 시스템에서는 인증 토큰에서 역할을 도출한다.
  // 기본 supervisor — 클라이언트가 setRole로 낮춰 경계(거부)를 시연할 수 있다.
  const actor: Actor = { id: `OP-${++clientSeq}`, role: 'supervisor' };
  engine.ensureSpawned(count);
  ws.send(wire(engine.snapshot())); // 신규 클라이언트 초기 동기화

  ws.on('message', (raw: Buffer | string) => {
    let cmd: ClientCommand;
    try {
      cmd = JSON.parse(raw.toString()) as ClientCommand;
    } catch {
      return;
    }
    if (!cmd || typeof cmd !== 'object') return;

    // 프로토콜·세션 전용(감사 비대상) 명령
    if ((cmd.type as string) === 'ping') {
      ws.send(JSON.stringify({ type: 'pong' }));
      return;
    }
    if (cmd.type === 'setRole') {
      if (cmd.role) actor.role = cmd.role;
      return;
    }
    if (cmd.type === 'setFocus') {
      engine.setFocus(cmd.riderId ?? null);
      return;
    }
    if (cmd.type === 'snapshot') {
      ws.send(wire(engine.snapshot()));
      return;
    }

    // 연동 경계: 역할 인증 + 감사. 엔진 도메인 명령은 여기서 실행된다.
    const result = engine.applyCommand(cmd, actor);
    if (!result.accepted) {
      ws.send(wire(engine.snapshot())); // 거부도 감사 로그에 남으므로 요청자에 반영
      return;
    }
    switch (cmd.type) {
      case 'start':
        if (typeof cmd.count === 'number' && Number.isFinite(cmd.count)) {
          count = clamp(cmd.count);
          if (engine.riderCount() !== count) engine.spawn(count);
        }
        if (typeof cmd.rateHz === 'number' && Number.isFinite(cmd.rateHz))
          rateHz = Math.min(60, Math.max(1, cmd.rateHz));
        if (!running) start();
        broadcast(wire(engine.snapshot()));
        break;
      case 'stop':
        running = false;
        broadcast(wire(engine.snapshot()));
        break;
      case 'setCount':
        if (typeof cmd.count === 'number' && Number.isFinite(cmd.count)) {
          count = clamp(cmd.count);
          engine.spawn(count);
        }
        broadcast(wire(engine.snapshot()));
        break;
      default:
        // setRule/inject/ackAlert/demo/reassign/promoteExpress/contactCourier:
        // applyCommand가 실행 — 최신 스냅샷만 방출.
        broadcast(wire(engine.snapshot()));
        break;
    }
  });

  ws.on('close', () => clients.delete(ws));
  ws.on('error', () => clients.delete(ws));
});

// 부팅 시엔 대기만 하고, 클라이언트가 'start'를 보내면 틱을 시작한다.
wss.on('listening', () => {
  const address = wss.address();
  // eslint-disable-next-line no-console
  console.log(
    `[last-mile] ws simulator server listening on ws://localhost:${
      address && typeof address === 'object' ? address.port : PORT
    }`,
  );
});
