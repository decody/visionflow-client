export interface RenderStats {
  lastMs: number;
  p95Ms: number;
  samples: number;
}

export function summarizeRenderLatency(values: number[]): RenderStats {
  if (!values.length) return { lastMs: 0, p95Ms: 0, samples: 0 };
  const sorted = [...values].sort((a, b) => a - b);
  const index = Math.min(
    sorted.length - 1,
    Math.max(0, Math.ceil(sorted.length * 0.95) - 1),
  );
  return {
    lastMs: Math.round(values[values.length - 1]!),
    p95Ms: Math.round(sorted[index]!),
    samples: values.length,
  };
}
