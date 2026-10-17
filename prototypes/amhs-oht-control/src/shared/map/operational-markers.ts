import type { RailGraph, XY } from '@/entities/fab/rail-graph';

export type JunctionKind = 'merge' | 'split' | 'cross';

export interface JunctionMarker {
  id: string;
  at: XY;
  kind: JunctionKind;
  incoming: number;
  outgoing: number;
}

const keyOf = ([x, y]: XY) => `${x}:${y}`;

/** 운전자가 주의해야 하는 합류·분기·교차 노드를 rail 방향성으로 도출한다. */
export function deriveJunctionMarkers(graph: RailGraph): JunctionMarker[] {
  const nodes = new Map<
    string,
    { at: XY; incoming: number; outgoing: number }
  >();
  for (const segment of graph.segments) {
    const from = nodes.get(keyOf(segment.a)) ?? {
      at: segment.a,
      incoming: 0,
      outgoing: 0,
    };
    from.outgoing++;
    nodes.set(keyOf(segment.a), from);
    const to = nodes.get(keyOf(segment.b)) ?? {
      at: segment.b,
      incoming: 0,
      outgoing: 0,
    };
    to.incoming++;
    nodes.set(keyOf(segment.b), to);
  }

  return [...nodes.entries()]
    .filter(([, node]) => node.incoming > 1 || node.outgoing > 1)
    .map(([key, node], index) => ({
      id: `JCT-${index + 1}-${key}`,
      at: node.at,
      kind:
        node.incoming > 1 && node.outgoing > 1
          ? 'cross'
          : node.incoming > 1
            ? 'merge'
            : 'split',
      incoming: node.incoming,
      outgoing: node.outgoing,
    }));
}

/** OHT heading(0°=동쪽, 반시계)을 화면 삼각형 회전값으로 변환한다. */
export function headingToShapeRotation(heading: number): number {
  return Math.PI / 2 - (heading * Math.PI) / 180;
}
