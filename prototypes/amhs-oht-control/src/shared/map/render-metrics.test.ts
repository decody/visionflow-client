import assert from 'node:assert/strict';
import test from 'node:test';

import { summarizeRenderLatency } from './render-metrics';

test('render latency summary reports latest and nearest-rank p95', () => {
  const values = Array.from({ length: 20 }, (_, index) => index + 1);
  assert.deepEqual(summarizeRenderLatency(values), {
    lastMs: 20,
    p95Ms: 19,
    samples: 20,
  });
  assert.deepEqual(summarizeRenderLatency([]), {
    lastMs: 0,
    p95Ms: 0,
    samples: 0,
  });
});
