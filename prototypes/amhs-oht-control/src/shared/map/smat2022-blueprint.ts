import layout from '@/entities/fab/smat2022-layout.json';

/**
 * SMAT2022 실측 레일망 블루프린트(방식 A, 뷰 전용).
 *
 * `smat2022-layout.json`(SMAT2022.rail 임포트 산출)을 읽어 실제 팹 규모의 레일
 * 토폴로지를 SVG로 그린다. 좌표는 원본 mm → m 변환 후 화면 px로 스케일하고 Y를 뒤집는다.
 * LINE/CURVE 링크를 색으로 구분하고 툴그룹 대표 노드를 마커로 표시한다. (합성 팹의
 * fab-blueprint와 별개: 이쪽은 외부 실측 데이터를 그대로 렌더한다.)
 */

interface RawLayout {
  extent: number[]; // [minX, minY, maxX, maxY] (mm)
  stats: { nodes: number; links: number; curves: number; sections: number; toolGroups: number };
  nodes: Record<string, [number, number]>; // mm
  links: [number, number, number][]; // [from, to, curve01]
  toolGroups: [string, [number, number]][]; // [name, [x,y] mm]
}

const L = layout as unknown as RawLayout;

export interface Smat2022Meta {
  /** [minX, minY, maxX, maxY] (m) */
  extent: [number, number, number, number];
  stats: RawLayout['stats'];
}

export function smat2022Meta(): Smat2022Meta {
  const [minX, minY, maxX, maxY] = L.extent;
  return {
    extent: [minX! / 1000, minY! / 1000, maxX! / 1000, maxY! / 1000],
    stats: L.stats,
  };
}

/** 실측 레일망을 SVG data URL로 렌더한다. */
export function smat2022BlueprintDataUrl(pxPerMeter = 4): string {
  const [minXmm, minYmm, maxXmm, maxYmm] = L.extent as [number, number, number, number];
  const minX = minXmm / 1000;
  const minY = minYmm / 1000;
  const W = (maxXmm - minXmm) / 1000; // m
  const H = (maxYmm - minYmm) / 1000; // m
  const S = pxPerMeter;
  const px = W * S;
  const py = H * S;
  const sx = (mmx: number) => (mmx / 1000 - minX) * S;
  const toY = (mmy: number) => (H - (mmy / 1000 - minY)) * S; // Y 뒤집기

  // rail 링크 (LINE / CURVE 색 구분)
  const lineSeg: string[] = [];
  const curveSeg: string[] = [];
  for (const [from, to, curve] of L.links) {
    const a = L.nodes[from];
    const b = L.nodes[to];
    if (!a || !b) continue;
    const seg = `<line x1="${sx(a[0]).toFixed(1)}" y1="${toY(a[1]).toFixed(1)}" x2="${sx(b[0]).toFixed(1)}" y2="${toY(b[1]).toFixed(1)}"/>`;
    (curve ? curveSeg : lineSeg).push(seg);
  }

  // 툴그룹 대표 노드 마커
  const tg: string[] = L.toolGroups.map(
    ([, at]) =>
      `<circle cx="${sx(at[0]).toFixed(1)}" cy="${toY(at[1]).toFixed(1)}" r="2.2" fill="#4f8cff" fill-opacity="0.65"/>`,
  );

  const svg =
    `<svg xmlns="http://www.w3.org/2000/svg" width="${px.toFixed(0)}" height="${py.toFixed(0)}" viewBox="0 0 ${px.toFixed(0)} ${py.toFixed(0)}">` +
    `<rect x="0" y="0" width="${px.toFixed(0)}" height="${py.toFixed(0)}" fill="#080d15"/>` +
    `<rect x="4" y="4" width="${(px - 8).toFixed(0)}" height="${(py - 8).toFixed(0)}" fill="none" stroke="#243250" stroke-width="1.5"/>` +
    `<g stroke="#3a4c70" stroke-width="0.8">${lineSeg.join('')}</g>` +
    `<g stroke="#8a6aaa" stroke-width="0.8">${curveSeg.join('')}</g>` +
    `<g>${tg.join('')}</g>` +
    `<text x="${(px - 12).toFixed(0)}" y="${(py - 24).toFixed(0)}" fill="#5a6d90" font="700 13px ui-sans-serif" font-family="ui-sans-serif,system-ui" font-weight="700" font-size="13" text-anchor="end" letter-spacing="0.1em">SMAT2022 · IMPORTED FAB RAIL NETWORK</text>` +
    `<text x="${(px - 12).toFixed(0)}" y="${(py - 8).toFixed(0)}" fill="#3d4d6b" font-family="ui-sans-serif,system-ui" font-weight="600" font-size="10" text-anchor="end" letter-spacing="0.06em">${W.toFixed(0)}×${H.toFixed(0)}m · ${L.stats.nodes} NODES · ${L.stats.links} LINKS (${L.stats.curves} CURVE) · ${L.stats.sections} SECTIONS · ${L.stats.toolGroups} TOOL GROUPS</text>` +
    `</svg>`;

  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}
