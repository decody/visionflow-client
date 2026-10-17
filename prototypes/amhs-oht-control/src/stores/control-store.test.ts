import assert from 'node:assert/strict';
import test from 'node:test';

import { useControlStore } from './control-store';

test('alarm lifecycle moves from active to acknowledged to recovered', () => {
  const store = useControlStore.getState();
  store.clearAlarms();
  store.pushAlarms([
    {
      id: 'AL-PORT-1',
      kind: 'EQP_DOWN',
      severity: 'critical',
      ts: 1000,
      message: 'ETCH-01-LP1 포트 사용 불가',
    },
  ]);
  assert.equal(useControlStore.getState().alarms[0]!.state, 'ACTIVE');

  useControlStore.getState().acknowledgeAlarm('AL-PORT-1');
  assert.equal(
    useControlStore.getState().alarms[0]!.state,
    'ACKNOWLEDGED',
  );

  useControlStore
    .getState()
    .recoverPortAlarms('ETCH-01-LP1', 5000);
  const recovered = useControlStore.getState().alarms[0]!;
  assert.equal(recovered.state, 'RECOVERED');
  assert.equal(recovered.recoveredTs, 5000);
});

test('duplicate alarm delivery replaces the existing alarm', () => {
  const store = useControlStore.getState();
  store.clearAlarms();
  const alarm = {
    id: 'AL-DUP',
    kind: 'BLOCKED' as const,
    severity: 'warn' as const,
    ts: 1000,
    message: 'first',
  };
  store.pushAlarms([alarm]);
  store.pushAlarms([{ ...alarm, message: 'latest' }]);
  assert.equal(useControlStore.getState().alarms.length, 1);
  assert.equal(useControlStore.getState().alarms[0]!.message, 'latest');
});
