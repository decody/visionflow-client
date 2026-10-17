/**
 * 뷰포트 컬링 — 순수 지오메트리 판정.
 *
 * 줌인 상태에서 화면 밖 OHT를 WebGL 렌더 소스에서 제외해, 매 프레임 재생성되는
 * 정점 버퍼 비용을 "전체 대수"가 아니라 "보이는 대수"에 비례하게 만든다.
 * OpenLayers·DOM 없이 테스트할 수 있도록 좌표/익스텐트 계산만 분리했다.
 *
 * Extent는 OpenLayers 관례를 따른다: [minX, minY, maxX, maxY].
 */
export type Extent = [number, number, number, number];

/**
 * 익스텐트를 각 방향으로 margin(폭/높이 비율)만큼 확장한다.
 * 가장자리에서의 팝인(pop-in)을 줄이기 위한 여유 영역.
 */
export function expandExtent(extent: Extent, margin: number): Extent {
  const [minX, minY, maxX, maxY] = extent;
  const dx = (maxX - minX) * margin;
  const dy = (maxY - minY) * margin;
  return [minX - dx, minY - dy, maxX + dx, maxY + dy];
}

/** 좌표가 익스텐트(경계 포함) 안에 있는지. */
export function withinExtent(
  x: number,
  y: number,
  extent: Extent,
): boolean {
  return (
    x >= extent[0] &&
    x <= extent[2] &&
    y >= extent[1] &&
    y <= extent[3]
  );
}

export interface CullDiff {
  add: string[];
  remove: string[];
}

/**
 * 현재 렌더 중인 집합(rendered)과 목표 가시 집합(visible)의 차이를 계산한다.
 * add: 새로 보이게 된 id, remove: 화면 밖으로 나간 id.
 */
export function diffVisibility(
  rendered: ReadonlySet<string>,
  visible: ReadonlySet<string>,
): CullDiff {
  const add: string[] = [];
  const remove: string[] = [];
  for (const id of visible) if (!rendered.has(id)) add.push(id);
  for (const id of rendered) if (!visible.has(id)) remove.push(id);
  return { add, remove };
}
