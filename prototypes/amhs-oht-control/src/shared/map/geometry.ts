import type { RailSegment, XY } from '@/entities/fab/rail-graph';

/** 점 p에서 선분 a-b까지의 최단 거리 */
export function distPointToSeg(p: XY, a: XY, b: XY): number {
  const dx = b[0] - a[0];
  const dy = b[1] - a[1];
  const len2 = dx * dx + dy * dy;
  if (len2 === 0) return Math.hypot(p[0] - a[0], p[1] - a[1]);
  let t = ((p[0] - a[0]) * dx + (p[1] - a[1]) * dy) / len2;
  t = Math.max(0, Math.min(1, t));
  return Math.hypot(p[0] - (a[0] + t * dx), p[1] - (a[1] + t * dy));
}

/** 점에 가장 가까운 레일 세그먼트 (경로 자동 마커링용) */
export function nearestSegment(p: XY, segments: RailSegment[]): RailSegment | null {
  let best: RailSegment | null = null;
  let bestD = Infinity;
  for (const seg of segments) {
    const d = distPointToSeg(p, seg.a, seg.b);
    if (d < bestD) {
      bestD = d;
      best = seg;
    }
  }
  return best;
}
