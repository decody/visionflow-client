/// <reference lib="webworker" />
/**
 * In-browser AMHS/OHT 시뮬레이터 (방식 A: Web Worker).
 * 시뮬레이션은 공용 SimEngine이 담당하고, 이 파일은 postMessage 전송만 맡는다.
 */
import type {
  Actor,
  ClientCommand,
  ServerMessage,
} from '../entities/oht/types';
import { SimEngine } from '../shared/sim/engine';

const engine = new SimEngine();
let timer: ReturnType<typeof setInterval> | null = null;
let running = false;
let rateHz = 10;
let count = 1000;
// 로컬 단일 운영자 세션. 실제 시스템에서는 인증 토큰에서 역할을 도출한다.
const ACTOR: Actor = { id: 'OP-LOCAL', role: 'supervisor' };

function post(msg: ServerMessage): void {
  (self as unknown as Worker).postMessage(msg);
}

function schedule(): void {
  if (timer) clearInterval(timer);
  timer = setInterval(
    () => post(engine.tick(rateHz)),
    Math.max(1000 / rateHz, 16),
  );
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
  if (cmd.type === 'snapshot') {
    post(engine.snapshot());
    return;
  }
  // 연동 경계: 인증 + 감사 로그. 엔진 도메인 명령은 여기서 실행된다.
  const result = engine.applyCommand(cmd, ACTOR);
  if (!result.accepted) {
    post(engine.snapshot()); // 거부도 감사 로그에 남으므로 UI에 반영
    return;
  }
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
    case 'setRate':
      if (typeof cmd.rateHz === 'number') {
        rateHz = cmd.rateHz;
        if (running) schedule();
      }
      post(engine.snapshot());
      break;
    case 'resetScenario':
      // 엔진 리셋은 applyCommand에서 수행됨. 로컬 count만 동기화.
      if (typeof cmd.count === 'number')
        count = Math.min(5000, Math.max(1, Math.floor(cmd.count)));
      post(engine.snapshot());
      break;
    default:
      // 엔진 도메인 명령(setDispatch/incident/closure/saturation/promoteHotLot)
      // 은 applyCommand에서 실행됨 — 최신 스냅샷만 방출.
      post(engine.snapshot());
      break;
  }
};
