import Feature from 'ol/Feature';
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
import { Circle as CircleStyle, Fill, Stroke, Style, Text } from 'ol/style';
import type { BooleanExpression } from 'ol/style/flat';

import {
  buildRailGraph,
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

  const railLayer = new VectorLayer({
    source: new VectorSource({
      features: format.readFeatures(geo.rails, readOpts),
    }),
    style: (f) =>
      f.get('kind') === 'interbay'
        ? new Style({
            stroke: new Stroke({ color: '#48577a', width: 3 }),
          })
        : f.get('kind') === 'transfer'
          ? new Style({
              stroke: new Stroke({ color: '#8a6aaa', width: 2.5 }),
            })
        : new Style({
            stroke: new Stroke({ color: '#333e57', width: 1.5 }),
          }),
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
              fill: new Fill({ color: '#2f3a52' }),
              stroke: new Stroke({ color: '#516079', width: 0.5 }),
            }),
            text:
              resolution < 0.085
                ? new Text({
                    text: f.get('portId'),
                    offsetY: 11,
                    font: '600 9px ui-sans-serif',
                    fill: new Fill({ color: '#9aabc1' }),
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
  const routeById = new Map<string, Coord[]>();
  let selectedId: string | null = null;
  let filterCode = -1;
  let cargoCode = -1;
  let hotOnly = false;
  const matches = (f: Feature) =>
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
      equipmentLayer,
      railLayer,
      portLayer,
      heatmapLayer,
      webglLayer,
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
    webglLayer.setVisible(next !== 'overview');
    overlayLayer.setVisible(next !== 'overview');
    portLayer.setVisible(next !== 'overview');
    equipmentLayer.setOpacity(next === 'overview' ? 0.55 : 1);
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
    return f;
  };

  // 렌더 소스를 현재 뷰포트에 보이는 OHT로 맞춘다.
  // overview LOD(밀집도 히트맵)나 지도 크기 미확정 시에는 전체를 유지한다.
  const syncRenderSource = () => {
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
    vehicleSource.changed();
  };

  // 일시정지 중 pan/zoom(배치 미수신)에도 보이는 집합을 다시 맞춘다.
  map.on('moveend', () => syncRenderSource());

  const applyBatch = (batch: BatchResult) => {
    if (pendingRenderAt === null) pendingRenderAt = performance.now();
    if (batch.operations) {
      const incident = batch.operations.incident;
      for (const feature of equipmentLayer.getSource()!.getFeatures())
        feature.set(
          'operatingStatus',
          incident?.equipmentId === feature.get('equipmentId')
            ? 'DOWN'
            : 'RUN',
          true,
        );
      for (const feature of portLayer.getSource()!.getFeatures())
        feature.set(
          'operatingStatus',
          incident?.portId === feature.get('portId')
            ? 'DOWN'
            : 'AVAILABLE',
          true,
        );
      equipmentLayer.changed();
      portLayer.changed();
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
    }
    for (const id of batch.deletions ?? []) {
      const f = vehicleSource.getFeatureById(id);
      if (f) vehicleSource.removeFeature(f);
      featureById.delete(id);
      routeById.delete(id);
      renderedIds.delete(id);
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
    }
    syncRenderSource();
    if (selectedId && !featureById.has(selectedId)) setSelected(null);
    if (selectedId) updateSelectionOverlay();
    map.render();
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
    if (changed) zoneSource.changed();
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
    updateCongestion,
    fit,
    dispose,
  };
}
