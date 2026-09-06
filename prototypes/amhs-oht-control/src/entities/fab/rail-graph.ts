import { FAB_EXTENT } from '@/shared/map/fab-constants';

/**
 * FAB 정적 골격(단방향 Rail / Process Bay / Equipment / Port) 생성기.
 *
 * 산업 표준 AMHS 관례를 단순화한 토폴로지:
 *  - Interbay 하이웨이: 외곽 단방향 루프(시계방향). 간선.
 *  - Intrabay 코리도: 각 Bay를 가로지르는 단방향(L→R) 지선. 툴 로드포트가 매달림.
 *  - Stocker(STK): 하이웨이에 접한 대용량 보관 노드.
 *  - Tool 로드포트(LP): Bay 코리도 위의 정차 노드(용량 1).
 *
 * 모든 세그먼트는 단방향(a→b)이며, 경로탐색은 방향을 준수한다.
 * 결정론적으로 생성되어 Worker/노드/렌더러가 동일 그래프를 만든다. 단위: m.
 */

export type XY = [number, number];

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
  at: XY;
  bayId?: string;
  equipmentId?: string;
  /** 보관/전송 용량 (tool=1, stocker=N) */
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

// ---- 토폴로지 파라미터 ----
const LEFT_X = 8;
const RIGHT_X = 112;
const BOTTOM_Y = 8;
const TOP_Y = 72;
const BAY_SPECS = [
  { id: 'BAY-PHOTO', name: 'PHOTO LITHOGRAPHY', process: 'PHOTO' as const, y: 22 },
  { id: 'BAY-ETCH', name: 'DRY ETCH', process: 'ETCH' as const, y: 36 },
  { id: 'BAY-CVD', name: 'THIN FILM · CVD', process: 'CVD' as const, y: 50 },
  { id: 'BAY-CMP', name: 'CMP · CLEAN', process: 'CMP' as const, y: 64 },
];
const TOOL_XS = [22, 36, 50, 70, 84, 98];
const STK_BOTTOM: XY = [60, BOTTOM_Y];
const STK_TOP: XY = [60, TOP_Y];

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
  // 하변: 좌→우 (중앙 STK-1 경유)
  chain('HW-B', [[LEFT_X, BOTTOM_Y], STK_BOTTOM, [RIGHT_X, BOTTOM_Y]], 'interbay');
  // 우변: 아래→위 (Bay Y에서 합류 노드)
  const rightYs = [BOTTOM_Y, ...bayYs, TOP_Y];
  chain('HW-R', rightYs.map((y) => [RIGHT_X, y] as XY), 'interbay');
  // 상변: 우→좌 (중앙 STK-2 경유)
  chain('HW-T', [[RIGHT_X, TOP_Y], STK_TOP, [LEFT_X, TOP_Y]], 'interbay');

  // 중앙 transfer spine은 공정 Bay 사이의 shortcut. 하→상 단방향.
  chain('XFER', [[60, BOTTOM_Y], ...bayYs.map((y) => [60, y] as XY), [60, TOP_Y]], 'transfer');

  // Intrabay 코리도 + 공정 장비. 장비는 rail 양쪽에 배치하고 포트는 rail 위에 둔다.
  BAY_SPECS.forEach(({ id: bayId, name, process, y }, bi) => {
    // 중앙 transfer spine의 교차점도 실제 노드로 포함해 Bay 간 우회 경로가
    // 그래프 탐색에서 연결되도록 한다.
    const xs = [
      LEFT_X,
      14,
      ...TOOL_XS.filter((x) => x < 60),
      60,
      ...TOOL_XS.filter((x) => x > 60),
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

    TOOL_XS.forEach((x, ti) => {
      const equipmentId = `${process}-${String(ti + 1).padStart(2, '0')}`;
      const portId = `${equipmentId}-LP1`;
      const above = ti % 2 === 0;
      const bounds: Equipment['bounds'] = [x - 5, above ? y + 1.4 : y - 5.8, x + 5, above ? y + 5.8 : y - 1.4];
      ports.push({ id: portId, kind: 'tool', at: [x, y], bayId, equipmentId, capacity: 1 });
      equipment.push({ id: equipmentId, name: `${process} TOOL ${ti + 1}`, process, bayId,
        kind: ti === TOOL_XS.length - 1 ? 'metrology' : 'process', status: 'RUN', bounds, portIds: [portId] });
    });

    // Bay 입구 staging buffer: 두 FOUP를 임시 보관.
    const bufferId = `BUF-${bi + 1}`;
    ports.push({ id: `${bufferId}-P1`, kind: 'buffer', at: [14, y], bayId, equipmentId: bufferId, capacity: 2 });
    equipment.push({ id: bufferId, name: `${process} STAGING`, process, bayId, kind: 'buffer', status: 'RUN',
      bounds: [10.5, y + 1.2, 17.5, y + 4.8], portIds: [`${bufferId}-P1`] });
  });

  // Stocker (하이웨이 접점) + 존 박스
  ports.push({ id: 'STK-01-P1', kind: 'stocker', at: STK_BOTTOM, equipmentId: 'STK-01', capacity: 24 });
  ports.push({ id: 'STK-02-P1', kind: 'stocker', at: STK_TOP, equipmentId: 'STK-02', capacity: 24 });
  equipment.push(
    { id: 'STK-01', name: 'RETICLE / FOUP STOCKER 01', process: 'STORAGE', bayId: 'STORAGE-S', kind: 'stocker', status: 'RUN', bounds: [53, 1, 67, 6.5], portIds: ['STK-01-P1'] },
    { id: 'STK-02', name: 'FOUP STOCKER 02', process: 'STORAGE', bayId: 'STORAGE-N', kind: 'stocker', status: 'RUN', bounds: [53, 73.5, 67, 79], portIds: ['STK-02-P1'] },
  );
  zones.push({
    id: 'Z-STK-1',
    type: 'stocker',
    name: 'SOUTH STOCKER',
    process: 'STORAGE',
    status: 'normal',
    ring: [
      [STK_BOTTOM[0] - 6, STK_BOTTOM[1] - 4],
      [STK_BOTTOM[0] + 6, STK_BOTTOM[1] - 4],
      [STK_BOTTOM[0] + 6, STK_BOTTOM[1] + 4],
      [STK_BOTTOM[0] - 6, STK_BOTTOM[1] + 4],
      [STK_BOTTOM[0] - 6, STK_BOTTOM[1] - 4],
    ],
  });
  zones.push({
    id: 'Z-STK-2',
    type: 'stocker',
    name: 'NORTH STOCKER',
    process: 'STORAGE',
    status: 'normal',
    ring: [
      [STK_TOP[0] - 6, STK_TOP[1] - 4],
      [STK_TOP[0] + 6, STK_TOP[1] - 4],
      [STK_TOP[0] + 6, STK_TOP[1] + 4],
      [STK_TOP[0] - 6, STK_TOP[1] + 4],
      [STK_TOP[0] - 6, STK_TOP[1] - 4],
    ],
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
        geometry: { type: 'Point' as const, coordinates: p.at },
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
