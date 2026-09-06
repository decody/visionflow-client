/**
 * 헤드리스 성능 벤치마크 — 시뮬레이션 코어(SimEngine) 단독 측정.
 *
 * 브라우저 렌더 FPS는 GPU·자동화 환경에 좌우돼 재현성이 낮다(자동화에서 1~4 FPS).
 * 이 벤치는 ws-server가 매 틱 수행하는 `JSON.stringify(engine.tick())`과 동일한
 * 경로를 노드에서 반복 실행해, 대수(500/1000/2000/5000)별로 다음을 측정한다.
 *   - tick 계산 지연 (p50/p95/p99/max)
 *   - 직렬화 지연 + 델타 바이트 (네트워크/브로드캐스트 부하 근사)
 *   - 틱당 업데이트 수 (코얼레싱 이전 원천 변경량)
 *   - 지속 가능 rate: p95 프레임 시간 대비 목표 Hz 예산 충족 여부
 *   - 메모리(rss/heapUsed) 사용량
 *
 * 시뮬레이션 시간은 tick(rateHz)가 내부적으로 전진시키므로 결과는 결정론적이다.
 * 브라우저에서 계측하는 실제 렌더 완료 지연(postrender p95)과 상호 보완한다.
 *
 * 실행:
 *   pnpm perf                         # 기본 프리셋
 *   pnpm perf -- --counts=1000,5000 --ticks=600 --rate=10
 *   pnpm perf:long                    # 장시간 실행 안정성(메모리 누수) 검증
 *   node --import tsx --expose-gc server/perf-bench.ts   # 정확한 메모리 측정
 */
import { writeFileSync } from 'node:fs';

import { encodeWireMessage } from '@/shared/realtime/wire-codec';
import { SimEngine } from '@/shared/sim/engine';

interface Args {
  counts: number[];
  ticks: number;
  warmup: number;
  rate: number;
  long: boolean;
  longCount: number;
  longTicks: number;
  out: string | null;
}

function parseArgs(argv: string[]): Args {
  const map = new Map<string, string>();
  for (const raw of argv) {
    const m = /^--([^=]+)(?:=(.*))?$/.exec(raw);
    if (m) map.set(m[1]!, m[2] ?? 'true');
  }
  const num = (k: string, d: number) =>
    map.has(k) ? Number(map.get(k)) : d;
  const list = (k: string, d: number[]) =>
    map.has(k)
      ? map
          .get(k)!
          .split(',')
          .map((s) => Number(s.trim()))
          .filter((n) => Number.isFinite(n) && n > 0)
      : d;
  return {
    counts: list('counts', [500, 1000, 2000, 5000]),
    ticks: num('ticks', 400),
    warmup: num('warmup', 80),
    rate: num('rate', 10),
    long: map.has('long'),
    longCount: map.get('long') && map.get('long') !== 'true'
      ? Number(map.get('long'))
      : num('long-count', 2000),
    longTicks: num('long-ticks', 6000),
    out: map.has('out') ? map.get('out')! : null,
  };
}

function percentile(sorted: number[], p: number): number {
  if (!sorted.length) return 0;
  const idx = Math.min(
    sorted.length - 1,
    Math.max(0, Math.ceil(sorted.length * p) - 1),
  );
  return sorted[idx]!;
}

const r2 = (n: number) => Math.round(n * 100) / 100;
const kb = (bytes: number) => Math.round(bytes / 102.4) / 10; // KiB, 0.1 정밀도
const mb = (bytes: number) => Math.round(bytes / (1024 * 1024) * 10) / 10;

function forceGc(): void {
  const gc = (globalThis as { gc?: () => void }).gc;
  if (gc) {
    gc();
    gc();
  }
}

interface PresetResult {
  count: number;
  ticks: number;
  tickP50: number;
  tickP95: number;
  tickP99: number;
  tickMax: number;
  frameP50: number;
  frameP95: number;
  frameP99: number;
  serializeP95: number;
  avgUpdates: number;
  avgBytes: number;
  maxBytes: number;
  budgetMs: number;
  sustainableHz: number;
  headroom: number;
  heapUsedMb: number;
  rssMb: number;
}

function runPreset(
  count: number,
  ticks: number,
  warmup: number,
  rate: number,
): PresetResult {
  // 고정 시드·고정 clock으로 재현 가능한 실행.
  const engine = new SimEngine(20260906, () => 1_000_000);
  engine.spawn(count);

  // JIT 워밍업 + 정상 상태(잡 배차·운행) 진입.
  for (let i = 0; i < warmup; i++) JSON.stringify(encodeWireMessage(engine.tick(rate)));

  const tickMs: number[] = [];
  const frameMs: number[] = [];
  const serializeMs: number[] = [];
  let totalUpdates = 0;
  let totalBytes = 0;
  let maxBytes = 0;

  for (let i = 0; i < ticks; i++) {
    const t0 = performance.now();
    const delta = engine.tick(rate);
    const t1 = performance.now();
    // ws-server와 동일 경로: 와이어 id 압축 후 직렬화.
    const json = JSON.stringify(encodeWireMessage(delta));
    const t2 = performance.now();

    tickMs.push(t1 - t0);
    serializeMs.push(t2 - t1);
    frameMs.push(t2 - t0);
    totalUpdates += delta.upd.length;
    const bytes = Buffer.byteLength(json);
    totalBytes += bytes;
    if (bytes > maxBytes) maxBytes = bytes;
  }

  const tickSorted = [...tickMs].sort((a, b) => a - b);
  const frameSorted = [...frameMs].sort((a, b) => a - b);
  const serSorted = [...serializeMs].sort((a, b) => a - b);

  const budgetMs = 1000 / rate;
  const frameP95 = percentile(frameSorted, 0.95);
  const sustainableHz = frameP95 > 0 ? 1000 / frameP95 : Infinity;

  forceGc();
  const mem = process.memoryUsage();

  return {
    count,
    ticks,
    tickP50: r2(percentile(tickSorted, 0.5)),
    tickP95: r2(percentile(tickSorted, 0.95)),
    tickP99: r2(percentile(tickSorted, 0.99)),
    tickMax: r2(tickSorted[tickSorted.length - 1] ?? 0),
    frameP50: r2(percentile(frameSorted, 0.5)),
    frameP95: r2(frameP95),
    frameP99: r2(percentile(frameSorted, 0.99)),
    serializeP95: r2(percentile(serSorted, 0.95)),
    avgUpdates: Math.round(totalUpdates / ticks),
    avgBytes: Math.round(totalBytes / ticks),
    maxBytes,
    budgetMs,
    sustainableHz: sustainableHz === Infinity ? 999 : Math.round(sustainableHz),
    headroom: r2(budgetMs > 0 ? budgetMs / frameP95 : 0),
    heapUsedMb: mb(mem.heapUsed),
    rssMb: mb(mem.rss),
  };
}

interface LongResult {
  count: number;
  ticks: number;
  simMinutes: number;
  startHeapMb: number;
  endHeapMb: number;
  slopeBytesPerTick: number;
  projectedMbPerHour: number;
  samples: { tick: number; heapMb: number }[];
}

function runLong(
  count: number,
  ticks: number,
  rate: number,
): LongResult {
  const engine = new SimEngine(20260906, () => 1_000_000);
  engine.spawn(count);
  for (let i = 0; i < 100; i++) JSON.stringify(encodeWireMessage(engine.tick(rate)));

  const samples: { tick: number; heapMb: number }[] = [];
  const sampleEvery = Math.max(1, Math.floor(ticks / 20));
  forceGc();
  let startHeap = process.memoryUsage().heapUsed;

  // 선형 회귀용 누적(최소제곱).
  let n = 0;
  let sumX = 0;
  let sumY = 0;
  let sumXY = 0;
  let sumXX = 0;

  for (let i = 0; i < ticks; i++) {
    JSON.stringify(encodeWireMessage(engine.tick(rate)));
    if (i % sampleEvery === 0) {
      forceGc();
      const heap = process.memoryUsage().heapUsed;
      if (i === 0) startHeap = heap;
      samples.push({ tick: i, heapMb: mb(heap) });
      n += 1;
      sumX += i;
      sumY += heap;
      sumXY += i * heap;
      sumXX += i * i;
    }
  }
  forceGc();
  const endHeap = process.memoryUsage().heapUsed;
  samples.push({ tick: ticks, heapMb: mb(endHeap) });

  const slope =
    n > 1 ? (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX) : 0;
  const ticksPerHour = rate * 3600;

  return {
    count,
    ticks,
    simMinutes: Math.round((ticks / rate / 60) * 10) / 10,
    startHeapMb: mb(startHeap),
    endHeapMb: mb(endHeap),
    slopeBytesPerTick: Math.round(slope),
    projectedMbPerHour: mb(slope * ticksPerHour),
    samples,
  };
}

function formatTable(results: PresetResult[]): string {
  const head =
    '| 대수 | tick p50 | tick p95 | tick p99 | tick max | frame p95 | 직렬화 p95 | upd/tick | 델타 avg | 델타 max | 지속Hz | 여유(×) | heap | rss |';
  const sep =
    '| ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |';
  const rows = results.map(
    (r) =>
      `| ${r.count.toLocaleString()} | ${r.tickP50}ms | ${r.tickP95}ms | ${r.tickP99}ms | ${r.tickMax}ms | ${r.frameP95}ms | ${r.serializeP95}ms | ${r.avgUpdates.toLocaleString()} | ${kb(r.avgBytes)}KB | ${kb(r.maxBytes)}KB | ${r.sustainableHz} | ${r.headroom}× | ${r.heapUsedMb}MB | ${r.rssMb}MB |`,
  );
  return [head, sep, ...rows].join('\n');
}

function main(): void {
  const args = parseArgs(process.argv.slice(2));
  const hasGc = typeof (globalThis as { gc?: unknown }).gc === 'function';
  const node = process.version;
  const stamp = new Date().toISOString();

  const lines: string[] = [];
  const log = (s = '') => {
    lines.push(s);
    // eslint-disable-next-line no-console
    console.log(s);
  };

  log(`# AMHS 시뮬레이션 코어 성능 벤치마크`);
  log('');
  log(`- 실행 시각: ${stamp}`);
  log(`- Node: ${node} · 정확 메모리(GC): ${hasGc ? '켜짐' : '꺼짐(--expose-gc 권장)'}`);
  log(
    `- 측정: warmup ${args.warmup}틱 후 ${args.ticks}틱, 목표 rate ${args.rate}Hz (예산 ${r2(1000 / args.rate)}ms/틱)`,
  );
  log(
    `- frame = tick 계산 + JSON 직렬화 (ws-server 브로드캐스트 1회와 동일 경로)`,
  );
  log('');

  const results: PresetResult[] = [];
  for (const count of args.counts) {
    process.stderr.write(`  … ${count}대 측정 중\n`);
    results.push(runPreset(count, args.ticks, args.warmup, args.rate));
  }

  log(formatTable(results));
  log('');

  const budget = 1000 / args.rate;
  log(`## 판정 (목표 ${args.rate}Hz, 예산 ${r2(budget)}ms/틱)`);
  log('');
  for (const r of results) {
    const ok = r.frameP95 <= budget;
    log(
      `- **${r.count.toLocaleString()}대**: frame p95 ${r.frameP95}ms → ${
        ok ? `✅ ${args.rate}Hz 지속 가능 (여유 ${r.headroom}×)` : `⚠️ 예산 초과 — 지속 가능 ${r.sustainableHz}Hz`
      }`,
    );
  }
  log('');

  if (args.long) {
    process.stderr.write(
      `  … 장시간 실행(${args.longCount}대 × ${args.longTicks}틱) 측정 중\n`,
    );
    const lr = runLong(args.longCount, args.longTicks, args.rate);
    log(`## 장시간 실행 안정성 (메모리 누수)`);
    log('');
    log(
      `- ${lr.count.toLocaleString()}대 × ${lr.ticks.toLocaleString()}틱 (약 ${lr.simMinutes}분 시뮬레이션, ${args.rate}Hz)`,
    );
    log(`- heapUsed: 시작 ${lr.startHeapMb}MB → 종료 ${lr.endHeapMb}MB`);
    log(
      `- 증가 기울기: ${lr.slopeBytesPerTick} B/틱 → 추정 **${lr.projectedMbPerHour}MB/시간**`,
    );
    const leaky = lr.projectedMbPerHour > 50;
    log(
      `- 판정: ${leaky ? '⚠️ 지속적 증가 관찰 — 누수 조사 필요' : '✅ 유의미한 증가 없음(안정)'}`,
    );
    if (!hasGc)
      log(`  - 주의: --expose-gc 없이 측정한 heap은 GC 타이밍에 흔들릴 수 있음`);
    log('');
  }

  log(
    `> 참고: 이 수치는 시뮬레이션 코어(계산+직렬화)만 측정한다. 브라우저 렌더 완료 지연은 앱 개발 진단 패널의 렌더 p95(postrender)로 별도 계측한다.`,
  );

  if (args.out) {
    writeFileSync(args.out, lines.join('\n') + '\n', 'utf8');
    process.stderr.write(`\n결과 저장: ${args.out}\n`);
  }
}

main();
