/**
 * FAB 실내 좌표계 상수 (OpenLayers 비의존).
 * Worker/Main 양쪽에서 공유하되, Worker가 OL을 번들하지 않도록 분리한다.
 */
export const FAB_CODE = 'FAB:LOCAL';

/** [minX, minY, maxX, maxY] — 도면 크기(미터) */
export const FAB_EXTENT: [number, number, number, number] = [0, 0, 120, 80];

export const FAB_CENTER: [number, number] = [
  (FAB_EXTENT[0] + FAB_EXTENT[2]) / 2,
  (FAB_EXTENT[1] + FAB_EXTENT[3]) / 2,
];
