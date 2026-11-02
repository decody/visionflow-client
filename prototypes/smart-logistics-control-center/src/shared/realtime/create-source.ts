/**
 * 실시간 소스 팩토리 — 방식 A(Web Worker) / 방식 B(ws 소켓) 전환. 단계 7.
 *
 * 기본은 인-브라우저 Web Worker 시뮬레이터(정적 배포 가능)다. URL 쿼리 `?src=ws`(또는
 * `NEXT_PUBLIC_WS_URL` 설정) 시 로컬 ws 서버(포트 3016)에 연결해 실제 소켓의 재연결·
 * heartbeat·seq 재동기·서버측 인증을 실측한다.
 */

import { SimulatorClient } from './simulator-client';
import { SocketClient } from './socket-client';
import type { RealtimeSource, RealtimeSourceOptions } from './types';

const DEFAULT_WS_URL = 'ws://localhost:3016';

function resolveWsUrl(): string | null {
  const env = process.env.NEXT_PUBLIC_WS_URL;
  if (typeof window === 'undefined') return env ?? null;
  const src = new URLSearchParams(window.location.search).get('src');
  if (src === 'ws') return env ?? DEFAULT_WS_URL;
  if (src === 'worker') return null; // 명시적으로 방식 A
  return env ?? null;
}

export function createRealtimeSource(opts: RealtimeSourceOptions): RealtimeSource {
  const wsUrl = resolveWsUrl();
  if (wsUrl) return new SocketClient(wsUrl, opts);
  return new SimulatorClient(opts);
}
