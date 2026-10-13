/**
 * 도로 그래프 생성 (순수, 결정론적) — 단계 2
 *
 * 입력은 간선도로 폴리라인 목록(lon/lat)이다. 각 폴리라인을 일정 간격으로 분할해
 * 노드를 만들고(직선 주행이 폴리라인을 따르도록), 서로 다른 도로의 가까운 노드끼리
 * 교차점 간선을 연결해 그래프를 엮는다. 마지막으로 분리된 컴포넌트를 최근접쌍으로
 * 봉합해 전체가 하나로 연결되도록 보장한다(Dijkstra가 항상 경로를 찾도록).
 */

import { metersBetween, type LonLat } from './geo';

export interface RoadNode {
  id: string;
  lon: number;
  lat: number;
}

export interface RoadEdge {
  to: string;
  weight: number; // meters
}

export interface RoadGraph {
  nodes: RoadNode[];
  nodeById: Map<string, RoadNode>;
  adjacency: Map<string, RoadEdge[]>;
}

export interface BuildOptions {
  /** 폴리라인 분할 최대 간격(m) */
  maxSegment?: number;
  /** 서로 다른 도로를 교차점으로 연결하는 최대 거리(m) */
  junctionRadius?: number;
}

function densify(path: LonLat[], maxSegment: number): LonLat[] {
  if (path.length === 0) return [];
  const out: LonLat[] = [path[0]!];
  for (let i = 1; i < path.length; i += 1) {
    const a = path[i - 1]!;
    const b = path[i]!;
    const steps = Math.max(1, Math.ceil(metersBetween(a, b) / maxSegment));
    for (let s = 1; s <= steps; s += 1) {
      const t = s / steps;
      out.push([a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t]);
    }
  }
  return out;
}

export function buildRoadGraph(lines: LonLat[][], options: BuildOptions = {}): RoadGraph {
  const maxSegment = options.maxSegment ?? 250;
  const junctionRadius = options.junctionRadius ?? 320;

  const nodes: RoadNode[] = [];
  const nodeById = new Map<string, RoadNode>();
  const adjacency = new Map<string, RoadEdge[]>();
  const lineOf: number[] = []; // node index → 소속 도로 인덱스

  const addNode = (point: LonLat, line: number): string => {
    const id = `N${nodes.length}`;
    const node = { id, lon: point[0], lat: point[1] };
    nodes.push(node);
    nodeById.set(id, node);
    adjacency.set(id, []);
    lineOf.push(line);
    return id;
  };

  const connect = (a: string, b: string): void => {
    if (a === b) return;
    const na = nodeById.get(a)!;
    const nb = nodeById.get(b)!;
    const w = metersBetween([na.lon, na.lat], [nb.lon, nb.lat]);
    // 중복 간선은 Dijkstra에 무해하지만, 봉합/교차에서 같은 쌍을 피한다.
    if (adjacency.get(a)!.some((e) => e.to === b)) return;
    adjacency.get(a)!.push({ to: b, weight: w });
    adjacency.get(b)!.push({ to: a, weight: w });
  };

  // 1) 폴리라인을 분할해 노드 + 선형 간선 생성
  lines.forEach((line, lineIndex) => {
    const pts = densify(line, maxSegment);
    let prev: string | null = null;
    for (const pt of pts) {
      const id = addNode(pt, lineIndex);
      if (prev) connect(prev, id);
      prev = id;
    }
  });

  // 2) 서로 다른 도로의 가까운 노드끼리 교차점 간선
  for (let i = 0; i < nodes.length; i += 1) {
    for (let j = i + 1; j < nodes.length; j += 1) {
      if (lineOf[i] === lineOf[j]) continue;
      const a = nodes[i]!;
      const b = nodes[j]!;
      if (metersBetween([a.lon, a.lat], [b.lon, b.lat]) <= junctionRadius) {
        connect(a.id, b.id);
      }
    }
  }

  // 3) 분리된 컴포넌트를 최근접쌍으로 봉합(전체 연결 보장)
  stitchComponents(nodes, nodeById, adjacency, connect);

  return { nodes, nodeById, adjacency };
}

function connectedComponents(
  nodes: RoadNode[],
  adjacency: Map<string, RoadEdge[]>,
): string[][] {
  const seen = new Set<string>();
  const comps: string[][] = [];
  for (const node of nodes) {
    if (seen.has(node.id)) continue;
    const comp: string[] = [];
    const queue = [node.id];
    seen.add(node.id);
    while (queue.length) {
      const id = queue.pop()!;
      comp.push(id);
      for (const edge of adjacency.get(id) ?? []) {
        if (!seen.has(edge.to)) {
          seen.add(edge.to);
          queue.push(edge.to);
        }
      }
    }
    comps.push(comp);
  }
  return comps;
}

function stitchComponents(
  nodes: RoadNode[],
  nodeById: Map<string, RoadNode>,
  adjacency: Map<string, RoadEdge[]>,
  connect: (a: string, b: string) => void,
): void {
  let comps = connectedComponents(nodes, adjacency);
  let guard = 0;
  while (comps.length > 1 && guard < nodes.length) {
    guard += 1;
    const base = comps[0]!;
    let best: { a: string; b: string; d: number } | null = null;
    for (const aId of base) {
      const a = nodeById.get(aId)!;
      for (let k = 1; k < comps.length; k += 1) {
        for (const bId of comps[k]!) {
          const b = nodeById.get(bId)!;
          const d = metersBetween([a.lon, a.lat], [b.lon, b.lat]);
          if (!best || d < best.d) best = { a: aId, b: bId, d };
        }
      }
    }
    if (!best) break;
    connect(best.a, best.b);
    comps = connectedComponents(nodes, adjacency);
  }
}

/** 좌표에 가장 가까운 노드 id(선형 탐색). */
export function nearestNode(graph: RoadGraph, point: LonLat): string {
  let bestId = graph.nodes[0]!.id;
  let bestD = Infinity;
  for (const node of graph.nodes) {
    const d = metersBetween([node.lon, node.lat], point);
    if (d < bestD) {
      bestD = d;
      bestId = node.id;
    }
  }
  return bestId;
}

/** 좌표 반경 안의 노드 id 목록(가까운 순). */
export function nodesWithin(graph: RoadGraph, point: LonLat, radius: number): string[] {
  return graph.nodes
    .map((n) => ({ id: n.id, d: metersBetween([n.lon, n.lat], point) }))
    .filter((n) => n.d <= radius)
    .sort((a, b) => a.d - b.d)
    .map((n) => n.id);
}
