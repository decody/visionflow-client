import { SimulatorClient } from './simulator-client';
import { SocketClient } from './socket-client';
import type { RealtimeSource, RealtimeSourceOptions } from './types';

/**
 * 실시간 소스 팩토리.
 *
 * 선택 우선순위:
 *  1) URL 쿼리 `?src=ws` / `?src=worker` (데모 중 즉시 전환)
 *  2) 환경변수 `NEXT_PUBLIC_WS_URL` 설정 시 → ws 소켓(방식 B)
 *  3) 기본값 → Web Worker 시뮬레이터(방식 A)
 */
export function createRealtimeSource(opts: RealtimeSourceOptions): RealtimeSource {
  const envUrl = process.env.NEXT_PUBLIC_WS_URL?.trim();
  const defaultUrl = envUrl && envUrl.length > 0 ? envUrl : 'ws://localhost:3012';

  let mode: 'worker' | 'ws' = envUrl ? 'ws' : 'worker';
  if (typeof window !== 'undefined') {
    const q = new URLSearchParams(window.location.search).get('src');
    if (q === 'ws') mode = 'ws';
    else if (q === 'worker') mode = 'worker';
  }

  return mode === 'ws' ? new SocketClient(defaultUrl, opts) : new SimulatorClient(opts);
}
