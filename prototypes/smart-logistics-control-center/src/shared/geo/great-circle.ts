/**
 * 대권항로(great-circle) 구면 기하 — 단계 0 유틸(기획서 §5/§13).
 *
 * 순수 함수만 둔다. 해상·항공 leg는 두 허브 간 구면 최단 경로를 slerp 보간해
 * 폴리라인을 만들고(§5), 날짜변경선(±180°)을 넘는 구간은 호출측에서 분할한다(§부록A).
 */

const R_EARTH_KM = 6371.0088;
const DEG = Math.PI / 180;
const RAD = 180 / Math.PI;

export type LonLat = [number, number];

export function toRad(deg: number): number {
  return deg * DEG;
}

export function toDeg(rad: number): number {
  return rad * RAD;
}

/** 두 지점 간 대권 거리(km) — haversine. */
export function haversineKm(a: LonLat, b: LonLat): number {
  const [lon1, lat1] = a;
  const [lon2, lat2] = b;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const s1 = Math.sin(dLat / 2);
  const s2 = Math.sin(dLon / 2);
  const h = s1 * s1 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * s2 * s2;
  return 2 * R_EARTH_KM * Math.asin(Math.min(1, Math.sqrt(h)));
}

/**
 * 대권 경로 위 비율 t(0~1) 지점 — 구면 선형 보간(slerp).
 * t=0 → a, t=1 → b. 경도는 -180~180으로 정규화해 반환한다.
 */
export function interpolate(a: LonLat, b: LonLat, t: number): LonLat {
  const lat1 = toRad(a[1]);
  const lon1 = toRad(a[0]);
  const lat2 = toRad(b[1]);
  const lon2 = toRad(b[0]);

  const d = angularDistance(a, b);
  if (d === 0) return [a[0], a[1]];

  const sinD = Math.sin(d);
  const A = Math.sin((1 - t) * d) / sinD;
  const B = Math.sin(t * d) / sinD;

  const x = A * Math.cos(lat1) * Math.cos(lon1) + B * Math.cos(lat2) * Math.cos(lon2);
  const y = A * Math.cos(lat1) * Math.sin(lon1) + B * Math.cos(lat2) * Math.sin(lon2);
  const z = A * Math.sin(lat1) + B * Math.sin(lat2);

  const lat = Math.atan2(z, Math.sqrt(x * x + y * y));
  const lon = Math.atan2(y, x);
  return [normalizeLon(toDeg(lon)), toDeg(lat)];
}

/** 대권 경로 중간점(t=0.5). */
export function midpoint(a: LonLat, b: LonLat): LonLat {
  return interpolate(a, b, 0.5);
}

/**
 * 대권 경로를 폴리라인으로 샘플링한다. segments개 구간(= segments+1개 점).
 * 날짜변경선을 넘는지 여부는 분할 책임을 지는 레이어가 판단하도록 점만 반환한다.
 */
export function samplePath(a: LonLat, b: LonLat, segments = 48): LonLat[] {
  const n = Math.max(1, Math.floor(segments));
  const pts: LonLat[] = [];
  for (let i = 0; i <= n; i += 1) {
    pts.push(interpolate(a, b, i / n));
  }
  return pts;
}

/** 두 지점의 중심각(radian). */
export function angularDistance(a: LonLat, b: LonLat): number {
  return haversineKm(a, b) / R_EARTH_KM;
}

/** 경도를 -180~180 범위로 정규화한다. */
export function normalizeLon(lon: number): number {
  let x = ((lon + 180) % 360 + 360) % 360;
  return x - 180;
}

/** 초기 방위각(bearing, deg 0~360). heading 계산용. */
export function initialBearing(a: LonLat, b: LonLat): number {
  const lat1 = toRad(a[1]);
  const lat2 = toRad(b[1]);
  const dLon = toRad(b[0] - a[0]);
  const y = Math.sin(dLon) * Math.cos(lat2);
  const x = Math.cos(lat1) * Math.sin(lat2) - Math.sin(lat1) * Math.cos(lat2) * Math.cos(dLon);
  return (toDeg(Math.atan2(y, x)) + 360) % 360;
}
