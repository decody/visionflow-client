/** 지리 좌표 유틸 (순수). 모든 좌표는 [lon, lat](WGS84). */

export type LonLat = [number, number];

const EARTH_R = 6_371_000; // m

/** 두 좌표 사이의 근사 거리(m). 서울 규모에서는 equirectangular 근사로 충분하다. */
export function metersBetween(a: LonLat, b: LonLat): number {
  const latMid = ((a[1] + b[1]) / 2) * (Math.PI / 180);
  const dx = (b[0] - a[0]) * (Math.PI / 180) * Math.cos(latMid) * EARTH_R;
  const dy = (b[1] - a[1]) * (Math.PI / 180) * EARTH_R;
  return Math.hypot(dx, dy);
}

/** a→b 진행 방향(deg, 북=0, 시계방향). 지도 회전/heading 표시에 쓴다. */
export function bearing(a: LonLat, b: LonLat): number {
  const latMid = ((a[1] + b[1]) / 2) * (Math.PI / 180);
  const dx = (b[0] - a[0]) * Math.cos(latMid);
  const dy = b[1] - a[1];
  const deg = (Math.atan2(dx, dy) * 180) / Math.PI;
  return (deg + 360) % 360;
}

/** a→b를 t(0~1)로 선형 보간. */
export function lerp(a: LonLat, b: LonLat, t: number): LonLat {
  return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];
}
