# Last-mile Delivery Control 프로토타입 진행 내역

- 작성일: 2026-10-13
- 대상: `visionflow-client/prototypes/last-mile-delivery-control`
- 목적: 실제 배송 플랫폼(TMS/OMS) 백엔드 연동 없이, 도시 라스트마일 배송 관제 화면과 라이더·주문·권역 운행을 실제처럼 보이고 움직이게 하는 프론트엔드 프로토타입 완성
- 계획서: [`last_mile_delivery_control_prototype_plan_ko.md`](last_mile_delivery_control_prototype_plan_ko.md)
- 선행 프로토타입(설계 패턴 출처): [`amhs_oht_control_prototype_progress_ko.md`](amhs_oht_control_prototype_progress_ko.md)

## 1. 최종 상태

계획서 로드맵 8단계를 모두 구현했다.

1. 지도·권역 레이어 (OpenLayers · LOD)
2. 도로 그래프·시뮬레이터 (RoadGraph · Dijkstra · snapshot/delta)
3. 배차·ETA·주문 생명주기
4. 알람·시나리오·배터리·자동 데모
5. 관제 UI 완성 (권역 KPI·이력 재생·개발 진단)
6. 연동 경계 (applyCommand·역할·감사·ws 방식 B)
7. 성능·최적화 (1,000~5,000대·WebGL·컬링·헤드리스 벤치)
8. 마감 (합성 데이터 고지·시연 스크립트·진행 문서)

실제 백엔드, 인증, DB, Kafka, 운영 API 계약, 지도 라우팅 API는 범위에서 제외했다. 데이터·명령·감사 로그는 로컬 mock과 합성 시뮬레이션으로 동작한다. AMHS(#02)가 실내 FAB 좌표계였다면 본 프로토타입은 실제 지리 좌표계(강남) 위에서 동작한다.

## 2. 지도·좌표계

- 투영: OpenLayers Web Mercator(EPSG:3857), `fromLonLat`로 강남 일대(역삼·삼성·논현·대치·청담)
- 배경: OSM(Overpass)에서 받은 강남 실제 도로망 GeoJSON(`public/gangnam-roads.geojson`)을 런타임 벡터 배경으로 렌더 — 외부 타일·API 키 없이 오프라인 표시
- 이동 제약: `View.extent`로 강남 일대로 팬/줌 하드 스톱(minZoom 12·maxZoom 18)
- LOD 3단계: 도시 전체(Overview) → 권역(Zone) → 라이더 상세(Detail)

관련 파일: `src/shared/map/seoul-layout.ts`, `src/features/map/delivery-map.tsx`

## 3. 도로 그래프·라이더 동작

- `src/entities/road/`(순수): 간선도로 폴리라인 → 노드/간선 그래프(근접 교차 연결·분리 컴포넌트 봉합으로 전체 연결 보장), Dijkstra 최단 경로·경로 길이
- 라이더는 도로 그래프 링크 위에서만 이동(teleport 없음), 순항 속도·heading·집화 핸드오프 체류
- 배터리: 거리 비례 방전, 경고 25%·위험 12%, 허브 복귀 충전(`CHARGING`), 여유 미만 라이더 배차 제외
- 결정론: 고정 seed mulberry32 + 안정적 생성 순서로 스냅샷 재현

관련 파일: `src/entities/road/`, `src/shared/sim/engine.ts`

## 4. 주문·배차·알람·시나리오

- 주문 생명주기: `QUEUED → ASSIGNED → TO_PICKUP → PICKED_UP → DELIVERING → DELIVERED` (+ SLA 초과 `DELAYED`·실패 `FAILED`), 터미널 프루닝
- 배차: EXPRESS 우선 + 규칙(ETA최소·최근접·선입선출), 동점 id 사전순 — 순수 `src/shared/sim/dispatch.ts`
- 라이브 알람: 지연(DELAY)·미배차(BACKLOG)·지오펜스(GEOFENCE)·배터리(BATTERY) — 순수 `deriveAlerts`가 "켜져 있어야 할 알람"을 결정론적으로 계산하고 엔진이 생성/ack 보존/자동 복구/프루닝 조정
- fault injection: 교통 정체(`incident`)·수요 서지(`surge`)·저배터리(`battery`)·초기화(`reset`)
- 자동 데모: 약 60초 고정 스크립트(정상→서지→정체→해제→저배터리→해소→복귀), `demo-script.md` 참조

관련 파일: `src/shared/sim/engine.ts`, `src/shared/sim/dispatch.ts`, `src/shared/sim/alerts.ts`

## 5. 실시간 파이프라인·관제 UI

- snapshot/delta 프로토콜: 라이더·주문·알람 3채널 + 시나리오 meta + 감사 로그, seq 단조 증가·gap 시 스냅샷 재동기, id 코얼레싱·rAF 배치 flush (순수 `DeltaReducer`)
- 방식 A: 인-브라우저 Web Worker 시뮬레이터 / 방식 B: 로컬 ws 서버(`?src=ws`)
- KPI(활성 라이더·진행 주문·미배차·평균 ETA)·권역별 KPI와 권역 클릭 동기화(지도·목록·파이프라인 공통 필터)
- 라이더 상세(상태·주문·ETA·배터리·heading·좌표)·배송 추적선·주문 파이프라인·라이브 알람(ack·영향 포커스)
- 이력 재생(최근 60초, 1·2·4× seek·LIVE 복귀), 개발 진단(FPS·msg/s·upd/s·coalesced%·resync·렌더 보이는/전체·JS heap)

관련 파일: `src/shared/realtime/`, `src/shared/stats/zone-kpi.ts`, `src/app/page.tsx`

## 6. 연동 경계 (역할·감사)

- 단일 실행 지점 `SimEngine.applyCommand(cmd, actor)`: 역할 인증 → 감사 기록(승인·거부 모두) → 승인 시 도메인 명령 실행
- 역할: `viewer(0) < dispatcher(1) < supervisor(2) < system(3)`. snapshot=viewer, 배차·운영 조치=dispatcher, 시나리오 주입=supervisor
- 명령: 재배차(`reassign`)·라이더 연락(`contactCourier`)·특급 승격(`promoteExpress`)·배차 규칙·알람 확인·자동 데모·시나리오 주입
- actor는 클라이언트가 주장하지 않고 어댑터(worker/ws)가 세션 컨텍스트로 주입. UI 역할 선택기는 세션 역할 전환을 시연
- 감사: 승인·거부 모두 `AuditEntry`로 방출, UI 감사 타임라인에 표시(정적 mock 대체)

관련 파일: `src/shared/integration/command-contract.ts`, `src/shared/sim/engine.ts`, `server/ws-server.ts`

## 7. 성능 검증·최적화

### 적용한 최적화

- 경로/거리 메모(`pathInfo`): 정적 그래프에서 (from,to)별 Dijkstra 1회 후 O(1) 재사용 → 대규모 배차/경로 비용 억제
- 배차 후보 상한(`DISPATCH_POOL_CAP=256`): 긴급도 상위만 검토·배정해 1회 배차 비용 상한
- 델타 절감: 추적선(`route`)을 포커스된 1명에게만 스트리밍(`setFocus`), lon/lat 1e6 양자화
- 렌더: 라이더 WebGLPointsLayer(상태색·줌 반지름), LOD 전환(overview/zone=WebGL 점 ↔ detail=벡터 삼각형+라벨), 뷰포트 컬링(보이는 라이더만 소스에 투입)
- 좌측 목록 렌더 상한(80) — 대규모 함대 DOM 폭증 방지

### 코어 벤치마크

고정 seed·고정 clock으로 `JSON.stringify(engine.tick())`을 반복 측정(`server/perf-bench.ts` → `perf-report.md`).

| 대수 | frame p95 | 지속 Hz | 여유 | 판정 |
| ---: | ---: | ---: | ---: | --- |
| 500 | 1.33ms | 751 | 75× | ✅ |
| 1,000 | 2.49ms | 402 | 40× | ✅ |
| 2,000 | 4.98ms | 201 | 20× | ✅ |
| 5,000 | 12.37ms | 81 | 8.08× | ✅ |

5,000대에서도 10Hz 예산(100ms/틱)을 8× 여유로 통과한다. 브라우저 렌더 완료 지연은 앱 개발 진단 패널의 FPS·렌더(보이는/전체)로 상호 보완한다.

## 8. 프로토타입 마감

- 초기 함대: 고정 seed 기반 라이더 40대(운영바 `함대`에서 500~5,000대 전환)
- 초기 카메라: 강남 전체 Overview
- 화면 표기: `Prototype #03 · 합성 데이터 · OSM 공개 도로망`
- 시연 순서와 캡처 권장 장면을 `demo-script.md`에 정리
- README에 실제 데이터가 아닌 합성 데이터·OSM 공개 도로망 시각화임을 명시
- 개발 서버는 3013 포트, ws 서버는 3014 포트에서 실행

## 9. 검증 상태

통과한 검증:

- TypeScript: `pnpm typecheck` (next typegen + `tsc --noEmit`)
- 전체 unit test: `pnpm test:unit` — 52 테스트 green (road-graph·delta-reducer·dispatch·engine·alerts·zone-kpi·command-contract·socket-server·viewport-cull)
- 프로덕션 빌드: `pnpm build`
- 개발 서버 기동 및 `/`·`/?src=ws` 200 응답 확인
- SimEngine 500~5,000대 성능 벤치마크(5,000대 10Hz 예산 통과)

주의: WebGL 포인트 렌더는 클라이언트 전용이라 dev 200 스모크로는 검증되지 않는다. AMHS(#02)의 동일 OpenLayers 10.6 패턴을 이식했으나, 실제 브라우저에서 한 번 육안 확인이 권장된다.

## 10. 범위 밖 항목

다음은 현재 프로토타입의 완료 조건이 아니다.

- 실제 배송 플랫폼(TMS/OMS)·지도 라우팅 API 연동
- 실운영 인증·권한 서버, DB·Kafka·실제 API 계약
- 실제 라이더 GPS 스트림, 실제 주소/주문 데이터
- 실제 GPU·단말별 성능 보증, 시연 영상 파일 제작
- 델타 id 압축(와이어 코덱) — localhost 수용 범위라 미도입

현재 결과물은 포트폴리오·UX 검증용 합성 라스트마일 배송 관제 프로토타입이다.
