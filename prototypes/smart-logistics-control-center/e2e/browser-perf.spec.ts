import { expect, test, type Page } from '@playwright/test';
import { appendFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

interface Sample {
  count: number;
  rendered: number;
  fpsAvg: number;
  fpsP95: number;
  fpsMin: number;
  heapStartMb: number | null;
  heapPeakMb: number | null;
  heapEndMb: number | null;
  viewport: { width: number; height: number; dpr: number };
  userAgent: string;
  hardwareConcurrency: number;
  deviceMemory: number | null;
}

const samples: Sample[] = [];
const REPORT = resolve(process.cwd(), 'browser-perf-report.md');

async function waitForLive(page: Page): Promise<void> {
  await page.goto('/?src=worker');
  await expect(page.locator('[data-testid="map-live"]')).toContainText('LIVE', { timeout: 15_000 });
}

async function measure(page: Page, count: number): Promise<Sample> {
  const fleetLabel = count >= 1000 ? `${count / 1000}k` : String(count);
  await page.getByRole('button', { name: fleetLabel, exact: true }).click();
  await expect(page.locator('[data-testid="map-live"]')).toHaveAttribute('data-conveyances', String(count), { timeout: 15_000 });
  await page.waitForTimeout(2_000);

  const result = await page.evaluate(async (durationMs) => {
    const frames: number[] = [];
    const memoryValues: number[] = [];
    const memory = () => {
      const perf = performance as Performance & { memory?: { usedJSHeapSize: number } };
      return perf.memory ? perf.memory.usedJSHeapSize / (1024 * 1024) : null;
    };
    const start = performance.now();
    let previous = start;
    let count = 0;
    await new Promise<void>((resolve) => {
      const tick = (now: number) => {
        count += 1;
        const value = memory();
        if (value !== null) memoryValues.push(value);
        if (now - previous >= 1000) {
          frames.push((count * 1000) / (now - previous));
          count = 0;
          previous = now;
        }
        if (now - start < durationMs) requestAnimationFrame(tick);
        else resolve();
      };
      requestAnimationFrame(tick);
    });
    const sorted = [...frames].sort((a, b) => a - b);
    const p95 = sorted[Math.min(sorted.length - 1, Math.max(0, Math.ceil(sorted.length * 0.95) - 1))] ?? 0;
    const live = document.querySelector<HTMLElement>('[data-testid="map-live"]');
    const nav = navigator as Navigator & { deviceMemory?: number };
    return {
      rendered: Number(live?.dataset.renderedConveyances ?? 0),
      fpsAvg: frames.reduce((sum, value) => sum + value, 0) / Math.max(frames.length, 1),
      fpsP95: p95,
      fpsMin: Math.min(...frames),
      heapStartMb: memoryValues[0] ?? null,
      heapPeakMb: memoryValues.length ? Math.max(...memoryValues) : null,
      heapEndMb: memoryValues.at(-1) ?? null,
      viewport: { width: innerWidth, height: innerHeight, dpr: devicePixelRatio },
      userAgent: navigator.userAgent,
      hardwareConcurrency: navigator.hardwareConcurrency,
      deviceMemory: nav.deviceMemory ?? null,
    };
  }, 5_000);

  return { count, ...result };
}

test.afterAll(() => {
  const lines = [
    '# Smart Logistics Browser Performance Report',
    '',
    `- 측정일: ${new Date().toISOString()}`,
    '- 브라우저: Playwright Chromium Desktop Chrome',
    '- 측정 방식: Worker 시뮬레이터, 5초 rAF 샘플, 초기 2초 안정화 후 측정',
    '- 주의: FPS와 heap은 실행 환경(GPU·창 크기·백그라운드 상태)에 따라 달라진다.',
    '',
    '| 운송수단 | 렌더 대상 | FPS 평균 | FPS p95 | FPS 최저 | heap 시작 | heap peak | heap 종료 | viewport | DPR |',
    '| ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | ---: |',
    ...samples.map((s) =>
      `| ${s.count.toLocaleString()} | ${s.rendered.toLocaleString()} | ${s.fpsAvg.toFixed(1)} | ${s.fpsP95.toFixed(1)} | ${s.fpsMin.toFixed(1)} | ${s.heapStartMb?.toFixed(1) ?? 'n/a'}MB | ${s.heapPeakMb?.toFixed(1) ?? 'n/a'}MB | ${s.heapEndMb?.toFixed(1) ?? 'n/a'}MB | ${s.viewport.width}×${s.viewport.height} | ${s.viewport.dpr} |`,
    ),
    '',
    '## 실행 조건',
    '',
    samples[0] ? `- userAgent: ${samples[0].userAgent}` : '- userAgent: n/a',
    samples[0] ? `- hardwareConcurrency: ${samples[0].hardwareConcurrency}` : '- hardwareConcurrency: n/a',
    samples[0] ? `- deviceMemory: ${samples[0].deviceMemory ?? 'n/a'}GB` : '- deviceMemory: n/a',
    '',
  ];
  writeFileSync(REPORT, `${lines.join('\n')}\n`, 'utf8');
});

test('1k/10k 및 5k/50k 브라우저 렌더 성능을 기록한다', async ({ page }) => {
  await waitForLive(page);
  const oneK = await measure(page, 1000);
  const fiveK = await measure(page, 5000);
  samples.push(oneK, fiveK);

  expect(oneK.rendered).toBeGreaterThan(0);
  expect(fiveK.rendered).toBeGreaterThan(0);
  appendFileSync(REPORT, '', 'utf8');
});
