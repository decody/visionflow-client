import { SimEngine } from '@/shared/sim/engine';
import assert from 'node:assert/strict';
import test from 'node:test';
import { advanceHistoryCursor, replayBatch } from './history';

test('rewinding restores job, cargo, heading and route without retaining future vehicles', () => {
  const engine = new SimEngine(42, () => 0);
  engine.spawn(8);
  const past = engine.snapshot();
  for (let i = 0; i < 700; i++) engine.tick(5);
  engine.spawn(32);
  const future = engine.snapshot();
  const frame = {
    t: past.ts,
    items: past.vehicles,
    operations: past.operations,
    alarms: [],
  };
  const batch = replayBatch(future.vehicles, frame);
  const states = new Map(
    future.vehicles.map((v) => [v.id, { ...v }]),
  );
  for (const id of batch.deletions ?? []) states.delete(id);
  for (const v of batch.additions ?? []) states.set(v.id, { ...v });
  for (const update of batch.updates)
    Object.assign(states.get(update.id)!, update);
  assert.deepEqual([...states.values()], past.vehicles);
  assert.deepEqual(batch.operations, past.operations);
  assert.equal(batch.deletions?.length, 24);
  assert.equal(replayBatch([], frame).additions?.length, 8);
});

test('playback follows recorded timestamps when capture intervals are throttled', () => {
  const frames = [0, 500, 2000, 3000].map((t) => ({
    t,
    items: [],
    alarms: [],
  }));
  assert.equal(advanceHistoryCursor(frames, 0, 1250), 1.5);
  assert.equal(advanceHistoryCursor(frames, 1.5, 750), 2);
  assert.equal(advanceHistoryCursor(frames, 2, 4000), 3);
});
