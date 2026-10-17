/**
 * 신호 교차로 위상(순수, 결정론적) — 기획서 §5 "신호 교차로/지오펜스" 보강.
 *
 * AMHS ZCU STOP 제어를 도심 신호등으로 재해석한다. 각 신호는 고정 주기(초록→빨강)로
 * 돌고, 교차로마다 서로 다른 오프셋을 둬 동시 점멸을 피한다. 상태는 오직 simSec의
 * 함수이므로 엔진(고정 seed·고정 clock)과 함께 완전히 재현된다.
 */

export type SignalState = 'GO' | 'STOP';

/** 한 주기의 초록/빨강 길이(초). 합이 전체 주기. */
export const SIGNAL_CYCLE = { green: 14, red: 8 } as const;

const PERIOD = SIGNAL_CYCLE.green + SIGNAL_CYCLE.red;

/** 교차로 i의 위상 오프셋(초). 서로소에 가까운 보폭으로 점멸을 흩뿌린다. */
export function signalOffset(index: number): number {
  return (index * 7) % PERIOD;
}

/** 교차로 i의 시각 simSec에서의 신호 상태(결정론적). */
export function signalStateAt(index: number, simSec: number): SignalState {
  const offset = signalOffset(index);
  const phase = (((simSec + offset) % PERIOD) + PERIOD) % PERIOD;
  return phase < SIGNAL_CYCLE.green ? 'GO' : 'STOP';
}
