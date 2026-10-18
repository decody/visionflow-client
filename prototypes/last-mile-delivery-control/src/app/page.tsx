'use client';

import { OverlayScrollbarsComponent } from 'overlayscrollbars-react';
import { useEffect, useMemo, useRef, useState } from 'react';

import type {
  AlertStatus,
  AuditEntry,
  CommandType,
  Courier,
  CourierStatus,
  DispatchRule,
  OrderLifecycle,
  Role,
  ScenarioKind,
} from '@/entities/delivery/types';
import { DeliveryMap, type MapRider } from '@/features/map/delivery-map';
import { zones } from '@/shared/map/seoul-layout';
import { createRealtimeSource } from '@/shared/realtime/create-source';
import type {
  AlertWire,
  OrderWire,
  RealtimeSource,
  RiderWire,
  ScenarioMeta,
  SignalWire,
  SourceMetrics,
} from '@/shared/realtime/types';
import { zoneSummary } from '@/shared/stats/zone-kpi';

const statusLabel: Record<CourierStatus, string> = {
  DELIVERING: '배송 중',
  PICKUP: '픽업 중',
  IDLE: '대기',
  DELAYED: '지연',
  CHARGING: '충전',
};

const dockLabel: Record<NonNullable<RiderWire['dock']>, string> = {
  APPROACHING: '접근 중',
  QUEUED: '슬롯 대기',
  DOCKED: '정차',
  HANDOFF: '인수·인계',
  RELEASING: '출차',
};

const orderStatusLabel: Record<OrderLifecycle, string> = {
  QUEUED: '대기',
  ASSIGNED: '배차',
  TO_PICKUP: '집화 이동',
  PICKED_UP: '집화 완료',
  DELIVERING: '배송 중',
  DELIVERED: '완료',
  DELAYED: '지연',
  FAILED: '실패',
};

// 생명주기를 기존 .order-state 색상 버킷(green/orange/red/grey)에 매핑한다.
const orderStateClass: Record<OrderLifecycle, string> = {
  QUEUED: 'ready',
  ASSIGNED: '',
  TO_PICKUP: '',
  PICKED_UP: '',
  DELIVERING: '',
  DELIVERED: 'completed',
  DELAYED: 'delayed',
  FAILED: 'delayed',
};

// 파이프라인 가시성: 지연·대기를 위로, 완료·실패를 아래로.
const orderRank: Record<OrderLifecycle, number> = {
  DELAYED: 0,
  QUEUED: 1,
  DELIVERING: 2,
  PICKED_UP: 3,
  TO_PICKUP: 4,
  ASSIGNED: 5,
  DELIVERED: 6,
  FAILED: 7,
};

const rules: DispatchRule[] = ['FASTEST_ETA', 'NEAREST', 'FIFO'];
const ruleLabel: Record<DispatchRule, string> = {
  FASTEST_ETA: 'ETA 최소',
  NEAREST: '최근접',
  FIFO: '선입선출',
};

const alertStatusLabel: Record<AlertStatus, string> = {
  OPEN: '미확인',
  ACKNOWLEDGED: '확인',
  RESOLVED: '복구',
};

const inflightStatus = new Set<OrderLifecycle>(['ASSIGNED', 'TO_PICKUP', 'PICKED_UP', 'DELIVERING']);
const zoneNames = zones.map((z) => z.name);
const replaySpeeds = [1, 2, 4] as const;
type ReplaySpeed = (typeof replaySpeeds)[number];
const HISTORY_MAX = 600; // 약 60초(10Hz) 이력 버퍼
const fleetSizes = [40, 500, 1000, 2000, 5000] as const; // 단계 7: 함대 규모 전환

type PendingAction =
  | { type: 'reassign'; label: string; target: string; impact: string; riderId: string }
  | { type: 'contactCourier'; label: string; target: string; impact: string; riderId: string }
  | { type: 'promoteExpress'; label: string; target: string; impact: string; orderId: string };
const LIST_CAP = 80; // 좌측 라이더 목록 렌더 상한(대규모 함대에서 DOM 폭증 방지)

// 패널 내부용 경량 오버레이 스크롤바 옵션(hover 시에만 표시).
const scrollOptions = {
  scrollbars: { theme: 'os-theme-light', autoHide: 'leave', autoHideDelay: 400 },
} as const;

const severityRank: Record<AlertWire['severity'], number> = { critical: 0, warning: 1, info: 2 };

// 단계 6: 연동 경계 — 역할 선택기와 감사 타임라인.
const roles: Role[] = ['viewer', 'dispatcher', 'supervisor'];
const authManagedRole = Boolean(process.env.NEXT_PUBLIC_WS_TOKEN);
const roleLabel: Record<Role, string> = {
  viewer: '조회',
  dispatcher: '배차',
  supervisor: '감독',
  system: '시스템',
};
const actionLabel: Record<CommandType, string> = {
  snapshot: '스냅샷 요청',
  start: '시작',
  stop: '일시정지',
  setCount: '라이더 수 변경',
  setRule: '배차 규칙 변경',
  ackAlert: '알람 확인',
  demo: '자동 데모',
  reassign: '재배차 요청',
  contactCourier: '라이더 연락',
  promoteExpress: '특급 승격',
  inject: '시나리오 주입',
};

/** 감사 항목 → 운영 조치 바 한 줄 요약. */
function auditSummary(e: AuditEntry): string {
  const who = `${roleLabel[e.actor.role]}/${e.actor.id}`;
  const verb = e.outcome === 'accepted' ? '승인' : '거부';
  const why = e.outcome === 'rejected' && e.reason ? ` · ${e.reason}` : '';
  return `${e.detail} · ${who} · ${verb}${why}`;
}

/** 감사 ts(ms) → HH:MM:SS. */
function auditTime(ts: number): string {
  return new Date(ts).toLocaleTimeString('ko-KR', { hour12: false });
}

/** 이력 재생용 프레임 — 한 틱의 materialized 뷰. */
interface Frame {
  tick: number;
  riders: RiderWire[];
  orders: OrderWire[];
  alerts: AlertWire[];
  signals: SignalWire[];
  meta: ScenarioMeta | null;
  audit: AuditEntry[];
}

interface Diag {
  fps: number;
  msgRate: number;
  updRate: number;
  coalesced: number;
  resync: number;
  heapMB: number | null;
}

/** 알람 경과(초) → 사람이 읽기 쉬운 상대 시각. */
function ageLabel(sec: number): string {
  if (sec < 60) return `${sec}초 전`;
  return `${Math.floor(sec / 60)}분 전`;
}

function toCourier(rider: RiderWire): Courier {
  return {
    id: rider.id,
    name: rider.name,
    status: rider.status,
    zone: rider.zone,
    completed: rider.completed,
    total: rider.total,
    eta: rider.status === 'IDLE' || rider.status === 'CHARGING' ? statusLabel[rider.status] : `${rider.etaMin}분`,
  };
}

export default function DeliveryControlPage() {
  const [riders, setRiders] = useState<RiderWire[]>([]);
  const [orders, setOrders] = useState<OrderWire[]>([]);
  const [alerts, setAlerts] = useState<AlertWire[]>([]);
  const [signals, setSignals] = useState<SignalWire[]>([]);
  const [meta, setMeta] = useState<ScenarioMeta | null>(null);
  const [audit, setAudit] = useState<AuditEntry[]>([]);
  const [role, setRoleState] = useState<Role>('supervisor');
  const [selectedStatus, setSelectedStatus] = useState<'ALL' | CourierStatus>('ALL');
  const [selectedZone, setSelectedZone] = useState('');
  const [selectedId, setSelectedId] = useState('');
  const [rule, setRule] = useState<DispatchRule>('FASTEST_ETA');
  const [paused, setPaused] = useState(false);
  const [fleetSize, setFleetSize] = useState(40);
  const [visibleOnMap, setVisibleOnMap] = useState(0);
  const [actionMessage, setActionMessage] = useState('대기 중인 운영 조치가 없습니다.');
  const [pendingAction, setPendingAction] = useState<PendingAction | null>(null);
  // 이력 재생
  const [frameCount, setFrameCount] = useState(0);
  const [replayActive, setReplayActive] = useState(false);
  const [replayIndex, setReplayIndex] = useState(0);
  const [replayLen, setReplayLen] = useState(0);
  const [speed, setSpeed] = useState<ReplaySpeed>(1);
  // 개발 진단
  const [showDiag, setShowDiag] = useState(false);
  const [diag, setDiag] = useState<Diag | null>(null);

  const sourceRef = useRef<RealtimeSource | null>(null);
  const historyRef = useRef<Frame[]>([]);
  const replayFramesRef = useRef<Frame[]>([]);
  const lastTickRef = useRef<number>(-1);
  const lastAuditIdRef = useRef<string>('');

  // 실시간 소스(Web Worker 또는 ws 소켓) 구독. 라이더·주문·알람을 id 기준으로 누적한다.
  useEffect(() => {
    const ridersById = new Map<string, RiderWire>();
    const ordersById = new Map<string, OrderWire>();
    const alertsById = new Map<string, AlertWire>();
    const signalsById = new Map<string, SignalWire>();
    let curSignals: SignalWire[] = [];
    let curMeta: ScenarioMeta | null = null;
    let curAudit: AuditEntry[] = [];
    const source = createRealtimeSource({
      count: 40,
      rateHz: 10,
      rule: 'FASTEST_ETA',
      onError: (message) => setActionMessage(`실시간 소스 오류: ${message}`),
      onBatch: (batch) => {
        if (batch.snapshot) {
          ridersById.clear();
          for (const r of batch.snapshot) ridersById.set(r.id, r);
        }
        if (batch.additions) for (const r of batch.additions) ridersById.set(r.id, r);
        for (const u of batch.updates) ridersById.set(u.id, u);
        if (batch.deletions) for (const id of batch.deletions) ridersById.delete(id);
        const nextRiders = [...ridersById.values()].sort((a, b) => a.id.localeCompare(b.id));
        setRiders(nextRiders);

        if (batch.orders) {
          ordersById.clear();
          for (const o of batch.orders) ordersById.set(o.id, o);
        }
        if (batch.orderAdditions) for (const o of batch.orderAdditions) ordersById.set(o.id, o);
        for (const u of batch.orderUpdates) ordersById.set(u.id, u);
        if (batch.orderDeletions) for (const id of batch.orderDeletions) ordersById.delete(id);
        const nextOrders = [...ordersById.values()];
        setOrders(nextOrders);

        if (batch.alerts) {
          alertsById.clear();
          for (const a of batch.alerts) alertsById.set(a.id, a);
        }
        if (batch.alertAdditions) for (const a of batch.alertAdditions) alertsById.set(a.id, a);
        for (const u of batch.alertUpdates) alertsById.set(u.id, u);
        if (batch.alertDeletions) for (const id of batch.alertDeletions) alertsById.delete(id);
        const nextAlerts = [...alertsById.values()];
        setAlerts(nextAlerts);

        // 신호 채널: 스냅샷은 전체 교체, 델타는 flip된 것만 최신으로.
        let signalsChanged = false;
        if (batch.signals) {
          signalsById.clear();
          for (const s of batch.signals) signalsById.set(s.id, s);
          signalsChanged = true;
        }
        for (const s of batch.signalUpdates) {
          signalsById.set(s.id, s);
          signalsChanged = true;
        }
        if (signalsChanged) {
          curSignals = [...signalsById.values()];
          setSignals(curSignals);
        }

        if (batch.meta) {
          curMeta = batch.meta;
          setMeta(batch.meta);
        }

        // 감사 로그(연동 경계): 전체 목록 갱신 + 최신 항목을 운영 조치 바에 반영.
        if (batch.audit) {
          curAudit = batch.audit;
          setAudit(batch.audit);
          const last = batch.audit[batch.audit.length - 1];
          if (last && last.id !== lastAuditIdRef.current) {
            lastAuditIdRef.current = last.id;
            setActionMessage(auditSummary(last));
          }
        }

        // 틱이 전진했을 때만 이력 프레임을 적재한다(rAF 과적재 방지).
        if (typeof batch.tick === 'number' && batch.tick !== lastTickRef.current) {
          lastTickRef.current = batch.tick;
          const hist = historyRef.current;
          hist.push({ tick: batch.tick, riders: nextRiders, orders: nextOrders, alerts: nextAlerts, signals: curSignals, meta: curMeta, audit: curAudit });
          if (hist.length > HISTORY_MAX) hist.shift();
          setFrameCount(hist.length);
        }
      },
    });
    sourceRef.current = source;
    source.start();
    return () => {
      source.dispose();
      sourceRef.current = null;
    };
  }, []);

  // 이력 재생 진행: 활성 상태에서 base 10fps × speed로 프레임을 전진, 끝에서 LIVE 복귀.
  useEffect(() => {
    if (!replayActive) return;
    const iv = setInterval(() => {
      setReplayIndex((i) => {
        const next = i + 1;
        if (next >= replayFramesRef.current.length) {
          setReplayActive(false); // 최신까지 따라잡음 → LIVE
          return i;
        }
        return next;
      });
    }, Math.max(16, Math.round(100 / speed)));
    return () => clearInterval(iv);
  }, [replayActive, speed]);

  // 개발 진단: FPS는 rAF로 집계, 나머지는 1초마다 소스 카운터 차분으로 rate 계산.
  useEffect(() => {
    if (!showDiag) return;
    let frames = 0;
    let rafId = requestAnimationFrame(function tick() {
      frames += 1;
      rafId = requestAnimationFrame(tick);
    });
    const zero: SourceMetrics = { msgCount: 0, rawUpd: 0, drainedUpd: 0, batchCount: 0, resyncCount: 0 };
    let prev = sourceRef.current?.getMetrics() ?? zero;
    const iv = setInterval(() => {
      const m = sourceRef.current?.getMetrics() ?? prev;
      const dRaw = m.rawUpd - prev.rawUpd;
      const dDrain = m.drainedUpd - prev.drainedUpd;
      const coalesced = dRaw > 0 ? Math.max(0, Math.round((1 - dDrain / dRaw) * 100)) : 0;
      const mem = (performance as unknown as { memory?: { usedJSHeapSize: number } }).memory;
      setDiag({
        fps: frames,
        msgRate: m.msgCount - prev.msgCount,
        updRate: dDrain,
        coalesced,
        resync: m.resyncCount,
        heapMB: mem ? Math.round(mem.usedJSHeapSize / 1048576) : null,
      });
      frames = 0;
      prev = m;
    }, 1000);
    return () => {
      cancelAnimationFrame(rafId);
      clearInterval(iv);
    };
  }, [showDiag]);

  // 세션 역할 전환(연동 경계 시연). 역할을 낮추면 권한 밖 명령은 감사에 '거부'로 남는다.
  const changeRole = (next: Role) => {
    if (authManagedRole) {
      setActionMessage('현재 세션 역할은 WebSocket 인증 토큰으로 서버가 결정합니다.');
      return;
    }
    setRoleState(next);
    sourceRef.current?.setRole(next);
    setActionMessage(`세션 역할을 '${roleLabel[next]}'(으)로 전환했습니다. 권한 밖 명령은 거부·감사됩니다.`);
  };

  // 아래 조치들은 명령을 보내기만 한다. 승인/거부 결과는 감사 스트림으로 돌아와
  // 운영 조치 바와 감사 타임라인에 반영된다(meta를 낙관적으로 바꾸지 않는다).
  const changeRule = (next: DispatchRule) => {
    setRule(next);
    sourceRef.current?.setRule(next);
  };

  // 단계 7: 함대 규모 전환(엔진 재구성). 500~5,000대까지 즉시 전환해 성능을 시연한다.
  const changeFleet = (next: number) => {
    setFleetSize(next);
    sourceRef.current?.setCount(next);
    setActionMessage(`함대 규모를 ${next.toLocaleString()}대로 전환했습니다.`);
  };

  const toggleScenario = (kind: 'incident' | 'surge' | 'closure', on: boolean) => {
    sourceRef.current?.inject(kind, on);
  };

  const injectOnce = (kind: ScenarioKind) => {
    sourceRef.current?.inject(kind, true);
  };

  const toggleDemo = () => {
    sourceRef.current?.setDemo(!viewMeta?.demoActive);
  };

  const toggleComms = () => {
    const next = !paused;
    setPaused(next);
    sourceRef.current?.setPaused(next);
    if (!next) sourceRef.current?.requestSnapshot();
    setActionMessage(next ? '통신 단절 — 수신을 멈췄습니다.' : '통신 복구 — 스냅샷으로 재동기합니다.');
  };

  // --- 이력 재생 제어 ---
  const enterReplay = (index: number) => {
    const frames = [...historyRef.current];
    if (frames.length === 0) return;
    replayFramesRef.current = frames;
    setReplayLen(frames.length);
    setReplayIndex(Math.min(Math.max(0, index), frames.length - 1));
    setReplayActive(true);
  };
  const goLive = () => {
    setReplayActive(false);
    setActionMessage('LIVE 복귀 — 실시간 수신을 표시합니다.');
  };
  const togglePlay = () => {
    if (replayActive) setReplayActive(false);
    else enterReplay(replayFramesRef.current.length ? replayIndex : Math.max(0, historyRef.current.length - 30));
  };
  const onSeek = (value: number) => {
    // 재생 중이 아니어도 스크럽하면 이력 모드로 진입(일시정지 상태).
    const frames = replayActive ? replayFramesRef.current : [...historyRef.current];
    if (frames.length === 0) return;
    if (!replayActive) {
      replayFramesRef.current = frames;
      setReplayLen(frames.length);
      setReplayActive(true);
    }
    setReplayIndex(Math.min(value, frames.length - 1));
  };

  // 재생 중이면 이력 프레임을, 아니면 라이브 상태를 화면 소스로 쓴다.
  const replayFrame =
    replayActive && replayFramesRef.current.length
      ? replayFramesRef.current[Math.min(replayIndex, replayFramesRef.current.length - 1)]
      : undefined;
  const viewRiders = replayFrame ? replayFrame.riders : riders;
  const viewOrders = replayFrame ? replayFrame.orders : orders;
  const viewAlerts = replayFrame ? replayFrame.alerts : alerts;
  const viewMeta = replayFrame ? replayFrame.meta : meta;
  const viewAudit = replayFrame ? replayFrame.audit : audit;
  const viewSignals = replayFrame ? replayFrame.signals : signals;

  const allCouriers = useMemo(() => viewRiders.map(toCourier), [viewRiders]);
  const matchesFilter = (c: Courier) =>
    (selectedStatus === 'ALL' || c.status === selectedStatus) && (selectedZone === '' || c.zone === selectedZone);
  const visibleCouriers = useMemo(() => allCouriers.filter(matchesFilter), [allCouriers, selectedStatus, selectedZone]);
  const mapRiders = useMemo<MapRider[]>(
    () =>
      viewRiders
        .filter((r) => (selectedStatus === 'ALL' || r.status === selectedStatus) && (selectedZone === '' || r.zone === selectedZone))
        .map((r) => ({ id: r.id, status: r.status, lon: r.lon, lat: r.lat, heading: r.heading, route: r.route })),
    [viewRiders, selectedStatus, selectedZone],
  );
  const selected = allCouriers.find((c) => c.id === selectedId) ?? visibleCouriers[0] ?? allCouriers[0];
  const selectedWire = useMemo(() => viewRiders.find((r) => r.id === selected?.id), [viewRiders, selected]);
  const selectedOrder = useMemo(
    () => (selectedWire?.orderId ? viewOrders.find((o) => o.id === selectedWire.orderId) : undefined),
    [viewOrders, selectedWire],
  );

  // 단계 7: 추적선은 포커스된(선택된) 라이더에게만 스트리밍하도록 소스에 알린다.
  const focusedId = selected?.id ?? '';
  useEffect(() => {
    sourceRef.current?.setFocus(focusedId || null);
  }, [focusedId]);

  useEffect(() => {
    sourceRef.current?.setSubscription(selectedZone ? { zone: selectedZone } : {});
  }, [selectedZone]);

  const pipeline = useMemo(
    () =>
      viewOrders
        .filter((o) => selectedZone === '' || o.zone === selectedZone)
        .sort((a, b) => {
          const rank = orderRank[a.status] - orderRank[b.status];
          return rank !== 0 ? rank : b.waitMin - a.waitMin || a.id.localeCompare(b.id);
        }),
    [viewOrders, selectedZone],
  );

  const zoneKpis = useMemo(() => zoneSummary(zoneNames, viewRiders, viewOrders), [viewRiders, viewOrders]);

  const kpi = useMemo(() => {
    const delivering = viewRiders.filter((r) => r.status === 'DELIVERING').length;
    const charging = viewRiders.filter((r) => r.status === 'CHARGING').length;
    const queued = viewOrders.filter((o) => o.status === 'QUEUED').length;
    const inflight = viewOrders.filter((o) => inflightStatus.has(o.status)).length;
    const delayed = viewOrders.filter((o) => o.status === 'DELAYED').length;
    const completed = viewOrders.filter((o) => o.status === 'DELIVERED').length;
    const failed = viewOrders.filter((o) => o.status === 'FAILED').length;
    const batteryRisk = viewRiders.filter((r) => typeof r.battery === 'number' && r.battery <= 25).length;
    const queuedOrders = viewOrders.filter((o) => o.status === 'QUEUED');
    const avgWait = queuedOrders.length ? Math.round(queuedOrders.reduce((sum, o) => sum + o.waitMin, 0) / queuedOrders.length) : 0;
    const dispatchActions = audit.filter((entry) => entry.action === 'reassign' && entry.outcome === 'accepted').length;
    const slaBase = completed + failed + delayed;
    const sla = slaBase ? Math.round((completed / slaBase) * 100) : 100;
    const etas = viewRiders.filter((r) => r.status !== 'IDLE' && r.status !== 'CHARGING').map((r) => r.etaMin);
    const avgEta = etas.length ? Math.round(etas.reduce((a, b) => a + b, 0) / etas.length) : 0;
    return { active: viewRiders.length, delivering, charging, queued, inflight, delayed, avgEta, completed, failed, batteryRisk, avgWait, dispatchActions, sla };
  }, [audit, viewRiders, viewOrders]);

  const sortedAlerts = useMemo(
    () =>
      [...viewAlerts].sort((a, b) => {
        const open = Number(b.status === 'OPEN') - Number(a.status === 'OPEN');
        if (open !== 0) return open;
        const sev = severityRank[a.severity] - severityRank[b.severity];
        return sev !== 0 ? sev : b.ageSec - a.ageSec || a.id.localeCompare(b.id);
      }),
    [viewAlerts],
  );
  const openAlerts = viewAlerts.filter((a) => a.status === 'OPEN');

  const acknowledgeAlert = (alert: AlertWire) => {
    sourceRef.current?.ackAlert(alert.id);
  };
  const focusAlert = (alert: AlertWire) => {
    if (alert.riderId) setSelectedId(alert.riderId);
  };
  // 운영 조치 — 먼저 영향 범위를 확인하고, 두 번째 클릭에서 연동 경계를 통과한다.
  const requestReassign = () => {
    if (selected) {
      setPendingAction({
        type: 'reassign',
        label: '재배차 요청',
        target: `${selected.id} · ${selected.name}`,
        impact: selectedOrder ? `현재 주문 ${selectedOrder.id} · ETA ${selectedOrder.etaMin}분` : '현재 배정 주문 없음',
        riderId: selected.id,
      });
    }
  };
  const contactCourier = () => {
    if (selected) {
      setPendingAction({
        type: 'contactCourier',
        label: '라이더 연락',
        target: `${selected.id} · ${selected.name}`,
        impact: selectedOrder ? `현재 주문 ${selectedOrder.id} 진행 상황 확인` : '현재 배정 주문 없음',
        riderId: selected.id,
      });
    }
  };
  const promoteExpress = () => {
    if (selectedOrder && selectedOrder.priority !== 'EXPRESS') {
      setPendingAction({
        type: 'promoteExpress',
        label: '특급 승격',
        target: selectedOrder.id,
        impact: `현재 우선순위 NORMAL · ETA ${selectedOrder.etaMin}분`,
        orderId: selectedOrder.id,
      });
    }
  };
  const confirmPendingAction = () => {
    if (!pendingAction) return;
    if (pendingAction.type === 'reassign') sourceRef.current?.reassign(pendingAction.riderId);
    if (pendingAction.type === 'contactCourier') sourceRef.current?.contactCourier(pendingAction.riderId);
    if (pendingAction.type === 'promoteExpress') sourceRef.current?.promoteExpress(pendingAction.orderId);
    setActionMessage(`${pendingAction.label} 실행 요청을 전송했습니다. 승인·거부 결과는 감사 타임라인에 반영됩니다.`);
    setPendingAction(null);
  };
  const selectZone = (zone: string) => setSelectedZone((z) => (z === zone ? '' : zone));

  const incidentOn = viewMeta?.incident ?? false;
  const surgeOn = viewMeta?.surge ?? false;
  const closureOn = viewMeta?.closure ?? false;
  const demoOn = viewMeta?.demoActive ?? false;
  const sliderMax = Math.max(0, (replayActive ? replayLen : frameCount) - 1);
  const sliderValue = replayActive ? replayIndex : sliderMax;
  const replaySec = replayActive ? ((replayLen - 1 - replayIndex) / 10).toFixed(1) : '0.0';

  return (
    <main className="shell">
      <section className="operational-bar" aria-label="데이터 연결 상태">
        <h1 className="bar-title">Last-mile Delivery Control</h1>
        <span className="synthetic-note" title="실제 배송 플랫폼이 아닌 로컬 합성 시뮬레이션 · 지도는 OpenStreetMap 공개 도로망">Prototype #03 · 합성 데이터 · OSM 공개 도로망</span>
        <div className="connection">
          <span className={`connection-dot ${paused ? 'paused' : ''} ${replayActive ? 'replay' : ''}`} />
          <strong>{replayActive ? 'REPLAY' : paused ? 'PAUSED' : 'LIVE'}</strong>
          <small>Web Worker 시뮬레이터</small>
        </div>
        <div className="freshness"><span>활성 라이더</span><b>{kpi.active}</b><i>정상</i></div>
        <div className="freshness"><span>미배차</span><b>{kpi.queued}</b><i className={kpi.queued > 0 ? 'warn' : ''}>대기</i></div>
        <div className="freshness"><span>미확인 알람</span><b>{openAlerts.length}</b><i className={openAlerts.length > 0 ? 'warn' : ''}>{openAlerts.length > 0 ? '운영 확인 필요' : '정상'}</i></div>
        {demoOn && (
          <div className="demo-badge" aria-live="polite">
            <span className="demo-dot" />자동 데모 · {viewMeta?.demoLabel ?? '진행'}{typeof viewMeta?.demoSec === 'number' ? ` · ${viewMeta.demoSec}s` : ''}
          </div>
        )}
        <div className="role-switch fleet-switch" aria-label="함대 규모">
          <span className="role-kicker">함대</span>
          {fleetSizes.map((n) => (
            <button key={n} className={fleetSize === n ? 'role-chip active' : 'role-chip'} onClick={() => changeFleet(n)} title={`${n.toLocaleString()}대로 전환`}>
              {n >= 1000 ? `${n / 1000}k` : n}
            </button>
          ))}
        </div>
        <button className={`mode-badge diag-toggle ${showDiag ? 'on' : ''}`} onClick={() => setShowDiag((s) => !s)}>진단 {showDiag ? 'ON' : 'OFF'}</button>
        <div className="role-switch" aria-label="세션 역할">
          <span className="role-kicker">역할</span>
          {roles.map((r) => (
            <button key={r} disabled={authManagedRole} className={role === r ? 'role-chip active' : 'role-chip'} onClick={() => changeRole(r)} title={authManagedRole ? '서버 인증 토큰으로 역할이 결정됩니다' : `${roleLabel[r]} 권한으로 명령을 전송합니다`}>
              {roleLabel[r]}
            </button>
          ))}
        </div>
      </section>

      <section className="kpi-grid" aria-label="운영 KPI">
        <Kpi label="활성 라이더" value={String(kpi.active)} detail={`배송 ${kpi.delivering} · 충전 ${kpi.charging}`} tone="blue" />
        <Kpi label="진행 중 주문" value={String(kpi.inflight)} detail="집화·배송 수행 중" tone="green" />
        <Kpi label="미배차 대기" value={String(kpi.queued)} detail={`지연 ${kpi.delayed}건`} tone="orange" />
        <Kpi label="평균 ETA" value={`${kpi.avgEta}분`} detail="목표 20분" tone="violet" />
        <Kpi label="완료 배송" value={String(kpi.completed)} detail={`실패 ${kpi.failed}건`} tone="green" />
        <Kpi label="SLA 준수율" value={`${kpi.sla}%`} detail="완료·실패·지연 기준" tone="blue" />
        <Kpi label="평균 대기" value={`${kpi.avgWait}분`} detail="미배차 주문 기준" tone="orange" />
        <Kpi label="배터리 위험" value={String(kpi.batteryRisk)} detail={`재배차 ${kpi.dispatchActions}건`} tone="violet" />
      </section>

      <section className="zone-band" aria-label="권역별 현황">
        <button className={selectedZone === '' ? 'zone-card all active' : 'zone-card all'} onClick={() => setSelectedZone('')}>
          <span className="zone-name">전체 권역</span>
          <span className="zone-stat"><b>{kpi.active}</b> 라이더</span>
        </button>
        {zoneKpis.map((z) => (
          <button className={selectedZone === z.zone ? 'zone-card active' : 'zone-card'} key={z.zone} onClick={() => selectZone(z.zone)}>
            <span className="zone-name">{z.zone}</span>
            <span className="zone-stat"><b>{z.riders}</b> 라이더 · 배송 {z.delivering}</span>
            <span className="zone-badges">
              {z.delayed > 0 && <i className="zb delayed">지연 {z.delayed}</i>}
              {z.queued > 0 && <i className="zb queued">대기 {z.queued}</i>}
              {z.express > 0 && <i className="zb express">특급 {z.express}</i>}
            </span>
          </button>
        ))}
      </section>

      <section className="workspace">
        <aside className="panel left-panel">
          <div className="panel-heading"><div><span className="section-kicker">FLEET</span><h2>라이더 현황</h2></div><span className="count">{visibleCouriers.length}</span></div>
          {visibleCouriers.length > LIST_CAP && <div className="list-cap-note">상위 {LIST_CAP}명 표시 · 전체 {visibleCouriers.length.toLocaleString()}명 (필터·권역으로 좁히기)</div>}
          <div className="filter-row">
            {(['ALL', 'DELIVERING', 'DELAYED', 'CHARGING', 'IDLE'] as const).map((status) => (
              <button className={selectedStatus === status ? 'filter active' : 'filter'} key={status} onClick={() => setSelectedStatus(status)}>
                {status === 'ALL' ? '전체' : statusLabel[status]}
              </button>
            ))}
          </div>
          {selectedZone && <div className="zone-filter-note">권역 필터 · {selectedZone} <button onClick={() => setSelectedZone('')}>해제</button></div>}
          <OverlayScrollbarsComponent className="panel-scroll" defer options={scrollOptions}>
            <div className="courier-list">
              {visibleCouriers.slice(0, LIST_CAP).map((courier) => (
                <button className={selected?.id === courier.id ? 'courier selected' : 'courier'} key={courier.id} onClick={() => setSelectedId(courier.id)}>
                  <span className={`status-dot ${courier.status.toLowerCase()}`} />
                  <span className="courier-main"><strong>{courier.id}</strong><small>{courier.name} · {courier.zone}</small></span>
                  <span className="courier-progress">{courier.completed}/{courier.total}<small>{statusLabel[courier.status]}</small></span>
                </button>
              ))}
            </div>
          </OverlayScrollbarsComponent>
        </aside>

        <section className="map-panel" aria-label="배송 실시간 지도">
          <div className="map-toolbar">
            <span>GANGNAM · SEOUL DELIVERY NETWORK{selectedZone ? ` · ${selectedZone}` : ''}</span>
            <span className="map-tools">−　＋　⌖</span>
          </div>
          <div className="dispatch-bar" aria-label="배차 규칙">
            <span className="dispatch-kicker">배차 규칙</span>
            {rules.map((r) => (
              <button className={rule === r ? 'filter active' : 'filter'} key={r} onClick={() => changeRule(r)}>
                {ruleLabel[r]}
              </button>
            ))}
          </div>
          <div className="dispatch-bar scenario-bar" aria-label="시나리오 주입">
            <span className="dispatch-kicker">시나리오</span>
            <button className={incidentOn ? 'filter active' : 'filter'} onClick={() => toggleScenario('incident', !incidentOn)}>교통 정체</button>
            <button className={surgeOn ? 'filter active' : 'filter'} onClick={() => toggleScenario('surge', !surgeOn)}>수요 서지</button>
            <button className={closureOn ? 'filter active' : 'filter'} onClick={() => toggleScenario('closure', !closureOn)}>도로 통제</button>
            <button className="filter" onClick={() => injectOnce('battery')}>저배터리</button>
            <button className="filter" onClick={() => injectOnce('reset')}>초기화</button>
            <span className="bar-sep" />
            <button className={demoOn ? 'filter active' : 'filter'} onClick={toggleDemo}>자동 데모</button>
            <button className={paused ? 'filter active' : 'filter'} onClick={toggleComms}>{paused ? '통신 복구' : '통신 단절'}</button>
          </div>
          <div className="map-canvas">
            <DeliveryMap riders={mapRiders} selectedId={selected?.id ?? ''} onSelect={setSelectedId} focusZone={selectedZone} onVisibleCount={setVisibleOnMap} signals={viewSignals} closureActive={closureOn} hubSlots={viewMeta?.hubs} />
            <div className="map-legend"><span><i className="legend-delivering" /> 배송 중</span><span><i className="legend-pickup" /> 픽업 중</span><span><i className="legend-delayed" /> 지연</span><span><i className="legend-charging" /> 충전</span><span><i className="legend-idle" /> 대기</span><span><i style={{ background: '#3dd598', borderRadius: '50%' }} /> 신호</span><span><i style={{ background: '#ff5a5f', borderRadius: '50%' }} /> 통제</span></div>
            {showDiag && diag && (
              <div className="diag-panel" aria-label="개발 진단">
                <div className="diag-head">DIAGNOSTICS</div>
                <dl>
                  <div><dt>FPS</dt><dd>{diag.fps}</dd></div>
                  <div><dt>msg/s</dt><dd>{diag.msgRate}</dd></div>
                  <div><dt>upd/s</dt><dd>{diag.updRate}</dd></div>
                  <div><dt>coalesced</dt><dd>{diag.coalesced}%</dd></div>
                  <div><dt>resync</dt><dd>{diag.resync}</dd></div>
                  <div><dt>렌더(보이는/전체)</dt><dd>{visibleOnMap}/{viewRiders.length}</dd></div>
                  <div><dt>JS heap</dt><dd>{diag.heapMB !== null ? `${diag.heapMB}MB` : 'n/a'}</dd></div>
                  <div><dt>이력</dt><dd>{frameCount}f</dd></div>
                </dl>
              </div>
            )}
          </div>
          <div className="replay-bar" aria-label="이력 재생">
            <button className="replay-btn" onClick={togglePlay} disabled={frameCount === 0} aria-label={replayActive ? '일시정지' : '재생'}>
              {replayActive ? '⏸' : '⏵'}
            </button>
            <div className="replay-speeds">
              {replaySpeeds.map((s) => (
                <button key={s} className={speed === s ? 'speed active' : 'speed'} onClick={() => setSpeed(s)}>{s}×</button>
              ))}
            </div>
            <input
              className="replay-seek"
              type="range"
              min={0}
              max={sliderMax}
              value={Math.min(sliderValue, sliderMax)}
              onChange={(e) => onSeek(Number(e.target.value))}
              disabled={frameCount === 0}
              aria-label="이력 탐색"
            />
            <span className="replay-time">{replayActive ? `−${replaySec}s` : 'LIVE'}</span>
            <button className={replayActive ? 'replay-live' : 'replay-live on'} onClick={goLive} disabled={!replayActive}>LIVE</button>
          </div>
        </section>

        <aside className="panel right-panel">
          <OverlayScrollbarsComponent className="panel-scroll" defer options={scrollOptions}>
          <div className="panel-heading"><div><span className="section-kicker">INSPECTOR</span><h2>라이더 상세</h2></div>{selected && <span className={`pill ${selected.status.toLowerCase()}`}>{statusLabel[selected.status]}</span>}{selectedWire?.dock && <span className="pill" style={{ marginLeft: 6, background: '#243447', color: '#9fd0ff' }}>도킹 · {dockLabel[selectedWire.dock]}</span>}</div>
          {selected ? (
            <>
              <div className="profile"><div className="avatar">{selected.name.slice(0, 1)}</div><div><h3>{selected.id}</h3><p>{selected.name} · {selected.zone}</p></div></div>
              <div className="detail-grid"><div><small>오늘 배송</small><strong>{selected.completed}건</strong></div><div><small>남은 주문</small><strong>{Math.max(0, selected.total - selected.completed)}건</strong></div><div><small>예상 도착</small><strong>{selected.eta}</strong></div><div><small>현재 주문</small><strong>{selectedOrder ? `${selectedOrder.id.replace('ORD-', '#')} · ${orderStatusLabel[selectedOrder.status]}` : '없음'}</strong></div><div><small>방향(heading)</small><strong>{selectedWire ? `${selectedWire.heading}°` : '—'}</strong></div><div><small>좌표</small><strong>{selectedWire ? `${selectedWire.lat.toFixed(4)}, ${selectedWire.lon.toFixed(4)}` : '—'}</strong></div></div>
              {typeof selectedWire?.battery === 'number' && (
                <div className={`battery-row ${selectedWire.battery < 12 ? 'critical' : selectedWire.battery < 25 ? 'low' : ''}`}>
                  <small>배터리</small>
                  <div className="battery-meter"><span style={{ width: `${selectedWire.battery}%` }} /></div>
                  <b>{selectedWire.battery}%</b>
                </div>
              )}
            </>
          ) : (
            <p className="permission-note">시뮬레이터 연결 중…</p>
          )}
          <div className="subheading">주문 파이프라인 <span className="sub-count">{kpi.queued}건 미배차</span></div>
          <div className="order-list">{pipeline.slice(0, 6).map((order) => <div className="order" key={order.id}><span className={`order-state ${orderStateClass[order.status]}`} /><div><strong>{order.id.replace('ORD-', '#')}{order.priority === 'EXPRESS' ? ' · 특급' : ''}</strong><small>{order.customer} · {order.zone}</small></div><b>{order.status === 'QUEUED' ? `대기 ${order.waitMin}분` : order.status === 'DELIVERED' || order.status === 'FAILED' ? orderStatusLabel[order.status] : `${order.etaMin}분`}</b></div>)}</div>
          <div className="subheading alert-title">운영 알람 <span className="sub-count">{openAlerts.length}건 미확인</span></div>
          <div className="alert-list">
            {sortedAlerts.length === 0 && <p className="permission-note">활성 알람이 없습니다.</p>}
            {sortedAlerts.slice(0, 8).map((alert) => (
              <div className={`alert ${alert.status === 'ACKNOWLEDGED' ? 'acknowledged' : ''} ${alert.status === 'RESOLVED' ? 'resolved' : ''}`} key={alert.id}>
                <span className={`alert-bar ${alert.severity}`} />
                <div onClick={() => focusAlert(alert)} style={{ cursor: alert.riderId ? 'pointer' : 'default' }}>
                  <strong>{alert.title}</strong>
                  <small>{alert.detail} · {alertStatusLabel[alert.status]}</small>
                </div>
                <time>{ageLabel(alert.ageSec)}</time>
                {alert.status === 'OPEN' && <button className="tiny-action" onClick={() => acknowledgeAlert(alert)}>확인</button>}
              </div>
            ))}
          </div>
          <div className="subheading">운영 조치 <span className="sub-count">{roleLabel[role]} 권한</span></div>
          <div className="command-panel">
            <p>{actionMessage}</p>
            {pendingAction ? (
              <div className="command-confirm" role="alert">
                <strong>실행 전 확인</strong>
                <span>{pendingAction.label} · {pendingAction.target}</span>
                <small>{pendingAction.impact}</small>
                <div className="command-actions">
                  <button className="command primary" onClick={confirmPendingAction}>확인 실행</button>
                  <button className="command" onClick={() => setPendingAction(null)}>취소</button>
                </div>
              </div>
            ) : (
              <div className="command-actions">
                <button className="command primary" onClick={requestReassign} disabled={!selected}>재배차 요청</button>
                <button className="command" onClick={contactCourier} disabled={!selected}>라이더 연락</button>
                <button className="command" onClick={promoteExpress} disabled={!selectedOrder || selectedOrder.priority === 'EXPRESS'}>특급 승격</button>
              </div>
            )}
            <small className="permission-note">
              {role === 'viewer'
                ? '조회 권한에서는 운영 명령이 연동 경계에서 거부되고 감사에 남습니다.'
                : role === 'dispatcher'
                  ? '배차 권한: 운영 조치는 승인되나 시나리오 주입은 감독 권한이 필요합니다.'
                  : '감독 권한: 운영 조치와 시나리오 주입이 모두 승인됩니다.'}
            </small>
          </div>
          <div className="subheading">감사 타임라인 <span className="sub-count">{viewAudit.length}건</span></div>
          <div className="audit-list">
            {viewAudit.length === 0 && <p className="permission-note">아직 기록된 명령이 없습니다.</p>}
            {[...viewAudit].reverse().slice(0, 8).map((event) => (
              <div className="audit" key={event.id}>
                <span className={`audit-dot ${event.outcome === 'accepted' ? 'success' : 'failed'}`} />
                <div>
                  <strong>{actionLabel[event.action] ?? event.action}</strong>
                  <small>{roleLabel[event.actor.role]}/{event.actor.id} · {event.detail}{event.outcome === 'rejected' && event.reason ? ` · ${event.reason}` : ''}</small>
                </div>
                <time>{auditTime(event.ts)}</time>
              </div>
            ))}
          </div>
          </OverlayScrollbarsComponent>
        </aside>
      </section>
    </main>
  );
}

function Kpi({ label, value, detail, tone }: { label: string; value: string; detail: string; tone: string }) {
  return <div className="kpi"><span className={`kpi-icon ${tone}`} /><small>{label}</small><strong>{value}</strong><em>{detail}</em></div>;
}
