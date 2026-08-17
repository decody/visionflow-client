# Dior Gallery 사용자 경험 및 포트폴리오 감사

작성일: 2026-08-17
대상: `prototypes/dior-gallery`
목적: 사용자 경험과 Visionflow 외부 포트폴리오 관점에서 현재 프로토타입의 완성도와 개선 과제를 평가한다.

## 1. 종합 평가

현재 Dior Gallery는 **완성도 높은 Web3D 비주얼 프로토타입** 단계에 있다. 장면별 개성, 모바일 전용 구도, 커스텀 셰이더와 공간 모델링은 Visionflow의 기술력을 충분히 보여준다.

외부 포트폴리오로 공개하기 위해서는 효과를 더 추가하기보다 다음 항목을 정리해야 한다.

- 초기 로딩과 GPU 메모리 사용량
- 첫 진입과 장면 이동 흐름
- 장면별 시각적 우선순위
- 실제 전시물에 대한 큐레이션 정보
- 독립 콘셉트 프로젝트라는 설명과 크레딧
- 마지막 장면 이후의 포트폴리오 전환
- 접근성과 저사양 환경 대응

현재 가장 큰 간극은 디자인 자체가 아니라 **프로젝트를 왜 만들었고 Visionflow가 무엇을 해결했는지 화면에서 설명되지 않는 점**이다.

## 2. 현재 강점

- `ARCHIVE → ATELIER → ROUGE → REVERIE`의 장면 구분이 명확하다.
- 터널, 아틀리에 오브젝트, 크리스탈 벽면, 드레스 파티클이 서로 다른 기술 역량을 보여준다.
- 데스크톱과 모바일에 별도의 카메라 구도와 오브젝트 배치를 적용했다.
- 직접 촬영한 이미지를 사용해 일반적인 3D 데모보다 고유성이 높다.
- 스크롤, 마우스 광원, 파티클과 배경음악이 하나의 경험으로 연결된다.
- 실제 아이폰에서 안정적인 퍼포먼스를 확인했다.
- 템플릿이 아니라 Visionflow의 자체 Creative Development 역량이 드러난다.

## 3. 공개 전 우선순위

| 우선순위 | 문제 | 권장 수정 |
|---|---|---|
| P0 | 초기 에셋이 무거움 | 이미지 리사이즈·WebP 변환, 오디오 preload 축소, 장면별 지연 로딩 |
| P0 | 숫자 버튼 장면 이동이 너무 오래 걸림 | 버튼 이동을 문서 스크롤과 분리하고 0.8~1.4초로 제한 |
| P0 | 마지막에 포트폴리오 결론이 없음 | 크레딧·Replay·Case Study·Visionflow 이동 추가 |
| P1 | 파티클이 작품보다 먼저 보임 | 전역 밀도를 낮추고 장면별 컬러와 노출 시점을 제한 |
| P1 | 작품에 대한 실제 정보가 없음 | 장면별 짧은 큐레이션 캡션과 사진 크레딧 추가 |
| P1 | 독립 프로토타입 표시가 부족함 | Dior 비공식 콘셉트 프로젝트임을 명시 |
| P1 | 접근성 모션 대응이 불완전함 | Three.js 애니메이션까지 reduced-motion 반영 |
| P2 | 포트폴리오 메타 정보 부족 | 역할·기술·문제·해결·성과를 설명하는 Case Study 구성 |

## 4. 사용자 관점의 개선점

### 4.1 초기 로딩 최적화

현재 사용 중인 이미지는 11장, 총 약 `9.52MB`이며 모두 `2016×1512` 크기다. 오디오도 약 `4.98MB`이므로 초기 방문자가 받을 가능성이 있는 에셋은 약 `14.5MB`다.

모든 장면이 동시에 마운트되기 때문에 첫 화면에서도 뒤쪽 장면 이미지까지 로딩된다. 파일 전송량뿐 아니라 브라우저가 텍스처를 GPU 메모리로 압축 해제할 때 더 큰 메모리를 사용한다.

권장 사양:

- 데스크톱 이미지: 긴 변 기준 `1280px`
- 모바일 이미지: 긴 변 기준 `960px`
- JPEG를 WebP로 변환
- 현재 장면과 다음 장면만 우선 로딩
- `velvet.mp3`의 `preload="auto"`를 `metadata`로 변경
- `PREPARING THE EXHIBITION` 대신 실제 로딩 퍼센트 표시
- 모바일 DPR과 텍스처 최대 크기 제한
- WebGL Context 손실 시 복구 또는 정적 대체 화면 제공

### 4.2 숫자 내비게이션 이동 시간

로컬 검수에서 숫자 버튼으로 장면을 이동할 때 긴 문서 거리 때문에 장면이 완전히 정착하기까지 약 6초 이상 걸리는 경우가 있었다.

두 조작 방식의 목적을 분리하는 것이 좋다.

- 마우스 휠: 시네마틱 탐험
- 숫자 버튼: 빠른 장면 이동
- 버튼 전환 시간: 약 0.8~1.4초
- 이동 중 지나가는 장면의 제목과 오브젝트는 숨김
- 목적 장면이 보이기 직전에 제목 애니메이션 시작

### 4.3 첫 진입 과정 단순화

현재 흐름은 다음과 같다.

```text
ENTER EXHIBITION
→ DRIFT INTO THE MARVELOUS
→ SCROLL TO ENTER
→ ARCHIVE
```

사용자는 이미 Enter를 눌렀는데 다시 스크롤해야 하므로 이중 진입처럼 느낄 수 있다.

추천 흐름:

```text
ENTER WITH SOUND
→ 짧은 터널 진입 모션
→ ARCHIVE
→ SCROLL TO EXPLORE
```

사운드가 시작된다는 사실을 입장 버튼에서 미리 알려주는 것이 좋다. 현재처럼 사용자 클릭 이벤트 안에서 재생을 시작하는 구현은 브라우저 자동재생 정책에 적합하다.

참고: [MDN 자동재생 가이드](https://developer.mozilla.org/en-US/docs/Web/Media/Guides/Autoplay)

### 4.4 파티클과 광원 편집

현재 단계에서는 파티클을 더 추가하면 완성도가 오히려 떨어질 가능성이 크다.

관찰된 문제:

- 첫 진입의 중앙 광원이 안내 문장을 가린다.
- 모든 장면에 보라·파랑·노랑 파티클이 유지되어 장면 간 차이가 약해진다.
- REVERIE에서는 드레스와 제목보다 파티클이 먼저 인식되는 순간이 있다.
- ATELIER의 섬세한 공방 분위기와 네온 파티클의 성격이 충돌한다.

추천 팔레트:

- `ARCHIVE`: 샴페인 골드와 희미한 청색
- `ATELIER`: 아이보리, 먼지 같은 백색, 극소량의 금색
- `ROUGE`: 루비, 와인, 붉은 반사광
- `REVERIE`: 금색 70%, 은색 30%

전역 파티클 밀도를 약 35~45% 줄이고 장면별 파티클이 주역이 되는 시점만 강조하는 것이 좋다.

### 4.5 타이포그래피와 작품의 우선순위

대형 타이틀은 Visionflow의 디자인 인상을 강하게 만들지만 REVERIE에서는 제목과 드레스가 시각적으로 경쟁한다.

추천 연출:

1. 장면 진입 시 큰 제목 노출
2. 1.5~2초 후 제목을 상단의 작은 챕터 라벨로 축소
3. 작품이 화면의 주인공이 됨
4. 설명은 필요할 때만 다시 펼칠 수 있게 처리

현재의 강한 첫인상을 유지하면서 작품 감상 시간을 확보할 수 있다.

Georgia와 Arial 조합은 안정적이지만 최종 포트폴리오에서는 기본적인 인상을 줄 수 있다. Dior 로고를 모방하기보다 Visionflow 고유의 고대비 Serif와 정교한 Sans 조합을 구성하는 편이 좋다.

### 4.6 실제 큐레이션 정보

현재 설명문은 분위기는 좋지만 사용자가 어떤 사진과 오브젝트를 보고 있는지 알려주지 않는다. 그 결과 경험이 멋있는 이미지 전시에 머물 수 있다.

장면마다 하나의 짧은 실제 정보를 추가한다.

```text
ARCHIVE
Photographed at La Galerie Dior, Paris
Original exhibition details and archival silhouettes

ATELIER
The making of form through toile, pattern and handwork
```

모든 액자에 설명을 붙일 필요는 없다. 장면당 한 개의 큐레이션 문장만 있어도 공간에 의미가 생긴다.

Dior 공식 공간도 heritage, savoir-faire, original designs와 sketches를 scenographic narrative로 연결한다.

- [La Galerie Dior](https://www.galeriedior.com/en/galleries/la-galerie-dior)
- [30 Montaigne](https://www.dior.com/en_int/fashion/30-montaigne)

### 4.7 마지막 장면 이후의 경험

현재 REVERIE에 도착하면 사용자가 할 수 있는 일이 거의 없다. 외부 포트폴리오에서는 마지막 장면이 가장 중요한 전환 지점이다.

약 4~5초 뒤 다음과 같은 엔드 카드를 노출하는 것이 좋다.

```text
A VISIONFLOW WEB3D STUDY

Creative Direction
WebGL Development
Interaction Design
Photography

REPLAY EXPERIENCE
VIEW CASE STUDY
BACK TO VISIONFLOW
```

엔드 카드가 없으면 사용자가 작품은 기억해도 Visionflow에 문의하거나 다른 프로젝트를 볼 가능성이 낮다.

### 4.8 접근성과 조작

현재 `prefers-reduced-motion`은 일부 CSS 애니메이션만 정지시키고 Three.js 파티클과 카메라 애니메이션은 계속 움직인다.

필요한 보완:

- reduced-motion에서 파티클 속도와 밀도 감소
- 카메라 전환을 짧은 페이드로 대체
- Scramble Text 즉시 완성
- 장면 숫자 버튼에 `Go to Archive` 같은 접근 가능한 이름 적용
- 키보드 `←/→` 또는 `1~4` 장면 이동
- 명확한 `:focus-visible` 스타일
- WebGL을 사용할 수 없는 환경을 위한 정적 이미지 버전
- 모바일 버튼의 실제 터치 영역 확대

WCAG 2.2의 최소 포인터 대상은 `24×24 CSS px`이며 중요한 모바일 컨트롤은 더 넓게 만드는 것이 권장된다.

참고: [W3C Target Size](https://www.w3.org/WAI/WCAG22/Understanding/target-size-minimum)

## 5. Visionflow 포트폴리오 관점의 개선점

### 5.1 프로젝트 성격 명시

현재 화면에는 `VISIONFLOW / PROTOTYPE 01`만 있어 실제 고객 프로젝트인지 독립 실험인지 구분하기 어렵다.

외부 공개 시 다음 정보를 명시한다.

- `Independent conceptual prototype`
- `Not affiliated with or commissioned by Dior`
- 촬영자와 이미지 크레딧
- 제작 연도
- Visionflow의 담당 영역
- 사용 기술
- 모바일 최적화 과정
- 프로젝트에서 해결한 핵심 문제

### 5.2 Case Study 구성

추천 구조:

```text
01. Overview
02. Creative Concept
03. Four-scene Narrative
04. Mobile Art Direction
05. WebGL and Shader Development
06. Performance Strategy
07. Sound Design
08. Result
```

우수한 WebGL 스튜디오 사례들은 최종 비주얼뿐 아니라 제작 이유와 기술을 함께 설명한다.

- [Vide Infra WebGL Case Study](https://videinfra.com/blog/case-study-a-triple-site-of-the-day-winner-powered-by-webgl)
- [Little Workshop Showroom](https://www.littleworkshop.fr/projects/showroom/)
- [Active Theory XR Experiments](https://xr.activetheory.net/)

### 5.3 포트폴리오 전환 요소

- Visionflow 포트폴리오로 돌아가는 링크
- 다음 Web3D 프로토타입 링크
- 프로젝트 문의 CTA
- 20~30초 미리보기 영상
- OG 이미지와 소셜 공유 메타데이터
- 프로젝트 대표 이미지와 썸네일
- 역할, 기술 스택, 제작 기간과 결과 요약
- 장면 도달률과 완주율을 확인할 수 있는 분석 이벤트

### 5.4 브랜드 포지셔닝

Dior의 비주얼을 복제하는 것보다 Visionflow가 패션·문화 콘텐츠를 Web3D로 재해석하는 능력을 보여주는 것이 중요하다.

강조해야 할 역량:

- Creative Direction
- Spatial Storytelling
- Responsive 3D Art Direction
- Shader and Particle Development
- Performance Optimization
- Interactive Sound Design

## 6. 권장 작업 순서

1. 이미지 최적화와 장면별 지연 로딩
2. 숫자 내비게이션 이동 시간 단축
3. 첫 진입 흐름 단순화
4. 전역 파티클 밀도와 컬러 정리
5. 제목이 일정 시간 후 축소되는 모션
6. 실제 큐레이션 캡션과 크레딧
7. REVERIE 엔드 카드 및 Visionflow CTA
8. reduced-motion과 키보드 접근성
9. OG 이미지·소셜 공유 메타데이터
10. 독립 프로토타입 Case Study 페이지

## 7. 최종 권고

지금 필요한 것은 추가 효과가 아니라 **편집과 정보 설계**다.

특히 다음 일곱 항목을 먼저 완료하면 단순한 Web3D 실험에서 Visionflow를 대표할 수 있는 외부 포트폴리오 프로젝트로 발전할 수 있다.

1. 초기 로딩 최적화
2. 장면 이동 시간 단축
3. 입장 흐름 단순화
4. 파티클과 광원 절제
5. 작품 중심 타이포그래피
6. 큐레이션 정보와 크레딧
7. 마지막 CTA와 Case Study 연결

효과를 더 많이 넣기보다 각 장면에서 무엇을 남기고 무엇을 제거할지 결정하는 것이 최종 완성도를 좌우한다.

## 8. 현재 작업 상태 참고

작성 시점 기준으로 `velvet.mp3`, 배경음악 재생 코드와 `SOUND ON/OFF` 컨트롤 변경은 로컬 작업 트리에 있으며 아직 커밋·배포되지 않은 상태다.

## 9. 개선 작업 반영 상태

2026-08-17 기준으로 공개 전 우선순위 가운데 다음 항목을 구현했다.

- 전시 이미지를 긴 변 `1280px`, WebP 품질 82로 변환해 총용량을 약 `9.52MB`에서 `1.20MB`로 축소
- 현재 구간과 인접 구간 중심으로 텍스처가 마운트되도록 장면 노출 범위 조정
- 오디오 preload를 `auto`에서 `metadata`로 변경
- 초기 텍스처 로딩 퍼센트를 표시하고 이후 장면 지연 로딩에는 전체 로더가 다시 나타나지 않도록 처리
- 숫자 버튼의 장면 이동을 약 `1.1초` 직접 전환으로 변경
- 입장 버튼 클릭 후 ARCHIVE까지 자동 진입하도록 첫 진입 흐름 단순화
- 전역 파티클 수를 줄이고 장면별 팔레트와 노출 강도를 분리
- 포인터 광원은 실제 포인터 이동이 있을 때만 작게 나타나도록 절제
- 장면 진입 후 대형 타이틀이 작은 챕터 레이블로 축소되도록 변경
- 각 장면에 실제 감상을 돕는 짧은 큐레이션 문장 추가
- 독립 콘셉트 프로젝트와 Dior 비의뢰 프로젝트임을 명시
- 2025년 서울 DDP에서 열린 `Christian Dior: Designer of Dreams`에서 받은 영감을 바탕으로 2026년 봄 제작한 배경 추가
- REVERIE 이후 Replay, Project Notes, Visionflow 이동을 포함한 엔드 카드 추가
- 엔딩 크레딧에 `Gichul Roh / Visionflow`와 LinkedIn, Visionflow, Routebase 링크 추가
- 배경 앰비언트 사운드에 `Created with Suno AI` 제작 크레딧 추가
- 프로젝트의 콘셉트·역할·기술·모바일 대응을 설명하는 Project Notes 패널 추가
- 키보드 방향키와 숫자키 장면 이동, Escape 닫기, focus-visible, ARIA 이름 추가
- `prefers-reduced-motion`을 카메라·파티클·크리스탈 애니메이션과 DPR 설정에 반영
- WebGL 2 미지원과 WebGL Context 손실 시 정적 이미지가 포함된 대체 화면 제공
- Open Graph와 Twitter 기본 메타데이터 추가

검수 결과:

- TypeScript 검사 통과
- Next.js 프로덕션 빌드 통과
- 데스크톱 브라우저에서 입장, 빠른 장면 이동, 타이틀 축소, 엔드 카드 확인
- `390×844` 모바일 뷰에서 인트로와 REVERIE 피날레 레이아웃 확인
- 브라우저 콘솔 오류 없음

후속 작업으로 남겨둔 항목은 전용 OG 대표 이미지 제작, 실제 Visionflow Case Study 라우트 연결과 분석 이벤트다.
