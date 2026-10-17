import type {
  Alarm,
  OperationsState,
  VehicleState,
} from '@/entities/oht/types';
import type { BatchResult } from '@/shared/realtime/delta-reducer';

export interface HistoryFrame {
  t: number;
  items: VehicleState[];
  operations?: OperationsState;
  alarms: Alarm[];
}

export function advanceHistoryCursor(
  frames: HistoryFrame[],
  cursor: number,
  elapsedMs: number,
): number {
  if (frames.length < 2) return 0;
  const index = Math.min(Math.floor(cursor), frames.length - 1);
  const start = frames[index]!.t;
  const end = frames[Math.min(index + 1, frames.length - 1)]!.t;
  const target = start + (end - start) * (cursor - index) + elapsedMs;
  let next = index;
  while (next < frames.length - 1 && frames[next + 1]!.t <= target)
    next++;
  if (next === frames.length - 1) return next;
  return (
    next +
    (target - frames[next]!.t) /
      Math.max(1, frames[next + 1]!.t - frames[next]!.t)
  );
}

/** Replay restores the complete transport state while reusing existing map features. */
export function replayBatch(
  existing: VehicleState[],
  frame: HistoryFrame,
): BatchResult {
  const currentIds = new Set(existing.map((v) => v.id));
  const nextIds = new Set(frame.items.map((v) => v.id));
  return {
    updates: frame.items,
    additions: frame.items.filter((v) => !currentIds.has(v.id)),
    deletions: [...currentIds].filter((id) => !nextIds.has(id)),
    operations: frame.operations,
    alarms: [],
    jobs: [],
    ts: frame.t,
  };
}
