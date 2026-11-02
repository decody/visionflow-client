/**
 * 권역(Region) 정의 — 단계 4(기획서 §3 드릴다운).
 *
 * 허브의 region 필드로 묶어 각 권역의 중심(bbox 중앙)과 지역 MapView 줌을 계산한다.
 * 글로브에서 권역을 선택하면 이 중심/줌으로 날아가 2D 지역 관제로 전환한다.
 */

import { HUBS } from '@/entities/logistics/mock';
import type { LonLat } from '@/shared/geo/great-circle';

export interface RegionView {
  id: string;
  name: string;
  center: LonLat;
  zoom: number;
  hubIds: string[];
}

const REGION_NAME: Record<string, string> = {
  APAC: '아시아·태평양',
  MEA: '중동·아프리카',
  EMEA: '유럽',
  AMER: '아메리카',
};

/** 경도 스팬(도) → MapView 줌 근사. 좁을수록 더 확대. */
export function spanToZoom(spanDeg: number): number {
  const z = Math.log2(360 / Math.max(spanDeg, 1)) - 0.2;
  return Math.min(5, Math.max(2, Number(z.toFixed(2))));
}

export function buildRegions(hubs = HUBS): RegionView[] {
  const groups = new Map<string, typeof HUBS>();
  for (const h of hubs) {
    const list = groups.get(h.region) ?? [];
    list.push(h);
    groups.set(h.region, list);
  }
  const regions: RegionView[] = [];
  for (const [id, list] of groups) {
    const lons = list.map((h) => h.lon);
    const lats = list.map((h) => h.lat);
    const minLon = Math.min(...lons);
    const maxLon = Math.max(...lons);
    const minLat = Math.min(...lats);
    const maxLat = Math.max(...lats);
    const span = Math.max(maxLon - minLon, maxLat - minLat);
    regions.push({
      id,
      name: REGION_NAME[id] ?? id,
      center: [(minLon + maxLon) / 2, (minLat + maxLat) / 2],
      zoom: spanToZoom(span),
      hubIds: list.map((h) => h.id),
    });
  }
  // 결정론 정렬(권역 id 사전순).
  regions.sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));
  return regions;
}

export const REGIONS = buildRegions();
