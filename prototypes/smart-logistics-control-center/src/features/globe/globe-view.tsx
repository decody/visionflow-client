'use client';

/**
 * deck.gl 글로브↔지역 관제 — 단계 1~4(기획서 §3/§8).
 *
 * _GlobeView에 지구 구(sphere) 배경 + Natural Earth 국가 경계 + 허브 노드 + 대권항로 arc +
 * 실시간 운송수단을 올리고(단계 1~2), 복합운송 Executive KPI(단계 3)를 띄운다. 권역을 선택하면
 * MapView 2D 지역 관제로 viewState를 보간하며 전환하고, 해당 권역으로 데이터를 필터한다(단계 4).
 */

import {
  _GlobeView as GlobeView,
  COORDINATE_SYSTEM,
  FlyToInterpolator,
  MapView,
  type Color,
} from '@deck.gl/core';
import { ArcLayer, GeoJsonLayer, ScatterplotLayer } from '@deck.gl/layers';
import { SimpleMeshLayer } from '@deck.gl/mesh-layers';
import DeckGL from '@deck.gl/react';
import { SphereGeometry } from '@luma.gl/engine';
import { useEffect, useMemo, useRef, useState } from 'react';

import { HUBS, LANES, hub } from '@/entities/logistics/mock';
import type { AuditEntry, Hub, HubKind, Mode, Role, RoutingRule, ScenarioKind } from '@/entities/logistics/types';
import { createRealtimeSource } from '@/shared/realtime/create-source';
import type { AlertWire, BatchResult, ConveyanceWire, ShipmentWire, SimMeta } from '@/shared/realtime/types';
import { REGIONS } from '@/shared/map/regions';
import { withinHemisphere } from '@/shared/map/viewport-cull';
import {
  INITIAL_VIEW_STATE,
  enterRegion,
  exitToGlobe,
  lodForSession,
  lodLabel,
  stepRotation,
  type GlobeViewState,
  type ViewMode,
} from '@/shared/map/view-controller';

const EARTH_RADIUS_METERS = 6.3e6;
const COUNTRIES_URL = '/natural-earth/countries-110m.geojson';

const HUB_REGION: Record<string, string> = Object.fromEntries(HUBS.map((h) => [h.id, h.region]));

const HUB_COLOR: Record<HubKind, Color> = {
  PORT: [86, 168, 255],
  AIRPORT: [174, 156, 255],
  RAIL_TERMINAL: [61, 213, 152],
  DC: [243, 165, 74],
};

const MODE_COLOR: Record<Mode, Color> = {
  SEA: [86, 168, 255],
  AIR: [174, 156, 255],
  ROAD: [243, 165, 74],
  RAIL: [61, 213, 152],
};

interface LaneRow {
  from: [number, number];
  to: [number, number];
  mode: Mode;
  label: string;
  fromRegion: string;
  toRegion: string;
}

/** viewState에 deck.gl 전환(보간) 옵션을 얹기 위한 타입. */
type ViewStateT = GlobeViewState & {
  transitionDuration?: number;
  transitionInterpolator?: FlyToInterpolator;
};

const TRANSITION_MS = 1500;

/** 배치를 id 맵에 반영(스냅샷=전체 교체, add/upd/del 코얼레싱). */
function applyBatch(map: Map<string, ConveyanceWire>, batch: BatchResult): void {
  if (batch.snapshot) {
    map.clear();
    for (const c of batch.snapshot) map.set(c.id, c);
  }
  if (batch.additions) for (const c of batch.additions) map.set(c.id, c);
  for (const c of batch.updates) {
    const prev = map.get(c.id);
    map.set(c.id, prev ? { ...prev, ...c } : c);
  }
  if (batch.deletions) for (const id of batch.deletions) map.delete(id);
}

/** 화물 채널(저빈도) 반영 — 스냅샷=전체 교체, add/upd/del 코얼레싱. */
function applyShipmentBatch(map: Map<string, ShipmentWire>, batch: BatchResult): void {
  if (batch.shipmentSnapshot) {
    map.clear();
    for (const s of batch.shipmentSnapshot) map.set(s.id, s);
  }
  if (batch.shipmentAdditions) for (const s of batch.shipmentAdditions) map.set(s.id, s);
  for (const s of batch.shipmentUpdates) {
    const prev = map.get(s.id);
    map.set(s.id, prev ? { ...prev, ...s } : s);
  }
  if (batch.shipmentDeletions) for (const id of batch.shipmentDeletions) map.delete(id);
}

/** 알람 채널 반영 — 스냅샷=전체 교체, add/upd/del 코얼레싱. */
function applyAlertBatch(map: Map<string, AlertWire>, batch: BatchResult): void {
  if (batch.alertSnapshot) {
    map.clear();
    for (const a of batch.alertSnapshot) map.set(a.id, a);
  }
  if (batch.alertAdditions) for (const a of batch.alertAdditions) map.set(a.id, a);
  for (const a of batch.alertUpdates) {
    const prev = map.get(a.id);
    map.set(a.id, prev ? { ...prev, ...a } : a);
  }
  if (batch.alertDeletions) for (const id of batch.alertDeletions) map.delete(id);
}

const SEVERITY_RANK: Record<AlertWire['severity'], number> = { critical: 0, warning: 1, info: 2 };

const MODE_LABEL: Record<Mode, string> = { SEA: '해상', AIR: '항공', ROAD: '육상', RAIL: '철도' };
const STATUS_LABEL: Record<string, string> = {
  IN_TRANSIT: '운송 중', AT_HUB: '환적', CUSTOMS_HOLD: '통관', DELAYED: '지연',
  DELIVERED: '완료', EXCEPTION: '예외', BOOKED: '예약', AT_ORIGIN: '출발지',
};
const ALL_MODES: Mode[] = ['SEA', 'AIR', 'ROAD', 'RAIL'];
const REPLAY_CAP = 300; // 이력 링버퍼 프레임 수(≈30s @10Hz)

type StatusFilter = 'ALL' | 'IN_TRANSIT' | 'AT_HUB' | 'RISK';
interface Filters {
  modes: Set<Mode>;
  status: StatusFilter;
  expediteOnly: boolean;
}
interface Frame {
  conveyances: ConveyanceWire[];
  shipments: ShipmentWire[];
  alerts: AlertWire[];
  meta: SimMeta | null;
}
interface ReplayState {
  active: boolean;
  idx: number;
  speed: number;
}

/** sim time(epoch ms) → 로컬 시:분:초. */
function fmtClock(ms: number): string {
  return new Date(ms).toLocaleTimeString('ko-KR', { hour12: false });
}

export function GlobeView3D() {
  const [viewState, setViewState] = useState<ViewStateT>(INITIAL_VIEW_STATE);
  const [mode, setMode] = useState<ViewMode>('GLOBE');
  const [region, setRegion] = useState<string | null>(null);
  const [autoRotate, setAutoRotate] = useState(true);
  const [conveyances, setConveyances] = useState<ConveyanceWire[]>([]);
  const [shipments, setShipments] = useState<ShipmentWire[]>([]);
  const [alerts, setAlerts] = useState<AlertWire[]>([]);
  const [audit, setAudit] = useState<AuditEntry[]>([]);
  const [sourceError, setSourceError] = useState<string | null>(null);
  const [role, setRoleState] = useState<Role>('supervisor');
  const [meta, setMeta] = useState<SimMeta | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [filters, setFilters] = useState<Filters>({ modes: new Set(ALL_MODES), status: 'ALL', expediteOnly: false });
  const [confirmAction, setConfirmAction] = useState<{ kind: 'expedite' | 'reroute'; id: string } | null>(null);
  const [diag, setDiag] = useState(false);
  const [diagData, setDiagData] = useState({ fps: 0, msgS: 0, updS: 0, coalesced: 0, resync: 0, rendered: 0, heapMb: 0 });
  const [replay, setReplay] = useState<ReplayState>({ active: false, idx: 0, speed: 1 });
  const rafRef = useRef<number | null>(null);
  const sourceRef = useRef<ReturnType<typeof createRealtimeSource> | null>(null);
  const recordingRef = useRef<Frame[]>([]);
  const replayFramesRef = useRef<Frame[]>([]);
  const lastRecTickRef = useRef<number>(-1);
  const renderedCountRef = useRef(0);

  /** 권역 드릴다운 — 지역 모드로 보간 전환하고 자동 회전을 끈다. */
  const drillToRegion = (regionId: string) => {
    const r = REGIONS.find((x) => x.id === regionId);
    if (!r) return;
    const next = enterRegion(r.id, r.center, r.zoom);
    setMode(next.mode);
    setRegion(next.region);
    setAutoRotate(false);
    setViewState({ ...next.view, transitionDuration: TRANSITION_MS, transitionInterpolator: new FlyToInterpolator() });
  };

  /** 글로브로 복귀. */
  const backToGlobe = () => {
    const next = exitToGlobe();
    setMode(next.mode);
    setRegion(next.region);
    setViewState({ ...next.view, transitionDuration: TRANSITION_MS, transitionInterpolator: new FlyToInterpolator() });
  };

  // 실시간 소스(방식 A: Web Worker 시뮬레이터) 구독 — 단계 2~3.
  useEffect(() => {
    const store = new Map<string, ConveyanceWire>();
    const ships = new Map<string, ShipmentWire>();
    const alertMap = new Map<string, AlertWire>();
    const source = createRealtimeSource({
      count: 300,
      rateHz: 10,
      onBatch: (batch) => {
        setSourceError(null);
        applyBatch(store, batch);
        applyShipmentBatch(ships, batch);
        applyAlertBatch(alertMap, batch);
        if (batch.meta) setMeta(batch.meta);
        const convArr = Array.from(store.values());
        setConveyances(convArr);
        const shipChanged =
          batch.shipmentSnapshot !== undefined ||
          (batch.shipmentAdditions?.length ?? 0) > 0 ||
          batch.shipmentUpdates.length > 0 ||
          (batch.shipmentDeletions?.length ?? 0) > 0;
        let shipArr: ShipmentWire[] | null = null;
        if (shipChanged) {
          shipArr = Array.from(ships.values());
          setShipments(shipArr);
        }
        const alertChanged =
          batch.alertSnapshot !== undefined ||
          (batch.alertAdditions?.length ?? 0) > 0 ||
          batch.alertUpdates.length > 0 ||
          (batch.alertDeletions?.length ?? 0) > 0;
        if (alertChanged) {
          setAlerts(
            Array.from(alertMap.values())
              .filter((a) => a.status !== 'RESOLVED')
              .sort((x, y) => SEVERITY_RANK[x.severity] - SEVERITY_RANK[y.severity]),
          );
        }
        if (batch.audit) setAudit(batch.audit);
        // 이력 링버퍼 — sim 틱이 바뀔 때만 1프레임 기록(복사본).
        if (batch.tick !== undefined && batch.tick !== lastRecTickRef.current) {
          lastRecTickRef.current = batch.tick;
          const rec = recordingRef.current;
          rec.push({
            conveyances: convArr.map((c) => ({ ...c })),
            shipments: (shipArr ?? Array.from(ships.values())).map((s) => ({ ...s })),
            alerts: Array.from(alertMap.values()).map((a) => ({ ...a })),
            meta: batch.meta ?? null,
          });
          if (rec.length > REPLAY_CAP) rec.shift();
        }
      },
      onError: (m) => {
        console.error('[realtime]', m);
        setSourceError(m);
      },
    });
    sourceRef.current = source;
    source.start();
    return () => {
      source.dispose();
      sourceRef.current = null;
    };
  }, []);

  // 이력 재생 스테핑 — 재생 중 프레임 인덱스를 속도만큼 전진.
  useEffect(() => {
    if (!replay.active) return;
    const timer = setInterval(() => {
      setReplay((r) => {
        if (!r.active) return r;
        const last = replayFramesRef.current.length - 1;
        return { ...r, idx: Math.min(last, r.idx + r.speed) };
      });
    }, 100);
    return () => clearInterval(timer);
  }, [replay.active]);

  // 개발 진단 — FPS + 소스 메트릭(1초 차분).
  useEffect(() => {
    if (!diag) return;
    let frames = 0;
    let raf = 0;
    let prev = performance.now();
    let prevM = sourceRef.current?.getMetrics() ?? null;
    const loop = () => {
      frames += 1;
      const now = performance.now();
      if (now - prev >= 1000) {
        const m = sourceRef.current?.getMetrics();
        const dm = m && prevM ? m : null;
        setDiagData({
          fps: Math.round((frames * 1000) / (now - prev)),
          msgS: dm && prevM ? dm.msgCount - prevM.msgCount : 0,
          updS: dm && prevM ? dm.rawUpd - prevM.rawUpd : 0,
          coalesced:
            dm && prevM && dm.rawUpd - prevM.rawUpd > 0
              ? Math.round((1 - (dm.drainedUpd - prevM.drainedUpd) / (dm.rawUpd - prevM.rawUpd)) * 100)
              : 0,
          resync: m?.resyncCount ?? 0,
          rendered: renderedCountRef.current,
          heapMb: (() => {
            const memory = (performance as Performance & { memory?: { usedJSHeapSize: number } }).memory;
            return memory ? Math.round((memory.usedJSHeapSize / (1024 * 1024)) * 10) / 10 : 0;
          })(),
        });
        frames = 0;
        prev = now;
        prevM = m ?? prevM;
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [diag]);

  const enterReplay = () => {
    replayFramesRef.current = [...recordingRef.current];
    setReplay({ active: true, idx: 0, speed: 1 });
  };
  const exitReplay = () => setReplay({ active: false, idx: 0, speed: 1 });

  const changeRole = (r: Role) => {
    setRoleState(r);
    sourceRef.current?.setRole(r);
  };

  // 자동 회전: 글로브 모드에서만, 경도를 매 프레임 전진(상호작용 시 토글로 끈다).
  useEffect(() => {
    if (!autoRotate || mode !== 'GLOBE') return;
    const tick = () => {
      setViewState((v) => stepRotation(v, 0.08));
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => {
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
    };
  }, [autoRotate, mode]);

  const lanes = useMemo<LaneRow[]>(
    () =>
      LANES.map((l) => {
        const a = hub(l.from);
        const b = hub(l.to);
        return {
          from: [a.lon, a.lat],
          to: [b.lon, b.lat],
          mode: l.mode,
          label: `${a.name} → ${b.name} (${l.mode})`,
          fromRegion: a.region,
          toRegion: b.region,
        };
      }),
    [],
  );

  // 이력 재생 중이면 기록 프레임을, 아니면 라이브 상태를 화면에 쓴다.
  const frame = replay.active ? replayFramesRef.current[replay.idx] : undefined;
  const viewConveyances = frame ? frame.conveyances : conveyances;
  const viewShipments = frame ? frame.shipments : shipments;
  const viewAlerts = frame ? frame.alerts : alerts;
  const viewMeta = frame ? frame.meta : meta;

  // 공통 필터(§8) — 모드·상태·우선순위.
  const matchesFilter = (modeV: Mode, status: string, priority: number, atRisk: boolean): boolean => {
    if (!filters.modes.has(modeV)) return false;
    if (filters.expediteOnly && priority !== 3) return false;
    if (filters.status === 'IN_TRANSIT' && !(status === 'IN_TRANSIT' || status === 'DELAYED')) return false;
    if (filters.status === 'AT_HUB' && !(status === 'AT_HUB' || status === 'CUSTOMS_HOLD')) return false;
    if (filters.status === 'RISK' && !atRisk) return false;
    return true;
  };

  // 권역 드릴다운 + 공통 필터 동기화(§4/§8).
  const inRegion = mode === 'REGION' && region !== null;
  const visibleHubs = inRegion ? HUBS.filter((h) => h.region === region) : HUBS;
  const visibleLanes = inRegion ? lanes.filter((l) => l.fromRegion === region || l.toRegion === region) : lanes;
  const visibleConveyances = viewConveyances.filter((c) => {
    if (!filters.modes.has(c.mode)) return false;
    if (inRegion) return c.region === region;
    // 글로브 모드: 지구 뒤편(뒷면 반구)은 어차피 가려지므로 버퍼에서 제외(§10 컬링).
    return withinHemisphere(c.lon, c.lat, viewState.longitude, viewState.latitude);
  });
  renderedCountRef.current = visibleConveyances.length;

  // deck.gl binary attributes — 수천 객체의 accessor 루프를 typed array로 대체(§10).
  const conveyanceBinary = useMemo(() => {
    const n = visibleConveyances.length;
    const positions = new Float32Array(n * 2);
    const colors = new Uint8Array(n * 3);
    for (let i = 0; i < n; i += 1) {
      const c = visibleConveyances[i]!;
      positions[i * 2] = c.lon;
      positions[i * 2 + 1] = c.lat;
      const col = MODE_COLOR[c.mode];
      colors[i * 3] = col[0];
      colors[i * 3 + 1] = col[1];
      colors[i * 3 + 2] = col[2];
    }
    return { length: n, attributes: { getPosition: { value: positions, size: 2 }, getFillColor: { value: colors, size: 3 } } };
  }, [visibleConveyances]);
  const filteredShipments = viewShipments.filter(
    (s) => (!inRegion || s.legs.some((l) => HUB_REGION[l.to] === region || HUB_REGION[l.from] === region)) &&
      matchesFilter(s.mode, s.status, s.priority, s.atRisk),
  );
  const selected = viewShipments.find((s) => s.id === selectedId) ?? null;

  const layers = [
    // 바다/지구 구 — 글로브 모드에서만(뒤쪽 반구 지형을 가려 준다).
    mode === 'GLOBE'
      ? new SimpleMeshLayer<number>({
          id: 'earth-sphere',
          data: [0],
          mesh: new SphereGeometry({ radius: EARTH_RADIUS_METERS, nlat: 36, nlong: 72 }),
          coordinateSystem: COORDINATE_SYSTEM.CARTESIAN,
          getPosition: () => [0, 0, 0],
          getColor: [11, 26, 43],
        })
      : null,
    // 국가 경계(육지) — 지역 모드에서는 2D 베이스맵 역할.
    new GeoJsonLayer({
      id: 'countries',
      data: COUNTRIES_URL,
      stroked: true,
      filled: true,
      getFillColor: [23, 46, 71],
      getLineColor: [58, 104, 146],
      getLineWidth: 1,
      lineWidthUnits: 'pixels',
    }),
    // 대권항로 레인(드릴다운 시 권역 접점 레인만).
    new ArcLayer<LaneRow>({
      id: 'lanes',
      data: visibleLanes,
      greatCircle: true,
      getSourcePosition: (d) => d.from,
      getTargetPosition: (d) => d.to,
      getSourceColor: (d) => MODE_COLOR[d.mode],
      getTargetColor: (d) => MODE_COLOR[d.mode],
      getWidth: 1.6,
      widthUnits: 'pixels',
      pickable: true,
    }),
    // 허브 노드(드릴다운 시 권역 허브만).
    new ScatterplotLayer<Hub>({
      id: 'hubs',
      data: visibleHubs,
      getPosition: (d) => [d.lon, d.lat],
      getRadius: (d) => (inRegion ? 5 + d.dwellCap / 10 : 3 + d.dwellCap / 12),
      radiusUnits: 'pixels',
      getFillColor: (d) => HUB_COLOR[d.kind],
      stroked: true,
      getLineColor: [8, 16, 26],
      lineWidthUnits: 'pixels',
      getLineWidth: 1,
      pickable: true,
    }),
    // 실시간 운송수단 — deck.gl binary attributes(§10). 컬링 후 보이는 수에 비례.
    new ScatterplotLayer({
      id: 'conveyances',
      data: conveyanceBinary,
      getRadius: inRegion ? 3.2 : 2.2,
      radiusUnits: 'pixels',
    }),
  ];

  const lod = lodForSession({ mode, region, view: viewState });
  const activeView = mode === 'GLOBE' ? new GlobeView({ id: 'globe' }) : new MapView({ id: 'map', repeat: true });
  const regionName = region ? REGIONS.find((r) => r.id === region)?.name ?? region : null;
  const stats = viewMeta?.shipments ?? null;
  const rules: { id: RoutingRule; label: string }[] = [
    { id: 'FASTEST_ETA', label: '최단 ETA' },
    { id: 'FEWEST_TRANSFERS', label: '최소 환적' },
    { id: 'LOWEST_COST', label: '최저 비용' },
  ];
  const scenarioDefs: { id: ScenarioKind; label: string }[] = [
    { id: 'congestion', label: '항만 혼잡' },
    { id: 'canalClosure', label: '운하 폐쇄' },
    { id: 'weather', label: '기상 회피' },
    { id: 'customs', label: '통관 급증' },
    { id: 'surge', label: '수요 서지' },
  ];
  const activeScenarios = viewMeta?.scenarios ?? [];
  const demo = viewMeta?.demo ?? null;
  const replayFrames = replayFramesRef.current;

  return (
    <div className="globe-host">
      <DeckGL
        views={activeView}
        viewState={viewState}
        controller
        onViewStateChange={(e) => setViewState((v) => ({ ...v, ...(e.viewState as Partial<GlobeViewState>) }))}
        onInteractionStateChange={(s) => {
          // 사용자가 끌기/줌을 시작하면 자동 회전을 끈다.
          if (s.isDragging || s.isZooming) setAutoRotate(false);
        }}
        layers={layers}
        getTooltip={({ object }) => {
          if (!object) return null;
          if ('kind' in object) return `${object.name} · ${object.kind} · dwellCap ${object.dwellCap}`;
          if ('mode' in object && 'speed' in object) return `${object.id} · ${object.mode} · ${object.speed}km/h → ${object.laneTo}`;
          if ('label' in object) return String(object.label);
          return null;
        }}
        style={{ position: 'absolute', inset: '0' }}
      />
      <div className="map-lod">
        {mode === 'REGION' && regionName ? `${regionName} · ` : ''}
        LOD <span>{lodLabel(lod)}</span> · zoom {viewState.zoom.toFixed(1)}
      </div>

      {/* 권역 드릴다운 / 글로브 복귀 (단계 4) */}
      <div className="region-switch">
        {mode === 'REGION' ? (
          <button type="button" className="region-chip back" onClick={backToGlobe}>
            ← 글로브
          </button>
        ) : (
          <>
            <span className="region-kicker">권역 드릴다운</span>
            {REGIONS.map((r) => (
              <button key={r.id} type="button" className="region-chip" onClick={() => drillToRegion(r.id)}>
                {r.name}
              </button>
            ))}
          </>
        )}
      </div>
      <div
        className="map-live"
        data-testid="map-live"
        data-rendered-conveyances={visibleConveyances.length}
        data-conveyances={viewMeta?.count ?? viewConveyances.length}
      >
        운송수단 <span>{viewMeta?.count ?? viewConveyances.length}</span> · 추적 화물 <span>{stats?.active ?? viewShipments.length}</span>
        {replay.active ? ' · ◼ REPLAY' : viewMeta ? ` · ${viewMeta.running ? '● LIVE' : '❚❚ PAUSED'} · ${viewMeta.rateHz}Hz` : ' · 연결 중…'}
        {viewMeta ? ` · ${fmtClock(viewMeta.simTime)}` : ''}
        {demo ? ` · 데모 ${demo.elapsedSec}s · ${demo.phase}` : ''}
      </div>
      {sourceError && <div className="source-error">실시간 연결 확인 필요 · {sourceError}</div>}
      {mode === 'GLOBE' && (
        <button
          type="button"
          className={`rotate-toggle${autoRotate ? ' on' : ''}`}
          onClick={() => setAutoRotate((v) => !v)}
        >
          {autoRotate ? '⏸ 회전 정지' : '▶ 자동 회전'}
        </button>
      )}

      {/* Executive KPI (단계 3 — meta 집계) */}
      {stats && (
        <div className="exec-kpi">
          <div className="exec-kpi-head">
            Executive KPI
            <em>on-time {stats.onTimePct}%</em>
          </div>
          <ul>
            <li><b>{stats.inTransit}</b><span>운송 중</span></li>
            <li><b>{stats.atHub}</b><span>환적 대기</span></li>
            <li className={stats.delayed ? 'warn' : ''}><b>{stats.delayed}</b><span>SLA 위험</span></li>
            <li className={stats.customsHold ? 'warn' : ''}><b>{stats.customsHold}</b><span>통관 보류</span></li>
            <li><b>{stats.delivered}</b><span>완료(누적)</span></li>
            <li className={stats.exceptions ? 'bad' : ''}><b>{stats.exceptions}</b><span>예외(누적)</span></li>
          </ul>
          <div className="rule-switch">
            <span>라우팅</span>
            {rules.map((r) => (
              <button
                key={r.id}
                type="button"
                className={`rule-chip${viewMeta?.rule === r.id ? ' active' : ''}`}
                onClick={() => sourceRef.current?.setRule(r.id)}
              >
                {r.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* 우측 레일 — 화물 선택 시 상세 Drawer, 아니면 알람 패널 */}
      {selected ? (
        <div className="drawer">
          <div className="drawer-head">
            <div>
              <strong>{selected.id}</strong>
              <small>
                {selected.originHub} → {selected.destHub} · {selected.priority === 3 ? 'EXPEDITE' : `P${selected.priority}`}
              </small>
            </div>
            <button type="button" className="drawer-close" onClick={() => setSelectedId(null)}>✕</button>
          </div>
          <div className={`drawer-status ${selected.atRisk ? 'risk' : ''}`}>
            {STATUS_LABEL[selected.status] ?? selected.status}
            {selected.atHub ? ` · ${selected.atHub}` : ''}
            <span>{selected.atRisk ? 'SLA 위험' : '정상'}</span>
          </div>
          <div className="drawer-eta">
            <div><small>누적 ETA</small><b>{fmtClock(selected.etaFinal)}</b></div>
            <div><small>SLA 기한</small><b className={selected.atRisk ? 'risk' : ''}>{fmtClock(selected.slaDue)}</b></div>
          </div>
          <div className="drawer-legs-title">leg 타임라인</div>
          <ol className="drawer-legs">
            {selected.legs.map((l, i) => (
              <li key={i} className={l.done ? 'done' : l.active ? 'active' : ''}>
                <i className="leg-dot" />
                <span className="leg-mode">{MODE_LABEL[l.mode]}</span>
                <span className="leg-route">{l.from} → {l.to}</span>
              </li>
            ))}
          </ol>
          {/* 2단계 확인 조치(§8) */}
          <div className="drawer-actions">
            {confirmAction && confirmAction.id === selected.id ? (
              <div className="confirm-box">
                <span>{confirmAction.kind === 'expedite' ? 'Expedite 승격' : '현재 허브 기준 재경로'} 실행할까요?</span>
                <div className="confirm-btns">
                  <button
                    type="button"
                    className="confirm yes"
                    onClick={() => {
                      if (confirmAction.kind === 'expedite') sourceRef.current?.promoteExpedite(selected.id);
                      else sourceRef.current?.rerouteShipment(selected.id);
                      setConfirmAction(null);
                    }}
                  >
                    확인
                  </button>
                  <button type="button" className="confirm no" onClick={() => setConfirmAction(null)}>취소</button>
                </div>
              </div>
            ) : (
              <>
                <button
                  type="button"
                  className="action-btn"
                  disabled={selected.priority === 3}
                  onClick={() => setConfirmAction({ kind: 'expedite', id: selected.id })}
                >
                  ★ Expedite 승격
                </button>
                <button
                  type="button"
                  className="action-btn"
                  onClick={() => setConfirmAction({ kind: 'reroute', id: selected.id })}
                >
                  ↻ 재경로 지시
                </button>
              </>
            )}
          </div>
        </div>
      ) : (
        <div className="alert-panel">
          <div className="alert-head">
            라이브 알람 <span>{viewAlerts.length}</span>
          </div>
          {viewAlerts.length === 0 ? (
            <p className="alert-empty">활성 알람 없음</p>
          ) : (
            <ul>
              {viewAlerts.slice(0, 6).map((a) => (
                <li key={a.id} className={`alert-item ${a.severity}`}>
                  <i className={`alert-bar ${a.severity}`} />
                  <div className="alert-body">
                    <strong>{a.title}</strong>
                    <small>{a.detail}</small>
                  </div>
                  {a.status === 'ACKNOWLEDGED' ? (
                    <span className="alert-ack">ACK</span>
                  ) : (
                    <button type="button" className="alert-ackbtn" onClick={() => sourceRef.current?.ackAlert(a.id)}>
                      확인
                    </button>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {/* 화물 목록 + 공통 필터 + 역할/감사 + 진단 (좌측 레일, 단계 6~7) */}
      <div className="ops-left">
        {/* 역할 선택기(연동 경계, 단계 7) */}
        <div className="role-switch">
          <span className="role-kicker">역할</span>
          {(['viewer', 'dispatcher', 'supervisor'] as Role[]).map((r) => (
            <button
              key={r}
              type="button"
              className={`role-chip${role === r ? ' active' : ''}`}
              onClick={() => changeRole(r)}
            >
              {r === 'viewer' ? '조회' : r === 'dispatcher' ? '배차' : '감독'}
            </button>
          ))}
        </div>
        {/* 함대 규모 선택기(§10 성능 — setCount) */}
        <div className="fleet-switch">
          <span className="role-kicker">함대</span>
          {[40, 500, 1000, 2000, 5000].map((n) => (
            <button
              key={n}
              type="button"
              className={`fleet-chip${viewMeta?.count === n ? ' active' : ''}`}
              onClick={() => sourceRef.current?.setCount(n)}
            >
              {n >= 1000 ? `${n / 1000}k` : n}
            </button>
          ))}
        </div>
        <div className="filter-bar">
          <div className="filter-row">
            {ALL_MODES.map((m) => (
              <button
                key={m}
                type="button"
                className={`filter-chip${filters.modes.has(m) ? ' on' : ''}`}
                onClick={() =>
                  setFilters((f) => {
                    const modes = new Set(f.modes);
                    if (modes.has(m)) modes.delete(m);
                    else modes.add(m);
                    return { ...f, modes };
                  })
                }
              >
                {MODE_LABEL[m]}
              </button>
            ))}
          </div>
          <div className="filter-row">
            {(['ALL', 'IN_TRANSIT', 'AT_HUB', 'RISK'] as StatusFilter[]).map((st) => (
              <button
                key={st}
                type="button"
                className={`filter-chip${filters.status === st ? ' on' : ''}`}
                onClick={() => setFilters((f) => ({ ...f, status: st }))}
              >
                {st === 'ALL' ? '전체' : st === 'IN_TRANSIT' ? '운송' : st === 'AT_HUB' ? '환적' : '위험'}
              </button>
            ))}
            <button
              type="button"
              className={`filter-chip${filters.expediteOnly ? ' on' : ''}`}
              onClick={() => setFilters((f) => ({ ...f, expediteOnly: !f.expediteOnly }))}
            >
              Expedite
            </button>
          </div>
        </div>
        <div className="ship-list-head">화물 <span>{filteredShipments.length}</span></div>
        <ul className="ship-list">
          {filteredShipments.slice(0, 60).map((s) => (
            <li key={s.id}>
              <button
                type="button"
                className={`ship-row${selectedId === s.id ? ' sel' : ''}`}
                onClick={() => setSelectedId(s.id)}
              >
                <i className={`ship-dot ${s.atRisk ? 'risk' : s.status === 'AT_HUB' || s.status === 'CUSTOMS_HOLD' ? 'hub' : 'ok'}`} />
                <span className="ship-id">{s.id}{s.priority === 3 ? ' ★' : ''}</span>
                <span className="ship-route">{s.originHub}→{s.destHub}</span>
                <span className="ship-status">{STATUS_LABEL[s.status] ?? s.status}</span>
              </button>
            </li>
          ))}
        </ul>
        <button type="button" className={`diag-toggle${diag ? ' on' : ''}`} onClick={() => setDiag((v) => !v)}>
          진단 {diag ? '▲' : '▼'}
        </button>
        {diag && (
          <div className="diag-panel">
            <div><small>FPS</small><b>{diagData.fps}</b></div>
            <div><small>msg/s</small><b>{diagData.msgS}</b></div>
            <div><small>upd/s</small><b>{diagData.updS}</b></div>
            <div><small>coalesced</small><b>{diagData.coalesced}%</b></div>
            <div><small>resync</small><b>{diagData.resync}</b></div>
            <div><small>렌더</small><b>{diagData.rendered}</b></div>
            <div><small>heap MB</small><b>{diagData.heapMb || 'n/a'}</b></div>
          </div>
        )}
        {/* 감사 타임라인(단계 7) */}
        <div className="audit-head">감사 로그</div>
        <ul className="audit-list">
          {audit.length === 0 ? (
            <li className="audit-empty">기록 없음</li>
          ) : (
            [...audit].slice(-5).reverse().map((a) => (
              <li key={a.id} className={`audit-item ${a.outcome === 'ACCEPTED' ? 'ok' : 'rej'}`}>
                <i className="audit-dot" />
                <div className="audit-body">
                  <strong>{a.detail}</strong>
                  <small>{a.actor.role} · {a.outcome === 'ACCEPTED' ? '승인' : `거부(${a.code})`}</small>
                </div>
              </li>
            ))
          )}
        </ul>
      </div>

      {/* 이력 재생 바 (단계 6) */}
      <div className="replay-bar">
        {!replay.active ? (
          <button type="button" className="replay-btn" onClick={enterReplay} disabled={replayFrames.length === 0 && recordingRef.current.length === 0}>
◀ 이력 재생
          </button>
        ) : (
          <>
            <button type="button" className="replay-btn" onClick={() => setReplay((r) => ({ ...r, speed: r.speed >= 4 ? 1 : r.speed * 2 }))}>
              {replay.speed}×
            </button>
            <input
              type="range"
              className="replay-seek"
              min={0}
              max={Math.max(0, replayFrames.length - 1)}
              value={replay.idx}
              onChange={(e) => setReplay((r) => ({ ...r, idx: Number(e.target.value) }))}
            />
            <span className="replay-pos">{replay.idx + 1}/{replayFrames.length}</span>
            <button type="button" className="replay-btn live" onClick={exitReplay}>● LIVE 복귀</button>
          </>
        )}
      </div>

      {/* 시나리오 바 (단계 5 — fault injection + 자동 데모) */}
      <div className="scenario-bar">
        <span className="scenario-kicker">시나리오</span>
        {scenarioDefs.map((sc) => {
          const on = activeScenarios.includes(sc.id);
          return (
            <button
              key={sc.id}
              type="button"
              className={`scenario-chip${on ? ' on' : ''}`}
              disabled={!!demo}
              onClick={() => sourceRef.current?.inject(sc.id, !on)}
            >
              {sc.label}
            </button>
          );
        })}
        <button
          type="button"
          className="scenario-chip reset"
          disabled={!!demo}
          onClick={() => sourceRef.current?.inject('reset', true)}
        >
          초기화
        </button>
        <button
          type="button"
          className={`scenario-chip demo${demo ? ' on' : ''}`}
          onClick={() => sourceRef.current?.setDemo(!demo)}
        >
          {demo ? '■ 데모 정지' : '▶ 자동 데모'}
        </button>
      </div>

      <div className="map-legend">
        <span><i style={{ background: 'rgb(86,168,255)' }} /> PORT / SEA</span>
        <span><i style={{ background: 'rgb(174,156,255)' }} /> AIRPORT / AIR</span>
        <span><i style={{ background: 'rgb(61,213,152)' }} /> RAIL</span>
        <span><i style={{ background: 'rgb(243,165,74)' }} /> DC / ROAD</span>
      </div>
    </div>
  );
}
