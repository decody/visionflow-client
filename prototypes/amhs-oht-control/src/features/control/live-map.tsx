'use client';

import 'ol/ol.css';
import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
} from 'react';

import {
  filterCodeOf,
  type StatusFilter,
} from '@/entities/oht/status';
import { buildRailGraph } from '@/entities/fab/rail-graph';
import {
  STATUS_COLORS,
  type Alarm,
  type DispatchRule,
  type OhtStatus,
  type OperationsState,
  type VehicleState,
} from '@/entities/oht/types';
import {
  createIndoorMap,
  type IndoorMap,
  type LodMode,
  type StatusCounts,
} from '@/shared/map/indoor-map';
import type { RenderStats } from '@/shared/map/render-metrics';
import { createRealtimeSource } from '@/shared/realtime/create-source';
import type {
  ClientMetrics,
  RealtimeSource,
  RealtimeStatus,
} from '@/shared/realtime/types';
import { useControlStore } from '@/stores/control-store';
import {
  advanceHistoryCursor,
  replayBatch,
  type HistoryFrame,
} from './history';

const COUNT_PRESETS = [8, 32, 500, 1000, 2000, 5000];
const FAB_BAYS = [
  { id: 'BAY-PHOTO', label: 'PHOTO' },
  { id: 'BAY-ETCH', label: 'ETCH' },
  { id: 'BAY-CVD', label: 'CVD' },
  { id: 'BAY-CMP', label: 'CMP' },
] as const;
const FAB_EQUIPMENT = buildRailGraph().equipment.filter(
  (item) => item.kind !== 'stocker',
);
const PHASE_LABELS: Record<string, string> = {
  QUEUED: '배차 대기',
  TO_PICKUP: '공차 픽업',
  LOADING: '호이스팅 적재',
  DELIVERING: '적재 이송',
  UNLOADING: '하역',
  WAITING_PORT: '포트 대기',
  DONE: '완료',
  IDLE: '대기',
  REPOSITIONING: '공차 순환',
  CHARGING: '충전',
};

const FILTERS: { key: StatusFilter; label: string }[] = [
  { key: 'ALL', label: '전체' },
  { key: 'MOVING', label: '이동' },
  { key: 'IDLE', label: '대기' },
  { key: 'LOADING', label: '적재' },
  { key: 'DELAYED_ONLY', label: '지연만' },
];

// ---- 이력 재생 설정 ----
const HISTORY_INTERVAL_MS = 500;
const HISTORY_MAX_FRAMES = 120; // 최근 60초
const PLAYBACK_TICK_MS = 100;
type DemoAction =
  | 'reset'
  | 'hot-lot'
  | 'port-on'
  | 'port-off'
  | 'rail-on'
  | 'rail-off'
  | 'storage-on'
  | 'storage-off'
  | 'outage-on'
  | 'outage-off'
  | 'complete';
const DEMO_STEPS: ReadonlyArray<{
  atMs: number;
  label: string;
  hint: string;
  action: DemoAction;
}> = [
  { atMs: 0, label: '정상 운행', hint: '8대 고정 seed 초기 상태', action: 'reset' },
  { atMs: 3_000, label: 'Hot lot 승격', hint: '긴급 Job 우선권과 강조 확인', action: 'hot-lot' },
  { atMs: 6_000, label: '포트 장애', hint: '목적지 포트와 영향 Job 확인', action: 'port-on' },
  { atMs: 14_000, label: '포트 복구', hint: '대기 차량 운행 재개', action: 'port-off' },
  { atMs: 16_000, label: '레일 폐쇄', hint: '폐쇄 구간과 자동 우회 확인', action: 'rail-on' },
  { atMs: 24_000, label: '레일 개통', hint: '정상 경로 복귀', action: 'rail-off' },
  { atMs: 26_000, label: '저장소 포화', hint: 'FULL 위치와 하역 대기 확인', action: 'storage-on' },
  { atMs: 36_000, label: '공간 확보', hint: '가용 slot과 하역 재개', action: 'storage-off' },
  { atMs: 38_000, label: '통신 단절', hint: '화면 정지와 재연결 상태 확인', action: 'outage-on' },
  { atMs: 44_000, label: '통신 복구', hint: '스냅샷 재동기', action: 'outage-off' },
  { atMs: 48_000, label: '데모 완료', hint: '정상 실시간 운행 유지', action: 'complete' },
];
const DEMO_DURATION_MS = DEMO_STEPS.at(-1)!.atMs;

export function LiveMap() {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<IndoorMap | null>(null);
  const clientRef = useRef<RealtimeSource | null>(null);

  const [counts, setCounts] = useState<StatusCounts | null>(null);
  const [metrics, setMetrics] = useState<ClientMetrics | null>(null);
  const [fps, setFps] = useState(0);
  const [renderStats, setRenderStats] = useState<RenderStats>({
    lastMs: 0,
    p95Ms: 0,
    samples: 0,
  });
  const [rendered, setRendered] = useState<[number, number]>([0, 0]);
  const [heapMb, setHeapMb] = useState<number | null>(null);
  const [lod, setLod] = useState<LodMode>('bay');
  const [activeBay, setActiveBay] = useState<string | null>(null);
  const [activeEquipment, setActiveEquipment] = useState('');
  const [detail, setDetail] = useState<VehicleState | null>(null);
  const [count, setCount] = useState(32);
  const [operations, setOperations] = useState<OperationsState>();
  const operationsRef = useRef<OperationsState | undefined>(
    undefined,
  );
  const [cargo, setCargo] = useState<'all' | 'loaded' | 'empty'>(
    'all',
  );
  const [hotOnly, setHotOnly] = useState(false);
  const [jobSearch, setJobSearch] = useState('');
  const [activeAlarmId, setActiveAlarmId] = useState<string | null>(null);
  const [replayAlarms, setReplayAlarms] = useState<Alarm[]>([]);
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>(
    'loading',
  );
  const [errorMsg, setErrorMsg] = useState('');
  const [jammed, setJammed] = useState(0);
  const [srcLabel, setSrcLabel] = useState('');
  const [conn, setConn] = useState<RealtimeStatus>('connecting');
  const [commsOutage, setCommsOutage] = useState(false);
  const [demo, setDemo] = useState({
    running: false,
    startedAt: 0,
    stepIndex: 0,
    elapsedMs: 0,
  });

  // 이력 재생 상태 (UI 표시용) + 구동용 ref
  const historyRef = useRef<HistoryFrame[]>([]);
  const modeRef = useRef<'live' | 'replay'>('live');
  const cursorRef = useRef(0);
  const playingRef = useRef(false);
  const speedRef = useRef(1);
  const [replay, setReplay] = useState({
    mode: 'live' as 'live' | 'replay',
    cursor: 0,
    len: 0,
    playing: false,
    speed: 1,
  });

  const filter = useControlStore((s) => s.filter);
  const alarms = useControlStore((s) => s.alarms);
  const paused = useControlStore((s) => s.paused);
  const setSelected = useControlStore((s) => s.setSelected);
  const setFilter = useControlStore((s) => s.setFilter);
  const pushAlarms = useControlStore((s) => s.pushAlarms);
  const acknowledgeAlarm = useControlStore(
    (s) => s.acknowledgeAlarm,
  );
  const togglePaused = useControlStore((s) => s.togglePaused);

  useEffect(() => {
    if (!containerRef.current) return;

    // WebGL 지원 확인 (없으면 오류 상태)
    const probe = document.createElement('canvas');
    const gl =
      probe.getContext('webgl2') ?? probe.getContext('webgl');
    if (!gl) {
      setStatus('error');
      setErrorMsg(
        '이 브라우저/기기는 WebGL을 지원하지 않아 지도를 렌더링할 수 없습니다.',
      );
      return;
    }

    let indoor: IndoorMap;
    try {
      indoor = createIndoorMap(containerRef.current);
    } catch (e) {
      setStatus('error');
      setErrorMsg(
        e instanceof Error
          ? e.message
          : '지도 초기화에 실패했습니다.',
      );
      return;
    }
    mapRef.current = indoor;
    indoor.onSelect((id) => setSelected(id));
    indoor.onLod((m) => setLod(m));
    indoor.fit();

    const client = createRealtimeSource({
      count: 32,
      rateHz: 10,
      onBatch: (batch) => {
        if (batch.alarms.length > 0) pushAlarms(batch.alarms);
        if (modeRef.current === 'replay') return; // 재생 중엔 라이브 반영 보류
        if (batch.operations) {
          const previousIncident = operationsRef.current?.incident;
          if (
            previousIncident?.active &&
            !batch.operations.incident?.active
          )
            useControlStore
              .getState()
              .recoverPortAlarms(
                previousIncident.portId,
                batch.ts ?? Date.now(),
              );
          operationsRef.current = batch.operations;
        }
        indoor.applyBatch(batch);
        if (batch.snapshot) setStatus('ready');
      },
      onMetrics: (m) => setMetrics(m),
      onError: (msg) => {
        setStatus('error');
        setErrorMsg(msg);
      },
      onStatus: (s) => setConn(s),
    });
    clientRef.current = client;
    setSrcLabel(client.label);
    client.start();

    // KPI/상세 폴링 (4Hz)
    const poll = setInterval(() => {
      setCounts(indoor.getCounts());
      setRenderStats(indoor.getRenderStats());
      setRendered(indoor.getRenderedCount());
      const memory = (
        performance as Performance & {
          memory?: { usedJSHeapSize: number };
        }
      ).memory;
      setHeapMb(
        memory
          ? Math.round((memory.usedJSHeapSize / 1024 / 1024) * 10) / 10
          : null,
      );
      setOperations(operationsRef.current);
      setJammed(indoor.updateCongestion());
      const sel = useControlStore.getState().selectedId;
      setDetail(sel ? (indoor.getVehicle(sel) ?? null) : null);
    }, 250);

    // 이력 캡처 (라이브일 때만)
    const capture = setInterval(() => {
      if (modeRef.current !== 'live') return;
      const items = indoor.getAllVehicles();
      if (!items.length) return;
      const buf = historyRef.current;
      buf.push({
        t: Date.now(),
        items,
        operations: operationsRef.current,
        alarms: [...useControlStore.getState().alarms],
      });
      if (buf.length > HISTORY_MAX_FRAMES) buf.shift();
      while (buf.length > 1 && buf[0]!.t < Date.now() - 60_000)
        buf.shift();
    }, HISTORY_INTERVAL_MS);

    // 재생 구동 루프
    let lastPlaybackTick = Date.now();
    const playback = setInterval(() => {
      const now = Date.now();
      const elapsed = now - lastPlaybackTick;
      lastPlaybackTick = now;
      if (modeRef.current !== 'replay' || !playingRef.current) return;
      const buf = historyRef.current;
      if (buf.length === 0) return;
      cursorRef.current = advanceHistoryCursor(
        buf,
        cursorRef.current,
        speedRef.current * elapsed,
      );
      if (cursorRef.current >= buf.length - 1) {
        cursorRef.current = buf.length - 1;
        playingRef.current = false;
      }
      const frame = applyFrame(indoor, buf, cursorRef.current);
      if (frame) {
        operationsRef.current = frame.operations;
        setReplayAlarms(frame.alarms);
      }
      setReplay((r) => ({
        ...r,
        cursor: cursorRef.current,
        playing: playingRef.current,
        len: buf.length,
      }));
    }, PLAYBACK_TICK_MS);

    // FPS
    let frames = 0;
    let last = performance.now();
    let rafId = 0;
    const loop = () => {
      frames += 1;
      const now = performance.now();
      if (now - last >= 1000) {
        setFps(Math.round((frames * 1000) / (now - last)));
        frames = 0;
        last = now;
      }
      rafId = requestAnimationFrame(loop);
    };
    rafId = requestAnimationFrame(loop);

    const ro = new ResizeObserver(() => {
      indoor.map.updateSize();
      indoor.fit();
    });
    ro.observe(containerRef.current);

    return () => {
      clearInterval(poll);
      clearInterval(capture);
      clearInterval(playback);
      cancelAnimationFrame(rafId);
      ro.disconnect();
      client.dispose();
      indoor.dispose();
      mapRef.current = null;
      clientRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    mapRef.current?.setFilterCode(filterCodeOf(filter));
  }, [filter]);

  useEffect(() => {
    mapRef.current?.setCargoFilter(cargo, hotOnly);
  }, [cargo, hotOnly]);

  useEffect(() => {
    clientRef.current?.setPaused(paused);
  }, [paused]);

  useEffect(() => {
    if (!demo.running) return;
    const timer = setInterval(() => {
      const elapsedMs = Date.now() - demo.startedAt;
      let nextIndex = demo.stepIndex;
      while (
        nextIndex < DEMO_STEPS.length &&
        elapsedMs >= DEMO_STEPS[nextIndex]!.atMs
      ) {
        executeDemoAction(DEMO_STEPS[nextIndex]!.action);
        nextIndex++;
      }
      setDemo((current) => ({
        ...current,
        running: nextIndex < DEMO_STEPS.length,
        stepIndex: nextIndex,
        elapsedMs: Math.min(elapsedMs, DEMO_DURATION_MS),
      }));
    }, 200);
    return () => clearInterval(timer);
    // executeDemoAction only dispatches to stable refs/setters.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [demo.running, demo.startedAt, demo.stepIndex]);

  function executeDemoAction(action: DemoAction) {
    const client = clientRef.current;
    if (!client) return;
    switch (action) {
      case 'reset':
        client.setOutage(false);
        setCommsOutage(false);
        client.resetScenario(8);
        client.setDispatch('priority');
        break;
      case 'hot-lot': client.promoteHotLot(); break;
      case 'port-on': client.setPortIncident(true); break;
      case 'port-off': client.setPortIncident(false); break;
      case 'rail-on': client.setRailClosure(true); break;
      case 'rail-off': client.setRailClosure(false); break;
      case 'storage-on': client.setStorageSaturation(true); break;
      case 'storage-off': client.setStorageSaturation(false); break;
      case 'outage-on':
        setCommsOutage(true);
        client.setOutage(true);
        break;
      case 'outage-off':
        setCommsOutage(false);
        client.setOutage(false);
        break;
      case 'complete':
        break;
    }
  }

  function startDemo() {
    if (modeRef.current === 'replay') exitReplay();
    if (paused) togglePaused();
    useControlStore.getState().clearAlarms();
    historyRef.current = [];
    setCount(8);
    executeDemoAction('reset');
    setDemo({
      running: true,
      startedAt: Date.now(),
      stepIndex: 1,
      elapsedMs: 0,
    });
  }

  function stopDemo() {
    const client = clientRef.current;
    client?.setOutage(false);
    client?.setPortIncident(false);
    client?.setRailClosure(false);
    client?.setStorageSaturation(false);
    client?.resetScenario(8);
    setCommsOutage(false);
    setCount(8);
    setDemo({ running: false, startedAt: 0, stepIndex: 0, elapsedMs: 0 });
  }

  const onChangeCount = (n: number) => {
    setCount(n);
    useControlStore.getState().clearAlarms();
    historyRef.current = [];
    exitReplay();
    clientRef.current?.setCount(n);
  };

  const focusBay = (bayId: string | null) => {
    setActiveBay(bayId);
    setActiveEquipment('');
    mapRef.current?.focusBay(bayId);
  };

  const focusEquipment = (equipmentId: string) => {
    setActiveEquipment(equipmentId);
    if (!equipmentId) {
      mapRef.current?.focusBay(activeBay);
      return;
    }
    const equipment = FAB_EQUIPMENT.find((item) => item.id === equipmentId);
    if (equipment) setActiveBay(equipment.bayId);
    mapRef.current?.focusEquipment(equipmentId);
  };

  // ---- 이력 재생 컨트롤 ----
  function enterReplay() {
    const buf = historyRef.current;
    if (buf.length < 2) return;
    modeRef.current = 'replay';
    cursorRef.current = 0;
    playingRef.current = true;
    speedRef.current = 1;
    const frame = mapRef.current
      ? applyFrame(mapRef.current, buf, 0)
      : undefined;
    if (frame) {
      operationsRef.current = frame.operations;
      setOperations(frame.operations);
      setReplayAlarms(frame.alarms);
    }
    setReplay({
      mode: 'replay',
      cursor: 0,
      len: buf.length,
      playing: true,
      speed: 1,
    });
  }
  function exitReplay() {
    modeRef.current = 'live';
    playingRef.current = false;
    setReplay((r) => ({ ...r, mode: 'live', playing: false }));
    clientRef.current?.requestSnapshot(); // 라이브 상태로 재동기
  }
  function togglePlay() {
    if (modeRef.current !== 'replay') return;
    playingRef.current = !playingRef.current;
    setReplay((r) => ({ ...r, playing: playingRef.current }));
  }
  function seek(cursor: number) {
    cursorRef.current = cursor;
    playingRef.current = false;
    const buf = historyRef.current;
    if (mapRef.current && buf.length) {
      const frame = applyFrame(mapRef.current, buf, cursor);
      if (frame) {
        operationsRef.current = frame.operations;
        setOperations(frame.operations);
        setReplayAlarms(frame.alarms);
      }
    }
    setReplay((r) => ({ ...r, cursor, playing: false }));
  }
  function setSpeed(s: number) {
    speedRef.current = s;
    setReplay((r) => ({ ...r, speed: s }));
  }

  const kpis = useMemo(() => {
    if (!counts) return [];
    return [
      { label: '전체 OHT', value: counts.total },
      { label: '이동', value: counts.MOVING },
      {
        label: '지연',
        value: counts.DELAYED,
        warn: counts.DELAYED > 0,
      },
      {
        label: '차단',
        value: counts.BLOCKED,
        warn: counts.BLOCKED > 0,
      },
      {
        label: '설비 장애',
        value: operations?.incident?.active ? 1 : 0,
        warn: operations?.incident?.active,
      },
      {
        label: '배차 대기',
        value:
          operations?.jobs.filter((j) => j.phase === 'QUEUED')
            .length ?? 0,
      },
      { label: '완료 반송', value: operations?.completed ?? 0 },
      {
        label: '평균 반송(초)',
        value: Math.round(operations?.averageTransportSec ?? 0),
      },
    ];
  }, [counts, jammed, operations]);

  const selectedJob = operations?.jobs.find(
    (job) => job.id === detail?.jobId && job.phase !== 'DONE',
  );
  const promotableJob =
    selectedJob?.priority === 3
      ? undefined
      : selectedJob ??
        operations?.jobs.find(
          (job) => job.phase !== 'DONE' && job.priority < 3,
        );
  const visibleAlarms = replay.mode === 'replay' ? replayAlarms : alarms;
  const activeAlarm = visibleAlarms.find(
    (alarm) => alarm.id === activeAlarmId,
  );

  function inspectAlarm(alarm: Alarm) {
    setActiveAlarmId(alarm.id);
    if (alarm.jobId) setJobSearch(alarm.jobId);
    if (alarm.equipmentId) {
      mapRef.current?.focusEquipment(alarm.equipmentId);
      setActiveEquipment(alarm.equipmentId);
    } else if (alarm.segmentId) {
      mapRef.current?.focusRailSegment(alarm.segmentId);
      setActiveEquipment('');
    }
    if (alarm.vehicleId) {
      if (!alarm.equipmentId && !alarm.segmentId)
        mapRef.current?.focusVehicle(alarm.vehicleId);
      else mapRef.current?.setSelected(alarm.vehicleId);
    }
  }

  const replayTimeLabel = useMemo(() => {
    const buf = historyRef.current;
    if (buf.length === 0) return '';
    const idx = Math.min(Math.floor(replay.cursor), buf.length - 1);
    const frame = buf[idx];
    if (!frame) return '';
    const secAgo = Math.round((Date.now() - frame.t) / 1000);
    return `-${secAgo}s`;
  }, [replay.cursor, replay.len]);

  return (
    <div style={styles.root}>
      <header style={styles.kpiStrip} role="banner">
        <div style={styles.brand}>
          <span style={styles.brandTag}>AMHS / OHT CONTROL</span>
          <span style={styles.brandSub}>
            Prototype #02 · 합성 FAB 시뮬레이션
          </span>
        </div>
        <div style={styles.kpiGroup}>
          {kpis.map((k) => (
            <div key={k.label} style={styles.kpi}>
              <span
                style={{
                  ...styles.kpiValue,
                  color: k.warn ? '#ff5470' : '#e6edf6',
                }}
              >
                {k.value.toLocaleString()}
              </span>
              <span style={styles.kpiLabel}>{k.label}</span>
            </div>
          ))}
        </div>
        <div style={styles.connectionStatus}>
          <span
            style={{
              ...styles.connectionDot,
              background:
                conn === 'open'
                  ? '#5ee6a8'
                  : conn === 'reconnecting'
                    ? '#ffd166'
                    : '#ff5470',
            }}
          />
          {conn === 'open'
            ? 'LIVE'
            : conn === 'reconnecting'
              ? '재연결 중'
              : '연결 중'}
        </div>
      </header>

      <div style={styles.body} className="amhs-body">
        <aside
          style={styles.leftPanel}
          className="amhs-left"
          aria-label="컨트롤 패널"
        >
          <div style={styles.sectionTitle}>FAB 탐색</div>
          <div style={styles.filterRow}>
            <button
              onClick={() => focusBay(null)}
              aria-pressed={activeBay === null}
              style={{
                ...styles.chip,
                ...(activeBay === null ? styles.chipActive : null),
              }}
            >
              전체
            </button>
            {FAB_BAYS.map((bay) => (
              <button
                key={bay.id}
                onClick={() => focusBay(bay.id)}
                aria-pressed={activeBay === bay.id}
                style={{
                  ...styles.chip,
                  ...(activeBay === bay.id ? styles.chipActive : null),
                }}
              >
                {bay.label}
              </button>
            ))}
          </div>
          <select
            aria-label="설비로 이동"
            className="amhs-select"
            value={activeEquipment}
            onChange={(event) => focusEquipment(event.target.value)}
          >
            <option value="">설비 선택</option>
            {FAB_EQUIPMENT.filter(
              (item) => !activeBay || item.bayId === activeBay,
            ).map((item) => (
              <option key={item.id} value={item.id}>
                {item.name}
              </option>
            ))}
          </select>
          <div style={styles.hint}>
            전체 FAB, 공정 Bay, 설비·포트 단계로 이동합니다.
          </div>

          <div style={styles.sectionTitle}>필터</div>
          <div style={styles.filterRow}>
            {FILTERS.map((f) => (
              <button
                key={f.key}
                onClick={() => setFilter(f.key)}
                aria-pressed={filter === f.key}
                aria-label={`상태 필터 ${f.label}`}
                style={{
                  ...styles.chip,
                  ...(filter === f.key ? styles.chipActive : null),
                }}
              >
                {f.label}
              </button>
            ))}
          </div>

          <div style={styles.sectionTitle}>반송 조건</div>
          <select
            aria-label="적재 상태 필터"
            value={cargo}
            onChange={(e) => setCargo(e.target.value as typeof cargo)}
            className="amhs-select"
          >
            <option value="all">적재·공차 전체</option>
            <option value="loaded">적재 차량</option>
            <option value="empty">공차 차량</option>
          </select>
          <label className="amhs-check">
            <input
              type="checkbox"
              checked={hotOnly}
              onChange={(e) => setHotOnly(e.target.checked)}
            />
            Hot lot만 보기
          </label>
          <div style={styles.hint}>
            흰 테두리: 적재 · 분홍 테두리: Hot lot
          </div>
          <div style={styles.sectionTitle}>디스패치 규칙</div>
          <select
            aria-label="디스패치 규칙"
            className="amhs-select"
            value={operations?.rule ?? 'priority'}
            disabled={replay.mode === 'replay'}
            onChange={(e) =>
              clientRef.current?.setDispatch(
                e.target.value as DispatchRule,
              )
            }
          >
            <option value="priority">우선순위 · Hot lot 우선</option>
            <option value="oldest">최장대기 · FIFO</option>
            <option value="nearest">최근접 · 공차 거리 최소</option>
          </select>
          <div style={styles.hint}>
            새 배차부터 적용됩니다. FIFO·우선순위는 작업을 먼저 고른
            뒤 가장 가까운 공차를 배정합니다.
          </div>
          <button
            style={{ ...styles.chip, ...styles.wideChip, marginTop: 8 }}
            disabled={
              replay.mode === 'replay' || demo.running || !promotableJob
            }
            onClick={() =>
              clientRef.current?.promoteHotLot(promotableJob?.id)
            }
          >
            {promotableJob
              ? `${promotableJob.id} · ${promotableJob.lotId} 긴급 승격`
              : '승격 가능한 일반 Job 없음'}
          </button>
          <div style={styles.hint}>
            선택 Job을 우선하며, 선택이 없으면 가장 오래된 일반 Job을
            Hot lot으로 승격합니다. 일반 Lot은 대기시간 aging을 유지합니다.
          </div>

          <div style={styles.sectionTitle}>운영 시나리오</div>
          <div
            style={{
              ...styles.scenarioBox,
              ...(demo.running ? styles.demoActive : null),
            }}
          >
            <strong>
              {demo.running
                ? `자동 데모 · ${DEMO_STEPS[Math.max(0, demo.stepIndex - 1)]!.label}`
                : '운영 데모 프리셋'}
            </strong>
            <span style={styles.hint}>
              {demo.running
                ? `${DEMO_STEPS[Math.max(0, demo.stepIndex - 1)]!.hint} · ${Math.ceil((DEMO_DURATION_MS - demo.elapsedMs) / 1000)}초 남음`
                : '고정 seed로 장애·우회·포화·통신 복구를 48초 동안 순서대로 재생합니다.'}
            </span>
            <div style={styles.demoProgressTrack}>
              <span
                style={{
                  ...styles.demoProgressBar,
                  width: `${(demo.elapsedMs / DEMO_DURATION_MS) * 100}%`,
                }}
              />
            </div>
            <button
              style={{ ...styles.chip, ...styles.wideChip }}
              disabled={replay.mode === 'replay'}
              onClick={demo.running ? stopDemo : startDemo}
            >
              {demo.running ? '데모 중단·초기화' : '자동 데모 시작'}
            </button>
          </div>
          <div
            style={{
              ...styles.scenarioBox,
              ...(operations?.incident?.active
                ? styles.scenarioActive
                : null),
            }}
          >
            <strong>
              {operations?.incident?.active
                ? `${operations.incident.portId} DOWN`
                : '설비 포트 장애'}
            </strong>
            <span style={styles.hint}>
              {operations?.incident?.active
                ? `영향 작업 ${operations.incident.affectedJobIds.join(', ') || '확인 중'} · 대기 OHT ${operations.incident.queueVehicleIds.length}대`
                : '운행 중인 작업의 목적지 포트를 차단합니다.'}
            </span>
            <button
              style={{ ...styles.chip, ...styles.wideChip }}
              disabled={replay.mode === 'replay' || demo.running}
              onClick={() =>
                clientRef.current?.setPortIncident(
                  !operations?.incident?.active,
                )
              }
            >
              {operations?.incident?.active
                ? '포트 복구'
                : '장애 발생'}
            </button>
            {operations?.incident?.equipmentId && (
              <button
                style={{ ...styles.chip, ...styles.wideChip }}
                onClick={() =>
                  focusEquipment(operations.incident!.equipmentId!)
                }
              >
                장애 설비로 이동
              </button>
            )}
          </div>
          <div
            style={{
              ...styles.scenarioBox,
              ...(operations?.saturation?.active
                ? styles.scenarioActive
                : null),
            }}
          >
            <strong>
              {operations?.saturation?.active
                ? `${operations.saturation.portId} 용량 포화`
                : 'Stocker / buffer 포화'}
            </strong>
            <span style={styles.hint}>
              {operations?.saturation?.active
                ? `가용 slot 0 · 하역 대기 OHT ${operations.saturation.queueVehicleIds.length}대`
                : '저장 위치를 가득 채워 하역 대기와 복구를 시연합니다.'}
            </span>
            <button
              style={{ ...styles.chip, ...styles.wideChip }}
              disabled={replay.mode === 'replay' || demo.running}
              onClick={() =>
                clientRef.current?.setStorageSaturation(
                  !operations?.saturation?.active,
                )
              }
            >
              {operations?.saturation?.active ? '공간 확보' : '용량 포화'}
            </button>
            {operations?.saturation?.equipmentId && (
              <button
                style={{ ...styles.chip, ...styles.wideChip }}
                onClick={() =>
                  focusEquipment(operations.saturation!.equipmentId!)
                }
              >
                포화 위치로 이동
              </button>
            )}
          </div>
          <div
            style={{
              ...styles.scenarioBox,
              ...(operations?.closure?.active
                ? styles.scenarioActive
                : null),
            }}
          >
            <strong>
              {operations?.closure?.active
                ? `${operations.closure.segmentIds.join(', ')} 레일 폐쇄`
                : '레일 구간 폐쇄'}
            </strong>
            <span style={styles.hint}>
              {operations?.closure?.active
                ? '해당 구간을 경로에서 제외 · 통과 차량 자동 우회'
                : '혼잡 구간을 폐쇄해 우회 동작을 시연합니다.'}
            </span>
            <button
              style={{ ...styles.chip, ...styles.wideChip }}
              disabled={replay.mode === 'replay' || demo.running}
              onClick={() =>
                clientRef.current?.setRailClosure(
                  !operations?.closure?.active,
                )
              }
            >
              {operations?.closure?.active ? '레일 개통' : '레일 폐쇄'}
            </button>
          </div>
          <div
            style={{
              ...styles.scenarioBox,
              ...(commsOutage ? styles.scenarioActive : null),
            }}
          >
            <strong>{commsOutage ? '통신 단절 중' : '통신 단절'}</strong>
            <span style={styles.hint}>
              {commsOutage
                ? '수신 중단 · 화면 정지 · 복구 시 스냅샷 재동기'
                : '실시간 수신을 끊어 재연결·재동기 동작을 시연합니다.'}
            </span>
            <button
              style={{ ...styles.chip, ...styles.wideChip }}
              disabled={replay.mode === 'replay' || demo.running}
              onClick={() => {
                const next = !commsOutage;
                setCommsOutage(next);
                clientRef.current?.setOutage(next);
              }}
            >
              {commsOutage ? '통신 복구' : '통신 단절'}
            </button>
          </div>
          <div style={styles.sectionTitle}>라이브</div>
          <button
            onClick={togglePaused}
            aria-pressed={paused}
            aria-label={paused ? '라이브 재개' : '라이브 일시정지'}
            style={{ ...styles.chip, ...styles.wideChip }}
          >
            {paused ? '▶ 재개' : '⏸ 일시정지'}
          </button>

          <div style={styles.sectionTitle}>상태 범례</div>
          <div style={styles.legend}>
            {(Object.keys(STATUS_COLORS) as OhtStatus[]).map((s) => (
              <div key={s} style={styles.legendRow}>
                <span
                  style={{
                    ...styles.dot,
                    background: STATUS_COLORS[s],
                  }}
                />
                <span>{s}</span>
              </div>
            ))}
          </div>
          <div style={styles.hint}>
            전체 화면은 밀집도를, 확대하면 OHT와 설비 포트를 표시합니다.
          </div>

          <details style={styles.diagnostics}>
            <summary style={styles.diagnosticsSummary}>개발 진단</summary>
            <div style={styles.diagnosticGrid}>
              <span>소스</span>
              <strong>{srcLabel || '연결 중'}</strong>
              <span>지도 단계</span>
              <strong>
                {lod === 'overview'
                  ? 'FAB 전체'
                  : lod === 'bay'
                    ? 'Bay'
                    : '설비'}
              </strong>
              <span>FPS</span>
              <strong>{fps}</strong>
              <span>메시지</span>
              <strong>{metrics?.messageRate ?? 0}/s</strong>
              <span>업데이트</span>
              <strong>
                {(metrics?.updateRate ?? 0).toLocaleString()}/s
              </strong>
              <span>코얼레싱</span>
              <strong>
                {(metrics?.coalesced ?? 0).toLocaleString()}
              </strong>
              <span>재동기</span>
              <strong>{metrics?.resyncs ?? 0}</strong>
              <span>적용 지연</span>
              <strong>{metrics?.applyLatency ?? 0}ms</strong>
              <span>렌더 완료</span>
              <strong>{renderStats.lastMs}ms</strong>
              <span>렌더 p95</span>
              <strong>
                {renderStats.p95Ms}ms · {renderStats.samples}
              </strong>
              <span>렌더 대상</span>
              <strong>
                {rendered[0].toLocaleString()} /{' '}
                {rendered[1].toLocaleString()}
              </strong>
              <span>JS heap</span>
              <strong>{heapMb === null ? '미지원' : `${heapMb}MB`}</strong>
              <span>정체 Zone</span>
              <strong>{jammed}</strong>
              <span>점유 구간</span>
              <strong>
                {operations?.traffic?.occupiedSegments ?? 0}
              </strong>
              <span>운행 WIP</span>
              <strong>{operations?.traffic?.admittedJobs ?? 0}</strong>
              <span>백프레셔</span>
              <strong>
                {operations?.traffic?.backpressuredJobs ?? 0}
              </strong>
              <span>합류 예약</span>
              <strong>
                {operations?.traffic?.junctionReservations ?? 0}
              </strong>
              <span>우회 OHT</span>
              <strong>
                {operations?.traffic?.reroutedVehicles ?? 0}
              </strong>
              <span>교착 감지</span>
              <strong>
                {operations?.traffic?.activeDeadlocks ?? 0}
              </strong>
              <span>교착 해소</span>
              <strong>
                {operations?.traffic?.resolvedDeadlocks ?? 0}
              </strong>
              <span>충전 중</span>
              <strong>
                {operations?.traffic?.chargingVehicles ?? 0}
              </strong>
              <span>저배터리</span>
              <strong
                style={
                  (operations?.traffic?.lowBatteryVehicles ?? 0) > 0
                    ? { color: '#ffd166' }
                    : undefined
                }
              >
                {operations?.traffic?.lowBatteryVehicles ?? 0}
              </strong>
            </div>
            <div style={styles.diagnosticLabel}>부하 설정</div>
            <div style={styles.filterRow}>
              {COUNT_PRESETS.map((n) => (
                <button
                  key={n}
                  onClick={() => onChangeCount(n)}
                  aria-pressed={count === n}
                  aria-label={`OHT ${n.toLocaleString()}대`}
                  style={{
                    ...styles.chip,
                    ...(count === n ? styles.chipActive : null),
                  }}
                >
                  {n.toLocaleString()}
                </button>
              ))}
            </div>
            <div style={styles.hint}>
              500대 이상은 렌더링 부하 검증용 합성 운행입니다.
            </div>
          </details>
        </aside>

        <div style={styles.mapWrap}>
          <div
            ref={containerRef}
            style={styles.map}
            role="application"
            aria-label="FAB 실내 좌표계 OHT 실시간 지도"
          />

          {status === 'loading' && (
            <div
              style={styles.overlay}
              role="status"
              aria-live="polite"
            >
              <div style={styles.spinner} aria-hidden />
              <span>시뮬레이터 연결 중…</span>
            </div>
          )}
          {status === 'error' && (
            <div
              style={{ ...styles.overlay, ...styles.overlayError }}
              role="alert"
            >
              <strong>지도를 표시할 수 없습니다</strong>
              <span style={styles.overlayErrMsg}>{errorMsg}</span>
            </div>
          )}

          {/* 이력 재생 타임 스크러버 */}
          {status === 'ready' && (
            <div
              style={styles.scrubber}
              role="group"
              aria-label="이력 재생 컨트롤"
            >
              {replay.mode === 'live' ? (
                <button
                  onClick={enterReplay}
                  style={styles.playBtn}
                  disabled={
                    replay.len === 0 && historyRef.current.length < 2
                  }
                  aria-label="이력 재생 시작"
                >
                  ⏱ 이력 재생
                </button>
              ) : (
                <>
                  <button
                    onClick={togglePlay}
                    style={styles.playBtn}
                    aria-label={replay.playing ? '일시정지' : '재생'}
                  >
                    {replay.playing ? '⏸' : '▶'}
                  </button>
                  <input
                    type="range"
                    min={0}
                    max={Math.max(historyRef.current.length - 1, 0)}
                    step={0.001}
                    value={replay.cursor}
                    onChange={(e) => seek(Number(e.target.value))}
                    style={styles.range}
                    aria-label="이력 재생 위치"
                  />
                  <span style={styles.timeLabel}>
                    {replayTimeLabel}
                  </span>
                  {[1, 2, 4].map((s) => (
                    <button
                      key={s}
                      onClick={() => setSpeed(s)}
                      aria-pressed={replay.speed === s}
                      aria-label={`재생 속도 ${s}배`}
                      style={{
                        ...styles.speedBtn,
                        ...(replay.speed === s
                          ? styles.chipActive
                          : null),
                      }}
                    >
                      ×{s}
                    </button>
                  ))}
                  <button
                    onClick={exitReplay}
                    style={styles.liveBtn}
                    aria-label="라이브로 복귀"
                  >
                    ● LIVE
                  </button>
                </>
              )}
            </div>
          )}
        </div>

        <aside
          style={styles.rightPanel}
          className="amhs-right"
          aria-label="상세 및 알람"
        >
          <div style={styles.sectionTitle}>개체 상세</div>
          {detail ? (
            <div style={styles.detailBox}>
              <div style={styles.detailId}>{detail.id}</div>
              <DetailRow
                k="상태"
                v={detail.status}
                color={STATUS_COLORS[detail.status]}
              />
              <DetailRow k="Job" v={detail.jobId ?? '—'} />
              <DetailRow
                k="반송 단계"
                v={PHASE_LABELS[detail.phase ?? 'IDLE'] ?? '—'}
              />
              <DetailRow k="FOUP" v={detail.carrierId ?? '—'} />
              <DetailRow k="Lot" v={detail.lotId ?? '—'} />
              <DetailRow
                k="우선순위"
                v={
                  detail.priority === 3
                    ? 'Hot lot (3)'
                    : detail.jobId
                      ? '일반 (1)'
                      : '—'
                }
              />
              <DetailRow
                k="적재"
                v={detail.loaded ? 'FOUP 적재' : '공차'}
              />
              {detail.blockedBy && (
                <DetailRow
                  k="대기 원인"
                  v={detail.blockedBy}
                  color="#ff8b70"
                />
              )}
              <DetailRow
                k="우회"
                v={
                  detail.rerouteCount
                    ? `${detail.rerouteCount}회`
                    : '없음'
                }
              />
              <DetailRow k="출발" v={detail.from || '—'} />
              <DetailRow k="도착" v={detail.to || '—'} />
              <DetailRow
                k="속도"
                v={`${detail.speed.toFixed(2)} m/s`}
              />
              <DetailRow
                k="배터리"
                v={
                  detail.battery === undefined
                    ? '—'
                    : `${detail.battery}%${
                        detail.phase === 'CHARGING'
                          ? ' · 충전 중'
                          : detail.battery <= 20
                            ? ' · 충전 필요'
                            : ''
                      }`
                }
              />
              <DetailRow
                k="위치"
                v={`${detail.x.toFixed(1)}, ${detail.y.toFixed(1)}`}
              />
              <DetailRow
                k="heading"
                v={`${Math.round(detail.heading)}°`}
              />
              <button
                onClick={() => mapRef.current?.setSelected(null)}
                style={styles.clearBtn}
              >
                선택 해제
              </button>
            </div>
          ) : (
            <div style={styles.placeholder}>
              지도에서 OHT를 클릭하면 상세와 경로가 표시됩니다.
            </div>
          )}

          <div style={styles.sectionTitle}>
            반송 작업 (
            {operations?.jobs.filter((j) => j.phase !== 'DONE')
              .length ?? 0}
            )
          </div>
          <input
            className="amhs-select"
            aria-label="반송 작업 검색"
            placeholder="Job · FOUP · Lot · OHT 검색"
            value={jobSearch}
            onChange={(e) => setJobSearch(e.target.value)}
          />
          <div className="amhs-jobs">
            {operations?.jobs
              .filter(
                (j) =>
                  (!hotOnly || j.priority === 3) &&
                  `${j.id} ${j.carrierId} ${j.lotId} ${j.vehicleId ?? ''}`
                    .toLowerCase()
                    .includes(jobSearch.toLowerCase()),
              )
              .map((j) => (
                <button
                  key={j.id}
                  className="amhs-job"
                  style={j.priority === 3 ? styles.hotJob : undefined}
                  disabled={!j.vehicleId || j.phase === 'DONE'}
                  onClick={() =>
                    mapRef.current?.setSelected(j.vehicleId)
                  }
                >
                  <span>
                    <strong>{j.id}</strong> · {PHASE_LABELS[j.phase]}{' '}
                    {j.priority === 3 ? '· HOT' : ''}
                  </span>
                  <span>
                    {j.carrierId} · {j.lotId}
                  </span>
                  <span>
                    {j.from} → {j.to}
                  </span>
                  <span>{j.vehicleId ?? '배차 대기'}</span>
                </button>
              ))}
            {!operations?.jobs.length && (
              <div style={styles.placeholder}>반송 작업 없음</div>
            )}
          </div>
          <details className="amhs-ports">
            <summary>포트·스토커 점유 / 용량</summary>
            {operations?.ports.map((p) => (
              <div
                key={p.id}
                className="amhs-port"
                style={
                  p.status === 'DOWN'
                    ? { color: '#ff5470', fontWeight: 700 }
                    : undefined
                }
              >
                <span>{p.id}</span>
                <span>
                  {p.status === 'DOWN' ? 'DOWN · ' : ''}
                  {p.occupied}/{p.capacity} · 예약 {p.reserved}
                </span>
              </div>
            ))}
          </details>
          <div style={styles.sectionTitle}>
            알람 (
            {
              (replay.mode === 'replay' ? replayAlarms : alarms)
                .length
            }
            )
          </div>
          {activeAlarm && (
            <div style={styles.alarmContext}>
              <strong>선택 알람 영향 범위</strong>
              <span>{activeAlarm.message}</span>
              <div style={styles.alarmContextGrid}>
                <span>위치</span>
                <b>
                  {activeAlarm.equipmentId ??
                    activeAlarm.segmentId ??
                    activeAlarm.portId ??
                    '차량 위치'}
                </b>
                <span>Job</span>
                <b>{activeAlarm.jobId ?? '—'}</b>
                <span>OHT</span>
                <b>{activeAlarm.vehicleId ?? '—'}</b>
              </div>
            </div>
          )}
          <div style={styles.alarmList}>
            {visibleAlarms.length === 0 && (
              <div style={styles.placeholder}>알람 없음</div>
            )}
            {visibleAlarms.map(
              (a) => (
                <div
                  key={a.id}
                  style={{
                    ...styles.alarmRow,
                    opacity: a.state === 'RECOVERED' ? 0.6 : 1,
                    borderLeftColor:
                      a.severity === 'critical'
                        ? '#ff5470'
                        : a.severity === 'warn'
                          ? '#ffd166'
                          : '#4da3ff',
                    background:
                      activeAlarmId === a.id
                        ? 'rgba(77, 163, 255, 0.1)'
                        : '#0d121c',
                  }}
                >
                  <button
                    style={styles.alarmMain}
                    onClick={() => inspectAlarm(a)}
                  >
                    <span style={styles.alarmKind}>
                      {a.kind} · {a.state ?? 'ACTIVE'}
                    </span>
                    <span style={styles.alarmMsg}>{a.message}</span>
                    <span style={styles.alarmTime}>
                      {formatAlarmDuration(a)}
                    </span>
                  </button>
                  {replay.mode === 'live' &&
                    (a.state ?? 'ACTIVE') === 'ACTIVE' && (
                      <button
                        style={styles.ackBtn}
                        onClick={() => acknowledgeAlarm(a.id)}
                      >
                        확인
                      </button>
                    )}
                </div>
              ),
            )}
          </div>

          <div style={styles.sectionTitle}>운영 감사 로그</div>
          <div style={styles.hint}>
            모든 운영 명령은 연동 경계에서 역할 기반으로 인증되고 actor·시각·
            결과가 기록됩니다.
          </div>
          <div style={styles.auditList}>
            {(operations?.audit?.length ?? 0) === 0 && (
              <div style={styles.placeholder}>기록 없음</div>
            )}
            {[...(operations?.audit ?? [])].reverse().map((entry) => (
              <div
                key={entry.id}
                style={{
                  ...styles.auditRow,
                  borderLeftColor:
                    entry.outcome === 'rejected' ? '#ff5470' : '#27c1a8',
                }}
                title={entry.reason ?? ''}
              >
                <span style={styles.auditTop}>
                  <span style={styles.auditActor}>
                    {entry.actor.id} · {entry.actor.role}
                  </span>
                  <span
                    style={{
                      ...styles.auditOutcome,
                      color:
                        entry.outcome === 'rejected' ? '#ff8a9c' : '#5fd0b8',
                    }}
                  >
                    {entry.outcome === 'rejected' ? '거부' : '승인'}
                  </span>
                </span>
                <span style={styles.auditMsg}>{entry.detail}</span>
              </div>
            ))}
          </div>
        </aside>
      </div>
    </div>
  );
}

function applyFrame(
  indoor: IndoorMap,
  buf: HistoryFrame[],
  cursor: number,
) {
  const idx = Math.min(
    Math.max(Math.floor(cursor), 0),
    buf.length - 1,
  );
  const frame = buf[idx];
  if (!frame) return;
  indoor.applyBatch(replayBatch(indoor.getAllVehicles(), frame));
  return frame;
}

function formatAlarmDuration(alarm: Alarm): string {
  const end = alarm.recoveredTs ?? Date.now();
  const seconds = Math.max(0, Math.floor((end - alarm.ts) / 1000));
  if (seconds < 60) return `${seconds}초 지속`;
  return `${Math.floor(seconds / 60)}분 ${seconds % 60}초 지속`;
}

function DetailRow({
  k,
  v,
  color,
}: {
  k: string;
  v: string;
  color?: string;
}) {
  return (
    <div style={styles.detailRow}>
      <span style={styles.detailKey}>{k}</span>
      <span
        style={{ ...styles.detailVal, color: color ?? '#e6edf6' }}
      >
        {v}
      </span>
    </div>
  );
}

const styles: Record<string, CSSProperties> = {
  root: {
    display: 'flex',
    flexDirection: 'column',
    height: '100vh',
    width: '100vw',
    overflow: 'hidden',
  },
  kpiStrip: {
    display: 'flex',
    alignItems: 'center',
    gap: 24,
    padding: '10px 18px',
    borderBottom: '1px solid var(--line)',
    background: 'var(--panel)',
    flexWrap: 'wrap',
  },
  brand: { display: 'flex', flexDirection: 'column', minWidth: 160 },
  brandTag: {
    fontWeight: 700,
    letterSpacing: '0.08em',
    fontSize: 13,
  },
  brandSub: { color: 'var(--muted)', fontSize: 11 },
  kpiGroup: { display: 'flex', gap: 20, flex: 1, flexWrap: 'wrap' },
  kpi: { display: 'flex', flexDirection: 'column', minWidth: 64 },
  kpiValue: {
    fontSize: 20,
    fontWeight: 700,
    fontVariantNumeric: 'tabular-nums',
  },
  kpiLabel: { color: 'var(--muted)', fontSize: 11 },
  perf: {
    display: 'flex',
    gap: 12,
    fontSize: 11,
    color: 'var(--muted)',
    fontVariantNumeric: 'tabular-nums',
    flexWrap: 'wrap',
    justifyContent: 'flex-end',
    alignItems: 'center',
  },
  lodBadge: {
    padding: '2px 8px',
    borderRadius: 5,
    border: '1px solid var(--line)',
    color: 'var(--text)',
  },
  connectionStatus: {
    display: 'flex',
    alignItems: 'center',
    gap: 7,
    padding: '5px 9px',
    border: '1px solid var(--line)',
    borderRadius: 6,
    color: 'var(--text)',
    fontSize: 11,
    fontWeight: 700,
    letterSpacing: '0.08em',
  },
  connectionDot: {
    width: 7,
    height: 7,
    borderRadius: '50%',
    boxShadow: '0 0 8px currentColor',
  },
  body: { display: 'flex', flex: 1, minHeight: 0 },
  leftPanel: {
    width: 190,
    padding: 14,
    borderRight: '1px solid var(--line)',
    background: 'var(--panel)',
    overflowY: 'auto',
  },
  rightPanel: {
    width: 320,
    flexShrink: 0,
    padding: 14,
    borderLeft: '1px solid var(--line)',
    background: 'var(--panel)',
    overflowY: 'auto',
    display: 'flex',
    flexDirection: 'column',
  },
  sectionTitle: {
    fontSize: 11,
    textTransform: 'uppercase',
    letterSpacing: '0.1em',
    color: 'var(--muted)',
    margin: '14px 0 8px',
  },
  filterRow: { display: 'flex', flexWrap: 'wrap', gap: 6 },
  chip: {
    padding: '5px 10px',
    fontSize: 12,
    borderRadius: 6,
    border: '1px solid var(--line)',
    background: 'transparent',
    color: 'var(--text)',
    cursor: 'pointer',
  },
  wideChip: { width: '100%' },
  scenarioBox: {
    display: 'flex',
    flexDirection: 'column',
    gap: 8,
    padding: 10,
    border: '1px solid var(--line)',
    borderRadius: 7,
    background: '#0d121c',
    fontSize: 12,
  },
  scenarioActive: {
    border: '1px solid #ff5470',
    background: 'rgba(255, 84, 112, 0.08)',
  },
  demoActive: {
    border: '1px solid #4da3ff',
    background: 'rgba(77, 163, 255, 0.08)',
  },
  demoProgressTrack: {
    height: 4,
    overflow: 'hidden',
    borderRadius: 4,
    background: '#232a3a',
  },
  demoProgressBar: {
    display: 'block',
    height: '100%',
    borderRadius: 4,
    background: 'var(--accent)',
    transition: 'width 200ms linear',
  },
  hotJob: {
    border: '1px solid #ff6fae',
    boxShadow: 'inset 3px 0 #ff6fae',
  },
  alarmContext: {
    display: 'flex',
    flexDirection: 'column',
    gap: 7,
    marginBottom: 8,
    padding: 10,
    border: '1px solid #4da3ff',
    borderRadius: 7,
    background: 'rgba(77, 163, 255, 0.08)',
    fontSize: 11,
  },
  alarmContextGrid: {
    display: 'grid',
    gridTemplateColumns: '46px 1fr',
    gap: '3px 8px',
    color: 'var(--muted)',
  },
  chipActive: {
    background: 'var(--accent)',
    border: '1px solid var(--accent)',
    color: '#04121f',
  },
  legend: {
    display: 'flex',
    flexDirection: 'column',
    gap: 5,
    fontSize: 11,
    color: 'var(--muted)',
  },
  legendRow: { display: 'flex', alignItems: 'center', gap: 8 },
  dot: {
    width: 10,
    height: 10,
    borderRadius: '50%',
    display: 'inline-block',
  },
  hint: {
    marginTop: 12,
    fontSize: 11,
    color: 'var(--muted)',
    lineHeight: 1.5,
  },
  diagnostics: {
    marginTop: 18,
    padding: '8px 0',
    borderTop: '1px solid var(--line)',
    color: 'var(--muted)',
    fontSize: 11,
  },
  diagnosticsSummary: {
    cursor: 'pointer',
    color: 'var(--muted)',
    letterSpacing: '0.08em',
    textTransform: 'uppercase',
  },
  diagnosticGrid: {
    display: 'grid',
    gridTemplateColumns: '1fr auto',
    gap: '5px 8px',
    marginTop: 10,
    padding: 9,
    borderRadius: 6,
    background: '#0b0e14',
    fontVariantNumeric: 'tabular-nums',
  },
  diagnosticLabel: {
    margin: '12px 0 7px',
    color: 'var(--muted)',
    textTransform: 'uppercase',
    letterSpacing: '0.08em',
  },
  mapWrap: {
    flex: 1,
    minWidth: 0,
    position: 'relative',
    display: 'flex',
  },
  map: { flex: 1, minWidth: 0, background: '#0b0e14' },
  overlay: {
    position: 'absolute',
    inset: 0,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    background: 'rgba(11,14,20,0.7)',
    color: 'var(--text)',
    fontSize: 13,
    backdropFilter: 'blur(2px)',
    zIndex: 5,
  },
  overlayError: {
    background: 'rgba(30,12,16,0.82)',
    color: '#ffd1d8',
  },
  overlayErrMsg: {
    color: 'var(--muted)',
    fontSize: 12,
    maxWidth: 360,
    textAlign: 'center',
  },
  spinner: {
    width: 26,
    height: 26,
    borderRadius: '50%',
    border: '3px solid rgba(255,255,255,0.15)',
    borderTopColor: 'var(--accent)',
    animation: 'amhs-spin 0.8s linear infinite',
  },
  scrubber: {
    position: 'absolute',
    left: 12,
    right: 12,
    bottom: 12,
    height: 40,
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    padding: '0 12px',
    borderRadius: 8,
    background: 'rgba(19,24,35,0.9)',
    border: '1px solid var(--line)',
    backdropFilter: 'blur(4px)',
  },
  playBtn: {
    padding: '5px 12px',
    fontSize: 12,
    borderRadius: 6,
    border: '1px solid var(--line)',
    background: 'transparent',
    color: 'var(--text)',
    cursor: 'pointer',
  },
  range: { flex: 1, accentColor: '#4da3ff' },
  timeLabel: {
    fontSize: 12,
    color: 'var(--muted)',
    fontVariantNumeric: 'tabular-nums',
    minWidth: 44,
  },
  speedBtn: {
    padding: '4px 8px',
    fontSize: 11,
    borderRadius: 5,
    border: '1px solid var(--line)',
    background: 'transparent',
    color: 'var(--text)',
    cursor: 'pointer',
  },
  liveBtn: {
    padding: '5px 10px',
    fontSize: 11,
    borderRadius: 6,
    border: '1px solid #ff5470',
    background: 'transparent',
    color: '#ff5470',
    cursor: 'pointer',
  },
  detailBox: {
    border: '1px solid var(--line)',
    borderRadius: 8,
    padding: 12,
  },
  detailId: { fontWeight: 700, fontSize: 15, marginBottom: 8 },
  detailRow: {
    display: 'flex',
    justifyContent: 'space-between',
    padding: '3px 0',
    fontSize: 12,
  },
  detailKey: { color: 'var(--muted)' },
  detailVal: { fontVariantNumeric: 'tabular-nums' },
  clearBtn: {
    marginTop: 10,
    width: '100%',
    padding: '6px',
    fontSize: 12,
    borderRadius: 6,
    border: '1px solid var(--line)',
    background: 'transparent',
    color: 'var(--muted)',
    cursor: 'pointer',
  },
  placeholder: {
    color: 'var(--muted)',
    fontSize: 12,
    padding: '8px 0',
    lineHeight: 1.5,
  },
  alarmList: {
    display: 'flex',
    flexDirection: 'column',
    gap: 6,
    overflowY: 'auto',
    flex: 1,
  },
  alarmRow: {
    textAlign: 'left',
    display: 'flex',
    alignItems: 'center',
    gap: 6,
    padding: '6px 8px',
    borderRadius: 6,
    border: '1px solid var(--line)',
    borderLeft: '3px solid #4da3ff',
    background: 'rgba(255,255,255,0.02)',
    color: 'var(--text)',
  },
  alarmMain: {
    minWidth: 0,
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    gap: 2,
    padding: 0,
    border: 0,
    background: 'transparent',
    color: 'inherit',
    textAlign: 'left',
    cursor: 'pointer',
  },
  ackBtn: {
    padding: '3px 7px',
    borderRadius: 5,
    border: '1px solid #4da3ff',
    background: 'rgba(77,163,255,.1)',
    color: '#8fc5ff',
    fontSize: 10,
    cursor: 'pointer',
  },
  alarmKind: {
    fontSize: 10,
    letterSpacing: '0.08em',
    color: 'var(--muted)',
  },
  alarmMsg: { fontSize: 12 },
  alarmTime: { fontSize: 10, color: 'var(--muted)' },
  auditList: {
    display: 'flex',
    flexDirection: 'column',
    gap: 5,
    maxHeight: 150,
    overflowY: 'auto',
  },
  auditRow: {
    display: 'flex',
    flexDirection: 'column',
    gap: 2,
    padding: '5px 8px',
    borderRadius: 6,
    border: '1px solid var(--line)',
    borderLeft: '3px solid #27c1a8',
    background: 'rgba(255,255,255,0.02)',
  },
  auditTop: {
    display: 'flex',
    justifyContent: 'space-between',
    gap: 8,
    fontSize: 10,
  },
  auditActor: { color: 'var(--muted)', letterSpacing: '0.04em' },
  auditOutcome: { fontWeight: 700 },
  auditMsg: { fontSize: 12 },
  selectedBadge: {
    position: 'absolute',
    top: 66,
    left: 206,
    padding: '4px 10px',
    fontSize: 12,
    borderRadius: 6,
    background: 'rgba(77,163,255,0.15)',
    border: '1px solid var(--accent)',
  },
};
