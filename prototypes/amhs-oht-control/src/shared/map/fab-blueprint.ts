import { buildRailGraph } from '@/entities/fab/rail-graph';
import { FAB_EXTENT } from './fab-constants';

/**
 * FAB 도면(청사진) 배경 이미지를 SVG로 생성해 data URL로 반환한다.
 *
 * Rail 그래프에서 interbay 하이웨이 / intrabay 코리도 / Stocker / Tool 로드포트를
 * 도출해 합성 청사진을 그린다. 단방향 트랙에는 진행 방향 화살표(chevron)를 얹는다.
 * OpenLayers ImageStatic 소스로 FAB_EXTENT에 정합되며, 라이브 레이어가 위에 겹친다.
 */
export function fabBlueprintDataUrl(): string {
  const g = buildRailGraph();
  const [, , W, H] = FAB_EXTENT; // 120 x 80 (m)
  const S = 10; // px per meter
  const px = W * S;
  const py = H * S;
  const toY = (my: number) => (H - my) * S;
  const sx = (mx: number) => mx * S;

  // 격자 (10m)
  const grid: string[] = [];
  for (let x = 0; x <= W; x += 10) grid.push(`<line x1="${sx(x)}" y1="0" x2="${sx(x)}" y2="${py}"/>`);
  for (let y = 0; y <= H; y += 10) grid.push(`<line x1="0" y1="${toY(y)}" x2="${px}" y2="${toY(y)}"/>`);

  const processColor: Record<string, string> = {
    PHOTO: '#4f8cff', ETCH: '#b776ff', CVD: '#27c1a8', CMP: '#f0a65a', STORAGE: '#45a8d8',
  };

  // Process bay / Stocker zones
  const zones: string[] = [];
  const labels: string[] = [];
  for (const z of g.zones) {
    const xs = z.ring.map((p) => p[0]);
    const ys = z.ring.map((p) => p[1]);
    const minX = Math.min(...xs);
    const maxX = Math.max(...xs);
    const minY = Math.min(...ys);
    const maxY = Math.max(...ys);
    const x = sx(minX);
    const y = toY(maxY);
    const w = (maxX - minX) * S;
    const h = (maxY - minY) * S;
    if (z.type === 'stocker') {
      zones.push(`<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="url(#hatch)" stroke="#3a4a66" stroke-width="1.5"/>`);
      labels.push(`<text x="${x + w / 2}" y="${y + h / 2 + 4}" class="lbl stk" text-anchor="middle">${z.name}</text>`);
    } else {
      const color = processColor[z.process] ?? '#4f8cff';
      zones.push(`<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="5" fill="${color}" fill-opacity="0.045" stroke="${color}" stroke-opacity="0.18"/>`);
      labels.push(`<text x="${sx(minX) + 9}" y="${y + 15}" class="bay">${z.process}</text><text x="${sx(minX) + 9}" y="${y + 28}" class="baySub">${z.name}</text>`);
    }
  }

  const equipmentSvg = g.equipment.map((e) => {
    const [minX, minY, maxX, maxY] = e.bounds;
    const x = sx(minX);
    const y = toY(maxY);
    const w = (maxX - minX) * S;
    const h = (maxY - minY) * S;
    const color = processColor[e.process] ?? '#4f8cff';
    const label = e.kind === 'buffer' ? 'STAGE' : e.id;
    return `<g><rect x="${x}" y="${y}" width="${w}" height="${h}" rx="4" fill="#141c29" stroke="${color}" stroke-opacity=".52" stroke-width="1.4"/>
      <rect x="${x + 5}" y="${y + 5}" width="${Math.max(8, w - 10)}" height="4" rx="2" fill="${color}" opacity=".35"/>
      <text x="${x + w / 2}" y="${y + h / 2 + 6}" class="eqp" text-anchor="middle">${label}</text></g>`;
  });

  // 트랙 + 방향 화살표(chevron)
  const rails: string[] = [];
  const arrows: string[] = [];
  for (const s of g.segments) {
    const ax = sx(s.a[0]);
    const ay = toY(s.a[1]);
    const bx = sx(s.b[0]);
    const by = toY(s.b[1]);
    const inter = s.kind === 'interbay';
    const transfer = s.kind === 'transfer';
    rails.push(
      `<line x1="${ax}" y1="${ay}" x2="${bx}" y2="${by}" stroke="${inter ? '#42628f' : transfer ? '#725a8d' : '#35455f'}" stroke-width="${inter ? 4 : transfer ? 3 : 2}"/>`,
    );
    // 세그먼트 중앙에 진행 방향 chevron
    const mx = (ax + bx) / 2;
    const my = (ay + by) / 2;
    const ang = (Math.atan2(by - ay, bx - ax) * 180) / Math.PI;
    arrows.push(
      `<g transform="translate(${mx.toFixed(1)},${my.toFixed(1)}) rotate(${ang.toFixed(1)})"><path d="M -4 -3 L 3 0 L -4 3" fill="none" stroke="${inter ? '#8db8e8' : transfer ? '#c5a5e8' : '#7186a6'}" stroke-width="1.4"/></g>`,
    );
  }

  // Tool 로드포트(작은 사각) / Stocker 포트(큰 마름모)
  const portsSvg: string[] = g.ports.map((p) => {
    const x = sx(p.at[0]);
    const y = toY(p.at[1]);
    if (p.kind === 'stocker') {
      return `<rect x="${x - 5}" y="${y - 5}" width="10" height="10" transform="rotate(45 ${x} ${y})" fill="#16233c" stroke="#4da3ff" stroke-width="1"/>`;
    }
    if (p.kind === 'buffer') return `<rect x="${x - 4}" y="${y - 4}" width="8" height="8" rx="2" fill="#122d35" stroke="#27c1a8" stroke-width="1.2"/>`;
    return `<circle cx="${x}" cy="${y}" r="3.5" fill="#0b111c" stroke="#8aa0bd" stroke-width="1.2"/><circle cx="${x}" cy="${y}" r="1.2" fill="#c9d7e8"/>`;
  });

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${px}" height="${py}" viewBox="0 0 ${px} ${py}">
    <defs>
      <pattern id="hatch" width="7" height="7" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
        <rect width="7" height="7" fill="#0f1830"/>
        <line x1="0" y1="0" x2="0" y2="7" stroke="#33507f" stroke-width="1"/>
      </pattern>
      <style>
        .lbl{fill:#6f86a5;font:600 9px ui-sans-serif,system-ui,sans-serif;letter-spacing:.05em}
        .lbl.stk{fill:#7fb0e8;font-weight:700}
        .bay{fill:#b9c9dc;font:700 12px ui-sans-serif,system-ui,sans-serif;letter-spacing:.16em}
        .baySub{fill:#6f829e;font:600 8px ui-sans-serif,system-ui,sans-serif;letter-spacing:.08em}
        .eqp{fill:#9cacc1;font:700 8px ui-sans-serif,system-ui,sans-serif;letter-spacing:.04em}
        .title{fill:#5a6d90;font:700 13px ui-sans-serif,system-ui,sans-serif;text-anchor:end;letter-spacing:.1em}
        .dim{fill:#3d4d6b;font:600 10px ui-sans-serif,system-ui,sans-serif;text-anchor:end;letter-spacing:.08em}
      </style>
    </defs>
    <rect x="0" y="0" width="${px}" height="${py}" fill="#090e17"/>
    <rect x="6" y="6" width="${px - 12}" height="${py - 12}" fill="none" stroke="#2b3a57" stroke-width="2"/>
    <g stroke="#1a2740" stroke-width="0.6">${grid.join('')}</g>
    <g opacity=".7"><rect x="${sx(1)}" y="${toY(16)}" width="${sx(118)}" height="${sx(5)}" fill="#101826"/><rect x="${sx(1)}" y="${toY(77)}" width="${sx(118)}" height="${sx(4)}" fill="#101826"/></g>
    <g>${zones.join('')}</g>
    <g>${equipmentSvg.join('')}</g>
    <g>${rails.join('')}</g>
    <g opacity="0.9">${arrows.join('')}</g>
    <g>${portsSvg.join('')}</g>
    <g>${labels.join('')}</g>
    <text x="${px - 14}" y="${py - 16}" class="title">FAB 01 · CLEANROOM AMHS OVERVIEW</text>
    <text x="${px - 14}" y="${py - 34}" class="dim">4 PROCESS BAYS · ${g.equipment.length} EQP · ${g.ports.length} PORTS · 2 STOCKERS</text>
  </svg>`;

  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}
