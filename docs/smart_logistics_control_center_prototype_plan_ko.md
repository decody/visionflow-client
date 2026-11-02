# Smart Logistics Control Center 프로토타입 계획서 (#04)

- 작성일: 2026-10-18
- 대상: `visionflow-client/prototypes/smart-logistics-control-center`
- 포트: `3015` (dior 3010 · AMHS 3011/ws 3012 · last-mile 3013/ws 3014 · **smart-logistics 3015/ws 3016**)
- 상위 기획서: `docs/frontend_portfolio_planning_ko.docx` — "실시간 GIS 관제 프론트엔드 포트폴리오" **10종 중 #01 대표작(Smart Logistics Control Center)**
- 목적: 실제 TMS/WMS 백엔드 연동 없이, **전세계 멀티모달 복합운송(해상·항공·육상·철도)을 3D 글로브에서 관제하고, 권역 드릴다운 시 2D 지역 관제로 매끄럽게 전환되는** 프론트엔드 프로토타입을 실무 수준으로 완성한다.

이 문서는 포트폴리오 프로토타입 #02 AMHS/OHT·#03 Last-mile이 세운 완성 기준(실시간 파이프라인·연동 경계·헤드리스 벤치·합성 데이터 고지)을 **글로벌 공급망 도메인으로 확장**하기 위한 계획서다. 앞의 두 프로토타입이 각각 실내 FAB 좌표계(로컬 투영)와 도시 지리 좌표(Web Mercator, OpenLayers)에서 동작했다면, 본 프로토타입은 **지구 전체(구면 좌표) + 지역(평면 투영)을 하나의 LOD 파이프라인으로 묶고, 렌더 엔진을 deck.gl로 교체**한다. 실시간 코어(SimEngine·DeltaReducer·Worker A/ws B·applyCommand·역할·감사)는 그대로 재사용한다.

- 선행 프로토타입(설계 패턴 출처): [`last_mile_delivery_control_prototype_plan_ko.md`](last_mile_delivery_control_prototype_plan_ko.md), [`amhs_integration_contract_ko.md`](amhs_integration_contract_ko.md)
- 프로토타입 README: `prototypes/smart-logistics-control-center/README.md`(단계 0에서 생성)

---

## 0. 포지셔닝과 기술 스택

**한 문장 소개**: 정적 공간 모델(항만·공항·항로 네트워크)과 실시간 운송 델타를 분리하고, deck.gl WebGL 레이어로 수천 대의 운송수단과 수만 건의 화물을 지구본·지역 두 LOD에서 안정적으로 렌더링하며 병목을 계측·개선한 글로벌 관제 프론트엔드.

**차별화 포인트**(앞의 두 프로토타입과의 구분):
- 좌표계: 구면(globe) ↔ 평면(regional)의 **듀얼 뷰·단일 데이터 파이프라인**.
- 이동 모델: 도로 그래프 Dijkstra(last-mile)가 아니라 **대권항로(great-circle) 보간 + 모드별 속도 모델**.
- 도메인: 단일 차량·주문이 아니라 **여러 구간(leg)으로 이어지는 복합운송 화물(shipment)**과 환적(transshipment).
- 렌더: OpenLayers → **deck.gl**(ArcLayer·TripsLayer·ScatterplotLayer·GeoJsonLayer·HeatmapLayer).

**기술 스택**:

| 계층 | 선택 | 비고 |
| --- | --- | --- |
| App shell | Next.js(App Router) + React + TypeScript | 지도는 client boundary 안에서 수명주기 관리 |
| 렌더 | **deck.gl**(`@deck.gl/core`·`/layers`·`/geo-layers`·`/aggregation-layers`·`/react`) | 글로브는 `_GlobeView`(experimental), 지역은 `MapView` |
| 2D 베이스맵(지역) | MapLibre GL JS(옵션) 또는 번들 벡터 | 오프라인 우선, 외부 API 키 0 |
| 글로브 표면 | 번들 Natural Earth 1:110m countries GeoJSON(public domain) + graticule | 외부 타일 불필요, 인터넷 없이 표시 |
| 서버 상태 | TanStack Query | 초기/조회(정적 네트워크·화물 카탈로그) |
| UI/뷰 상태 | Zustand | 선택·필터·레이어 표시·뷰·재생 |
| 실시간 | 커스텀 `RealtimeSource`(Worker A / ws B) | AMHS·last-mile 코어 재사용 |

> ⚠️ deck.gl `_GlobeView`는 experimental API다. 버전 고정(`deck.gl@^9`)하고, 글로브↔지역 전환은 `views` 교체 + `viewState` 보간으로 추상화해 엔진 교체 리스크를 어댑터 한 곳(`shared/map/`)에 가둔다.

## 1. 범위와 비범위

프론트엔드 단독 + 합성 데이터로 완결한다. AMHS·last-mile과 동일하게 다음은 **범위 밖**이다.

- 실제 TMS/WMS/운송사 API, AIS(선박)·ADS-B(항공) 실시간 피드, 캐리어 EDI/API 연동
- 실제 세관·관세·B/L·운임 데이터, 실제 항만 혼잡·기상 피드
- 실운영 인증·권한 서버, DB·Kafka·메시지 브로커
- 특정 GPU·단말 성능 보증, 시연 영상 파일 제작, 사실적 지형/위성 리얼리즘(deck.gl 선택의 트레이드오프)

데이터·명령·감사 로그는 로컬 mock과 합성 시뮬레이션으로 동작한다. 글로브 표면과 네트워크는 공개 데이터(Natural Earth·합성 항로)만 쓰고, **특정 물류사의 실제 운송망이 아님**을 화면과 README에 명시한다.

## 2. 도메인 매핑과 모델 (복합운송)

### 2.1 선행 프로토타입 개념 매핑

| AMHS(#02) / Last-mile(#03) | 본 프로토타입(#04) | 비고 |
| --- | --- | --- |
| OHT / 라이더(단일 이동체) | **Conveyance**(선박·항공기·트럭·열차) | 모드별 속도·용량·heading |
| Rail / 도로 그래프 | **운송 네트워크**(항로·해상 레인·간선 도로·철도) | 노드=허브, 링크=레인(모드별) |
| FOUP / 주문(단일 위치) | **Shipment**(화물, 여러 leg로 구성) | 현재 소유 위치=특정 leg의 conveyance 또는 허브 |
| Bay / 배송 권역 | **권역(Region)** | 아시아·북미·유럽 등 대륙/국가/도시 다단 |
| Stocker / 물류센터 | **Hub**(항만·공항·철도터미널·DC) | 환적·보관·통관 |
| Load Port 도킹 | **환적·게이트 처리**(gate-in→loaded→departed) | 허브 체류(dwell) 모델 |
| Hot lot / 특급 승격 | **Expedite**(우선순위 화물) | SLA 민감 화물 |
| Dispatch rule | **라우팅/배정 규칙** | 최단 ETA / 최소 환적 / 최저 비용(가중) |
| Rail 폐쇄·우회 / 도로 통제 | **운하·항만 폐쇄·기상 회피** | 레인 비용 ∞ → 재경로(대권항로 회피 폴리곤) |
| 통신 단절·재동기 | 피드 끊김·재동기 | snapshot 재동기 동일 |

### 2.2 핵심 도메인 모델(타입 스케치)

```ts
type Mode = 'SEA' | 'AIR' | 'ROAD' | 'RAIL';
type HubKind = 'PORT' | 'AIRPORT' | 'RAIL_TERMINAL' | 'DC';      // 분류/보관/통관
type ShipmentStatus =
  | 'BOOKED' | 'AT_ORIGIN' | 'IN_TRANSIT' | 'AT_HUB'              // 환적 대기/통관
  | 'CUSTOMS_HOLD' | 'DELIVERED' | 'DELAYED' | 'EXCEPTION';

interface Hub { id: string; kind: HubKind; name: string; lon: number; lat: number;
  region: string; dwellCap: number; } // 동시 환적 처리 상한

interface Leg {                                   // 화물의 한 구간
  mode: Mode; fromHub: string; toHub: string;
  conveyanceId: string | null;                    // 배정된 운송수단(미배정 시 null)
  path: [number, number][];                       // 대권항로 보간 폴리라인(lon,lat)
  departPlan: number; arrivePlan: number;         // 계획 시각(sim time)
  status: 'PLANNED' | 'ACTIVE' | 'DONE';
}

interface Shipment {                              // 복합운송 단위
  id: string; priority: 0 | 1 | 2 | 3;            // 3=Expedite
  legs: Leg[]; legIndex: number;                  // 현재 진행 중 leg
  status: ShipmentStatus; etaFinal: number;       // 누적 ETA(최종 목적지)
  slaDue: number;                                 // SLA 기한
  milestones: { code: string; ts: number }[];     // gate-in/loaded/departed/arrived/customs...
}

interface Conveyance {                            // 선박/항공기/트럭/열차
  id: string; mode: Mode; lon: number; lat: number; heading: number;
  speed: number;                                  // 모드별 순항(§5)
  legRef: { shipmentId: string; legIndex: number } | null;
  capacity: number; load: number; region: string; // 뷰포트 컬링용 현재 권역
}
```

> 설계 의도: **Shipment는 "소유권/상태의 서사"**를, **Conveyance는 "지도 위 움직임"**을 담당해 분리한다(AMHS의 Job↔OHT, last-mile의 Order↔Rider 분리와 동형). 실시간 고빈도 델타는 주로 Conveyance 위치, 저빈도 델타는 Shipment 마일스톤/상태다.

## 3. 좌표계·지도 (글로브↔지역 듀얼 LOD)

AMHS=로컬 투영, last-mile=Web Mercator(OL)였다. 본 프로토타입은 **deck.gl 듀얼 뷰**다.

- **글로브(Overview)**: `_GlobeView`. 좌표는 EPSG:4326 lon/lat를 구면에 직접 매핑. 표면은 번들 Natural Earth countries `GeoJsonLayer`(+ graticule). 레인은 **대권항로 arc**(`ArcLayer` 또는 보간 폴리라인 `PathLayer`), 허브는 `ScatterplotLayer`, 대륙 간 물동량은 집계(`ArcLayer` 폭=flow) + 선택적 `HeatmapLayer`(허브 밀도).
- **지역(Regional)**: `MapView`. 특정 권역 줌인/선택 시 전환 — 개별 conveyance·세부 경로·허브 혼잡·(옵션)도시 last-mile 수준 간선까지. 베이스맵은 MapLibre(오프라인 벡터) 또는 번들 벡터. last-mile의 지역 관제 패턴을 여기에 접목 가능.
- **전환(핵심 UX)**: 글로브에서 권역 클릭 또는 임계 줌 도달 시 `MapView`로 전환하며 `viewState`(longitude·latitude·zoom·pitch)를 보간 애니메이션. 역방향(지역→글로브)도 동일. 전환은 `shared/map/view-controller.ts`(순수 상태기계)가 관리.
- **LOD 3단계**: **Globe 집계**(대륙 간 flow arc·허브 노드·밀도) → **권역 flow**(국가/레인 단위 conveyance 포인트·레인 강조) → **지역 상세**(개별 conveyance 심벌·leg 경로·허브 도킹). AMHS FAB/Bay/Equipment, last-mile Overview/Zone/Detail에 대응.
- **오프라인 원칙**: 글로브 표면·네트워크·항로는 전부 번들(외부 호출 0). 지역 베이스맵만 선택적으로 온라인 타일을 허용하되 기본은 오프라인(앞 프로토타입과 동일 원칙).

## 4. 실시간 파이프라인 (AMHS·last-mile 코어 재사용)

동일한 snapshot/delta 프로토콜과 공통 인터페이스를 그대로 가져온다. **렌더 엔진만 교체**되고 수신 계층은 재사용한다.

- `SimEngine`(순수) + `DeltaReducer`(수신 코얼레싱)를 **Worker(A)·ws 서버(B)가 공유**, 전송 수단만 `RealtimeSource`로 추상화.
- 방식 A(기본): 인-브라우저 Web Worker 시뮬레이터가 snapshot/delta 송출(정적 배포 가능).
- 방식 B(옵션): 로컬 `ws` 서버(포트 3016)가 동일 엔진 구동, 재연결·backoff·heartbeat·seq 재동기 시연. last-mile의 `ws-auth`(토큰/JWT)·payload 상한·rate limit·감사 로그·세션 스코프·구독 필터를 **그대로 이식**.
- **채널 분리**: `conveyances`(고빈도 위치, upd/add/del) · `shipments`(저빈도 마일스톤/상태) · `alerts` · `audit` · `meta`(시나리오). DeltaReducer 대칭 코얼레싱.
- **구독 필터(글로브 특화)**: 연결/뷰별 `ViewSubscription`에 **권역·extent(bbox)·모드 필터**를 넣어 outbound 메시지를 서버에서 필터(last-mile `filterMessage` 확장). 글로브 Overview는 집계만, 지역은 해당 extent conveyance만 수신 → 대역폭 LOD.
- **델타 대역폭**: lon/lat 1e5~1e6 양자화, conveyance id 정수 압축, 위치 무변화(정박/대기) 반복 전송 억제(last-mile delta 축소 패턴).

## 5. 이동체 동작 현실성 (대권항로 + 모드 모델)

last-mile의 도로 그래프 Dijkstra를 **네트워크 그래프 + 대권항로 보간**으로 일반화한다.

- **대권항로(great-circle)**: 해상·항공 leg는 두 허브 간 구면 최단 경로를 slerp 보간(`shared/geo/great-circle.ts`, 순수). 육상·철도 leg는 노드 그래프 경로(Dijkstra, last-mile `path.ts` 재사용)로 폴리라인 생성.
- **모드별 속도 모델**(합성, 데모 가속): 선박 ~12–24 kn, 항공기 ~800–900 km/h, 트럭 ~60–90 km/h, 철도 ~80–120 km/h. 시뮬 clock은 **시간 압축**(예: 1 real-sec = N sim-min)으로 대륙 횡단을 수십 초에 시연.
- **가·감속/접근**: 허브 접근 시 감속·정지, 출항/이륙 시 가속(last-mile `stepSpeed` 패턴의 일반화). teleport 없음.
- **환적 체류(dwell)**: 허브 도착 → gate-in → (통관/분류 dwell) → 다음 leg conveyance에 적재(loaded) → 출발(departed). 허브 `dwellCap` 초과 시 대기(QUEUED, last-mile 허브 슬롯 패턴 이식).
- **기상/통제 회피**: 활성 회피 폴리곤(태풍·분쟁구역)·폐쇄 레인(운하) 진입 시 대권항로 재계산(우회 waypoint 삽입), `rerouteAll` 트리거.
- **지오펜스/마일스톤**: 영해·공역·권역 경계 진입·이탈 시 마일스톤 이벤트와 상태 전이.

## 6. 운송 운영 모델 (복합운송 생명주기)

AMHS Job·last-mile Order 생명주기를 **멀티-leg 복합운송**으로 확장한다.

- 화물 단계: `BOOKED → AT_ORIGIN → IN_TRANSIT → AT_HUB(환적) → … → DELIVERED`(+ `CUSTOMS_HOLD`/`DELAYED`/`EXCEPTION`).
- leg 전이: 각 leg는 `PLANNED → ACTIVE → DONE`. leg 완료 시 소유권이 다음 conveyance 또는 허브로 이전(화물은 항상 단일 위치).
- **누적 ETA**: 남은 leg별 (거리/모드속도 + 허브 dwell + 통관 가중)의 합. 지연 임계 초과 시 DELAYED 전이·알람, SLA 기한 비교로 at-risk 산출.
- **환적·용량**: 허브 `dwellCap` 예약, conveyance `capacity`/`load`로 적재 상한. 초과 시 다음 출발편 대기.
- **배정/라우팅 규칙**: 최단 ETA / 최소 환적 / 최저 비용(가중) — last-mile dispatch 규칙 구조 재사용, 동점 id 사전순 결정론.
- 1,000~5,000대 conveyance / 10,000~50,000 shipment 부하에서도 미사용 운송수단을 순환시켜 고빈도 델타 유지.

## 7. 시나리오 (자동 데모 + 수동 fault injection)

고정 seed 자동 데모(약 60~90초)로 글로벌 운영 흐름을 재생하고, 수동 주입으로 개별 disruption을 시연한다.

| 시나리오 | 확인 포인트 |
| --- | --- |
| 정상 운송 | 대권항로 arc·허브 환적·누적 ETA |
| Expedite 승격 | 우선순위·경로 재배정·강조 |
| 항만 혼잡 | 허브 dwell 증가·대기열·ETA 전파 |
| 운하 폐쇄(수에즈/파나마) | 레인 ∞·대권항로 우회·전 화물 재경로 |
| 기상 회피(태풍) | 회피 폴리곤·항로 굴절·지연 |
| 통관 지연 급증 | CUSTOMS_HOLD·예외 알람·영향 화물 |
| 수요 서지 | 예약 폭증·허브 backpressure |
| 캐리어 결항·지연 | leg 재배정·연결편 놓침 |
| 피드 단절·재동기 | 화면 정지·snapshot 재동기 |
| 복구 | 정상 운영 회복 |

## 8. 관제 UI (실무 수준 완성도)

- **Executive KPI**: 운송 중 화물·정시율(on-time %)·예외 건수·평균 운송 시간·at-risk(SLA 임박)·환적 대기·완료.
- **글로브 Overview**: 대륙 간 flow arc(폭=물동량)·허브 노드(크기=처리량, 색=혼잡)·밀도 히트맵·회전/자동 스핀 토글.
- **지역 드릴다운**: 권역 클릭/줌 → 2D 지역 관제(개별 conveyance·leg 경로·허브 혼잡·필터 동기화).
- **화물 상세 Drawer**: leg 타임라인(모드 아이콘·계획/실측·마일스톤), 누적 ETA·SLA, 예외·통관 상태, 현재 conveyance.
- **공통 필터**: 모드(해/공/육/철)·레인·캐리어·상태·우선순위 — 글로브·지역·목록 공통 적용.
- **알람**: ETA/SLA 위반·허브 dwell 초과·지오펜스(회피구역 진입)·예외(통관/환적 실패)·용량(허브 혼잡). ack·복구, 영향 화물/허브 포커스.
- **운영 조치**: 재경로·Expedite 승격·통관 홀드 해제·우회 지시 — **역할 기반 2단계 확인**(last-mile 확인 UI 이식).
- **이력 재생**: 최근 N초 링버퍼·속도·seek·LIVE 복귀, 자동 데모 진행률.
- **개발 진단**: FPS·msg/s·upd/s·coalesced%·resync·latency·렌더 대상(보이는/전체)·JS heap.

## 9. 연동 경계 (applyCommand·역할·감사)

last-mile [`amhs_integration_contract_ko.md`](amhs_integration_contract_ko.md) 경계를 물류 명령으로 재정의(구조 동일).

- 단일 실행 지점 `SimEngine.applyCommand(cmd, actor)`: 역할 인증 → 감사 기록(승인·거부 모두) → 승인 시 실행. Worker/ws 어댑터가 세션 actor 주입(클라이언트가 주장하지 않음).
- 역할: `viewer(0) < planner(1) < supervisor(2) < system(3)`.
- 명령(예): `snapshot`(viewer) · `reroute`/`expedite`/`contactCarrier`/`setRoutingRule`/`ackAlert`(planner) · `injectDisruption`(항만혼잡·운하폐쇄·기상·통관·서지)/`resetScenario`(supervisor).
- 감사: `AuditEntry`(id·ts·actor·action·detail·outcome·code) → UI 감사 패널. ws 방식은 선택적 JSONL 감사 로그.
- 서버 인증 경계(방식 B): last-mile `WS_AUTH_TOKENS`/HS256 JWT·payload 상한·rate limit·세션 스코프·구독 필터 **그대로 이식**.

## 10. 성능 목표·최적화

- 목표: 상호작용 중 50~60 FPS, p95 반영 지연 ≤ 200ms, 10~20Hz 송신(틱 예산 50~100ms).
- **deck.gl 최적화**: 레이어 `updateTriggers` 최소화, **binary attributes/typed array**로 수만 객체 attribute 전달(객체 배열 회피), `ArcLayer`/`ScatterplotLayer` GPU 렌더, 애니메이션 이동은 `TripsLayer`(시간 기반) 검토, LOD별 레이어 가시성 전환, 글로브 집계 vs 지역 상세 데이터 분리.
- **뷰포트/권역 컬링**: 현재 extent·권역 밖 conveyance는 데이터에서 제외(last-mile `viewport-cull` 일반화, 글로브는 가시 반구 컬링).
- **코어 벤치**: 헤드리스 `JSON.stringify(engine.tick())` 반복으로 1k/2k/5k conveyance·10k~50k shipment의 tick·직렬화 p95·델타 바이트·지속 Hz·메모리 측정 → `perf-report.md`. 고정 seed·고정 clock 결정론.
- **델타**: lon/lat 양자화·id 정수 압축·무변화 억제·권역 구독 필터(대역폭 LOD).

## 11. 폴더 구조 (AMHS·last-mile 미러링 + deck.gl)

```
src/
  app/                       # Next.js routes (/ → 관제)
  features/control/          # KPI·필터·이력재생·알람 UI
  features/globe/            # deck.gl 글로브/지역 React 컴포넌트(뷰 전환)
  entities/logistics/        # 타입(Shipment/Leg/Conveyance/Hub)·mock·status(순수)
  entities/network/          # 운송 네트워크 그래프 생성/경로(순수) + *.test.ts
  shared/geo/                # great-circle·구면 거리·보간(순수) + *.test.ts
  shared/sim/                # SimEngine (Worker·ws 공용)
  shared/realtime/           # DeltaReducer·SimulatorClient·SocketClient·팩토리 + *.test.ts
  shared/map/                # deck.gl 어댑터·레이어 팩토리·view-controller(글로브↔지역) + *.test.ts
  shared/integration/        # command-contract(역할 정책) + *.test.ts
  stores/                    # Zustand(선택/필터/뷰/재생)
  workers/                   # simulator.worker.ts (방식 A)
public/
  natural-earth/             # countries 1:110m GeoJSON(번들, public domain)
  network/                   # 합성 허브·레인 네트워크 GeoJSON(번들)
server/                      # ws-server.ts (방식 B, 포트 3016) + ws-auth.ts + perf-bench.ts
```

## 12. 구현 로드맵 (단계)

| 단계 | 내용 | 상태 |
| --- | --- | --- |
| 0. 스캐폴드 | Next 앱·포트 3015·deck.gl 설치·레이아웃·도메인 타입·정적 mock·번들 GeoJSON | ⬜ |
| 1. 글로브 MVP | `_GlobeView`·countries 표면·허브 노드·대권항로 arc·회전·LOD 배지 | ⬜ |
| 2. 네트워크·시뮬레이터 | 허브/레인 그래프, great-circle 보간, conveyance 이동 시뮬 + snapshot/delta(Worker A) | ⬜ |
| 3. 복합운송·ETA·상태 | Shipment/Leg 생명주기, 환적 dwell, 누적 ETA, 배정/라우팅 규칙 | ⬜ |
| 4. 글로브↔지역 전환 | `MapView` 지역 LOD, viewState 보간, 권역 드릴다운·필터 동기화 | ⬜ |
| 5. 알람·시나리오 | ETA/SLA·dwell·지오펜스·예외·용량 알람, 자동 데모 + fault injection(운하/기상/통관/서지) | ⬜ |
| 6. 관제 UI 완성 | KPI·화물 상세 Drawer·필터·이력 재생·진단·2단계 확인 조치 | ⬜ |
| 7. 연동 경계 | applyCommand·역할·감사, ws 서버(방식 B)·ws-auth 이식 | ⬜ |
| 8. 성능·최적화 | deck.gl binary/updateTriggers·컬링·헤드리스 벤치·perf-report, 1k~5k·10k~50k | ⬜ |
| 9. 마감 | demo-script·합성 데이터 고지·고정 시작 상태·진행 내역 문서·README | ⬜ |

> last-mile 대비 단계가 하나 많다(글로브↔지역 전환 §4를 독립 단계로 분리). 각 단계 종료 시 `tsc --noEmit`·unit test green·(렌더는) 브라우저 육안 확인을 게이트로 둔다.

## 13. 테스트 계획 (node --test + tsx)

- `great-circle` — 구면 거리·중간점·보간 샘플 수·경도 wrap(±180) 처리
- `network` — 결정론적 그래프 생성, adjacency, 경로 도달성, 레인 폐쇄 시 우회
- `delta-reducer` — 코얼레싱·seq gap·재동기·채널별(conveyance/shipment/alert/audit) 누적
- `engine` — 화물 단계·leg 전이·소유권 이전·환적 dwell·용량 예약·누적 ETA·델타 일치
- `view-controller` — 글로브↔지역 전환 상태기계·viewState 경계·권역 선택
- `viewport-cull` — extent/권역/가시 반구 컬링, diff 가시성
- `command-contract` — 역할별 승인/거부·감사 생성
- `socket-server` — 임시 포트 서버 + 두 클라이언트 snapshot/seq/명령/구독 필터/인증 거부

## 14. 완료 조건 (Definition of Done)

- 단계 0~9 구현, `tsc --noEmit` 통과, 전체 unit test green.
- 글로브↔지역 전환이 매끄럽고(viewState 보간), 자동 데모가 고정 seed로 재현되며 1k~5k conveyance 전환이 동작.
- 헤드리스 코어 벤치가 10~20Hz 예산을 통과하고 `perf-report.md`에 기록.
- deck.gl 렌더(글로브 arc·허브·히트맵, 지역 상세) 브라우저 육안 확인.
- README·화면에 **합성 데이터·공개 Natural Earth·실제 운송망 아님**을 명시.
- 진행 내역 문서(`smart_logistics_control_center_prototype_progress_ko.md`)를 AMHS/last-mile 양식으로 작성.

---

## 부록 A. 핵심 리스크와 완화

| 리스크 | 완화 |
| --- | --- |
| `_GlobeView` experimental API 불안정 | deck.gl 버전 고정, 뷰 전환을 어댑터(`shared/map/`) 한 곳에 캡슐화, 최악 시 2D MapView-only 폴백 |
| 글로브↔지역 전환 UX 복잡 | 전환을 순수 상태기계(`view-controller`)로 분리·테스트, viewState 보간은 deck.gl `transitionInterpolator` 사용 |
| 대권항로 경도 wrap(±180) 렌더 아티팩트 | 보간 시 날짜변경선 분할, 테스트로 wrap 케이스 고정 |
| 수만 객체 attribute 비용 | binary/typed array·`updateTriggers` 최소화·LOD 데이터 분리·권역 구독 필터 |
| 도메인 복잡도(멀티모달) 과설계 | 단계 2까지는 단일 leg로 시작, 단계 3에서 멀티-leg 확장(점진) |

## 부록 B. 앞 프로토타입에서 그대로 이식하는 자산

- 실시간 코어: `SimEngine`·`DeltaReducer`·`RealtimeSource`·Worker/ws 이중화·seq 재동기.
- 연동 경계: `command-contract`(ROLE_RANK·COMMAND_MIN_ROLE·authorize·audit), `applyCommand` 단일 실행점.
- 방식 B 서버 하드닝: `ws-auth`(토큰/JWT)·payload 상한·rate limit·세션 스코프·구독 필터·JSONL 감사.
- 성능 도구: 헤드리스 `perf-bench`·`perf-report.md` 양식, 뷰포트 컬링(일반화).
- UI 패턴: 2단계 확인 조치·이력 재생 링버퍼·개발 진단 오버레이·합성 데이터 고지 배지.
- 그래프 경로: last-mile `entities/road`(Dijkstra)를 육상/철도 leg에 재사용.
