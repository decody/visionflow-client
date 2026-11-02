/**
 * 뷰포트/권역 컬링 — 순수 지오메트리 판정. 단계 8(기획서 §10).
 *
 * 화면 밖(지역 모드) 또는 지구 뒤편(글로브 모드)의 운송수단을 렌더 소스에서 제외해,
 * 매 프레임 재생성되는 정점 버퍼 비용을 "전체 대수"가 아니라 "보이는 대수"에 비례하게
 * 만든다. deck.gl/DOM 없이 테스트할 수 있도록 좌표 계산만 분리했다.
 *
 * Extent 관례: [minLon, minLat, maxLon, maxLat].
 */
export type Extent = [number, number, number, number];

const DEG = Math.PI / 180;

/** 익스텐트를 각 방향으로 margin(폭/높이 비율)만큼 확장(가장자리 pop-in 완화). */
export function expandExtent(extent: Extent, margin: number): Extent {
  const [minX, minY, maxX, maxY] = extent;
  const dx = (maxX - minX) * margin;
  const dy = (maxY - minY) * margin;
  return [minX - dx, minY - dy, maxX + dx, maxY + dy];
}

/** 좌표가 익스텐트(경계 포함) 안에 있는지. */
export function withinExtent(lon: number, lat: number, extent: Extent): boolean {
  return lon >= extent[0] && lon <= extent[2] && lat >= extent[1] && lat <= extent[3];
}

/**
 * 글로브 가시 반구 판정 — 카메라 중심(centerLon/Lat)에서 본 앞면인지.
 * 두 지점의 단위 벡터 내적 ≥ cos(90°+여유)면 앞면. margin(도)으로 가장자리를 약간 넉넉히.
 */
export function withinHemisphere(
  lon: number,
  lat: number,
  centerLon: number,
  centerLat: number,
  marginDeg = 8,
): boolean {
  const dot = Math.sin(lat * DEG) * Math.sin(centerLat * DEG) +
    Math.cos(lat * DEG) * Math.cos(centerLat * DEG) * Math.cos((lon - centerLon) * DEG);
  return dot >= Math.cos((90 + marginDeg) * DEG);
}

export interface CullDiff {
  add: string[];
  remove: string[];
}

/** 렌더 중 집합과 목표 가시 집합의 차이(메트릭/디버그용). */
export function diffVisibility(rendered: ReadonlySet<string>, visible: ReadonlySet<string>): CullDiff {
  const add: string[] = [];
  const remove: string[] = [];
  for (const id of visible) if (!rendered.has(id)) add.push(id);
  for (const id of rendered) if (!visible.has(id)) remove.push(id);
  return { add, remove };
}
