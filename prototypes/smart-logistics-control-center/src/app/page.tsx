import { GlobePanel } from '@/features/globe/globe-panel';
import { HUBS, LANES, sampleShipments } from '@/entities/logistics/mock';
import type { HubKind } from '@/entities/logistics/types';

/**
 * 관제 화면 진입점.
 *
 * KPI의 기준 요약과 실시간 글로브 관제 영역을 함께 제공한다. 실제 라이브 상태와
 * 상호작용은 GlobePanel 내부의 Worker/WebSocket 소스가 담당한다.
 */
export default function Page() {
  const now = Date.UTC(2026, 9, 18, 0, 0, 0); // 고정 기준 시각(결정론)
  const shipments = sampleShipments(now);
  const byKind = (kind: HubKind) => HUBS.filter((h) => h.kind === kind).length;

  return (
    <main className="shell">
      <header className="topbar">
        <div className="brand">
          <span className="kicker">VISIONFLOW · PROTOTYPE #04</span>
          <h1>Smart Logistics Control Center</h1>
        </div>
        <span className="synthetic-note">합성 데이터 · 공개 경계 데이터 · 실제 운송망 아님</span>
      </header>

      <section className="kpi-grid">
        <div className="kpi">
          <small>샘플 화물</small>
          <strong>{shipments.length}</strong>
          <em>Worker 실시간 풀은 글로브에서 표시</em>
          <span className="kpi-icon blue" />
        </div>
        <div className="kpi">
          <small>허브(노드)</small>
          <strong>{HUBS.length}</strong>
          <em>PORT·AIRPORT·RAIL·DC</em>
          <span className="kpi-icon green" />
        </div>
        <div className="kpi">
          <small>레인(링크)</small>
          <strong>{LANES.length}</strong>
          <em>해·공·육·철</em>
          <span className="kpi-icon orange" />
        </div>
        <div className="kpi">
          <small>프로토타입 단계</small>
          <strong>9</strong>
          <em>MVP · 성능 · 시연 완료</em>
          <span className="kpi-icon violet" />
        </div>
      </section>

      <section className="stage">
        <GlobePanel />
      </section>

      <section className="netbar">
        <span className="chip port">PORT <b>{byKind('PORT')}</b></span>
        <span className="chip air">AIRPORT <b>{byKind('AIRPORT')}</b></span>
        <span className="chip rail">RAIL_TERMINAL <b>{byKind('RAIL_TERMINAL')}</b></span>
        <span className="chip dc">DC <b>{byKind('DC')}</b></span>
        {shipments.map((s) => (
          <span key={s.id} className="chip">
            {s.id} · {s.legs.length} legs · <b>{s.priority === 3 ? 'EXPEDITE' : `P${s.priority}`}</b>
          </span>
        ))}
      </section>
    </main>
  );
}
