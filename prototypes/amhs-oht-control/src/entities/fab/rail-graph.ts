import { FAB_EXTENT } from '@/shared/map/fab-constants';
import fabLayout from './fab-layout.json';

/**
 * FAB 정적 골격(단방향 Rail / Process Bay / Equipment / Port) 생성기.
 *
 * 산업 표준 AMHS 관례를 단순화한 토폴로지:
 *  - Interbay 하이웨이: 외곽 단방향 루프(시계방향). 간선.
 *  - Intrabay 코리도: 각 Bay를 가로지르는 단방향(L→R) 지선. 툴 로드포트가 매달림.
 *  - Stocker(STK): 하이웨이에 접한 대용량 보관 노드.
 *  - Tool 로드포트(LP): Bay 코리도 위의 정차 노드. 공정 툴은 복수 로드포트를 가진다.
 *
 * 레이아웃(좌표·용량·로드포트 수)은 `fab-layout.json`에서 읽는다. 모든 세그먼트는
 * 단방향(a→b)이며, 경로탐색은 방향을 준수한다. 결정론적으로 생성되어 Worker/노드/
 * 렌더러가 동일 그래프를 만든다. 단위: m.
 */

export type XY = [number, number];

/** fab-layout.json 스키마 */
export interface FabLayout {
  extent: [number, number, number, number];
  highway: { left: number; right: number; bottom: number; top: number };
  spineX: number;
  bayEntryX: number;
  toolXs: number[];
  bufferCapacity: number;
  loadPorts: { process: number; metrology: number; spacing: number };
  bays: {
    id: string;
    name: string;
    process: Zone['process'];
    y: number;
  }[];
  stockers: {
    id: string;
    name: string;
    at: XY;
    capacity: number;
    bayId: string;
    zoneName: string;
  }[];
}

export type SegKind = 'interbay' | 'intrabay' | 'transfer';

export interface RailSegment {
  id: string;
  a: XY;
  b: XY;
  /** 단방향: a→b 만 주행 가능 */
  length: number;
  kind: SegKind;
}

export interface Zone {
  id: string;
  type: 'intrabay' | 'stocker';
  name: string;
  process: 'PHOTO' | 'ETCH' | 'CVD' | 'CMP' | 'STORAGE';
  status: 'normal' | 'busy' | 'down';
  ring: XY[];
}

export interface Port {
  id: string;
  kind: 'tool' | 'stocker' | 'buffer';
  /** 경로 탐색용 rail 정차 노드. 같은 툴의 복수 로드포트는 이 노드를 공유한다. */
  at: XY;
  /** 마커 표시 좌표(복수 로드포트를 겹치지 않게 오프셋). 없으면 at을 쓴다. */
  renderAt?: XY;
  bayId?: string;
  equipmentId?: string;
  /** 보관/전송 용량 (tool 로드포트=1, buffer=N, stocker=N) */
  capacity: number;
}

export interface Equipment {
  id: string;
  name: string;
  process: Zone['process'];
  bayId: string;
  kind: 'process' | 'metrology' | 'buffer' | 'stocker';
  status: 'RUN' | 'IDLE' | 'PM' | 'DOWN';
  /** [minX, minY, maxX, maxY] */
  bounds: [number, number, number, number];
  portIds: string[];
}

export interface RailGraph {
  extent: [number, number, number, number];
  segments: RailSegment[];
  zones: Zone[];
  ports: Port[];
  equipment: Equipment[];
  /** nodeKey → 그 노드에서 나가는 세그먼트 인덱스(seg.a === node) */
  adjacency: Map<string, number[]>;
  /** nodeKey → 그 노드에 있는 Port */
  portByNode: Map<string, Port>;
}

// ---- 토폴로지 파라미터 (fab-layout.json) ----
// JSON 리터럴은 number[]/string으로 추론되므로 스펙 타입으로 단언한다.
const LAYOUT = fabLayout as unknown as FabLayout;
const LEFT_X = LAYOUT.highway.left;
const RIGHT_X = LAYOUT.highway.right;
const BOTTOM_Y = LAYOUT.highway.bottom;
const TOP_Y = LAYOUT.highway.top;
const SPINE_X = LAYOUT.spineX;
const BAY_ENTRY_X = LAYOUT.bayEntryX;
const BAY_SPECS = LAYOUT.bays;
const TOOL_XS = LAYOUT.toolXs;

function nodeKey(p: XY): string {
  return `${Math.round(p[0] * 100)}:${Math.round(p[1] * 100)}`;
}

function dist(a: XY, b: XY): number {
  return Math.hypot(b[0] - a[0], b[1] - a[1]);
}

export function buildRailGraph(): RailGraph {
  const segments: RailSegment[] = [];
  const zones: Zone[] = [];
  const ports: Port[] = [];
  const equipment: Equipment[] = [];

  const pushSeg = (id: string, a: XY, b: XY, kind: SegKind) => {
    segments.push({ id, a, b, length: dist(a, b), kind });
  };

  // 연속 노드 배열을 단방향 세그먼트 체인으로
  const chain = (prefix: string, pts: XY[], kind: SegKind) => {
    for (let i = 0; i < pts.length - 1; i += 1) pushSeg(`${prefix}-${i}`, pts[i]!, pts[i + 1]!, kind);
  };

  // Interbay 하이웨이 루프 (시계방향, 단방향)
  // 좌변: 위→아래 (Bay Y에서 분기 노드)
  const bayYs = BAY_SPECS.map((b) => b.y);
  const leftYs = [TOP_Y, ...[...bayYs].reverse(), BOTTOM_Y];
  chain('HW-L', leftYs.map((y) => [LEFT_X, y] as XY), 'interbay');
  // 하변/상변은 스토커가 하이웨이 라인 위에 매달리므로, 각 스토커 x를 실제 노드로
  // 삽입해 스토커 정차 노드가 그래프에 연결되게 한다(경로탐색·충전소 도달 성립).
  const stockerXsOn = (y: number) =>
    LAYOUT.stockers.filter((s) => s.at[1] === y).map((s) => s.at[0]);
  // 하변: 좌→우 (스토커·중앙 스파인 경유)
  const bottomXs = Array.from(new Set([LEFT_X, SPINE_X, ...stockerXsOn(BOTTOM_Y), RIGHT_X])).sort((a, b) => a - b);
  chain('HW-B', bottomXs.map((x) => [x, BOTTOM_Y] as XY), 'interbay');
  // 우변: 아래→위 (Bay Y에서 합류 노드)
  const rightYs = [BOTTOM_Y, ...bayYs, TOP_Y];
  chain('HW-R', rightYs.map((y) => [RIGHT_X, y] as XY), 'interbay');
  // 상변: 우→좌 (스토커·중앙 스파인 경유)
  const topXs = Array.from(new Set([LEFT_X, SPINE_X, ...stockerXsOn(TOP_Y), RIGHT_X])).sort((a, b) => b - a);
  chain('HW-T', topXs.map((x) => [x, TOP_Y] as XY), 'interbay');

  // 중앙 transfer spine은 공정 Bay 사이의 shortcut. 하→상 단방향.
  chain('XFER', [[SPINE_X, BOTTOM_Y], ...bayYs.map((y) => [SPINE_X, y] as XY), [SPINE_X, TOP_Y]], 'transfer');

  // Intrabay 코리도 + 공정 장비. 장비는 rail 양쪽에 배치하고 포트는 rail 위에 둔다.
  const spacing = LAYOUT.loadPorts.spacing;
  BAY_SPECS.forEach(({ id: bayId, name, process, y }, bi) => {
    // 같은 공정의 Bay가 복수(A/B)면 process만으로는 장비 id가 충돌하므로,
    // bayId의 공정 뒤 접미사(예: BAY-PHOTO-A → "A")를 붙여 유일하게 만든다.
    // 단일 Bay 레이아웃(BAY-PHOTO)에서는 접미사가 없어 기존 id(PHOTO-01)를 유지한다.
    const baySuffix = bayId.slice(`BAY-${process}`.length).replace(/^-/, '');
    const eqpPrefix = baySuffix ? `${process}-${baySuffix}` : process;
    // 각 툴의 로드포트를 rail을 따라 벌어진 **개별 정차 노드**로 배치한다.
    // 복수 로드포트 툴에서는 OHT가 LP마다 위치를 미세 조정해 정차한다.
    const toolLps = TOOL_XS.map((x, ti) => {
      const isMetrology = ti === TOOL_XS.length - 1;
      const lpCount = Math.max(
        1,
        isMetrology ? LAYOUT.loadPorts.metrology : LAYOUT.loadPorts.process,
      );
      const xsOfTool = Array.from(
        { length: lpCount },
        (_, lp) => x + (lp - (lpCount - 1) / 2) * spacing,
      );
      return { x, ti, isMetrology, xs: xsOfTool };
    });
    const lpXs = toolLps.flatMap((tool) => tool.xs);

    // 중앙 transfer spine의 교차점도 실제 노드로 포함해 Bay 간 우회 경로가
    // 그래프 탐색에서 연결되도록 한다. LP 노드는 이미 오름차순이다.
    const xs = [
      LEFT_X,
      BAY_ENTRY_X,
      ...lpXs.filter((x) => x < SPINE_X),
      SPINE_X,
      ...lpXs.filter((x) => x > SPINE_X),
      RIGHT_X,
    ];
    chain(bayId, xs.map((x) => [x, y] as XY), 'intrabay');

    zones.push({
      id: `Z-${bayId}`,
      type: 'intrabay',
      name,
      process,
      status: 'normal',
      ring: [
        [LEFT_X - 1, y - 6],
        [RIGHT_X + 1, y - 6],
        [RIGHT_X + 1, y + 6],
        [LEFT_X - 1, y + 6],
        [LEFT_X - 1, y - 6],
      ],
    });

    toolLps.forEach(({ x, ti, isMetrology, xs: lpXsOfTool }) => {
      const equipmentId = `${eqpPrefix}-${String(ti + 1).padStart(2, '0')}`;
      const portIds: string[] = [];
      lpXsOfTool.forEach((lpX, lp) => {
        const portId = `${equipmentId}-LP${lp + 1}`;
        portIds.push(portId);
        // 각 로드포트는 자신의 rail 정차 노드를 가진다(경로탐색 대상).
        ports.push({
          id: portId,
          kind: 'tool',
          at: [lpX, y],
          bayId,
          equipmentId,
          capacity: 1,
        });
      });
      const above = ti % 2 === 0;
      const halfW = Math.max(5, (lpXsOfTool.length * spacing) / 2 + 1.5);
      const bounds: Equipment['bounds'] = [
        x - halfW,
        above ? y + 1.4 : y - 5.8,
        x + halfW,
        above ? y + 5.8 : y - 1.4,
      ];
      equipment.push({ id: equipmentId, name: `${process} TOOL ${ti + 1}`, process, bayId,
        kind: isMetrology ? 'metrology' : 'process', status: 'RUN', bounds, portIds });
    });

    // Bay 입구 staging buffer: 여러 FOUP를 임시 보관.
    const bufferId = `BUF-${bi + 1}`;
    ports.push({ id: `${bufferId}-P1`, kind: 'buffer', at: [BAY_ENTRY_X, y], bayId, equipmentId: bufferId, capacity: LAYOUT.bufferCapacity });
    equipment.push({ id: bufferId, name: `${process} STAGING`, process, bayId, kind: 'buffer', status: 'RUN',
      bounds: [BAY_ENTRY_X - 3.5, y + 1.2, BAY_ENTRY_X + 3.5, y + 4.8], portIds: [`${bufferId}-P1`] });
  });

  // Stocker (하이웨이 접점) + 존 박스 — 레이아웃 스펙에서 생성
  LAYOUT.stockers.forEach((stk, si) => {
    const [sxm, sym] = stk.at;
    ports.push({ id: `${stk.id}-P1`, kind: 'stocker', at: stk.at as XY, equipmentId: stk.id, capacity: stk.capacity });
    const below = sym < (BOTTOM_Y + TOP_Y) / 2;
    equipment.push({
      id: stk.id,
      name: stk.name,
      process: 'STORAGE',
      bayId: stk.bayId,
      kind: 'stocker',
      status: 'RUN',
      // 스토커 박스는 하이웨이 바깥쪽(도면 가장자리 방향)으로 자기 y에 붙여 그린다.
      bounds: below ? [sxm - 7, sym - 7, sxm + 7, sym - 1.5] : [sxm - 7, sym + 1.5, sxm + 7, sym + 7],
      portIds: [`${stk.id}-P1`],
    });
    zones.push({
      id: `Z-STK-${si + 1}`,
      type: 'stocker',
      name: stk.zoneName,
      process: 'STORAGE',
      status: 'normal',
      ring: [
        [sxm - 6, sym - 4],
        [sxm + 6, sym - 4],
        [sxm + 6, sym + 4],
        [sxm - 6, sym + 4],
        [sxm - 6, sym - 4],
      ],
    });
  });

  // 방향성 인접 리스트 (나가는 간선) + 포트 노드 인덱스
  const adjacency = new Map<string, number[]>();
  segments.forEach((seg, idx) => {
    const k = nodeKey(seg.a);
    const list = adjacency.get(k);
    if (list) list.push(idx);
    else adjacency.set(k, [idx]);
  });

  const portByNode = new Map<string, Port>();
  for (const p of ports) portByNode.set(nodeKey(p.at), p);

  return { extent: FAB_EXTENT, segments, zones, ports, equipment, adjacency, portByNode };
}

export function nodeKeyOf(p: XY): string {
  return nodeKey(p);
}

/**
 * BFS 최단경로 (단방향) — start→goal 를 잇는 세그먼트 인덱스 순서.
 * 도달 불가/동일 노드면 빈 배열.
 */
export function findRoute(graph: RailGraph, startKey: string, goalKey: string): number[] {
  if (startKey === goalKey) return [];
  const prev = new Map<string, { seg: number; from: string }>();
  const visited = new Set<string>([startKey]);
  const queue: string[] = [startKey];

  while (queue.length > 0) {
    const cur = queue.shift()!;
    const outgoing = graph.adjacency.get(cur) ?? [];
    for (const si of outgoing) {
      const seg = graph.segments[si]!;
      const other = nodeKey(seg.b);
      if (visited.has(other)) continue;
      visited.add(other);
      prev.set(other, { seg: si, from: cur });
      if (other === goalKey) {
        const path: number[] = [];
        let node = goalKey;
        while (node !== startKey) {
          const p = prev.get(node)!;
          path.unshift(p.seg);
          node = p.from;
        }
        return path;
      }
      queue.push(other);
    }
  }
  return [];
}

// ---- GeoJSON 직렬화 ----

export function railGraphToGeoJSON(graph: RailGraph) {
  return {
    rails: {
      type: 'FeatureCollection' as const,
      features: graph.segments.map((s) => ({
        type: 'Feature' as const,
        geometry: { type: 'LineString' as const, coordinates: [s.a, s.b] },
        properties: { railId: s.id, kind: s.kind, direction: 'one-way' },
      })),
    },
    zones: {
      type: 'FeatureCollection' as const,
      features: graph.zones.map((z) => ({
        type: 'Feature' as const,
        geometry: { type: 'Polygon' as const, coordinates: [z.ring] },
        properties: { zoneId: z.id, zoneType: z.type, name: z.name, process: z.process, status: z.status },
      })),
    },
    ports: {
      type: 'FeatureCollection' as const,
      features: graph.ports.map((p) => ({
        type: 'Feature' as const,
        // 마커는 renderAt(복수 로드포트 오프셋)으로 표시. 경로탐색은 at을 직접 쓴다.
        geometry: { type: 'Point' as const, coordinates: p.renderAt ?? p.at },
        properties: { portId: p.id, kind: p.kind, bayId: p.bayId ?? null, equipmentId: p.equipmentId ?? null, capacity: p.capacity },
      })),
    },
    equipment: {
      type: 'FeatureCollection' as const,
      features: graph.equipment.map((e) => ({
        type: 'Feature' as const,
        geometry: { type: 'Polygon' as const, coordinates: [[
          [e.bounds[0], e.bounds[1]], [e.bounds[2], e.bounds[1]], [e.bounds[2], e.bounds[3]],
          [e.bounds[0], e.bounds[3]], [e.bounds[0], e.bounds[1]],
        ]] },
        properties: { equipmentId: e.id, name: e.name, process: e.process, bayId: e.bayId, kind: e.kind, status: e.status },
      })),
    },
  };
}
