import Feature, { type FeatureLike } from 'ol/Feature';
import OLMap from 'ol/Map';
import type MapBrowserEvent from 'ol/MapBrowserEvent';
import View from 'ol/View';
import GeoJSON from 'ol/format/GeoJSON';
import LineString from 'ol/geom/LineString';
import Point from 'ol/geom/Point';
import Heatmap from 'ol/layer/Heatmap';
import ImageLayer from 'ol/layer/Image';
import VectorLayer from 'ol/layer/Vector';
import WebGLPointsLayer from 'ol/layer/WebGLPoints';
import Static from 'ol/source/ImageStatic';
import VectorSource from 'ol/source/Vector';
import {
  Circle as CircleStyle,
  Fill,
  RegularShape,
  Stroke,
  Style,
  Text,
} from 'ol/style';
import type { BooleanExpression } from 'ol/style/flat';

import {
  buildRailGraph,
  nodeKeyOf,
  railGraphToGeoJSON,
  type RailGraph,
  type XY,
} from '@/entities/fab/rail-graph';
import { CODE_STATUS, STATUS_CODE } from '@/entities/oht/status';
import {
  STATUS_COLORS,
  type Coord,
  type OhtStatus,
  type VehicleState,
} from '@/entities/oht/types';
import type { BatchResult } from '@/shared/realtime/simulator-client';
import { fabBlueprintDataUrl } from './fab-blueprint';
import { nearestSegment } from './geometry';
import {
  deriveJunctionMarkers,
  headingToShapeRotation,
} from './operational-markers';
import {
  summarizeRenderLatency,
  type RenderStats,
} from './render-metrics';
import {
  diffVisibility,
  expandExtent,
  withinExtent,
  type Extent,
} from './viewport-cull';
import {
  FAB_CENTER,
  FAB_CODE,
  FAB_EXTENT,
  fabProjection,
} from './projection';

export interface StatusCounts {
  total: number;
  MOVING: number;
  IDLE: number;
  LOADING: number;
  UNLOADING: number;
  BLOCKED: number;
  DELAYED: number;
  DOWN: number;
}

export type LodMode = 'overview' | 'bay' | 'equipment';

export interface IndoorMap {
  map: OLMap;
  applyBatch: (batch: BatchResult) => void;
  getCounts: () => StatusCounts;
  getVehicle: (id: string) => VehicleState | undefined;
  getAllVehicles: () => VehicleState[];
  getRenderStats: () => RenderStats;
  /** [렌더 소스에 올라온 OHT 수, 전체 OHT 수] — 뷰포트 컬링 관측용 */
  getRenderedCount: () => [visible: number, total: number];
  setSelected: (id: string | null) => void;
  onSelect: (cb: (id: string | null) => void) => void;
  /** filterCode: -1=전체, 그 외는 statusCode */
  setFilterCode: (code: number) => void;
  setCargoFilter: (
    cargo: 'all' | 'loaded' | 'empty',
    hot: boolean,
  ) => void;
  onLod: (cb: (mode: LodMode) => void) => void;
  focusBay: (bayId: string | null) => void;
  focusEquipment: (equipmentId: string) => void;
  focusVehicle: (vehicleId: string) => void;
  focusRailSegment: (segmentId: string) => void;
  /** Zone별 밀도 집계 → 폴리곤 재색상. 정체(jam) 구간 수 반환 */
  updateCongestion: () => number;
  fit: () => void;
  dispose: () => void;
}

interface ZoneBox {
  id: string;
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
}

const LOD_BAY_RESOLUTION = 0.22;
const LOD_EQUIPMENT_RESOLUTION = 0.095;

// 뷰포트 밖 OHT를 렌더 소스에서 제외할 때, 가장자리 팝인을 줄이기 위한 여유 비율.
const CULL_MARGIN = 0.2;

const emptyCounts = (): StatusCounts => ({
  total: 0,
  MOVING: 0,
  IDLE: 0,
  LOADING: 0,
  UNLOADING: 0,
  BLOCKED: 0,
  DELAYED: 0,
  DOWN: 0,
});

export function createIndoorMap(target: HTMLElement): IndoorMap {
  const graph: RailGraph = buildRailGraph();
  const geo = railGraphToGeoJSON(graph);
  const format = new GeoJSON();
  const readOpts = {
    dataProjection: FAB_CODE,
    featureProjection: FAB_CODE,
  };

  // ---- FAB 도면 배경 이미지 (최하단) ----
  const blueprintLayer = new ImageLayer({
    source: new Static({
      url: fabBlueprintDataUrl(),
      imageExtent: FAB_EXTENT,
      projection: fabProjection,
    }),
    opacity: 0.9,
  });

  // ---- 정적 골격 레이어 ----
  const CONG_FILL = [
    'rgba(255,255,255,0.02)',
    'rgba(255,209,102,0.14)',
    'rgba(244,84,84,0.22)',
  ];
  const zoneSource = new VectorSource({
    features: format.readFeatures(geo.zones, readOpts),
  });
  const zoneLayer = new VectorLayer({
    source: zoneSource,
    style: (f) => {
      const cong = (f.get('cong') as number) ?? 0;
      const base =
        f.get('zoneType') === 'stocker' && cong === 0
          ? 'rgba(77,163,255,0.06)'
          : (CONG_FILL[cong] ?? CONG_FILL[0]!);
      return new Style({
        stroke: new Stroke({
          color: cong === 2 ? '#f4795b' : '#2a3346',
          width: cong === 2 ? 1.5 : 1,
        }),
        fill: new Fill({ color: base }),
      });
    },
  });

  // Zone bbox(정체 집계용) — ring에서 계산
  const zoneBoxes: ZoneBox[] = graph.zones.map((z) => {
    const xs = z.ring.map((p) => p[0]);
    const ys = z.ring.map((p) => p[1]);
    return {
      id: z.id,
      minX: Math.min(...xs),
      minY: Math.min(...ys),
      maxX: Math.max(...xs),
      maxY: Math.max(...ys),
    };
  });

  const railSource = new VectorSource({
    features: format.readFeatures(geo.rails, readOpts),
  });

  // Bay 내부의 청정 작업 aisle. 장비와 intrabay rail 사이의 서비스 띠를
  // 별도 레이어로 표현해 단순한 색상 박스가 아니라 운영 공간으로 읽히게 한다.
  const aisleSource = new VectorSource({
    features: graph.zones
      .filter((z) => z.type === 'intrabay')
      .flatMap((z) => {
        const xs = z.ring.map((p) => p[0]);
        const ys = z.ring.map((p) => p[1]);
        const minX = Math.min(...xs) + 1.5;
        const maxX = Math.max(...xs) - 1.5;
        const centerY = (Math.min(...ys) + Math.max(...ys)) / 2;
        return [-2.2, 2.2].map((offset) => {
          const feature = new Feature({
            geometry: new LineString([[minX, centerY + offset], [maxX, centerY + offset]]),
          });
          feature.set('bayId', z.id);
          return feature;
        });
      }),
  });
  const aisleLayer = new VectorLayer({
    source: aisleSource,
    style: (_feature, resolution) =>
      resolution > LOD_BAY_RESOLUTION
        ? undefined
        : new Style({
            stroke: new Stroke({ color: 'rgba(111,145,180,.42)', width: 1, lineDash: [3, 5] }),
          }),
  });

  // 장비의 Rail-facing 도킹 면과 내부 모듈 분할선. Load Port 원형 마커와
  // 결합되어 장비가 어느 방향으로 FOUP를 받는지 보여준다.
  const equipmentDetailSource = new VectorSource();
  for (const equipment of graph.equipment) {
    if (equipment.kind === 'stocker') continue;
    const bay = graph.zones.find((zone) => zone.id === `Z-${equipment.bayId}`);
    if (!bay) continue;
    const [minX, minY, maxX, maxY] = equipment.bounds;
    const bayYs = bay.ring.map((p) => p[1]);
    const bayY = (Math.min(...bayYs) + Math.max(...bayYs)) / 2;
    const aboveRail = (minY + maxY) / 2 > bayY;
    const dockY = aboveRail ? minY : maxY;
    const detailColor = equipment.kind === 'buffer' ? '#27c1a8' : '#8ca5c7';
    const dock = new Feature({
      geometry: new LineString([[minX, dockY], [maxX, dockY]]),
    });
    dock.set('detailType', 'dock');
    dock.set('detailColor', detailColor);
    equipmentDetailSource.addFeature(dock);
    const moduleCount = Math.max(2, equipment.portIds.length + 1);
    for (let i = 1; i < moduleCount; i += 1) {
      const x = minX + ((maxX - minX) * i) / moduleCount;
      const moduleLine = new Feature({
        geometry: new LineString([[x, minY + 0.7], [x, maxY - 0.7]]),
      });
      moduleLine.set('detailType', 'module');
      moduleLine.set('detailColor', detailColor);
      equipmentDetailSource.addFeature(moduleLine);
    }
  }
  const equipmentDetailLayer = new VectorLayer({
    source: equipmentDetailSource,
    style: (feature, resolution) =>
      resolution > LOD_BAY_RESOLUTION
        ? undefined
        : new Style({
            stroke: new Stroke({
              color: feature.get('detailColor') as string,
              width: feature.get('detailType') === 'dock' ? 1.6 : 0.7,
              lineDash: feature.get('detailType') === 'module' ? [2, 3] : undefined,
            }),
          }),
  });

  // Stocker는 하이웨이와 보관 랙 사이에 입출고 목이 있다는 점을 보여준다.
  const stockerDetailSource = new VectorSource();
  for (const equipment of graph.equipment.filter((item) => item.kind === 'stocker')) {
    const port = graph.ports.find((item) => item.id === equipment.portIds[0]);
    if (!port) continue;
    const [minX, minY, maxX, maxY] = equipment.bounds;
    const rackY = (minY + maxY) / 2;
    const io = new Feature({
      geometry: new LineString([[port.at[0], port.at[1]], [port.at[0], rackY]]),
    });
    io.set('detailType', 'stocker-io');
    stockerDetailSource.addFeature(io);
    const marker = new Feature({
      geometry: new Point([port.at[0], rackY]),
    });
    marker.set('detailType', 'stocker-marker');
    marker.set('rotation', port.at[1] < rackY ? Math.PI / 2 : -Math.PI / 2);
    stockerDetailSource.addFeature(marker);
  }
  const stockerDetailLayer = new VectorLayer({
    source: stockerDetailSource,
    style: (feature, resolution) => {
      if (resolution > LOD_BAY_RESOLUTION) return undefined;
      if (feature.get('detailType') === 'stocker-marker')
        return new Style({
          image: new RegularShape({
            points: 3,
            radius: resolution < LOD_EQUIPMENT_RESOLUTION ? 5 : 3.5,
            rotation: (feature.get('rotation') as number) ?? 0,
            fill: new Fill({ color: '#4da3ff' }),
            stroke: new Stroke({ color: '#d8edff', width: 0.8 }),
          }),
          text: resolution < LOD_EQUIPMENT_RESOLUTION
            ? new Text({ text: 'I/O', offsetY: 10, font: '700 8px ui-sans-serif', fill: new Fill({ color: '#9dcaff' }) })
            : undefined,
        });
      return new Style({ stroke: new Stroke({ color: '#4da3ff', width: 1.2, lineDash: [4, 3] }) });
    },
  });
  const railLayer = new VectorLayer({
    source: railSource,
    // 실제 OHT 레일처럼 외곽 하이웨이·교차 레인·intrabay·transfer를
    // 이중 선과 중앙 진행선으로 표현한다. 그래프의 lane 메타데이터는
    // 라우팅에는 영향을 주지 않고, 맵의 공간적 판독성만 높인다.
    style: (f) => {
      const closed = Boolean(f.get('closed'));
      const kind = f.get('kind') as string;
      const lane = f.get('lane') as string;
      const congestion = Number(f.get('congestion') ?? 0);
      const baseWidth = kind === 'interbay' ? 3.4 : kind === 'transfer' ? 2.8 : 2.1;
      const color = closed
        ? '#ff5470'
        : congestion >= 2
          ? '#f4795b'
          : congestion === 1
            ? '#d6a84a'
        : lane === 'high'
          ? '#668fc4'
          : lane === 'low'
            ? '#3d5f91'
            : kind === 'transfer'
              ? '#9b78c2'
              : kind === 'interbay'
                ? '#526b98'
                : '#43516d';
      const styles = [
        new Style({
          stroke: new Stroke({
            color: closed ? 'rgba(255,84,112,.22)' : 'rgba(4,9,18,.92)',
            width: baseWidth + 3.6,
            lineCap: 'round',
            lineJoin: 'round',
          }),
        }),
        new Style({
          stroke: new Stroke({
            color,
            width: closed ? baseWidth + 0.8 : baseWidth + (congestion >= 2 ? 0.8 : 0),
            lineCap: 'round',
            lineJoin: 'round',
          }),
        }),
      ];
      // 교차 코리도의 상·하행 레인은 얇은 밝은 중앙선을 추가해 한 줄짜리
      // 그래프가 아니라 두 개의 운영 레인으로 읽히게 한다.
      if (!closed && (lane === 'high' || lane === 'low')) {
        styles.push(new Style({
          stroke: new Stroke({ color: 'rgba(174,210,247,.72)', width: 0.8, lineDash: [5, 7] }),
        }));
      }
      return styles;
    },
  });

  // 장거리 레일에는 방향 화살표를 별도 레이어로 둔다. 배경 SVG의 정적
  // 화살표보다 선명하고, live map의 레인 색상과 같은 규칙을 공유한다.
  const railDirectionSource = new VectorSource({
    features: graph.segments
      .filter((segment) => segment.length >= 10)
      .map((segment) => {
        const feature = new Feature({
          geometry: new Point([
            (segment.a[0] + segment.b[0]) / 2,
            (segment.a[1] + segment.b[1]) / 2,
          ]),
        });
        feature.set('lane', segment.lane);
        feature.set(
          'rotation',
          Math.atan2(segment.b[1] - segment.a[1], segment.b[0] - segment.a[0]),
        );
        return feature;
      }),
  });
  const railDirectionLayer = new VectorLayer({
    source: railDirectionSource,
    style: (feature, resolution) => {
      if (resolution > LOD_EQUIPMENT_RESOLUTION) {
        const lane = feature.get('lane') as string;
        const color =
          lane === 'high' ? '#b9d9ff' :
          lane === 'low' ? '#7ea8d8' :
          lane === 'transfer' ? '#d4b8ef' : '#9ab9e2';
        return new Style({
          image: new RegularShape({
            points: 3,
            radius: resolution < LOD_BAY_RESOLUTION ? 4.5 : 3.5,
            rotation: (feature.get('rotation') as number) ?? 0,
            fill: new Fill({ color }),
            stroke: new Stroke({ color: 'rgba(5,10,18,.9)', width: 1 }),
          }),
        });
      }
      return undefined;
    },
  });

  const railCurveLayer = new VectorLayer({
    source: new VectorSource({
      features: format.readFeatures(geo.curves, readOpts),
    }),
    style: (feature) => {
      const kind = feature.get('kind') as string;
      const color = kind === 'transfer' ? '#9b78c2' : '#526b98';
      return [
        new Style({
          stroke: new Stroke({ color: 'rgba(4,9,18,.92)', width: 7.2, lineCap: 'round', lineJoin: 'round' }),
        }),
        new Style({
          stroke: new Stroke({ color, width: kind === 'transfer' ? 2.8 : 3.4, lineCap: 'round', lineJoin: 'round' }),
        }),
      ];
    },
  });

  // Bay 식별자는 배경 청사진에만 묻히지 않도록 별도 운영 라벨로 둔다.
  // overview에서는 숨기고 bay LOD에서만 표시해 9개 Bay가 한눈에 읽히게 한다.
  const bayLabelSource = new VectorSource({
    features: graph.zones
      .filter((z) => z.type === 'intrabay')
      .map((z) => {
        const xs = z.ring.map((p) => p[0]);
        const ys = z.ring.map((p) => p[1]);
        const feature = new Feature({
          geometry: new Point([Math.min(...xs) + 3, Math.max(...ys) - 2]),
        });
        feature.set('bayId', z.id.replace(/^Z-/, ''));
        feature.set('process', z.process);
        return feature;
      }),
  });
  const bayLabelLayer = new VectorLayer({
    source: bayLabelSource,
    style: (feature, resolution) => {
      if (resolution > LOD_BAY_RESOLUTION || resolution <= LOD_EQUIPMENT_RESOLUTION) return undefined;
      const process = feature.get('process') as string;
      const color =
        process === 'PHOTO' ? '#78a8ff' :
        process === 'ETCH' ? '#c59bff' :
        process === 'CVD' ? '#6be0cb' : '#ffc27d';
      return new Style({
        text: new Text({
          text: `${feature.get('bayId')} · ${process}`,
          font: '700 10px ui-sans-serif, system-ui',
          fill: new Fill({ color }),
          stroke: new Stroke({ color: 'rgba(5,10,18,.95)', width: 3 }),
          backgroundFill: new Fill({ color: 'rgba(8,12,19,.72)' }),
          padding: [2, 4, 2, 4],
          textAlign: 'left',
        }),
      });
    },
  });

  // 각 Process Bay의 intrabay 진입·이탈 게이트. 실제 FAB 도면처럼
  // Bay와 interbay 하이웨이의 경계를 읽을 수 있게 하는 운영 마커다.
  const bayGateSource = new VectorSource({
    features: graph.zones
      .filter((z) => z.type === 'intrabay')
      .flatMap((z) => {
        const ys = z.ring.map((p) => p[1]);
        const y = (Math.min(...ys) + Math.max(...ys)) / 2;
        return [
          { at: [26, y] as XY, type: 'ENTRY', process: z.process, bayId: z.id.replace(/^Z-/, '') },
          { at: [286, y] as XY, type: 'EXIT', process: z.process, bayId: z.id.replace(/^Z-/, '') },
        ].map((item) => {
          const feature = new Feature({ geometry: new Point(item.at) });
          feature.set('gateType', item.type);
          feature.set('process', item.process);
          feature.set('bayId', item.bayId);
          return feature;
        });
      }),
  });
  const bayGateLayer = new VectorLayer({
    source: bayGateSource,
    style: (feature, resolution) => {
      if (resolution > LOD_BAY_RESOLUTION) return undefined;
      const process = feature.get('process') as string;
      const color =
        process === 'PHOTO' ? '#78a8ff' :
        process === 'ETCH' ? '#c59bff' :
        process === 'CVD' ? '#6be0cb' : '#ffc27d';
      const entry = feature.get('gateType') === 'ENTRY';
      return new Style({
        image: new RegularShape({
          points: 4,
          radius: resolution < LOD_EQUIPMENT_RESOLUTION ? 5 : 4,
          angle: Math.PI / 4,
          rotation: entry ? 0 : Math.PI,
          fill: new Fill({ color: 'rgba(8,12,19,.95)' }),
          stroke: new Stroke({ color, width: 1.4 }),
        }),
        text:
          resolution < LOD_BAY_RESOLUTION
            ? new Text({
                text: entry ? 'ENTRY' : 'EXIT',
                offsetY: entry ? -12 : 12,
                font: '700 8px ui-sans-serif',
                fill: new Fill({ color }),
                backgroundFill: new Fill({ color: 'rgba(8,12,19,.84)' }),
                padding: [1, 3, 1, 3],
              })
            : undefined,
      });
    },
  });

  const junctionSource = new VectorSource({
    features: deriveJunctionMarkers(graph).map((junction) => {
      const feature = new Feature({ geometry: new Point(junction.at) });
      feature.set('kind', junction.kind);
      feature.set('incoming', junction.incoming);
      feature.set('outgoing', junction.outgoing);
      return feature;
    }),
  });
  const junctionLayer = new VectorLayer({
    source: junctionSource,
    style: (feature, resolution) => {
      const kind = feature.get('kind') as 'merge' | 'split' | 'cross';
      const color =
        kind === 'merge' ? '#ffd166' : kind === 'split' ? '#b776ff' : '#66d9ef';
      return new Style({
        image: new RegularShape({
          points: 4,
          radius: resolution < 0.095 ? 5 : 3.5,
          angle: Math.PI / 4,
          fill: new Fill({ color: 'rgba(8,12,19,.92)' }),
          stroke: new Stroke({ color, width: 1.5 }),
        }),
        text:
          resolution < 0.07
            ? new Text({
                text: kind === 'cross' ? 'XFER' : kind.toUpperCase(),
                offsetY: 12,
                font: '700 9px ui-sans-serif',
                fill: new Fill({ color }),
                backgroundFill: new Fill({ color: 'rgba(8,12,19,.82)' }),
                padding: [1, 3, 1, 3],
              })
            : undefined,
      });
    },
  });

  const turntableSource = new VectorSource({
    features: graph.turntables.map((tt) => {
      const feature = new Feature({ geometry: new Point(tt.at) });
      feature.set('ttKind', tt.kind);
      return feature;
    }),
  });
  const turntableLayer = new VectorLayer({
    source: turntableSource,
    style: (feature, resolution) => {
      const kind = feature.get('ttKind') as 'transfer' | 'corner';
      const color = kind === 'corner' ? '#7f93b3' : '#ffcf6b';
      return new Style({
        image: new RegularShape({
          points: 8,
          radius: resolution < 0.095 ? 5.5 : 4,
          fill: new Fill({ color: 'rgba(13,21,38,.95)' }),
          stroke: new Stroke({ color, width: 1.4 }),
        }),
        text:
          resolution < 0.06
            ? new Text({
                text: 'TT',
                offsetY: -12,
                font: '700 8px ui-sans-serif',
                fill: new Fill({ color }),
                backgroundFill: new Fill({ color: 'rgba(8,12,19,.82)' }),
                padding: [1, 3, 1, 3],
              })
            : undefined,
      });
    },
  });

  const zcuSource = new VectorSource({
    features: graph.zcus.map((z) => {
      const feature = new Feature({ geometry: new Point(z.at) });
      feature.set('zcuType', z.type);
      feature.set('active', false);
      feature.set(
        'controlledSegments',
        (graph.adjacency.get(nodeKeyOf(z.at)) ?? []).map(
          (segment) => graph.segments[segment]!.id,
        ),
      );
      return feature;
    }),
  });
  const zcuLayer = new VectorLayer({
    source: zcuSource,
    visible: false, // equipment LOD에서만 표시(합류 마커와 겹침 최소화)
    style: (feature, resolution) => {
      const type = feature.get('zcuType') as 'STOP' | 'RESET';
      const active = Boolean(feature.get('active'));
      const color = type === 'STOP' ? '#ff5470' : '#66d9ef';
      return new Style({
        image: new RegularShape({
          points: type === 'STOP' ? 8 : 4,
          radius: resolution < 0.095 ? 5 : 3.5,
          angle: Math.PI / 4,
          fill: new Fill({ color: active ? `${color}55` : 'rgba(8,12,19,.6)' }),
          stroke: new Stroke({ color, width: active ? 2.4 : 1.3 }),
        }),
        text:
          resolution < 0.05
            ? new Text({
                text: active ? `${type} · BUSY` : type,
                offsetY: 11,
                font: '700 8px ui-sans-serif',
                fill: new Fill({ color }),
                backgroundFill: new Fill({ color: 'rgba(8,12,19,.82)' }),
                padding: [1, 3, 1, 3],
              })
            : undefined,
      });
    },
  });

  const equipmentLayer = new VectorLayer({
    source: new VectorSource({
      features: format.readFeatures(geo.equipment, readOpts),
    }),
    style: (f, resolution) => {
      const process = f.get('process');
      const color =
        process === 'PHOTO'
          ? '#4f8cff'
          : process === 'ETCH'
            ? '#b776ff'
            : process === 'CVD'
              ? '#27c1a8'
              : process === 'CMP'
                ? '#f0a65a'
                : '#45a8d8';
      const down = f.get('operatingStatus') === 'DOWN';
      return new Style({
        stroke: new Stroke({
          color: down ? '#ff5470' : color,
          width: down ? 3 : resolution < 0.12 ? 2 : 1,
        }),
        fill: new Fill({
          color: down
            ? 'rgba(255,84,112,0.2)'
            : 'rgba(14,21,33,0.72)',
        }),
        text:
          resolution < 0.17
            ? new Text({
                text: f.get('equipmentId'),
                font: '600 11px ui-sans-serif, system-ui',
                fill: new Fill({ color: '#d7e1ee' }),
                backgroundFill: new Fill({ color: 'rgba(8,12,19,.72)' }),
                padding: [2, 4, 2, 4],
              })
            : undefined,
      });
    },
  });

  const portLayer = new VectorLayer({
    source: new VectorSource({
      features: format.readFeatures(geo.ports, readOpts),
    }),
    style: (f, resolution) =>
      f.get('operatingStatus') === 'DOWN'
        ? new Style({
            image: new CircleStyle({
              radius: 6,
              fill: new Fill({ color: '#ff5470' }),
              stroke: new Stroke({ color: '#ffffff', width: 1.5 }),
            }),
            text: new Text({
              text: `${f.get('portId')} · DOWN`,
              offsetY: 15,
              font: '700 10px ui-sans-serif',
              fill: new Fill({ color: '#ff8ca0' }),
              backgroundFill: new Fill({ color: 'rgba(8,12,19,.9)' }),
              padding: [2, 4, 2, 4],
            }),
          })
        : f.get('storageStatus') === 'SATURATED'
          ? new Style({
              image: new CircleStyle({
                radius: 7,
                fill: new Fill({ color: '#f4795b' }),
                stroke: new Stroke({ color: '#ffd166', width: 2 }),
              }),
              text: new Text({
                text: `${f.get('portId')} · FULL`,
                offsetY: 16,
                font: '700 10px ui-sans-serif',
                fill: new Fill({ color: '#ffd166' }),
                backgroundFill: new Fill({ color: 'rgba(8,12,19,.9)' }),
                padding: [2, 4, 2, 4],
              }),
            })
        : f.get('kind') === 'stocker'
        ? new Style({
            image: new CircleStyle({
              radius: 5,
              fill: new Fill({ color: 'rgba(77,163,255,0.25)' }),
              stroke: new Stroke({ color: '#4da3ff', width: 1.2 }),
            }),
            text:
              resolution < 0.16
                ? new Text({
                    text: f.get('portId'),
                    offsetY: 13,
                    font: '600 10px ui-sans-serif',
                    fill: new Fill({ color: '#9db9dc' }),
                  })
                : undefined,
          })
        : f.get('kind') === 'buffer'
          ? new Style({
              image: new CircleStyle({
                radius: 4,
                fill: new Fill({ color: '#173c43' }),
                stroke: new Stroke({ color: '#27c1a8', width: 1.4 }),
              }),
              text:
                resolution < 0.11
                  ? new Text({
                      text: f.get('portId'),
                      offsetY: 11,
                      font: '600 9px ui-sans-serif',
                      fill: new Fill({ color: '#88cfc5' }),
                    })
                  : undefined,
            })
                : new Style({
                    image: new CircleStyle({
                      radius: resolution < 0.12 ? 3.5 : 2.2,
                      fill: new Fill({
                        color:
                          Number(f.get('portOccupied') ?? 0) >= Number(f.get('portCapacity') ?? 1)
                            ? '#8d3f4d'
                            : Number(f.get('portOccupied') ?? 0) > 0
                              ? '#285e68'
                              : Number(f.get('portReserved') ?? 0) > 0
                                ? '#725b2a'
                                : '#2f3a52',
                      }),
                      stroke: new Stroke({
                        color:
                          Number(f.get('portOccupied') ?? 0) >= Number(f.get('portCapacity') ?? 1)
                            ? '#ff8b70'
                            : Number(f.get('portReserved') ?? 0) > 0
                              ? '#ffd166'
                              : '#516079',
                        width: Number(f.get('portReserved') ?? 0) > 0 ? 1.2 : 0.5,
                      }),
                    }),
                    text:
                      resolution < 0.085
                        ? new Text({
                            text: `${f.get('portId')} · ${f.get('portOccupied') ?? 0}/${f.get('portCapacity') ?? 1}${Number(f.get('portReserved') ?? 0) > 0 ? ` · R${f.get('portReserved')}` : ''}`,
                            offsetY: 11,
                            font: '600 9px ui-sans-serif',
                            fill: new Fill({
                              color: Number(f.get('portReserved') ?? 0) > 0 ? '#ffd166' : '#9aabc1',
                            }),
                          })
                        : undefined,
          }),
  });

  // ---- OHT 소스 ----
  // featureById가 전체 모델(모든 OHT), vehicleSource는 화면에 보이는 부분집합만
  // 담는 렌더 소스다(WebGL/Heatmap 공유). 줌인 시 뷰포트 밖 OHT를 제외해 매 프레임
  // 재생성되는 WebGL 정점 버퍼 비용을 "전체 대수"가 아니라 "보이는 대수"에 비례시킨다.
  const vehicleSource = new VectorSource<Feature<Point>>({});
  const featureById = new Map<string, Feature<Point>>();
  // 현재 vehicleSource(렌더 소스)에 올라와 있는 OHT id 집합.
  const renderedIds = new Set<string>();
  const CULL_REFRESH_MS = 250;
  let lastCullSyncAt = 0;
  const routeById = new Map<string, Coord[]>();
  let selectedId: string | null = null;
  let filterCode = -1;
  let cargoCode = -1;
  let hotOnly = false;
  const matches = (f: FeatureLike) =>
    (filterCode === -1 || f.get('statusCode') === filterCode) &&
    (cargoCode === -1 || f.get('loadedCode') === cargoCode) &&
    (!hotOnly || f.get('priority') === 3);
  const filterExpression: BooleanExpression = [
    'all',
    [
      'any',
      ['==', ['var', 'filterCode'], -1],
      ['==', ['get', 'statusCode'], ['var', 'filterCode']],
    ],
    [
      'any',
      ['==', ['var', 'cargoCode'], -1],
      ['==', ['get', 'loadedCode'], ['var', 'cargoCode']],
    ],
    [
      'any',
      ['==', ['var', 'hotOnly'], 0],
      ['==', ['get', 'priority'], 3],
    ],
  ];

  // 상태별 색상 표현식(statusCode 기반)
  const colorExpr: Array<string | number | Array<string>> = [
    'match',
    ['get', 'statusCode'],
  ];
  CODE_STATUS.forEach((s, code) =>
    colorExpr.push(code, STATUS_COLORS[s]),
  );
  colorExpr.push('#ffffff');

  const webglLayer = new WebGLPointsLayer({
    source: vehicleSource,
    variables: { filterCode: -1, cargoCode: -1, hotOnly: 0 },
    filter: filterExpression,
    style: {
      'circle-radius': [
        'interpolate',
        ['linear'],
        ['zoom'],
        2,
        2,
        8,
        4.5,
      ],
      'circle-fill-color': colorExpr,
      'circle-stroke-color': [
        'case',
        ['==', ['get', 'priority'], 3],
        '#ff79c6',
        ['==', ['get', 'loadedCode'], 1],
        '#ffffff',
        'rgba(0,0,0,0.35)',
      ],
      'circle-stroke-width': 1.2,
      'circle-displacement': [0, 0],
    },
  } as unknown as ConstructorParameters<typeof WebGLPointsLayer>[0]);

  // 설비 확대에서는 원형 점 대신 진행 방향과 적재 상태를 읽을 수 있는 OHT 심벌을 사용한다.
  const vehicleDetailLayer = new VectorLayer({
    source: vehicleSource,
    visible: false,
    declutter: true,
    style: (feature, resolution) => {
      if (!matches(feature)) return undefined;
      const status = feature.get('status') as OhtStatus;
      const loaded = feature.get('loadedCode') === 1;
      const hot = feature.get('priority') === 3;
      const heading = (feature.get('heading') as number) ?? 0;
      const vehicle = feature.get('vehicle') as VehicleState;
      const dockState = vehicle.dockState;
      const label = loaded
        ? `${vehicle.id} · ${vehicle.carrierId ?? 'FOUP'}${dockState ? ` · ${dockState}` : ''}`
        : `${vehicle.id}${dockState ? ` · ${dockState}` : ''}`;
      const dockColor =
        dockState === 'WAITING' ? '#ff8b70' :
        dockState === 'TRANSFERRING' ? '#ffd166' :
        dockState === 'DOCKED' ? '#66d9ef' :
        dockState === 'RELEASING' ? '#9be28f' : undefined;
      return new Style({
        image: new RegularShape({
          points: 3,
          radius: loaded ? 8 : 7,
          rotation: headingToShapeRotation(heading),
          rotateWithView: true,
          fill: new Fill({ color: STATUS_COLORS[status] }),
          stroke: new Stroke({
            color: hot ? '#ff79c6' : dockColor ?? (loaded ? '#ffffff' : '#0b111c'),
            width: hot ? 2.5 : loaded ? 2 : 1.2,
          }),
        }),
        text:
          resolution < 0.055
            ? new Text({
                text: label,
                offsetY: 14,
                font: hot
                  ? '700 10px ui-sans-serif'
                  : '600 9px ui-sans-serif',
                fill: new Fill({ color: hot ? '#ff9bd4' : '#d7e1ee' }),
                backgroundFill: new Fill({ color: 'rgba(8,12,19,.84)' }),
                padding: [2, 3, 2, 3],
              })
            : undefined,
      });
    },
  });

  // 저배터리·충전 OHT를 링으로 강조(overview 제외 차량 LOD). 대상이 소수라 비용이 작다.
  const batteryLayer = new VectorLayer({
    source: vehicleSource,
    style: (feature) => {
      if (!matches(feature)) return undefined;
      const charging = feature.get('chargingCode') === 1;
      const battery = feature.get('battery') as number | undefined;
      const low = typeof battery === 'number' && battery <= 20;
      if (!charging && !low) return undefined;
      const color = charging
        ? '#27c1a8'
        : (battery ?? 100) <= 10
          ? '#ff5470'
          : '#ffd166';
      return new Style({
        image: new CircleStyle({
          radius: 9,
          fill: new Fill({ color: 'rgba(0,0,0,0)' }),
          stroke: new Stroke({ color, width: 2 }),
        }),
      });
    },
  });

  const heatmapLayer = new Heatmap({
    source: vehicleSource,
    blur: 14,
    radius: 8,
    weight: () => 0.7,
    filter: filterExpression,
    variables: { filterCode: -1, cargoCode: -1, hotOnly: 0 },
    visible: false,
  });

  // ---- 선택/경로 오버레이 (선택 OHT + 최근접 레일 세그먼트) ----
  const overlaySource = new VectorSource();
  const overlayLayer = new VectorLayer({
    source: overlaySource,
    style: (f) => {
      const kind = f.get('kind');
      if (kind === 'route') {
        return new Style({
          stroke: new Stroke({ color: '#ffd166', width: 4 }),
        });
      }
      if (kind === 'heading') {
        return new Style({
          stroke: new Stroke({ color: '#ffffff', width: 2 }),
        });
      }
      return new Style({
        image: new CircleStyle({
          radius: 6,
          fill: new Fill({ color: 'rgba(255,255,255,0.15)' }),
          stroke: new Stroke({ color: '#ffffff', width: 1.5 }),
        }),
      });
    },
  });

  const view = new View({
    projection: fabProjection,
    center: FAB_CENTER,
    resolution: 0.18,
    constrainResolution: false,
    showFullExtent: true,
  });

  const map = new OLMap({
    target,
    layers: [
      blueprintLayer,
      zoneLayer,
      aisleLayer,
      bayLabelLayer,
      bayGateLayer,
      equipmentLayer,
      equipmentDetailLayer,
      stockerDetailLayer,
      railLayer,
      railCurveLayer,
      railDirectionLayer,
      junctionLayer,
      turntableLayer,
      zcuLayer,
      portLayer,
      heatmapLayer,
      webglLayer,
      vehicleDetailLayer,
      batteryLayer,
      overlayLayer,
    ],
    view,
    controls: [],
  });
  const renderSamples: number[] = [];
  let pendingRenderAt: number | null = null;
  // rendercomplete는 연속 스트림 중 소스가 유휴 상태가 되지 않으면
  // 발생하지 않는다. postrender는 해당 지도 프레임 합성이 끝난 시점이다.
  const onRenderComplete = () => {
    if (pendingRenderAt === null) return;
    renderSamples.push(performance.now() - pendingRenderAt);
    if (renderSamples.length > 120) renderSamples.shift();
    pendingRenderAt = null;
  };
  map.on('postrender', onRenderComplete);

  // ---- LOD 전환 ----
  const lodListeners: Array<(m: LodMode) => void> = [];
  let lod: LodMode = 'bay';
  const updateLod = () => {
    const res = view.getResolution() ?? 0.18;
    const next: LodMode =
      res > LOD_BAY_RESOLUTION
        ? 'overview'
        : res > LOD_EQUIPMENT_RESOLUTION
          ? 'bay'
          : 'equipment';
    if (next === lod) return;
    lod = next;
    heatmapLayer.setVisible(next === 'overview');
    webglLayer.setVisible(next === 'bay');
    vehicleDetailLayer.setVisible(next === 'equipment');
    batteryLayer.setVisible(next !== 'overview');
    overlayLayer.setVisible(next !== 'overview');
    junctionLayer.setVisible(next !== 'overview');
    turntableLayer.setVisible(next !== 'overview');
    railDirectionLayer.setVisible(next !== 'equipment');
    zcuLayer.setVisible(next !== 'overview');
    portLayer.setVisible(next !== 'overview');
    bayGateLayer.setVisible(next !== 'overview');
    equipmentLayer.setOpacity(next === 'overview' ? 0.55 : 1);
    syncRenderSource(true);
    for (const cb of lodListeners) cb(next);
  };
  view.on('change:resolution', updateLod);

  // ---- 선택 처리 ----
  const selectListeners: Array<(id: string | null) => void> = [];
  const setSelected = (id: string | null) => {
    selectedId = id;
    updateSelectionOverlay();
    for (const cb of selectListeners) cb(id);
  };

  const updateSelectionOverlay = () => {
    overlaySource.clear(true);
    if (!selectedId) {
      overlaySource.changed();
      return;
    }
    const f = featureById.get(selectedId);
    if (!f || !matches(f)) {
      overlaySource.changed();
      return;
    }
    const [x, y] = f.getGeometry()!.getCoordinates();
    const p: XY = [x ?? 0, y ?? 0];
    const feats: Feature[] = [];

    // 실제 Job 경로(폴리라인) 하이라이트. 없으면 최근접 세그먼트로 폴백.
    const poly = routeById.get(selectedId);
    if (poly && poly.length >= 2) {
      const route = new Feature({
        geometry: new LineString(poly.map((c) => [c[0], c[1]])),
      });
      route.set('kind', 'route');
      feats.push(route);
    } else {
      const best = nearestSegment(p, graph.segments);
      if (best) {
        const route = new Feature({
          geometry: new LineString([best.a, best.b]),
        });
        route.set('kind', 'route');
        feats.push(route);
      }
    }

    // heading 방향 인디케이터(짧은 선)
    const heading =
      ((f.get('heading') as number) ?? 0) * (Math.PI / 180);
    const hx = p[0] + Math.cos(heading) * 2.4;
    const hy = p[1] + Math.sin(heading) * 2.4;
    const dir = new Feature({
      geometry: new LineString([p, [hx, hy]]),
    });
    dir.set('kind', 'heading');
    feats.push(dir);

    const marker = new Feature({ geometry: new Point(p) });
    marker.set('kind', 'sel');
    feats.push(marker);

    overlaySource.addFeatures(feats);
    overlaySource.changed();
  };

  // 클릭 → 최근접 OHT 선택 (WebGL 히트검출 대신 좌표 스캔으로 견고하게)
  const onClick = (ev: MapBrowserEvent) => {
    const coord = map.getCoordinateFromPixel(ev.pixel);
    if (!coord) return;
    const cx = coord[0] ?? 0;
    const cy = coord[1] ?? 0;
    const tol = (view.getResolution() ?? 0.18) * 8; // 픽셀 반경 ≈ 8px
    let hit: string | null = null;
    let bestD = tol;
    featureById.forEach((f, id) => {
      if (!matches(f)) return;
      const [x, y] = f.getGeometry()!.getCoordinates();
      const d = Math.hypot((x ?? 0) - cx, (y ?? 0) - cy);
      if (d < bestD) {
        bestD = d;
        hit = id;
      }
    });
    setSelected(hit);
  };
  map.on('click', onClick);

  // ---- 배치 반영 ----
  const makeFeature = (v: VehicleState): Feature<Point> => {
    const f = new Feature({ geometry: new Point([v.x, v.y]) });
    f.setId(v.id);
    f.set('id', v.id, true);
    f.set('statusCode', STATUS_CODE[v.status], true);
    f.set('status', v.status, true);
    f.set('jobId', v.jobId, true);
    f.set('speed', v.speed, true);
    f.set('heading', v.heading, true);
    f.set('vehicle', { ...v }, true);
    f.set('loadedCode', v.loaded ? 1 : 0, true);
    f.set('priority', v.priority ?? 0, true);
    f.set('battery', v.battery ?? 100, true);
    f.set('chargingCode', v.phase === 'CHARGING' ? 1 : 0, true);
    return f;
  };

  // 렌더 소스를 현재 뷰포트에 보이는 OHT로 맞춘다.
  // overview LOD(밀집도 히트맵)나 지도 크기 미확정 시에는 전체를 유지한다.
  const syncRenderSource = (force = false) => {
    const now = performance.now();
    if (!force && now - lastCullSyncAt < CULL_REFRESH_MS) return;
    lastCullSyncAt = now;
    const size = map.getSize();
    const extent: Extent | null =
      lod !== 'overview' && size
        ? expandExtent(
            view.calculateExtent(size) as Extent,
            CULL_MARGIN,
          )
        : null;

    const visible = new Set<string>();
    for (const [id, f] of featureById) {
      if (!extent) {
        visible.add(id);
        continue;
      }
      const [x, y] = f.getGeometry()!.getCoordinates();
      if (withinExtent(x ?? 0, y ?? 0, extent)) visible.add(id);
    }

    const { add, remove } = diffVisibility(renderedIds, visible);
    for (const id of remove) {
      const f = vehicleSource.getFeatureById(id);
      if (f) vehicleSource.removeFeature(f);
      renderedIds.delete(id);
    }
    if (add.length) {
      const feats: Feature<Point>[] = [];
      for (const id of add) {
        const f = featureById.get(id);
        if (!f) continue;
        feats.push(f);
        renderedIds.add(id);
      }
      vehicleSource.addFeatures(feats);
    }
    if (add.length || remove.length) vehicleSource.changed();
  };

  // 일시정지 중 pan/zoom(배치 미수신)에도 보이는 집합을 다시 맞춘다.
  map.on('moveend', () => syncRenderSource(true));

  const applyBatch = (batch: BatchResult) => {
    if (pendingRenderAt === null) pendingRenderAt = performance.now();
    let vehicleChanged = false;
    let needsRender = Boolean(batch.operations || batch.snapshot);
    if (batch.operations) {
      const incident = batch.operations.incident;
      const portById = new Map(
        batch.operations.ports.map((port) => [port.id, port]),
      );
      for (const feature of equipmentLayer.getSource()!.getFeatures())
        feature.set(
          'operatingStatus',
          incident?.equipmentId === feature.get('equipmentId')
            ? 'DOWN'
            : 'RUN',
          true,
        );
      for (const feature of portLayer.getSource()!.getFeatures())
        {
          const port = portById.get(feature.get('portId'));
          feature.set(
            'operatingStatus',
            incident?.portId === feature.get('portId')
              ? 'DOWN'
              : 'AVAILABLE',
            true,
          );
          feature.set(
            'storageStatus',
            batch.operations.saturation?.portId === feature.get('portId')
              ? 'SATURATED'
              : 'AVAILABLE',
            true,
          );
          feature.set('portOccupied', port?.occupied ?? 0, true);
          feature.set('portReserved', port?.reserved ?? 0, true);
          feature.set('portCapacity', port?.capacity ?? feature.get('capacity') ?? 1, true);
        }
      const closedIds = new Set(batch.operations.closure?.segmentIds ?? []);
      for (const feature of railLayer.getSource()!.getFeatures())
        feature.set('closed', closedIds.has(feature.get('railId')), true);
      const busySegments = new Set(batch.operations.traffic?.junctionSegmentIds ?? []);
      for (const feature of zcuSource.getFeatures())
        feature.set(
          'active',
          feature.get('zcuType') === 'STOP' &&
            (feature.get('controlledSegments') as string[]).some((id) => busySegments.has(id)),
          true,
        );
      equipmentLayer.changed();
      portLayer.changed();
      railLayer.changed();
      zcuSource.changed();
    }
    if (batch.snapshot) {
      // 초기 연결·fleet 변경·재동기 snapshot부터 새 측정 구간으로 본다.
      renderSamples.length = 0;
      pendingRenderAt = performance.now();
      vehicleSource.clear(true);
      renderedIds.clear();
      featureById.clear();
      routeById.clear();
      for (const v of batch.snapshot) {
        featureById.set(v.id, makeFeature(v));
        if (v.route && v.route.length >= 2)
          routeById.set(v.id, v.route);
      }
      lastCullSyncAt = 0;
      // 렌더 소스 채우기는 syncRenderSource가 뷰포트에 맞춰 처리한다.
    }

    for (const v of batch.additions ?? []) {
      const old = featureById.get(v.id);
      if (old) {
        const inSource = vehicleSource.getFeatureById(v.id);
        if (inSource) vehicleSource.removeFeature(inSource);
        renderedIds.delete(v.id);
      }
      featureById.set(v.id, makeFeature(v));
      routeById.set(v.id, v.route ?? []);
      vehicleChanged = true;
    }
    for (const id of batch.deletions ?? []) {
      const f = vehicleSource.getFeatureById(id);
      if (f) vehicleSource.removeFeature(f);
      featureById.delete(id);
      routeById.delete(id);
      renderedIds.delete(id);
      vehicleChanged = true;
    }

    // (재)배정된 Job의 경로 갱신
    for (const job of batch.jobs) {
      if (job.route.length >= 2) routeById.set(job.id, job.route);
      const f = featureById.get(job.id);
      if (f) f.set('jobId', job.jobId, true);
    }

    for (const u of batch.updates) {
      const f = featureById.get(u.id);
      if (!f) continue;
      const previous = f.get('vehicle') as VehicleState;
      f.set('vehicle', { ...previous, ...u }, true);
      if (u.route !== undefined) routeById.set(u.id, u.route);
      if (u.loaded !== undefined)
        f.set('loadedCode', u.loaded ? 1 : 0, true);
      if (u.priority !== undefined)
        f.set('priority', u.priority, true);
      if (typeof u.x === 'number' || typeof u.y === 'number') {
        const current = f.getGeometry()!.getCoordinates();
        f.getGeometry()!.setCoordinates([
          u.x ?? current[0]!,
          u.y ?? current[1]!,
        ]);
      }
      if (u.status) {
        f.set('statusCode', STATUS_CODE[u.status], true);
        f.set('status', u.status, true);
      }
      if (u.jobId !== undefined) f.set('jobId', u.jobId, true);
      if (typeof u.speed === 'number') f.set('speed', u.speed, true);
      if (typeof u.heading === 'number')
        f.set('heading', u.heading, true);
      if (typeof u.battery === 'number') f.set('battery', u.battery, true);
      if (u.phase !== undefined)
        f.set('chargingCode', u.phase === 'CHARGING' ? 1 : 0, true);
      vehicleChanged = true;
    }
    syncRenderSource();
    if (selectedId && !featureById.has(selectedId)) setSelected(null);
    if (selectedId) updateSelectionOverlay();
    if (vehicleChanged) {
      vehicleSource.changed();
      needsRender = true;
    }
    if (needsRender) map.render();
  };

  const getCounts = (): StatusCounts => {
    const c = emptyCounts();
    featureById.forEach((f) => {
      const s = (f.get('status') as OhtStatus) ?? 'MOVING';
      c[s] += 1;
      c.total += 1;
    });
    return c;
  };

  const readVehicle = (
    f: Feature<Point>,
    id: string,
  ): VehicleState => {
    const [x, y] = f.getGeometry()!.getCoordinates();
    return {
      ...(f.get('vehicle') as VehicleState),
      id,
      x: x ?? 0,
      y: y ?? 0,
      heading: (f.get('heading') as number) ?? 0,
      status: (f.get('status') as OhtStatus) ?? 'MOVING',
      jobId: (f.get('jobId') as string | null) ?? null,
      speed: (f.get('speed') as number) ?? 0,
    };
  };

  const getVehicle = (id: string): VehicleState | undefined => {
    const f = featureById.get(id);
    return f ? readVehicle(f, id) : undefined;
  };

  const getAllVehicles = (): VehicleState[] => {
    const out: VehicleState[] = [];
    featureById.forEach((f, id) => out.push(readVehicle(f, id)));
    return out;
  };

  const zoneFeatById = new Map<
    string,
    ReturnType<typeof zoneSource.getFeatures>[number]
  >();
  zoneSource
    .getFeatures()
    .forEach((f) => zoneFeatById.set(f.get('zoneId') as string, f));
  const railFeatById = new Map<string, Feature>();
  railSource
    .getFeatures()
    .forEach((f) => railFeatById.set(f.get('railId') as string, f as Feature));

  const updateCongestion = (): number => {
    // Zone별 개체 수 집계
    const counts = new Map<string, number>();
    for (const zb of zoneBoxes) counts.set(zb.id, 0);
    featureById.forEach((f) => {
      const [x, y] = f.getGeometry()!.getCoordinates();
      const px = x ?? 0;
      const py = y ?? 0;
      for (const zb of zoneBoxes) {
        if (
          px >= zb.minX &&
          px <= zb.maxX &&
          py >= zb.minY &&
          py <= zb.maxY
        ) {
          counts.set(zb.id, (counts.get(zb.id) ?? 0) + 1);
          break;
        }
      }
    });
    // 평균 대비 상대적 혼잡도(fleet 크기와 무관하게 핫스팟 강조)
    const vals = Array.from(counts.values());
    const mean =
      vals.reduce((a, b) => a + b, 0) / Math.max(vals.length, 1);
    let jams = 0;
    let changed = false;
    counts.forEach((c, id) => {
      let level = 0;
      if (c >= 8 && c > mean * 1.7) level = 2;
      else if (c >= 5 && c > mean * 1.25) level = 1;
      if (level === 2) jams += 1;
      const zf = zoneFeatById.get(id);
      if (zf && (zf.get('cong') as number) !== level) {
        zf.set('cong', level, true);
        changed = true;
      }
    });
    // 엔진이 방출한 현재 점유 세그먼트 ID를 이용해 Rail 자체도
    // 저밀도/혼잡/정체 단계로 색칠한다. 위치 근접 계산을 반복하지 않아
    // 5,000대에서도 4Hz 진단 폴링 비용을 일정하게 유지한다.
    const railCounts = new Map<string, number>();
    featureById.forEach((f) => {
      const vehicle = f.get('vehicle') as VehicleState;
      if (vehicle.status === 'IDLE' || vehicle.status === 'DOWN') return;
      const segmentId = vehicle.segmentId;
      if (segmentId) railCounts.set(segmentId, (railCounts.get(segmentId) ?? 0) + 1);
    });
    railFeatById.forEach((rf, id) => {
      const count = railCounts.get(id) ?? 0;
      const level = count >= 8 ? 2 : count >= 4 ? 1 : 0;
      if (Number(rf.get('congestion') ?? 0) !== level) {
        rf.set('congestion', level, true);
        changed = true;
      }
    });
    if (changed) {
      zoneSource.changed();
      railSource.changed();
    }
    return jams;
  };

  const fit = () => {
    const size = map.getSize();
    if (size && size[0] && size[1]) {
      view.fit(FAB_EXTENT, { size, padding: [28, 28, 28, 28] });
      updateLod();
    }
  };

  const focusBay = (bayId: string | null) => {
    if (!bayId) {
      fit();
      return;
    }
    const zone = graph.zones.find((z) => z.id === `Z-${bayId}`);
    const size = map.getSize();
    if (!zone || !size) return;
    const xs = zone.ring.map((p) => p[0]);
    const ys = zone.ring.map((p) => p[1]);
    view.fit([Math.min(...xs), Math.min(...ys), Math.max(...xs), Math.max(...ys)], {
      size,
      padding: [70, 70, 70, 70],
      duration: 350,
      maxZoom: 8,
    });
  };

  const focusEquipment = (equipmentId: string) => {
    const equipment = graph.equipment.find((e) => e.id === equipmentId);
    const size = map.getSize();
    if (!equipment || !size) return;
    view.fit(equipment.bounds, {
      size,
      padding: [130, 130, 130, 130],
      duration: 350,
      maxZoom: 10,
    });
  };

  const focusVehicle = (vehicleId: string) => {
    const feature = featureById.get(vehicleId);
    if (!feature) return;
    setSelected(vehicleId);
    view.animate({
      center: feature.getGeometry()!.getCoordinates(),
      resolution: Math.min(view.getResolution() ?? 0.08, 0.08),
      duration: 350,
    });
  };

  const focusRailSegment = (segmentId: string) => {
    const segment = graph.segments.find((item) => item.id === segmentId);
    const size = map.getSize();
    if (!segment || !size) return;
    const pad = 2;
    view.fit(
      [
        Math.min(segment.a[0], segment.b[0]) - pad,
        Math.min(segment.a[1], segment.b[1]) - pad,
        Math.max(segment.a[0], segment.b[0]) + pad,
        Math.max(segment.a[1], segment.b[1]) + pad,
      ],
      { size, padding: [150, 150, 150, 150], duration: 350, maxZoom: 11 },
    );
  };

  const dispose = () => {
    map.un('click', onClick);
    map.un('postrender', onRenderComplete);
    view.un('change:resolution', updateLod);
    map.setTarget(undefined);
    map.dispose();
    featureById.clear();
  };

  return {
    map,
    applyBatch,
    getCounts,
    getVehicle,
    getAllVehicles,
    getRenderStats: () => summarizeRenderLatency(renderSamples),
    getRenderedCount: () => [renderedIds.size, featureById.size],
    setSelected,
    onSelect: (cb) => selectListeners.push(cb),
    setFilterCode: (code) => {
      filterCode = code;
      webglLayer.updateStyleVariables({ filterCode: code });
      heatmapLayer.updateStyleVariables({ filterCode: code });
      updateSelectionOverlay();
    },
    setCargoFilter: (cargo, hot) => {
      cargoCode = cargo === 'all' ? -1 : cargo === 'loaded' ? 1 : 0;
      hotOnly = hot;
      const variables = { cargoCode, hotOnly: hot ? 1 : 0 };
      webglLayer.updateStyleVariables(variables);
      heatmapLayer.updateStyleVariables(variables);
      updateSelectionOverlay();
    },
    onLod: (cb) => lodListeners.push(cb),
    focusBay,
    focusEquipment,
    focusVehicle,
    focusRailSegment,
    updateCongestion,
    fit,
    dispose,
  };
}
