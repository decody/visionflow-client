'use client';

import { useMemo, useRef, useState } from 'react';

import {
  smat2022BlueprintDataUrl,
  smat2022Meta,
} from '@/shared/map/smat2022-blueprint';

/**
 * SMAT2022 실측 레일망 뷰어(방식 A). `SMAT2022.rail`을 파싱·렌더한 정적 블루프린트를
 * 팬/줌으로 탐색한다. 라이브 sim과 분리된 뷰 전용 화면(엔진 미구동).
 */
export function Smat2022View() {
  const url = useMemo(() => smat2022BlueprintDataUrl(6), []);
  const meta = useMemo(() => smat2022Meta(), []);
  const [scale, setScale] = useState(0.6);
  const [pos, setPos] = useState({ x: 40, y: 80 });
  const drag = useRef<{ x: number; y: number; ox: number; oy: number } | null>(null);

  const onWheel = (e: React.WheelEvent) => {
    const factor = e.deltaY < 0 ? 1.12 : 1 / 1.12;
    const next = Math.min(8, Math.max(0.15, scale * factor));
    // 커서 기준 줌
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const cx = e.clientX - rect.left;
    const cy = e.clientY - rect.top;
    setPos((p) => ({
      x: cx - ((cx - p.x) * next) / scale,
      y: cy - ((cy - p.y) * next) / scale,
    }));
    setScale(next);
  };

  return (
    <div style={styles.root}>
      <header style={styles.header}>
        <div>
          <div style={styles.title}>SMAT2022 · IMPORTED FAB RAIL NETWORK</div>
          <div style={styles.sub}>
            {(meta.extent[2] - meta.extent[0]).toFixed(0)}×{(meta.extent[3] - meta.extent[1]).toFixed(0)}m ·{' '}
            {meta.stats.nodes} nodes ·{' '}
            {meta.stats.links} links ({meta.stats.curves} curve) · {meta.stats.sections} sections ·{' '}
            {meta.stats.toolGroups} tool groups · <span style={styles.dim}>view-only import (no sim)</span>
          </div>
        </div>
        <div style={styles.actions}>
          <button style={styles.btn} onClick={() => { setScale(0.6); setPos({ x: 40, y: 80 }); }}>
            reset view
          </button>
          <a style={styles.link} href="/">← live map</a>
        </div>
      </header>
      <div
        style={styles.canvas}
        onWheel={onWheel}
        onPointerDown={(e) => {
          drag.current = { x: e.clientX, y: e.clientY, ox: pos.x, oy: pos.y };
          (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
        }}
        onPointerMove={(e) => {
          if (!drag.current) return;
          setPos({ x: drag.current.ox + (e.clientX - drag.current.x), y: drag.current.oy + (e.clientY - drag.current.y) });
        }}
        onPointerUp={(e) => {
          drag.current = null;
          (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId);
        }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={url}
          alt="SMAT2022 imported rail network"
          draggable={false}
          style={{
            position: 'absolute',
            left: 0,
            top: 0,
            transform: `translate(${pos.x}px, ${pos.y}px) scale(${scale})`,
            transformOrigin: '0 0',
            imageRendering: 'auto',
            userSelect: 'none',
          }}
        />
        <div style={styles.hint}>휠: 확대/축소 · 드래그: 이동</div>
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  root: { position: 'fixed', inset: 0, background: '#070b12', color: '#c9d7e8', display: 'flex', flexDirection: 'column' },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 18px', borderBottom: '1px solid #1b2740', gap: 16 },
  title: { fontWeight: 700, letterSpacing: '0.08em', fontSize: 14 },
  sub: { fontSize: 11, color: '#7186a6', marginTop: 3, letterSpacing: '0.03em' },
  dim: { color: '#4d5f80' },
  actions: { display: 'flex', gap: 10, alignItems: 'center' },
  btn: { background: '#132038', color: '#9fb4d4', border: '1px solid #26385c', borderRadius: 6, padding: '6px 10px', fontSize: 12, cursor: 'pointer' },
  link: { color: '#4f8cff', fontSize: 12, textDecoration: 'none' },
  canvas: { position: 'relative', flex: 1, overflow: 'hidden', cursor: 'grab', touchAction: 'none' },
  hint: { position: 'absolute', right: 14, bottom: 12, fontSize: 11, color: '#4d5f80', background: 'rgba(8,12,19,.7)', padding: '4px 8px', borderRadius: 6, pointerEvents: 'none' },
};
