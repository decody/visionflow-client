# Last-mile Delivery Control 프로토타입 계획서 (#03)

- 작성일: 2026-10-01
- 대상: `visionflow-client/prototypes/last-mile-delivery-control`
- 포트: `3013` (dior 3010 · AMHS 3011/ws 3012 · last-mile 3013/ws 3014)
- 목적: 실제 배송 플랫폼 백엔드 연동 없이, **도시 라스트마일 배송 관제 화면과 라이더·주문·권역 운행을 실제처럼 보이고 움직이게 하는** 프론트엔드 프로토타입을 실무수준으로 완성한다.

이 문서는 포트폴리오 프로토타입 #02 AMHS/OHT 관제가 세운 완성 기준을 **배송 도메인으로 이식**하기 위한 계획서다. AMHS가 실내 FAB 좌표계 위에서 OHT·FOUP·Rail을 관제했다면, 본 프로토타입은 **실제 지리 좌표계(서울)** 위에서 라이더·주문·배송 권역·물류센터를 관제한다. 두 프로토타입은 실시간 파이프라인(snapshot/delta·DeltaReducer·Worker/ws)과 연동 경계(applyCommand·역할 인증·감사) 설계를 **공유**한다.

- 선행 프로토타입(설계 패턴 출처): [`amhs_oht_control_prototype_progress_ko.md`](amhs_oht_control_prototype_progress_ko.md), [`amhs_integration_contract_ko.md`](amhs_integration_contract_ko.md)
- 프로토타입 README: [`prototypes/last-mile-delivery-control/README.md`](../prototypes/last-mile-delivery-control/README.md)

---

## 1. 범위와 비범위

프론트엔드 단독 + 합성 데이터로 완결한다. AMHS와 동일하게 다음은 **범위 밖**이다.

- 실제 배송 플랫폼(TMS/OMS)·지도 라우팅 API(네이버/카카오/구글 Directions) 연동
- 실운영 인증·권한 서버, DB·Kafka·실제 API 계약
- 실제 라이더 GPS 스트림, 실제 주소/주문 데이터
- 실제 GPU·단말별 성능 보증, 시연 영상 파일 제작

데이터·명령·감사 로그는 로컬 mock과 합성 시뮬레이션으로 동작한다. 지리 배경은 공개 타일(OSM 등) 또는 벡터 권역만 사용하고, 특정 업체의 실제 배송망이 아님을 화면과 README에 명시한다.

## 2. 도메인 매핑 (AMHS → 배송)

| AMHS(#02) 개념 | 본 프로토타입(#03) 대응 | 비고 |
| --- | --- | --- |
| OHT(vehicle) | 라이더(Courier) | 이륜차/자전거, 좌표·heading·speed·battery |
| Rail 그래프 | 도로 그래프(RoadGraph) | 노드=교차로, 링크=도로구간(단방향/양방향) |
| FOUP / Lot | 주문 / 택배(Order/Parcel) | 단일 소유 위치(허브·라이더·고객) |
| Bay | 배송 권역(Zone) | 강남 A·서초 B·송파 A·강동 C·잠실 B |
| Stocker / 충전소 | 물류센터(Hub/FC) / 교대·충전 거점 | 집화·분류·충전 |
| Load Port 도킹 | 집화(pickup)·배송(dropoff) 도착/도킹 | APPROACHING/DOCKED/HANDOFF/RELEASING |
| ZCU / junction 합류 제어 | 신호 교차로 / 지오펜스 | 정지·대기·통과 제어 |
| Hot lot 승격 | 특급(EXPRESS) 주문 승격 | 우선순위 3 |
| Dispatch rule(priority/FIFO/nearest) | 배차 규칙(ETA최소/FIFO/최근접) | 동일 구조 |
| 배터리·충전 복귀 | 라이더 배터리·교대/충전 복귀 | 전기 이륜차 가정 |
| Rail 폐쇄·우회 | 도로 통제·사고 우회 | 구간 비용 ∞ → 재경로 |
| 통신 단절·재동기 | GPS 신호 끊김·재동기 | snapshot 재동기 동일 |

## 3. 좌표계·지도 (AMHS 대비 핵심 차이)

AMHS는 실내 커스텀 투영(FAB:LOCAL, 재투영 0)을 썼다. 본 프로토타입은 **실제 지리 좌표계**를 쓴다.

- 투영: OpenLayers 기본 Web Mercator(EPSG:3857), `fromLonLat`로 서울 강남/송파 일대(현재 스캐폴드 중심 `127.035, 37.505`).
- 배경: **오프라인 벡터 배경 확정(2026-10-09)** — OSM(Overpass)에서 받은 강남 일대 실제 도로망을 `public/gangnam-roads.geojson`에 번들해 런타임 fetch로 렌더한다(외부 타일·API 키 불필요, 인터넷 없이도 표시). 온라인 CARTO 타일은 중간에 시도했으나 어드블로커·망 환경 의존성 때문에 오프라인 벡터로 대체. 그 위에 합성 권역·배송 간선·허브·추적선·라이더를 겹친다.
- 이동 제약: `View.extent`로 강남 일대(북 압구정·동 삼성동·서 양재 인접·남 청계산)로 팬/줌을 제한(경계 하드 스톱, minZoom 12·maxZoom 18).
- LOD 3단계: **도시 Overview(권역 heatmap/집계)** → **권역(라이더 포인트)** → **라이더 상세(주문 경로·도킹)**. AMHS의 FAB/Bay/Equipment LOD에 대응.
- 좌표 소스: 현재 mock의 `x/y(0~100 그리드)` 오프셋 환산을 **도로 그래프 상의 실제 lon/lat 경로**로 교체한다(라이더는 도로 링크를 따라 이동).

## 4. 실시간 파이프라인 (AMHS 설계 재사용)

동일한 snapshot/delta 프로토콜과 공통 인터페이스를 그대로 가져온다.

- `SimEngine`(순수 시뮬레이션) + `DeltaReducer`(수신 파이프라인)를 **Worker(A)·ws 서버(B)가 공유**, 전송 수단만 교체(`RealtimeSource` 인터페이스).
- 방식 A(기본): 인-브라우저 Web Worker 시뮬레이터가 snapshot/delta 송출, 정적 배포 가능.
- 방식 B(옵션): 로컬 `ws` 서버(포트 3014)가 동일 엔진을 노드에서 구동, 재연결·exponential backoff·heartbeat 시연.
- seq 단조 증가, gap 감지 시 클라이언트가 `snapshot` 요청 → 재동기. id별 최신 delta 코얼레싱, rAF 배치 flush.
- 델타 대역폭: 좌표 양자화(lon/lat 소수 자리 고정)·operations 스로틀·id 압축(`RDR-####` → 정수)로 AMHS와 동일 규칙 적용.

## 5. 라이더 동작 현실성

AMHS OHT 물리 모델을 도시 주행으로 재해석한다.

- **가·감속·정지거리**: 순간 속도 변경 대신 가속/감속 프로파일. 도심 순항 속도(이륜차 가정 ~8~12 m/s, 구간별 상한), 교차로·목적지 접근 시 정지거리 기반 감속.
- **도로 제약**: 라이더는 도로 그래프 링크 위에서만 이동(teleport 없음), 단방향 구간·회전 제약 반영.
- **신호 교차로/지오펜스**: 신호 대기(ZCU STOP 대응), 권역 경계 지오펜스 진입·이탈 이벤트.
- **배터리/교대**: 거리 비례 방전, 임계 미만이면 가까운 허브로 복귀해 충전/교대(배차 제외), 경고·위험 알람.
- **집화·배송 도킹**: 도착 → 집화/인수(HANDOFF) → 해제 단계. 동일 지점 동시 처리 제약(허브 집화 슬롯 등).

## 6. 반송(배송) 운영 모델

AMHS의 Job 생명주기를 배송 단계로 매핑한다.

- 주문 단계: `QUEUED → ASSIGNED → TO_PICKUP → PICKED_UP → DELIVERING → DELIVERED`(+ `DELAYED`/`FAILED`).
- 집화 전 라이더는 공차, 집화 완료 후에만 주문이 라이더로 이동. 배송 완료 시 고객 지점으로 소유 이전.
- 목적지/집화 슬롯 예약(허브 용량, 라이더 동시 적재 상한).
- 우선순위: EXPRESS(3) 우선 후 FIFO. 배차 규칙: ETA최소 / FIFO / 최근접(도로 그래프 단방향 거리, Dijkstra).
- ETA 추정: 남은 경로 거리 / 구간 속도 + 신호·정체 가중. 지연 임계 초과 시 DELAYED 전이·알람.
- 1,000~5,000대 부하에서는 미배차 라이더도 순환시켜 고빈도 델타 유지.

## 7. 시나리오 (자동 데모 + 수동 fault injection)

고정 seed 자동 데모(약 60초)로 운영 흐름을 재생하고, 수동 주입으로 개별 상황을 시연한다.

| 시나리오 | 확인 포인트 |
| --- | --- |
| 정상 배송 | 라이더 이동·권역 KPI·주문 목록 |
| 특급(EXPRESS) 승격 | 우선순위·강조 |
| 교통 정체 | 구간 속도 저하·ETA 증가 |
| 도로 통제·우회 | 폐쇄 구간·자동 재경로 |
| 지오펜스 이탈 | 권역 이탈 알람·영향 주문 |
| 배송 지연 | DELAYED 전이·지연 알람 |
| 미배차 급증(수요 서지) | 배차 대기열·backpressure |
| 라이더 저배터리·교대 | 배터리 알람·허브 복귀 |
| 통신 단절·재동기 | 화면 정지·snapshot 재동기 |
| 복구 | 정상 운행 회복 |

## 8. 관제 UI (실무수준 완성도)

현재 스캐폴드(KPI·필터·지도·상세·알람·감사 정적 화면)를 실데이터·상호작용으로 완성한다.

- 상단 KPI: 활성 라이더·진행 주문·배송 지연·평균 ETA·미배차·완료(현재 정적 → 엔진 집계).
- 권역별 KPI, 권역 클릭 시 지도·목록 동기화.
- 라이더 상세: 상태·주문·ETA·배터리·heading·위치, 최근 배송 작업.
- 공통 필터(상태·적재·특급), 지도-목록-클릭 공통 적용.
- 알람: 지연·지오펜스·미배차·배터리, ack(확인)·복구 상태, 영향 주문·라이더 포커스.
- 운영 조치: 재배차·라이더 연락 등 — 역할 기반 승인(현재 "조회 권한 승인 대기" 문구를 실제 경계로 연결).
- 이력 재생(최근 60초)·속도·seek·LIVE 복귀, 자동 데모 진행률.
- 개발 진단: FPS·msg/s·upd/s·coalesced·resync·latency·렌더 대상(보이는/전체)·JS heap.

## 9. 연동 경계 (applyCommand·역할·감사)

AMHS [`amhs_integration_contract_ko.md`](amhs_integration_contract_ko.md)의 경계를 배송 명령으로 재정의한다.

- 단일 실행 지점 `SimEngine.applyCommand(cmd, actor)`: 역할 인증 → 감사 기록 → (승인 시) 실행. Worker/ws 어댑터가 세션 actor 주입(클라이언트가 주장하지 않음).
- 역할: `viewer(0) < dispatcher(1) < supervisor(2) < system(3)`.
- 명령(예): `snapshot`(viewer) · `reassign`/`contactCourier`/`promoteExpress`/`setDispatch`(dispatcher) · `setTrafficIncident`/`setRoadClosure`/`setZoneSurge`/`resetScenario`(supervisor).
- 감사: 승인·거부 모두 `AuditEntry`(id·ts·actor·action·detail·outcome·code)로 `operations.audit` 방출, UI 감사 패널 표시.

## 10. 성능 목표·최적화

- 목표: 상호작용 중 50~60 FPS, p95 반영 지연 ≤ 200ms, 10Hz 송신(틱 예산 100ms).
- 렌더: WebGLPoints(권역 LOD) ↔ Heatmap(Overview LOD), 라이더 상세 심벌(상세 LOD), 뷰포트 컬링.
- 코어 벤치: 헤드리스 `JSON.stringify(engine.tick())` 반복으로 500/1,000/2,000/5,000대 tick·직렬화 p95·델타 바이트·지속 Hz·메모리 측정 → `perf-report.md`. 고정 seed·고정 clock 결정론.
- 델타: lon/lat 양자화·operations 스로틀·id 압축.

## 11. 폴더 구조 (AMHS 미러링)

```
src/
  app/                       # Next.js routes (/ → 관제, 필요 시 /replay 등)
  features/control/          # KPI·지도·필터·이력재생·알람 UI
  features/map/              # delivery-map (OpenLayers 어댑터) — 현재 존재
  entities/delivery/         # 타입·mock·status(순수) — 현재 존재(types.ts/mock-data.ts)
  entities/road/             # 도로 그래프 생성/경로/GeoJSON(순수) + *.test.ts
  shared/sim/                # SimEngine (Worker·ws 공용)
  shared/realtime/           # DeltaReducer·SimulatorClient·SocketClient·팩토리 + *.test.ts
  shared/map/                # 투영·지오메트리(순수)·권역 도면 + *.test.ts
  shared/integration/        # command-contract(역할 정책)
  stores/                    # Zustand(선택/필터/알람/일시정지)
  workers/                   # simulator.worker.ts (방식 A)
server/                      # ws-server.ts (방식 B, 포트 3014) + perf-bench.ts
```

## 12. 구현 로드맵 (단계)

| 단계 | 내용 | 상태 |
| --- | --- | --- |
| 0. 스캐폴드 | 레이아웃·도메인 타입·정적 mock·벡터 지도 | ✅ |
| 1. 지도·권역 레이어 | OpenLayers 서울 권역·간선 도로·물류센터 레이어, LOD 골격 | ✅ (2026-10-01) |
| 2. 도로 그래프·시뮬레이터 | RoadGraph 생성/경로(Dijkstra), 라이더 이동 시뮬레이터 + snapshot/delta(Worker) | ✅ (2026-10-01) |
| 3. 배차·ETA·상태 전이 | 주문 생명주기, 배차 규칙, ETA, 지연 전이 | ✅ (2026-10-09) |
| 4. 알람·시나리오 | 지오펜스·지연·미배차·배터리 알람, 자동 데모 + fault injection | ✅ (2026-10-10) |
| 5. 관제 UI 완성 | KPI·상세·필터·동기화·이력 재생·감사 로그 | ✅ (2026-10-10) |
| 6. 연동 경계 | applyCommand·역할·감사, ws 서버(방식 B) | ✅ (2026-10-13) |
| 7. 성능·최적화 | WebGL/LOD/컬링, 헤드리스 벤치·perf-report, 1,000~5,000대 | ✅ (2026-10-13) |
| 8. 마감 | demo-script, 합성 데이터 고지, 고정 시작 상태, 진행 내역 문서 | ✅ (2026-10-13) |

**단계 8 구현 메모(2026-10-13)**: 마감. (1) **합성 데이터 고지** — 운영바에 `Prototype #03 · 합성 데이터 · OSM 공개 도로망` 배지(`page.tsx` `.synthetic-note`), README 상단·하단에 실제 배송 플랫폼/GPS/주소 아님을 명시. (2) **고정 시작 상태** — 고정 seed 라이더 40대·강남 전체 Overview, 함대 선택기로 500~5,000 전환. (3) **시연 스크립트** `demo-script.md`(시작 상태·60초 자동 데모 표·역할 경계 시연·수동 포인트·방식 B·캡처 장면). (4) **진행 내역 문서** `docs/last_mile_delivery_control_prototype_progress_ko.md`(AMHS 양식 10절: 최종 상태·지도·도로/라이더·주문/배차/알람·실시간/UI·연동 경계·성능·마감·검증·범위 밖). (5) **README 전면 개정**(단계 1~8·폴더·실행 dev/test/ws/perf·방식 B·역할 시연). **검증**: 테스트 52 green·타입체크·빌드. **DoD(§14) 충족** — 단계 1~8 구현·tsc·전체 테스트 green·자동 데모 고정 재현·500~5,000 전환·헤드리스 벤치 10Hz 통과·perf-report.md·합성 데이터 화면/README 고지·진행 문서 작성. ⚠️ WebGL 육안 확인·git 커밋은 잔여.

**단계 7 구현 메모(2026-10-13)**: 성능·최적화(1,000~5,000대).
- **엔진 스케일**(`engine.ts`): `MAX_RIDERS` 2,000→5,000. 핵심은 **경로/거리 메모**(`pathInfo` — 그래프가 정적이라 (from,to)별 Dijkstra 1회 후 O(1) 재사용, spawn에서 clear) — `roadDist`·`routeRider`가 이를 공유해 대규모 배차 비용을 상수에 가깝게 억제. **배차 후보 상한**(`DISPATCH_POOL_CAP=256` — 긴급도 상위만 검토·배정해 1회 배차 비용 상한). `routeRider`는 메모 배열을 복사해 넘김(변형 방지).
- **델타 절감**(단계 7): 추적선(`route`)을 전 라이더가 아니라 **포커스된 1명에게만** 스트리밍 — `setFocus(riderId)` 세션 명령(worker·ws·`create-source` 경유, 인증/감사 밖) + `toWire`가 `rider.id===focusId`일 때만 `route` 포함. lon/lat는 기존처럼 1e6 양자화.
- **헤드리스 벤치**(`server/perf-bench.ts` + `perf` 스크립트): 고정 seed·고정 clock으로 `JSON.stringify(engine.tick())` 반복, 500/1k/2k/5k별 tick·frame p95·직렬화·델타 바이트·지속Hz·heap/rss 측정 → `perf-report.md` 저장. **결과: 5,000대 frame p95 12.37ms(여유 8.08×)로 10Hz 예산 통과**(500=1.33ms·1k=2.49ms·2k=4.98ms). 델타 avg 5,000대≈1.1MB/틱(id압축 미도입, localhost ws 수용 가능).
- **렌더 최적화**(`features/map/delivery-map.tsx`, AMHS 패턴 이식): 라이더를 **WebGLPointsLayer**로 렌더(상태색=`statusCode` match 표현식, 반지름=줌 보간). LOD 전환 — overview·zone=WebGL 점, **detail=벡터 레이어(방향 삼각형+라벨, declutter)**로 토글. **뷰포트 컬링**(순수 `shared/map/viewport-cull.ts`: expandExtent·withinExtent·diffVisibility + 테스트) — 확장된 뷰 익스텐트 안의 라이더만 소스에 넣어 렌더 비용 ∝ 보이는 수. 선택 라이더는 별도 오버레이 소스(링+삼각형+라벨), 추적선/목적지 레이어 유지. WebGL은 픽셀 히트 판정이 제한적이라 **클릭 시 최근접 라이더 직접 탐색**(약 18px 허용).
- **UI**(`page.tsx`): 운영바 **함대 규모 선택기**(40/500/1k/2k/5k → `setCount`로 엔진 재구성), 포커스=선택 라이더 연동(`setFocus`), 좌측 라이더 목록 렌더 상한(`LIST_CAP=80` + 안내, DOM 폭증 방지), 개발 진단 "렌더(보이는/전체)"를 컬링 후 실제 수(`onVisibleCount`)로 표시.
- **검증**: 테스트 52 green(viewport-cull 4 신규), 타입체크·빌드·dev 200, perf 벤치 5k까지 10Hz 통과. ⚠️ WebGL 렌더는 클라이언트 전용이라 dev 200로는 미검증 — 실제 브라우저 육안 확인 권장.

**단계 6 구현 메모(2026-10-13)**: 연동 경계(applyCommand·역할·감사·ws 방식 B). AMHS #02의 경계 설계를 배송 도메인으로 이식.
- **역할·명령 계약**(`src/entities/delivery/types.ts` + 순수 `src/shared/integration/command-contract.ts`): 역할 `viewer(0) < dispatcher(1) < supervisor(2) < system(3)`. `COMMAND_MIN_ROLE` — snapshot=viewer, setRule/ackAlert/demo/reassign/contactCourier/promoteExpress/start/stop/setCount=dispatcher, inject(시나리오 주입)=supervisor. `authorizeCommand`(FORBIDDEN/BAD_REQUEST)·`describeCommand`·`buildAuditEntry`·`isAuditable` 순수 함수.
- **단일 실행 지점**(`engine.ts` `applyCommand(cmd, actor)`): 역할 인증 → 감사 기록(승인·거부 모두, 상한 20) → 승인 시 도메인 명령 실행. start/stop/setCount 루프 제어는 인증·감사만 하고 실행은 호출측(worker/ws)이 `accepted`를 보고 수행. 신규 도메인 명령 `reassign`(주문 재대기+라이더 해제)·`promoteExpress`(일반→특급 승격)·`contactCourier`(감사 전용). 감사 ts용 `clock` 생성자 주입(테스트 결정론). 스냅샷에 `audit`(최근 8), 델타에 `auditAdd`(신규) 동봉, `riderCount()` 추가.
- **수신 파이프라인**(`delta-reducer.ts`): 감사 채널(append-only, id 중복 제거, 상한 20, dirty 시 전체 방출). `BatchResult.audit`.
- **방식 A 어댑터**(`simulator.worker.ts`): 세션 actor(기본 supervisor) 주입, `setRole` 세션 명령, snapshot 외 전 명령 `applyCommand` 경유, 거부도 스냅샷으로 UI 반영. `SimulatorClient`에 setRole/reassign/contactCourier/promoteExpress 추가.
- **방식 B**(`server/ws-server.ts` 포트 3014 + `src/shared/realtime/socket-client.ts`): 동일 엔진을 노드에서 구동, 연결별 actor·ping/pong·setRole·applyCommand·재연결(backoff)·heartbeat·seq 재동기. `create-source.ts`가 `?src=ws`(또는 `NEXT_PUBLIC_WS_URL`)로 방식 전환.
- **UI**(`page.tsx`): 운영바 역할 선택기(조회·배차·감독)→`setRole`, 라이브 감사 타임라인(정적 mock 대체, 최신 항목이 운영 조치 바에 승인/거부+사유로 반영), 운영 조치(재배차·라이더 연락·특급 승격)를 실제 경계 명령으로 연결, 시나리오 meta 낙관적 변경 제거(거부 시 desync 방지)·스트림 meta만 신뢰. 이력 프레임에 audit 포함(재생 일관).
- **검증**: 테스트 48 green(신규: command-contract 4·engine applyCommand/감사/reassign/promoteExpress 4·socket-server 1 — 역할 경계·감사 e2e), 타입체크·프로덕션 빌드·dev 200(`/`·`/?src=ws`). `ws@8.18.0`·`@types/ws` 추가, `ws:server` 스크립트.

**단계 5 구현 메모(2026-10-10)**: 관제 UI 완성.
- **권역별 KPI + 동기화**: 순수 `shared/stats/zone-kpi.ts`의 `zoneSummary`(권역별 라이더·배송중·지연·미배차·특급 집계, zones 순서 유지) → kpi-grid 아래 권역 밴드(클릭 선택/해제). `selectedZone`이 라이더 목록·주문 파이프라인·지도 라이더를 공통 필터링하고, `DeliveryMap`에 `focusZone` 전달 → 해당 권역 폴리곤 강조(앰버)·나머지 디밍 + `view.fit`으로 뷰 이동.
- **이력 재생**: 클라이언트 링 버퍼(`historyRef`, 틱 전진 시에만 적재, 최근 ~600프레임≈60s). 재생 진입 시 버퍼를 `replayFramesRef`로 고정 복사(라이브 트리밍과 분리). 재생/일시정지·속도(1·2·4×)·seek 슬라이더·LIVE 복귀. 재생 중에는 화면 소스(`viewRiders/Orders/Alerts/Meta`)를 프레임으로 스위치, 최신 도달 시 자동 LIVE. 상단 상태 뱃지 REPLAY/PAUSED/LIVE.
- **개발 진단**: `SimulatorClient`에 누적 카운터(`getMetrics()`: msgCount·rawUpd·drainedUpd·batchCount·resyncCount) 추가, `RealtimeSource`에 노출. 페이지는 rAF로 FPS 집계 + 1초 차분으로 msg/s·upd/s·coalesced%·resync·JS heap(`performance.memory`)·렌더 대상(보이는/전체)·이력 프레임 수 → 지도 우상단 오버레이. 운영바 "진단 ON/OFF" 토글.
- **인스펙터 보강**: detail-grid에 방향(heading°)·좌표(lat,lon) 추가.
- **검증**: 테스트 39 green(zone-kpi 3 신규), 타입체크·프로덕션 빌드·dev 200 통과. 운영 조치 역할승인은 §9=단계6 범위라 현행 유지.

**단계 4 구현 메모(2026-10-10)**: 알람·시나리오·배터리.
- **배터리 모델**(`engine.ts`): Rider/RiderWire에 `battery` 추가, 이동 거리 비례 방전(`BATTERY_DRAIN_PER_M`), 임계 경고 25%·위험 12%. 새 상태 `CHARGING` — 위험/경고권 진입 시 가장 가까운 허브로 경로를 잡고 충전 모드 전환(`startCharging`/`advanceCharging`), 완충 후 유휴 복귀. 배차는 충전 중·배터리 여유(`BATTERY_RESERVE` 20%) 미만 라이더를 제외. `travel()`로 이동/방전 분리.
- **라이브 알람**: 순수 `shared/sim/alerts.ts`의 `deriveAlerts`(지연 DELAY·미배차 BACKLOG·지오펜스 GEOFENCE·배터리 BATTERY)가 "켜져 있어야 할 알람 집합"을 결정론적(id 사전순)으로 계산 → 엔진 `reconcileAlerts`가 생성/ack 보존/자동 복구(RESOLVED)/프루닝 조정. AlertWire 채널(`alertsAdd/Upd/Del`) + `DeltaReducer` 대칭 코얼레싱. 정적 mock-data 알람을 라이브로 대체(감사 타임라인만 정적 유지).
- **시나리오/fault injection**: 엔진 상태 `incident`(전역 순항속도 계수 0.45)·`surge`(도착량·풀 상한 상향 + 즉시 버스트). `inject(scenario,on)`·`ackAlert(id)`·`setDemo(on)` 명령을 `ClientCommand`·worker·`SimulatorClient`·`RealtimeSource`에 추가. 통신 단절은 클라이언트 `setPaused`(기존) + 복구 시 스냅샷 재동기.
- **자동 데모**: 엔진 내 결정론 스크립트(약 60s: 정상→서지→정체→해제→저배터리→서지해소→복귀), `ScenarioMeta`(incident/surge/demoActive/demoLabel/demoSec)를 snapshot·delta에 동봉해 UI 배지 표시.
- **UI**(`page.tsx`+`globals.css`): 라이브 알람 리스트(심각도 바·상태 라벨·경과·ack 버튼·영향 라이더 포커스), 시나리오 바(교통정체·수요서지 토글 / 저배터리·초기화 일회성 / 자동데모·통신 토글), 인스펙터 배터리 미터, 운영바 데모 배지·PAUSED 표시, 라이더 필터·범례·KPI에 충전 반영.
- **검증**: 테스트 36 green(신규 alerts 5·engine 7·delta-reducer 2), 타입체크·프로덕션 빌드·dev 200 통과.

**단계 3 구현 메모(2026-10-09)**: 주문 생명주기 + 배차. 엔진(`src/shared/sim/engine.ts`)에 주문 풀 도입 — 시간기반 주문 도착, `QUEUED → ASSIGNED → TO_PICKUP → PICKED_UP(집화 dwell 1.5s) → DELIVERING → DELIVERED`, SLA 초과 시 `DELAYED`(감속 0.35×)·3% `FAILED`, 터미널 주문 프루닝(20s grace). 순수 배차 선택 `src/shared/sim/dispatch.ts`(EXPRESS 우선 + `FASTEST_ETA`/`NEAREST`/`FIFO`, 동점 id 사전순). realtime 프로토콜에 **주문 2번째 채널**(`OrderWire`, snapshot.orders·delta.ordersUpd/Add/Del) + `DeltaReducer` 대칭 코얼레싱. `ClientCommand`/`RealtimeSource`에 `setRule`(worker·simulator-client 경유). `RiderWire.route`(남은 경로 폴리라인) 추가 → 선택 라이더 추적선. page.tsx: 주문 라이브 구독·KPI(미배차/진행/지연/ETA)·주문 파이프라인 리스트·배차 규칙 토글. 테스트 22종(dispatch 6·engine 5·road 5·delta-reducer 6) green, 타입체크·빌드·dev 200. 버그수정: updatePosition이 집화 dwell 중 path 끝 idx+1 접근 크래시 → 마지막 노드 스냅 가드.

**UI·지도 개편 메모(2026-10-09)**: (1) **전체 뷰포트 레이아웃** — shell `100dvh` flex, 상단 고정·워크스페이스 flex:1, 외곽 패딩 10px. 네이티브 스크롤 제거하고 **OverlayScrollbars**(`overlayscrollbars-react` 설치) 오버레이 스크롤바를 페이지 전역·좌측 라이더 목록·우측 인스펙터에 적용. (2) **헤더 제거** — 상단 topbar 삭제, 타이틀을 운영 상태 바 왼쪽(`.bar-title`)으로 이동, KPI 카드 높이 축소. (3) **지도 명확화** — 라이더 마커를 진행방향 삼각형으로(대기는 원형)·확대, 범례에 픽업 추가, 선택 라이더 **배송 경로(앰버 점선)+목적지** 표시. (4) **강남 집중** — `src/shared/map/seoul-layout.ts`를 강남 일대(역삼·삼성·논현·대치·청담동, 실제 간선 테헤란로·강남대로·영동대로·봉은사로·도산대로·선릉로·언주로·학동로)로 재정의, mock-data 알람 권역명도 강남 동으로. (5) **오프라인 지도 배경** — CARTO 타일 → OSM Overpass로 받은 강남 실제 도로망 GeoJSON(`public/gangnam-roads.geojson`, 1,863 feature·516KB, 좌표 5자리) 벡터 배경으로 교체(외부 호출 0). `ResizeObserver`로 map updateSize 보강. (6) **이동 영역 제약** — `View.extent`로 북 압구정·동 삼성동·서 양재 인접·남 청계산까지로 팬/줌 제한.

**단계 2 구현 메모(2026-10-01)**: 도로 그래프 모듈 `src/entities/road/`(순수) 신설 — `geo.ts`(거리·bearing·보간), `build-road-graph.ts`(간선도로 폴리라인 분할→노드/간선, 서로 다른 도로 근접 노드 교차연결, 분리 컴포넌트 최근접쌍 봉합으로 전체 연결 보장), `path.ts`(Dijkstra·경로길이). 실시간 계층 `src/shared/realtime/`(AMHS 패턴 이식 축약) — `types.ts`(RiderWire·snapshot/delta·RealtimeSource), `delta-reducer.ts`(seq gap·코얼레싱, 순수), `simulator-client.ts`(Worker+rAF flush), `create-source.ts`. 엔진 `src/shared/sim/engine.ts` — 고정 seed, 라이더가 허브↔권역 배송지를 Dijkstra 경로로 왕복(가속 없는 순항, teleport 없음), PICKUP↔DELIVERING 2상. Worker `src/workers/simulator.worker.ts`. 지도는 RiderWire lon/lat 직접 렌더(placement.ts 폐기), page는 `createRealtimeSource` 구독→라이더/KPI 라이브. 테스트 9종(road-graph 5·delta-reducer 4) green, 타입체크·빌드·dev 200 확인. 좌표는 합성. ETA·배차규칙·주문 생명주기·알람은 단계 3/4.

**단계 1 구현 메모(2026-10-01)**: 서울 남동권(강남·서초·송파·강동·잠실) 합성 도면을 `src/shared/map/seoul-layout.ts`(권역 폴리곤 5·물류센터 3·간선/보조 도로 7, lon/lat)로 분리하고, `src/features/map/delivery-map.tsx`가 권역·간선도로·허브·라이더 4개 벡터 레이어로 렌더한다. 줌 기반 LOD 3단계(도시 전체/권역/라이더 상세)를 `change:resolution`에서 재계산해 레이어 스타일·라벨 밀도·좌측 상단 LOD 배지를 전환한다. 라이더는 `src/shared/map/placement.ts`(순수)가 권역 중심+그리드 지터로 배치(단계 2에서 도로 그래프 경로 좌표로 대체). 타입체크·프로덕션 빌드 통과. 공개 래스터 타일은 미도입(벡터 전용, 계획대로 2차).

## 13. 테스트 계획 (node --test + tsx)

- `road-graph` — 결정론적 생성, adjacency, 경로 도달성, GeoJSON 피처 수
- `delta-reducer` — 코얼레싱·seq gap·재동기·알람 누적
- `geometry` — 점-선분 거리, 최근접 세그먼트/링크 스냅
- `status` — 필터 코드 매핑, 코드↔상태 역매핑
- `engine` — 주문 단계, 소유권 이전, 용량 예약, 배차 규칙, ETA, 델타 일치, 공차 순환
- `history` — 주문/경로/위치 복원, 불규칙 캡처 간격 배속 재생
- `command-contract` — 역할별 승인/거부
- `socket-server` — 임시 포트 서버 + 두 클라이언트 snapshot/seq/명령/pause/pong

## 14. 완료 조건 (Definition of Done)

- 단계 1~8 구현, `tsc --noEmit` 통과, 전체 unit test green.
- 자동 데모가 고정 seed로 재현되고, 500~5,000대 전환이 동작.
- 헤드리스 코어 벤치가 10Hz 예산을 통과하고 `perf-report.md`에 기록.
- README·화면에 **합성 데이터·공개 타일 시각화**임을 명시.
- 진행 내역 문서(`last_mile_delivery_control_prototype_progress_ko.md`)를 AMHS 양식으로 작성.
