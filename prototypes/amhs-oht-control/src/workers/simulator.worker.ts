/// <reference lib="webworker" />
/**
 * In-browser AMHS/OHT 시뮬레이터 (방식 A: Web Worker).
 * 시뮬레이션은 공용 SimEngine이 담당하고, 이 파일은 postMessage 전송만 맡는다.
 */
import type {
  ClientCommand,
  ServerMessage,
} from '../entities/oht/types';
import { SimEngine } from '../shared/sim/engine';

const engine = new SimEngine();
let timer: ReturnType<typeof setInterval> | null = null;
let running = false;
let rateHz = 10;
let count = 1000;

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
  switch (cmd.type) {
    case 'setDispatch':
      if (
        cmd.rule === 'nearest' ||
        cmd.rule === 'oldest' ||
        cmd.rule === 'priority'
      ) {
        engine.setDispatch(cmd.rule);
        post(engine.snapshot());
      }
      break;
    case 'setPortIncident':
      engine.setPortIncident(cmd.enabled === true);
      post(engine.snapshot());
      break;
    case 'setRailClosure':
      engine.setRailClosure(cmd.enabled === true);
      post(engine.snapshot());
      break;
    case 'start':
      if (typeof cmd.count === 'number') count = cmd.count;
      if (typeof cmd.rateHz === 'number') rateHz = cmd.rateHz;
      start();
      break;
    case 'stop':
      stop();
      break;
    case 'snapshot':
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
      break;
    default:
      break;
  }
};
