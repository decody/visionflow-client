/// <reference lib="webworker" />
/**
 * 인-브라우저 복합운송 시뮬레이터 (방식 A: Web Worker) — 단계 2~7.
 * 시뮬레이션은 공용 SimEngine이 담당한다. 단계 7부터 도메인 명령은 연동 경계
 * `engine.applyCommand(cmd, actor)`를 거친다(역할 인증 + 감사). 루프 제어만 여기서 실행.
 */
import type { Actor } from '@/entities/logistics/types';
import type { ClientCommand, ServerMessage } from '@/shared/realtime/types';
import { SimEngine } from '@/shared/sim/engine';

const engine = new SimEngine();
let timer: ReturnType<typeof setInterval> | null = null;
let running = false;
let rateHz = 10;
let count = 300;
// 로컬 단일 세션 주체. 기본 supervisor — setRole로 낮춰 연동 경계(거부)를 시연한다.
const actor: Actor = { id: 'OP-LOCAL', role: 'supervisor' };

function post(msg: ServerMessage): void {
  (self as unknown as Worker).postMessage(msg);
}

function schedule(): void {
  if (timer) clearInterval(timer);
  timer = setInterval(() => post(engine.tick(rateHz)), Math.max(1000 / rateHz, 16));
}

function start(): void {
  if (running) return;
  running = true;
  engine.ensureSpawned(count);
  engine.setRunning(true);
  post(engine.snapshot());
  schedule();
}

function stop(): void {
  running = false;
  engine.setRunning(false);
  if (timer) {
    clearInterval(timer);
    timer = null;
  }
}

self.onmessage = (ev: MessageEvent) => {
  const cmd = ev.data as ClientCommand;

  // 세션 전용(경계 밖, 인증/감사 대상 아님): 역할 전환.
  if (cmd.type === 'setRole') {
    if (cmd.role) actor.role = cmd.role;
    return;
  }
  if (cmd.type === 'setSubscription') return; // 방식 A는 전체 상태를 계산 → no-op
  if (cmd.type === 'snapshot') {
    post(engine.snapshot());
    return;
  }

  // 연동 경계: 역할 인증 + 감사. 도메인 명령은 applyCommand가 실행한다.
  const result = engine.applyCommand(cmd, actor);
  if (!result.accepted) {
    post(engine.snapshot()); // 거부도 감사 로그에 남으므로 최신 스냅샷으로 반영
    return;
  }

  // 루프 제어(start/stop/setCount)만 호출측이 실행한다.
  switch (cmd.type) {
    case 'start':
      if (typeof cmd.count === 'number') count = cmd.count;
      if (typeof cmd.rateHz === 'number') rateHz = cmd.rateHz;
      start();
      break;
    case 'stop':
      stop();
      post(engine.snapshot());
      break;
    case 'setCount':
      if (typeof cmd.count === 'number') {
        count = cmd.count;
        const wasRunning = running;
        stop();
        engine.spawn(count);
        if (wasRunning) start();
        else post(engine.snapshot());
      }
      break;
    default:
      // setRule/inject/ackAlert/demo/promoteExpedite/rerouteShipment: applyCommand가 실행 → 스냅샷만.
      post(engine.snapshot());
      break;
  }
};
