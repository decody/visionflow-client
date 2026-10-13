/// <reference lib="webworker" />
/**
 * 인-브라우저 배송 시뮬레이터 (방식 A: Web Worker) — 단계 2.
 * 시뮬레이션은 공용 SimEngine이 담당하고, 이 파일은 postMessage 전송만 맡는다.
 */
import type { Actor } from '../entities/delivery/types';
import type { ClientCommand, ServerMessage } from '../shared/realtime/types';
import { SimEngine } from '../shared/sim/engine';

const engine = new SimEngine();
let timer: ReturnType<typeof setInterval> | null = null;
let running = false;
let rateHz = 10;
let count = 40;
// 로컬 단일 세션 주체. 실제 시스템에서는 인증 토큰에서 역할을 도출한다.
// 기본은 supervisor(전체 조작 가능) — setRole로 낮춰 연동 경계(거부)를 시연한다.
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
  post(engine.snapshot());
  schedule();
}

function stop(): void {
  running = false;
  if (timer) {
    clearInterval(timer);
    timer = null;
  }
}

self.onmessage = (ev: MessageEvent) => {
  const cmd = ev.data as ClientCommand;

  // 세션 전용: 역할 전환(연동 경계 밖 — 인증/감사 대상 아님).
  if (cmd.type === 'setRole') {
    if (cmd.role) actor.role = cmd.role;
    return;
  }
  // 세션 전용: 추적선 포커스 라이더 지정(단계 7). 읽기 성격이라 경계 밖.
  if (cmd.type === 'setFocus') {
    engine.setFocus(cmd.riderId ?? null);
    return;
  }
  // 읽기 전용 스냅샷은 경계 밖에서 바로 응답한다.
  if (cmd.type === 'snapshot') {
    post(engine.snapshot());
    return;
  }

  // 연동 경계: 역할 인증 + 감사 로그. 도메인 명령은 applyCommand가 실행한다.
  const result = engine.applyCommand(cmd, actor);
  if (!result.accepted) {
    // 거부도 감사 로그에 남으므로 최신 스냅샷으로 UI에 반영한다.
    post(engine.snapshot());
    return;
  }

  // 루프 제어(start/stop/setCount)만 호출측이 실행한다. 나머지는 applyCommand가 수행함.
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
      // setRule/inject/ackAlert/demo/reassign/promoteExpress/contactCourier:
      // applyCommand에서 실행됨 — 최신 스냅샷만 방출.
      post(engine.snapshot());
      break;
  }
};
