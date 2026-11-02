/**
 * 헤드리스 성능 벤치마크 — 복합운송 시뮬레이션 코어(SimEngine) 단독 측정. 단계 8(기획서 §10).
 *
 * 브라우저 렌더 FPS는 GPU·자동화 환경에 좌우돼 재현성이 낮다. 이 벤치는 ws-server가 매 틱
 * 수행하는 `JSON.stringify(engine.tick())`과 동일 경로를 노드에서 반복 실행해, 규모별로
 * tick/직렬화 지연(p50/p95/p99/max)·델타 바이트·틱당 업데이트·지속 Hz·메모리를 측정한다.
 * 고정 seed + tick 결정론. 브라우저 실측 FPS·렌더 대상 수는 앱 진단 패널로 보완한다.
 *
 * 실행:
 *   pnpm perf                                   # 기본 프리셋 → perf-report.md
 *   node --import tsx --expose-gc server/perf-bench.ts   # 정확한 메모리 측정
 *   pnpm perf -- --ticks=600 --rate=10
 */
import { writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

import { SimEngine } from '@/shared/sim/engine';

interface Preset {
  conveyances: number;
  shipments: number;
}

interface Args {
  presets: Preset[];
  ticks: number;
  warmup: number;
  rate: number;
  out: string | null;
}

const DEFAULT_PRESETS: Preset[] = [
  { conveyances: 500, shipments: 4000 },
  { conveyances: 1000, shipments: 10000 },
  { conveyances: 2000, shipments: 20000 },
  { conveyances: 5000, shipments: 50000 },
];

function parseArgs(argv: string[]): Args {
  const map = new Map<string, string>();
  for (const raw of argv) {
    const m = /^--([^=]+)(?:=(.*))?$/.exec(raw);
    if (m) map.set(m[1]!, m[2] ?? 'true');
  }
  const num = (k: string, d: number) => (map.has(k) ? Number(map.get(k)) : d);
  return {
    presets: DEFAULT_PRESETS,
    ticks: num('ticks', 400),
    warmup: num('warmup', 80),
    rate: num('rate', 10),
    out: map.has('out') ? map.get('out')! : fileURLToPath(new URL('../perf-report.md', import.meta.url)),
  };
}

function percentile(sorted: number[], p: number): number {
  if (!sorted.length) return 0;
  const idx = Math.min(sorted.length - 1, Math.max(0, Math.ceil(sorted.length * p) - 1));
  return sorted[idx]!;
}

const r2 = (n: number) => Math.round(n * 100) / 100;
const kb = (bytes: number) => Math.round(bytes / 102.4) / 10;
const mb = (bytes: number) => Math.round((bytes / (1024 * 1024)) * 10) / 10;

function forceGc(): void {
  const gc = (globalThis as { gc?: () => void }).gc;
  if (gc) {
    gc();
    gc();
  }
}

interface Result {
  conveyances: number;
  shipments: number;
  tickP50: number;
  tickP95: number;
  tickP99: number;
  tickMax: number;
  frameP95: number;
  serializeP95: number;
  avgUpdates: number;
  avgBytes: number;
  maxBytes: number;
  sustainableHz: number;
  headroom: number;
  heapUsedMb: number;
  rssMb: number;
}

function runPreset(preset: Preset, ticks: number, warmup: number, rate: number): Result {
  const engine = new SimEngine();
  engine.spawn(preset.conveyances);
  engine.setShipmentTarget(preset.shipments);
  engine.setRunning(true);
  for (let i = 0; i < warmup; i += 1) JSON.stringify(engine.tick(rate));

  const tickMs: number[] = [];
  const frameMs: number[] = [];
  const serMs: number[] = [];
  let totalUpdates = 0;
  let totalBytes = 0;
  let maxBytes = 0;

  for (let i = 0; i < ticks; i += 1) {
    const t0 = performance.now();
    const delta = engine.tick(rate);
    const t1 = performance.now();
    const json = JSON.stringify(delta);
    const t2 = performance.now();
    tickMs.push(t1 - t0);
    serMs.push(t2 - t1);
    frameMs.push(t2 - t0);
    totalUpdates += delta.type === 'delta' ? delta.upd.length : 0;
    const bytes = Buffer.byteLength(json);
    totalBytes += bytes;
    if (bytes > maxBytes) maxBytes = bytes;
  }

  const tickSorted = [...tickMs].sort((a, b) => a - b);
  const frameSorted = [...frameMs].sort((a, b) => a - b);
  const serSorted = [...serMs].sort((a, b) => a - b);
  const frameP95 = percentile(frameSorted, 0.95);
  const budgetMs = 1000 / rate;

  forceGc();
  const mem = process.memoryUsage();

  return {
    conveyances: preset.conveyances,
    shipments: preset.shipments,
    tickP50: r2(percentile(tickSorted, 0.5)),
    tickP95: r2(percentile(tickSorted, 0.95)),
    tickP99: r2(percentile(tickSorted, 0.99)),
    tickMax: r2(tickSorted[tickSorted.length - 1] ?? 0),
    frameP95: r2(frameP95),
    serializeP95: r2(percentile(serSorted, 0.95)),
    avgUpdates: Math.round(totalUpdates / ticks),
    avgBytes: Math.round(totalBytes / ticks),
    maxBytes,
    sustainableHz: frameP95 > 0 ? Math.round(1000 / frameP95) : 999,
    headroom: r2(budgetMs > 0 ? budgetMs / frameP95 : 0),
    heapUsedMb: mb(mem.heapUsed),
    rssMb: mb(mem.rss),
  };
}

function formatTable(results: Result[]): string {
  const head =
    '| 운송수단 | 화물 | tick p50 | tick p95 | tick p99 | tick max | frame p95 | 직렬화 p95 | upd/tick | 델타 avg | 델타 max | 지속Hz | 여유(×) | heap | rss |';
  const sep = '| ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |';
  const rows = results.map(
    (r) =>
      `| ${r.conveyances.toLocaleString()} | ${r.shipments.toLocaleString()} | ${r.tickP50}ms | ${r.tickP95}ms | ${r.tickP99}ms | ${r.tickMax}ms | ${r.frameP95}ms | ${r.serializeP95}ms | ${r.avgUpdates.toLocaleString()} | ${kb(r.avgBytes)}KB | ${kb(r.maxBytes)}KB | ${r.sustainableHz} | ${r.headroom}× | ${r.heapUsedMb}MB | ${r.rssMb}MB |`,
  );
  return [head, sep, ...rows].join('\n');
}

function main(): void {
  const args = parseArgs(process.argv.slice(2));
  const hasGc = typeof (globalThis as { gc?: unknown }).gc === 'function';
  const budget = 1000 / args.rate;
  const lines: string[] = [];
  const log = (s = '') => {
    lines.push(s);
    // eslint-disable-next-line no-console
    console.log(s);
  };

  log('# Smart Logistics 복합운송 시뮬레이션 코어 성능 벤치마크');
  log('');
  log(`- 실행 시각: ${new Date().toISOString()}`);
  log(`- Node: ${process.version} · 정확 메모리(GC): ${hasGc ? '켜짐' : '꺼짐(--expose-gc 권장)'}`);
  log(`- 측정: warmup ${args.warmup}틱 후 ${args.ticks}틱, 목표 ${args.rate}Hz (예산 ${r2(budget)}ms/틱)`);
  log('- frame = tick 계산 + JSON 직렬화 (ws-server 브로드캐스트 1회와 동일 경로)');
  log('- 고정 seed·tick 결정론. 화물은 저빈도 채널(변경분만), 운송수단은 매 틱 전체 upd.');
  log('');

  const results: Result[] = [];
  for (const preset of args.presets) {
    process.stderr.write(`  … 운송수단 ${preset.conveyances} · 화물 ${preset.shipments} 측정 중\n`);
    results.push(runPreset(preset, args.ticks, args.warmup, args.rate));
  }

  log(formatTable(results));
  log('');
  log(`## 판정 (목표 ${args.rate}Hz, 예산 ${r2(budget)}ms/틱)`);
  log('');
  for (const r of results) {
    const ok = r.frameP95 <= budget;
    log(
      `- **운송수단 ${r.conveyances.toLocaleString()} · 화물 ${r.shipments.toLocaleString()}**: frame p95 ${r.frameP95}ms → ${
        ok ? `✅ ${args.rate}Hz 지속 가능 (여유 ${r.headroom}×)` : `⚠️ 예산 초과 — 지속 가능 ${r.sustainableHz}Hz`
      }`,
    );
  }
  log('');
  log('> MVP 합격 기준(기획서 §15.4): 1,000 운송수단 / 10,000 화물, 10Hz, p95 반영 지연 ≤ 200ms. 5,000/50,000은 스트레스 결과로 별도 보고.');
  log('> 이 수치는 코어(계산+직렬화)만 측정한다. 브라우저 렌더는 deck.gl binary 포인트 + 가시 반구/권역 컬링으로 보이는 운송수단 수에 비례하며, 실측 FPS·렌더 대상 수는 앱 진단 패널에서 확인한다.');

  if (args.out) {
    writeFileSync(args.out, lines.join('\n') + '\n', 'utf8');
    process.stderr.write(`\n결과 저장: ${args.out}\n`);
  }
}

main();
