import Projection from 'ol/proj/Projection';
import { addProjection } from 'ol/proj';

import { FAB_CODE, FAB_EXTENT } from './fab-constants';

/**
 * FAB 실내 좌표계를 OpenLayers 투영으로 등록한다.
 *
 * 다른 GIS 프로토타입은 EPSG:4326 → 3857 재투영을 쓰지만, 반도체 FAB에는
 * 지리 좌표가 없다. 대신 도면 원점(좌하단)을 기준으로 한 데카르트 좌표(단위: m)를
 * 그대로 사용한다. 이렇게 하면 대량 델타 수신 시 좌표 변환 비용이 0이 된다.
 */
export const fabProjection = new Projection({
  code: FAB_CODE,
  units: 'm',
  extent: FAB_EXTENT,
  metersPerUnit: 1,
});

addProjection(fabProjection);

export { FAB_CODE, FAB_EXTENT, FAB_CENTER } from './fab-constants';
