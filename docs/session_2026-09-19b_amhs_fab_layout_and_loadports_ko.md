# 작업 세션 로그 — 2026-09-19 (FAB 모델 현실성: JSON 레이아웃 + 복수 로드포트)

`amhs-oht-control` 프로토타입의 2026-09-19 후속 진행분. 같은 날 [OHT 동작 현실성
](session_2026-09-19_amhs_oht_motion_and_battery_ko.md)에 이어 "남은 후보"의
**FAB 모델 현실성(복수 로드포트·JSON 레이아웃)**을 구현한다.

- 대상: `visionflow-client/prototypes/amhs-oht-control`
- 저장소: `decody/visionflow-client`, 브랜치 `agent/amhs-oht-control-prototype`

---

## 1. JSON 레이아웃

FAB 정적 골격의 하드코딩 상수(하이웨이 좌표·Bay Y·툴 x·Stocker·용량)를
`src/entities/fab/fab-layout.json`으로 추출하고, `buildRailGraph()`가 이를 해석하도록 했다.

- `FabLayout` 타입으로 스키마를 명시(`extent`·`highway`·`spineX`·`bayEntryX`·`toolXs`·
  `bufferCapacity`·`loadPorts`·`bays`·`stockers`). JSON 리터럴은 number[]로 추론되므로
  `as unknown as FabLayout`로 단언한다(`resolveJsonModule`은 tsconfig.base에서 이미 켜짐).
- Worker/노드/렌더러가 같은 JSON을 import → 결정론 유지. 좌표·용량·로드포트 수를 파일에서 편집 가능.
- 토폴로지 생성 로직(체인·존·인접리스트)은 그대로라 **세그먼트 55·노드 46 불변** → 라우팅
  동역학·throughput 특성 유지.

## 2. 복수 로드포트

기존엔 툴마다 로드포트 1개(용량 1)였다. 실제 FAB처럼 공정 툴에 복수 로드포트를 부여.

- `loadPorts.process`(기본 2)·`loadPorts.metrology`(1)로 툴별 LP 수를 지정. id는 `${eqp}-LP{n}`.
- **같은 툴의 LP는 경로탐색 rail 노드(`at`)를 공유**(라우팅 성립)하되 각 용량 1로 독립 점유.
  마커는 `renderAt`(좌우 오프셋)으로 겹치지 않게 그린다(청사진 SVG·GeoJSON 모두 renderAt 사용).
- 포트 수 30 → 50(tool 24→44, buffer 4, stocker 2). 툴이 복수 FOUP를 동시에 보유·서비스.
- 엔진 `generateJobs`에 **동일 설비 반송 제외** 가드 추가 — LP1→LP2 같은 무의미한 동일 노드
  이동을 막는다(같은 `equipmentId` 목적지 배제).

## 검증 요약

- **테스트 65 → 68개 통과** (복수 로드포트 규약·노드공유 2 + 레이아웃 extent 1 추가).
  기존 불변식(포트 용량·재현·teleport·교착 배수) 전부 유지.
- seed 스윕(42·7·11·100·2026 × 8·32·64): 실제 프리셋 seed(20260905)의 8/32대는 각 완료
  14/12로 건강. 대부분 조합 ≥10이며 교착(gridlock)은 없다(약한 조합도 avgBlk<1로 단순 변동).
- `tsc --noEmit` 통과. 헤드리스 perf: 포트 30→50으로 generateJobs·operations 비용이 소폭 늘어
  5,000대 frame p95 9.4ms(예산 대비 ~10.6× 여유). 코어는 여전히 병목 아님.

## 남은 후보

- 실제 시스템 연동 경계(API 계약·인증·감사 로그) — 별도 설계 세션 필요.
- 로드포트별 개별 정차 위치(현재는 노드 공유)·배터리 지도 시각화·데모 파라미터 미세 튜닝.
