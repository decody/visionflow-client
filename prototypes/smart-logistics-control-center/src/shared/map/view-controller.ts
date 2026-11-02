/**
 * 글로브/지역 뷰 상태·LOD 컨트롤러(순수 함수).
 *
 * 글로브↔지역(MapView) 전환 상태와 줌 기반 LOD를 계산한다. 렌더러에 의존하지 않는
 * 순수 함수라 단위 테스트한다.
 */

import { normalizeLon, type LonLat } from '@/shared/geo/great-circle';

/** LOD 3단계 — Globe 집계 / 권역 flow / 지역 상세(기획서 §3). */
export type Lod = 'GLOBE' | 'REGION' | 'LOCAL';

/** 뷰 모드 — 3D 글로브(_GlobeView) ↔ 2D 지역(MapView). */
export type ViewMode = 'GLOBE' | 'REGION';

export interface GlobeViewState {
  longitude: number;
  latitude: number;
  zoom: number;
  pitch: number;
  bearing: number;
}

/** 초기 뷰 — 아시아·태평양 물동량이 보이도록 동경 110° 부근에서 시작. */
export const INITIAL_VIEW_STATE: GlobeViewState = {
  longitude: 110,
  latitude: 20,
  // Overview에서 지구본이 관제 영역의 주 시각 요소로 보이도록 초기 배율을 확보한다.
  // 지역 전환 임계값(2)보다 낮게 유지해 첫 화면은 항상 Globe LOD로 시작한다.
  zoom: 1.2,
  pitch: 0,
  bearing: 0,
};

/** 줌 임계값 — 이 값들이 Globe→Region→Local 경계다. */
export const LOD_ZOOM = { region: 2, local: 4.5 } as const;

export function lodForZoom(zoom: number): Lod {
  if (zoom < LOD_ZOOM.region) return 'GLOBE';
  if (zoom < LOD_ZOOM.local) return 'REGION';
  return 'LOCAL';
}

export function lodLabel(lod: Lod): string {
  switch (lod) {
    case 'GLOBE':
      return '글로브 집계';
    case 'REGION':
      return '권역 흐름';
    case 'LOCAL':
      return '지역 상세';
  }
}

/** 자동 회전 한 프레임: 경도를 degPerFrame 만큼 전진시키고 ±180으로 정규화. */
export function stepRotation(state: GlobeViewState, degPerFrame: number): GlobeViewState {
  return { ...state, longitude: normalizeLon(state.longitude + degPerFrame) };
}

/**
 * 글로브↔지역 전환 상태기계(순수) — 단계 4.
 * mode·선택 권역·목표 viewState만 계산한다. 보간 애니메이션은 deck.gl이 담당.
 */
export interface ViewSession {
  mode: ViewMode;
  region: string | null;
  view: GlobeViewState;
}

export function initialSession(): ViewSession {
  return { mode: 'GLOBE', region: null, view: { ...INITIAL_VIEW_STATE } };
}

/** 권역 드릴다운: 지역 모드로 전환하고 중심/줌을 맞춘다. */
export function enterRegion(regionId: string, center: LonLat, zoom: number): ViewSession {
  return {
    mode: 'REGION',
    region: regionId,
    view: { longitude: center[0], latitude: center[1], zoom, pitch: 0, bearing: 0 },
  };
}

/** 글로브로 복귀. */
export function exitToGlobe(): ViewSession {
  return initialSession();
}

/** 세션 기준 LOD: 글로브는 줌 기반, 지역은 줌에 따라 REGION/LOCAL. */
export function lodForSession(session: ViewSession): Lod {
  if (session.mode === 'GLOBE') return lodForZoom(session.view.zoom);
  return session.view.zoom >= LOD_ZOOM.local ? 'LOCAL' : 'REGION';
}
