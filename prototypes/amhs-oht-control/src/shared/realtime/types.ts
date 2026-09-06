import type { DispatchRule } from '@/entities/oht/types';
import type { BatchResult } from './delta-reducer';

export interface ClientMetrics {
  /** 초당 수신 메시지 수 */
  messageRate: number;
  /** 초당 수신 개별 upd 수 */
  updateRate: number;
  /** 프레임 배치로 합쳐져 절약된(코얼레싱된) upd 수 */
  coalesced: number;
  /** seq gap 감지 및 스냅샷 재동기 횟수 */
  resyncs: number;
  /** 마지막 메시지 수신~프레임 반영 지연(ms) 근사 */
  applyLatency: number;
}

export interface RealtimeSourceOptions {
  count?: number;
  rateHz?: number;
  onBatch: (batch: BatchResult) => void;
  onMetrics?: (m: ClientMetrics) => void;
  onError?: (message: string) => void;
  /** 연결 상태 변화(소켓 재연결 시연용) */
  onStatus?: (status: RealtimeStatus) => void;
}

export type RealtimeStatus =
  | 'connecting'
  | 'open'
  | 'reconnecting'
  | 'closed';

/** Worker 시뮬레이터(방식 A)와 ws 소켓(방식 B)이 공유하는 공통 인터페이스 */
export interface RealtimeSource {
  start(): void;
  setCount(count: number): void;
  setRate(rateHz: number): void;
  setDispatch(rule: DispatchRule): void;
  setPortIncident(enabled: boolean): void;
  requestSnapshot(): void;
  setPaused(paused: boolean): void;
  dispose(): void;
  /** 소스 종류 라벨 (UI 배지) */
  readonly label: string;
}
