import type { OhtStatus } from './types';

/** UI/GPU 필터에 쓰는 상태 필터 종류 */
export type StatusFilter = OhtStatus | 'ALL' | 'DELAYED_ONLY';

/** 상태 → 숫자 코드 (WebGL 표현식 attribute로 사용) */
export const STATUS_CODE: Record<OhtStatus, number> = {
  MOVING: 0,
  IDLE: 1,
  LOADING: 2,
  UNLOADING: 3,
  BLOCKED: 4,
  DELAYED: 5,
  DOWN: 6,
};

export const CODE_STATUS: OhtStatus[] = [
  'MOVING',
  'IDLE',
  'LOADING',
  'UNLOADING',
  'BLOCKED',
  'DELAYED',
  'DOWN',
];

/** 필터 → WebGL filterCode (-1 = 전체) */
export function filterCodeOf(f: StatusFilter): number {
  if (f === 'ALL') return -1;
  if (f === 'DELAYED_ONLY') return STATUS_CODE.DELAYED;
  return STATUS_CODE[f];
}
