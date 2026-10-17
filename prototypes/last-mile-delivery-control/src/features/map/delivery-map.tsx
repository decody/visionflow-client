'use client';

import { useEffect, useRef } from 'react';
import Feature from 'ol/Feature';
import Map from 'ol/Map';
import Circle from 'ol/geom/Circle';
import LineString from 'ol/geom/LineString';
import Point from 'ol/geom/Point';
import Polygon from 'ol/geom/Polygon';
import VectorLayer from 'ol/layer/Vector';
import WebGLPointsLayer from 'ol/layer/WebGLPoints';
import VectorSource from 'ol/source/Vector';
import GeoJSON from 'ol/format/GeoJSON';
import View from 'ol/View';
import { Attribution } from 'ol/control';
import { fromLonLat } from 'ol/proj';
import { Circle as CircleStyle, Fill, RegularShape, Stroke, Style, Text } from 'ol/style';
import type { FeatureLike } from 'ol/Feature';

import type { RiderStatus } from '@/shared/realtime/types';
import { arterials, closureSites, hubs, networkCenter, signalSites, zones } from '@/shared/map/seoul-layout';
import { expandExtent, withinExtent, type Extent } from '@/shared/map/viewport-cull';

import 'ol/ol.css';

/** 지도가 그리는 라이더 최소 정보(실시간 lon/lat). */
export interface MapRider {
  id: string;
  status: RiderStatus;
  lon: number;
  lat: number;
  heading: number;
  /** 현재 위치→목적지 남은 경로(lon/lat). 선택 라이더 추적선 표시용. */
  route?: [number, number][];
}

/** 신호 교차로 상태(지도 표시용). */
export type MapSignal = { id: string; state: 'GO' | 'STOP' };

/** 줌 기반 상세 단계(LOD). 도시 전체 → 권역 → 라이더 상세. */
type Lod = 'overview' | 'zone' | 'detail';

function lodFromZoom(zoom: number): Lod {
  if (zoom < 12.5) return 'overview';
  if (zoom < 14.2) return 'zone';
  return 'detail';
}

const lodLabel: Record<Lod, string> = {
  overview: '도시 전체',
  zone: '권역',
  detail: '라이더 상세',
};

// WebGL match 표현식과 코드-색상 매핑(상태 → 정수 코드).
const STATUS_ORDER: RiderStatus[] = ['DELIVERING', 'PICKUP', 'IDLE', 'DELAYED', 'CHARGING'];
const statusCode: Record<RiderStatus, number> = {
  DELIVERING: 0,
  PICKUP: 1,
  IDLE: 2,
  DELAYED: 3,
  CHARGING: 4,
};
const statusColor: Record<RiderStatus, string> = {
  DELIVERING: '#3dd598',
  PICKUP: '#56a8ff',
  IDLE: '#91a0af',
  DELAYED: '#ff6f7d',
  CHARGING: '#ffc34d',
};

/** 상세 LOD에서만 쓰는 라이더 심벌(방향 삼각형·대기 원형) + 라벨. 컬링으로 소수만 그린다. */
function riderDetailStyle(feature: FeatureLike): Style {
  const rider = feature.get('rider') as MapRider;
  const color = statusColor[rider.status];
  const stroke = new Stroke({ color: '#0a0e16', width: 1.25 });
  const image =
    rider.status === 'IDLE'
      ? new CircleStyle({ radius: 5, fill: new Fill({ color }), stroke })
      : new RegularShape({
          points: 3,
          radius: 8,
          rotation: (rider.heading * Math.PI) / 180,
          fill: new Fill({ color }),
          stroke,
        });
  return new Style({
    image,
    text: new Text({
      text: rider.id.replace('RDR-', ''),
      offsetY: -16,
      font: '10px sans-serif',
      fill: new Fill({ color: '#dce8f2' }),
      stroke: new Stroke({ color: '#0a0e16', width: 3 }),
    }),
  });
}

/** 선택 라이더 강조(항상 최상단 오버레이): 밝은 링 + 방향 삼각형 + 라벨. */
function selectedStyle(feature: FeatureLike): Style[] {
  const rider = feature.get('rider') as MapRider;
  const color = statusColor[rider.status];
  const ring = new Style({
    image: new CircleStyle({
      radius: 13,
      fill: new Fill({ color: 'rgba(255,255,255,0.08)' }),
      stroke: new Stroke({ color: '#ffffff', width: 2 }),
    }),
  });
  const marker = new Style({
    image:
      rider.status === 'IDLE'
        ? new CircleStyle({ radius: 6, fill: new Fill({ color }), stroke: new Stroke({ color: '#ffffff', width: 2 }) })
        : new RegularShape({
            points: 3,
            radius: 10,
            rotation: (rider.heading * Math.PI) / 180,
            fill: new Fill({ color }),
            stroke: new Stroke({ color: '#ffffff', width: 2 }),
          }),
    text: new Text({
      text: rider.id.replace('RDR-', ''),
      offsetY: -18,
      font: 'bold 11px sans-serif',
      fill: new Fill({ color: '#ffffff' }),
      stroke: new Stroke({ color: '#0a0e16', width: 3 }),
    }),
  });
  return [ring, marker];
}

/** 오프라인 벡터 배경 도로(OSM 강남 실제 도로망) 스타일 — 다크 지도 톤. */
function basemapRoadStyle(feature: FeatureLike) {
  const rank = feature.get('rank');
  const width = rank === 'primary' ? 2.2 : rank === 'secondary' ? 1.4 : 0.8;
  const color = rank === 'primary' ? '#33455c' : rank === 'secondary' ? '#2a3850' : '#223042';
  return new Style({ stroke: new Stroke({ color, width }) });
}

/** 선택 라이더의 배송 추적선(경로 폴리라인)과 목적지 마커 스타일. */
function routeStyle(feature: FeatureLike) {
  if (feature.get('kind') === 'dest') {
    return new Style({
      image: new CircleStyle({
        radius: 6,
        fill: new Fill({ color: '#ffd86b' }),
        stroke: new Stroke({ color: '#0a0e16', width: 2 }),
      }),
      text: new Text({
        text: '목적지',
        offsetY: -14,
        font: 'bold 10px sans-serif',
        fill: new Fill({ color: '#ffe9a8' }),
        stroke: new Stroke({ color: '#0a0e16', width: 3 }),
      }),
    });
  }
  return new Style({ stroke: new Stroke({ color: '#ffd86b', width: 3, lineDash: [6, 6] }) });
}

function zoneStyle(feature: FeatureLike, lod: Lod, focusZone: string) {
  const focused = focusZone !== '' && feature.get('name') === focusZone;
  const dimmed = focusZone !== '' && !focused;
  const fillAlpha = focused ? '2e' : lod === 'overview' ? '20' : lod === 'zone' ? '12' : '08';
  const color = focused ? '#ffd86b' : '#4da3ff';
  return new Style({
    fill: new Fill({ color: `${color}${dimmed ? '06' : fillAlpha}` }),
    stroke: new Stroke({
      color: dimmed ? '#35506b' : color,
      width: focused ? 2 : lod === 'overview' ? 1.5 : 1,
      lineDash: focused ? undefined : [5, 5],
    }),
    text: new Text({
      text: lod === 'overview' ? String(feature.get('label')) : String(feature.get('name')),
      font: focused || lod === 'overview' ? 'bold 12px sans-serif' : '11px sans-serif',
      fill: new Fill({ color: focused ? '#ffe9a8' : '#a6bfd2' }),
      stroke: new Stroke({ color: '#0a0e16', width: 3 }),
      overflow: true,
    }),
  });
}

function arterialStyle(feature: FeatureLike, lod: Lod) {
  const primary = feature.get('rank') === 'primary';
  if (lod === 'overview' && !primary) return undefined;
  const width = primary ? (lod === 'detail' ? 3 : 2) : 1.5;
  const style = new Style({
    stroke: new Stroke({ color: primary ? '#3b5168' : '#2b3d4e', width }),
  });
  if (lod === 'detail') {
    style.setText(new Text({
      text: String(feature.get('name')),
      placement: 'line',
      font: '9px sans-serif',
      fill: new Fill({ color: '#6f8598' }),
      stroke: new Stroke({ color: '#0a0e16', width: 2 }),
    }));
  }
  return style;
}

function hubStyle(feature: FeatureLike, lod: Lod) {
  return new Style({
    image: new CircleStyle({
      radius: lod === 'overview' ? 7 : 9,
      fill: new Fill({ color: '#1e5b7f' }),
      stroke: new Stroke({ color: '#9bd9ff', width: 2 }),
    }),
    text: new Text({
      text: lod === 'overview' ? 'FC' : String(feature.get('name')),
      offsetY: 18,
      font: lod === 'overview' ? 'bold 9px sans-serif' : '10px sans-serif',
      fill: new Fill({ color: '#bfe5ff' }),
      stroke: new Stroke({ color: '#0a0e16', width: 3 }),
    }),
  });
}

/** 신호등 심벌: GO=녹색, STOP=적색 원형. 상세 LOD에서만 라벨을 붙인다. */
function signalStyle(feature: FeatureLike, lod: Lod): Style {
  const state = feature.get('state') as 'GO' | 'STOP';
  const color = state === 'STOP' ? '#ff5a5f' : '#3dd598';
  return new Style({
    image: new CircleStyle({
      radius: lod === 'overview' ? 3 : 4.5,
      fill: new Fill({ color }),
      stroke: new Stroke({ color: '#0a0e16', width: 1.5 }),
    }),
    text:
      lod === 'detail'
        ? new Text({
            text: '신호',
            offsetY: 13,
            font: '9px sans-serif',
            fill: new Fill({ color: '#9fb4c6' }),
            stroke: new Stroke({ color: '#0a0e16', width: 2 }),
          })
        : undefined,
  });
}

/** 도로 통제 구역: 반경 디스크(적색 반투명) + 통제 라벨. 활성 시에만 표시. */
function closureStyle(feature: FeatureLike): Style {
  return new Style({
    fill: new Fill({ color: 'rgba(255,90,95,0.14)' }),
    stroke: new Stroke({ color: '#ff5a5f', width: 2, lineDash: [6, 5] }),
    text: new Text({
      text: `⛔ ${String(feature.get('name') ?? '도로 통제')}`,
      font: 'bold 11px sans-serif',
      fill: new Fill({ color: '#ffd4d6' }),
      stroke: new Stroke({ color: '#0a0e16', width: 3 }),
      overflow: true,
    }),
  });
}

export function DeliveryMap({
  riders,
  selectedId,
  onSelect,
  focusZone = '',
  onVisibleCount,
  signals,
  closureActive = false,
}: {
  riders: MapRider[];
  selectedId: string;
  onSelect: (id: string) => void;
  /** 선택된 권역 이름. 설정 시 해당 권역을 강조하고 뷰를 맞춘다. 단계 5. */
  focusZone?: string;
  /** 단계 7: 뷰포트 컬링 후 실제 렌더 중인 라이더 수(개발 진단용). */
  onVisibleCount?: (n: number) => void;
  /** 신호 교차로 상태(보강). 미지정이면 신호 레이어를 그리지 않는다. */
  signals?: MapSignal[];
  /** 도로 통제 활성 여부(보강). true면 통제 구역을 강조한다. */
  closureActive?: boolean;
}) {
  const targetRef = useRef<HTMLDivElement>(null);
  const lodBadgeRef = useRef<HTMLSpanElement>(null);
  const mapRef = useRef<Map | null>(null);
  const riderSourceRef = useRef<VectorSource | null>(null);
  const selectedSourceRef = useRef<VectorSource | null>(null);
  const routeSourceRef = useRef<VectorSource | null>(null);
  const zoneLayerRef = useRef<VectorLayer | null>(null);
  const webglLayerRef = useRef<WebGLPointsLayer<VectorSource<FeatureLike>> | null>(null);
  const detailLayerRef = useRef<VectorLayer | null>(null);
  const signalSourceRef = useRef<VectorSource | null>(null);
  const signalLayerRef = useRef<VectorLayer | null>(null);
  const closureLayerRef = useRef<VectorLayer | null>(null);
  const lodRef = useRef<Lod>('zone');
  const focusZoneRef = useRef<string>(focusZone);
  focusZoneRef.current = focusZone;
  // 카메라 이동 effect가 매 프레임(riders 갱신) 재실행되지 않도록 최신 위치를 ref로 보관.
  const ridersRef = useRef<MapRider[]>(riders);
  ridersRef.current = riders;
  const onVisibleCountRef = useRef(onVisibleCount);
  onVisibleCountRef.current = onVisibleCount;

  // 지도 1회 초기화: 정적 레이어 + WebGL 라이더 포인트 + 상세 벡터 레이어 + LOD 배선.
  useEffect(() => {
    if (!targetRef.current) return;
    // 이동 제약 영역(extent): 북 압구정 · 동 삼성동 · 서 양재 인접 · 남 청계산 일대까지.
    const sw = fromLonLat([127.010, 37.440]);
    const ne = fromLonLat([127.078, 37.535]);
    const constraintExtent: [number, number, number, number] = [sw[0]!, sw[1]!, ne[0]!, ne[1]!];

    const view = new View({
      center: fromLonLat(networkCenter),
      zoom: 14,
      minZoom: 12,
      maxZoom: 18,
      extent: constraintExtent,
      smoothExtentConstraint: false,
    });

    const zoneSource = new VectorSource({
      features: zones.map((zone) => new Feature({
        geometry: new Polygon([[...zone.ring, zone.ring[0]!].map((c) => fromLonLat(c))]),
        name: zone.name,
        label: zone.label,
      })),
    });
    const arterialSource = new VectorSource({
      features: arterials.map((road) => new Feature({
        geometry: new LineString(road.path.map((c) => fromLonLat(c))),
        name: road.name,
        rank: road.rank,
      })),
    });
    const hubSource = new VectorSource({
      features: hubs.map((hub) => new Feature({ geometry: new Point(fromLonLat(hub.at)), name: hub.name })),
    });
    const riderSource = new VectorSource();
    riderSourceRef.current = riderSource;
    const selectedSource = new VectorSource();
    selectedSourceRef.current = selectedSource;
    const routeSource = new VectorSource();
    routeSourceRef.current = routeSource;

    const basemapSource = new VectorSource({
      url: '/gangnam-roads.geojson',
      format: new GeoJSON(),
      attributions: '© OpenStreetMap contributors',
    });
    const basemapLayer = new VectorLayer({ source: basemapSource, style: basemapRoadStyle });
    const zoneLayer = new VectorLayer({ source: zoneSource, style: (f) => zoneStyle(f, lodRef.current, focusZoneRef.current) });
    zoneLayerRef.current = zoneLayer;
    const arterialLayer = new VectorLayer({ source: arterialSource, style: (f) => arterialStyle(f, lodRef.current) });
    const hubLayer = new VectorLayer({ source: hubSource, style: (f) => hubStyle(f, lodRef.current) });
    const routeLayer = new VectorLayer({ source: routeSource, style: routeStyle });

    // 보강: 신호 교차로 — 위치는 정적(signalSites), 상태(GO/STOP)만 prop으로 갱신.
    const signalSource = new VectorSource({
      features: signalSites.map((site) => {
        const f = new Feature({ geometry: new Point(fromLonLat(site.at)), id: site.id, state: 'GO' });
        f.setId(site.id);
        return f;
      }),
    });
    signalSourceRef.current = signalSource;
    const signalLayer = new VectorLayer({ source: signalSource, style: (f) => signalStyle(f, lodRef.current) });
    signalLayerRef.current = signalLayer;

    // 보강: 도로 통제 구역 — 반경 디스크. 활성 시에만 보이게 토글.
    const closureSource = new VectorSource({
      features: closureSites.map((site) => new Feature({
        geometry: new Circle(fromLonLat(site.center), site.radiusM / Math.cos((site.center[1] * Math.PI) / 180)),
        name: site.name,
      })),
    });
    const closureLayer = new VectorLayer({ source: closureSource, style: closureStyle, visible: false });
    closureLayerRef.current = closureLayer;

    // 단계 7: 대규모 함대는 WebGL 포인트로 렌더한다(상태색 = statusCode 매치, 반지름 = 줌 보간).
    const colorExpr: Array<string | number | string[]> = ['match', ['get', 'statusCode']];
    STATUS_ORDER.forEach((s) => colorExpr.push(statusCode[s], statusColor[s]));
    colorExpr.push('#ffffff');
    const webglLayer = new WebGLPointsLayer({
      source: riderSource,
      style: {
        'circle-radius': ['interpolate', ['linear'], ['zoom'], 12, 2.5, 15, 4, 18, 6],
        'circle-fill-color': colorExpr,
        'circle-stroke-color': 'rgba(10,14,22,0.75)',
        'circle-stroke-width': 1,
      },
    } as unknown as ConstructorParameters<typeof WebGLPointsLayer>[0]);
    webglLayerRef.current = webglLayer;

    // 상세 LOD에서만 방향 삼각형·라벨을 그린다(컬링으로 보이는 소수만).
    const detailLayer = new VectorLayer({ source: riderSource, visible: false, declutter: true, style: riderDetailStyle });
    detailLayerRef.current = detailLayer;

    const selectedLayer = new VectorLayer({ source: selectedSource, style: selectedStyle });

    const map = new Map({
      target: targetRef.current,
      layers: [basemapLayer, zoneLayer, arterialLayer, closureLayer, hubLayer, routeLayer, signalLayer, webglLayer, detailLayer, selectedLayer],
      view,
      controls: [new Attribution({ collapsible: false })],
    });
    mapRef.current = map;

    const resizeObserver = new ResizeObserver(() => map.updateSize());
    resizeObserver.observe(targetRef.current);

    // 줌 변화 → LOD 재계산. WebGL(overview·zone) ↔ 상세 벡터(detail) 레이어를 전환한다.
    const applyLod = () => {
      const next = lodFromZoom(view.getZoom() ?? 12.4);
      if (next === lodRef.current) return;
      lodRef.current = next;
      if (lodBadgeRef.current) lodBadgeRef.current.textContent = lodLabel[next];
      webglLayer.setVisible(next !== 'detail');
      detailLayer.setVisible(next === 'detail');
      [zoneLayer, arterialLayer, hubLayer, signalLayer].forEach((layer) => layer.changed());
    };
    view.on('change:resolution', applyLod);
    // 팬/줌 종료 시 뷰포트 컬링을 다시 적용(보이는 라이더만 소스에 유지).
    map.on('moveend', () => syncRiders(ridersRef.current));
    if (lodBadgeRef.current) lodBadgeRef.current.textContent = lodLabel[lodRef.current];

    map.once('postrender', () => {
      const extent = zoneSource.getExtent();
      view.fit(extent, { padding: [40, 40, 40, 40], maxZoom: 15 });
      applyLod();
      syncRiders(ridersRef.current);
    });

    // WebGL 포인트는 픽셀 히트 판정이 제한적이라, 클릭 좌표에서 최근접 라이더를 직접 찾는다.
    map.on('singleclick', (event) => {
      const riders = ridersRef.current;
      if (!riders.length) return;
      const tolerance = 18 * (view.getResolution() ?? 1); // 약 18px 반경
      let bestId = '';
      let bestDist = Infinity;
      for (const rider of riders) {
        const p = fromLonLat([rider.lon, rider.lat]);
        const dx = p[0]! - event.coordinate[0]!;
        const dy = p[1]! - event.coordinate[1]!;
        const d = Math.hypot(dx, dy);
        if (d < bestDist) {
          bestDist = d;
          bestId = rider.id;
        }
      }
      if (bestId && bestDist <= tolerance) onSelect(bestId);
    });

    return () => {
      resizeObserver.disconnect();
      map.setTarget(undefined);
      webglLayer.dispose();
      mapRef.current = null;
      riderSourceRef.current = null;
      selectedSourceRef.current = null;
      routeSourceRef.current = null;
      zoneLayerRef.current = null;
      webglLayerRef.current = null;
      detailLayerRef.current = null;
      signalSourceRef.current = null;
      signalLayerRef.current = null;
      closureLayerRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [onSelect]);

  // 신호 상태(GO/STOP) 갱신 → 해당 피처의 state 갱신 후 레이어 재스타일.
  useEffect(() => {
    const source = signalSourceRef.current;
    if (!source || !signals) return;
    for (const sig of signals) {
      const f = source.getFeatureById(sig.id);
      if (f && f.get('state') !== sig.state) f.set('state', sig.state);
    }
    signalLayerRef.current?.changed();
  }, [signals]);

  // 도로 통제 활성/해제 → 통제 구역 레이어 토글.
  useEffect(() => {
    closureLayerRef.current?.setVisible(closureActive);
  }, [closureActive]);

  // 뷰포트 컬링: 확장된 현재 뷰 익스텐트 안의 라이더만 소스에 넣는다(렌더 비용 ∝ 보이는 수).
  const syncRiders = (list: MapRider[]) => {
    const map = mapRef.current;
    const source = riderSourceRef.current;
    if (!map || !source) return;
    const size = map.getSize();
    let extent: Extent | null = null;
    if (size) extent = expandExtent(map.getView().calculateExtent(size) as Extent, 0.15);

    source.clear(true);
    let visible = 0;
    for (const rider of list) {
      const p = fromLonLat([rider.lon, rider.lat]);
      if (extent && !withinExtent(p[0]!, p[1]!, extent)) continue;
      const feature = new Feature({ geometry: new Point(p) });
      feature.set('rider', rider);
      feature.set('statusCode', statusCode[rider.status]);
      source.addFeature(feature);
      visible += 1;
    }
    onVisibleCountRef.current?.(visible);
  };

  // 권역 선택 → 권역 강조 재렌더 + 해당 권역으로 뷰 맞춤(해제 시 전체로 복귀).
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    zoneLayerRef.current?.changed();
    const view = map.getView();
    const zone = zones.find((z) => z.name === focusZone);
    if (zone) {
      const ring = [...zone.ring, zone.ring[0]!].map((c) => fromLonLat(c));
      const geom = new Polygon([ring]);
      view.fit(geom.getExtent(), { padding: [60, 60, 60, 60], maxZoom: 15.5, duration: 350 });
    }
  }, [focusZone]);

  // 라이더 피처 동기화(뷰포트 컬링) + 선택 라이더 오버레이 + 추적선/목적지.
  useEffect(() => {
    syncRiders(riders);

    const selectedSource = selectedSourceRef.current;
    const selectedRider = riders.find((rider) => rider.id === selectedId);
    if (selectedSource) {
      selectedSource.clear(true);
      if (selectedRider) {
        const f = new Feature({ geometry: new Point(fromLonLat([selectedRider.lon, selectedRider.lat])) });
        f.set('rider', selectedRider);
        selectedSource.addFeature(f);
      }
    }

    const routeSource = routeSourceRef.current;
    if (routeSource) {
      routeSource.clear(true);
      if (selectedRider?.route && selectedRider.route.length > 1) {
        const line = new Feature({ geometry: new LineString(selectedRider.route.map((c) => fromLonLat(c))) });
        line.set('kind', 'route');
        routeSource.addFeature(line);
        const dest = selectedRider.route[selectedRider.route.length - 1]!;
        const destFeature = new Feature({ geometry: new Point(fromLonLat(dest)) });
        destFeature.set('kind', 'dest');
        routeSource.addFeature(destFeature);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [riders, selectedId]);

  // 선택 라이더로 카메라 이동(선택 변경 시에만, 패닝만). riders 갱신에는 반응하지 않는다.
  useEffect(() => {
    const selected = ridersRef.current.find((rider) => rider.id === selectedId);
    if (!mapRef.current || !selected) return;
    mapRef.current.getView().animate({ center: fromLonLat([selected.lon, selected.lat]), duration: 250 });
  }, [selectedId]);

  return (
    <>
      <div ref={targetRef} className="ol-map" aria-label="강남 일대 배송 운영 지도" />
      <span className="map-lod" aria-live="polite">LOD · <span ref={lodBadgeRef}>권역</span></span>
    </>
  );
}
