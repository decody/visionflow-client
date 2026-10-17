/**
 * 강남 일대(역삼·삼성·논현·대치·청담) 배송 네트워크 정적 도면 (뷰 전용 합성 데이터)
 *
 * 실제 업체의 배송망이 아니라, 서울 강남구 역삼·삼성·논현·대치·청담동 일대를 근사한 합성 좌표다.
 * 좌표는 모두 [lon, lat](WGS84)이며 지도 어댑터에서 `fromLonLat`으로 투영한다.
 * 간선도로 골격(테헤란로·강남대로·영동대로 등)은 도로 그래프(entities/road)의 노드/링크로 확장된다.
 * 배경 지도 타일(CARTO/OSM)은 인터넷 연결 전제로 런타임에 로드된다.
 */

export type LonLat = [number, number];

export type DeliveryZone = {
  /** 라이더가 배치되는 권역 이름. */
  name: string;
  label: string;
  /** 외곽 링(닫힌 폴리곤). 마지막 점은 생략하고 어댑터가 닫는다. */
  ring: LonLat[];
  centroid: LonLat;
};

export type DeliveryHub = {
  id: string;
  name: string;
  at: LonLat;
};

export type Arterial = {
  name: string;
  /** primary=간선, secondary=보조. LOD·선 두께 구분에 쓴다. */
  rank: 'primary' | 'secondary';
  path: LonLat[];
};

export const zones: DeliveryZone[] = [
  {
    name: '역삼동',
    label: '역삼동 · 테헤란로',
    ring: [
      [127.028, 37.496], [127.046, 37.496], [127.046, 37.507], [127.028, 37.507],
    ],
    centroid: [127.037, 37.5015],
  },
  {
    name: '삼성동',
    label: '삼성동 · 코엑스',
    ring: [
      [127.052, 37.505], [127.070, 37.505], [127.070, 37.519], [127.052, 37.519],
    ],
    centroid: [127.061, 37.512],
  },
  {
    name: '논현동',
    label: '논현동 · 학동로',
    ring: [
      [127.024, 37.508], [127.042, 37.508], [127.042, 37.519], [127.024, 37.519],
    ],
    centroid: [127.033, 37.5135],
  },
  {
    name: '대치동',
    label: '대치동 · 은마사거리',
    ring: [
      [127.046, 37.490], [127.064, 37.490], [127.064, 37.502], [127.046, 37.502],
    ],
    centroid: [127.055, 37.496],
  },
  {
    name: '청담동',
    label: '청담동 · 명품거리',
    ring: [
      [127.042, 37.517], [127.058, 37.517], [127.058, 37.527], [127.042, 37.527],
    ],
    centroid: [127.050, 37.522],
  },
];

export const hubs: DeliveryHub[] = [
  { id: 'FC-YS', name: '역삼 물류센터', at: [127.037, 37.5015] },
  { id: 'FC-SS', name: '삼성 물류센터', at: [127.061, 37.511] },
  { id: 'FC-NH', name: '논현 집배송 거점', at: [127.033, 37.513] },
];

export const arterials: Arterial[] = [
  // 테헤란로 (강남역 → 역삼 → 선릉 → 삼성역, 동서 간선)
  { name: '테헤란로', rank: 'primary', path: [[127.0276, 37.4979], [127.0364, 37.5006], [127.0489, 37.5045], [127.0631, 37.5089]] },
  // 강남대로 (신사 → 강남역 → 양재 방향, 남북 간선)
  { name: '강남대로', rank: 'primary', path: [[127.0203, 37.5163], [127.0255, 37.5060], [127.0276, 37.4979], [127.0320, 37.4880]] },
  // 영동대로 (청담 → 삼성역 → 대치, 남북 간선)
  { name: '영동대로', rank: 'primary', path: [[127.0595, 37.5200], [127.0631, 37.5089], [127.0620, 37.4950]] },
  // 봉은사로 (강남구청 → 봉은사 → 삼성, 동서 간선)
  { name: '봉은사로', rank: 'primary', path: [[127.0300, 37.5140], [127.0470, 37.5150], [127.0631, 37.5120]] },
  // 도산대로 (신사 → 논현 → 청담, 동서 간선)
  { name: '도산대로', rank: 'primary', path: [[127.0203, 37.5163], [127.0340, 37.5175], [127.0480, 37.5180]] },
  // 선릉로 (선릉역 → 청담, 남북 보조)
  { name: '선릉로', rank: 'secondary', path: [[127.0489, 37.5045], [127.0505, 37.5130], [127.0520, 37.5200]] },
  // 언주로 (논현 → 역삼 → 대치, 남북 보조)
  { name: '언주로', rank: 'secondary', path: [[127.0340, 37.5175], [127.0335, 37.5006], [127.0330, 37.4900]] },
  // 학동로 (논현 → 삼성, 동서 보조)
  { name: '학동로', rank: 'secondary', path: [[127.0255, 37.5120], [127.0400, 37.5110], [127.0540, 37.5100]] },
];

/**
 * 신호 교차로(합성). 간선이 교차하는 주요 사거리를 근사한 좌표다.
 * 엔진은 각 지점에서 가장 가까운 도로 그래프 노드를 신호 노드로 삼고(nearestNode),
 * 지도는 같은 좌표에 신호등 심벌을 그린다. 상태(GO/STOP)는 엔진이 스트리밍한다.
 */
export type SignalSite = { id: string; name: string; at: LonLat };

export const signalSites: SignalSite[] = [
  { id: 'SIG-GN', name: '강남역 사거리', at: [127.0276, 37.4979] },
  { id: 'SIG-YS', name: '역삼역 교차로', at: [127.0364, 37.5006] },
  { id: 'SIG-SR', name: '선릉역 교차로', at: [127.0489, 37.5045] },
  { id: 'SIG-SS', name: '삼성역 교차로', at: [127.0631, 37.5089] },
  { id: 'SIG-GC', name: '강남구청 교차로', at: [127.0470, 37.5150] },
  { id: 'SIG-NH', name: '논현 사거리', at: [127.0340, 37.5175] },
];

/**
 * 도로 통제·폐쇄 지점(합성). 활성화되면 중심에서 반경(m) 안의 모든 간선을
 * 통행 불가로 간주해(구간 비용 ∞) 라이더가 자동 우회하도록 한다.
 */
export type ClosureSite = { id: string; name: string; center: LonLat; radiusM: number };

export const closureSites: ClosureSite[] = [
  // 테헤란로 중간(역삼~선릉) 구간 통제 — 병행 도로로 우회가 가능한 지점.
  { id: 'CLZ-TH', name: '테헤란로 통제(역삼~선릉)', center: [127.0427, 37.5026], radiusM: 320 },
];

/** 전체 네트워크 기준 중심(강남 일대 경계 중앙 근사). */
export const networkCenter: LonLat = [127.045, 37.507];

/** name → zone 조회(라이더 배치에 사용). */
export const zoneByName: Record<string, DeliveryZone> = Object.fromEntries(
  zones.map((zone) => [zone.name, zone]),
);
