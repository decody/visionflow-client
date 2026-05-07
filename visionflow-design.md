### 🤖 Claude Code 인계 문서 — 프론트엔드 구현 가이드

> **목적**: 웹 채팅 Claude(Notion + Figma 작업)에서 Claude Code(Next.js 구현 + 배포)로 컨텍스트를 인계하기 위한 단일 문서
> 

> **대상**: Claude Code 첫 세션 진입 시 이 문서 1개만 읽으면 즉시 작업 시작 가능하도록 작성됨
> 

> **작성일**: 2026.05.07 · **프로젝트**: [VisionFlow.kr](http://VisionFlow.kr) 리뉴얼
> 

---

# 0. 빠른 시작 (Claude Code 첫 진입 시 읽기)

## 0.1 프로젝트 한 줄 정의

[VisionFlow.kr](http://VisionFlow.kr) (한국 B2B AI 디지털 스튜디오) 사이트 리뉴얼 — 웹 3D · 광고 이미지 · 웹/앱 · 데이터 대시보드 4개 카테고리를 명확화하고 SEO/성능을 확보하는 작업.

## 0.2 현재 상태

| 단계 | 상태 | 주관 |
| --- | --- | --- |
| 전략 기획서 | ✅ 완료 (Notion) | 웹 채팅 Claude |
| 카테고리별 메뉴 기획서 (4종) | ✅ 완료 (Notion) | 웹 채팅 Claude |
| About / Work / Contact / Admin CMS 기획서 | ✅ 완료 (Notion) | 웹 채팅 Claude |
| 디자인 시스템 (Figma) | ✅ 완료 | 웹 채팅 Claude |
| 메인 페이지 디자인 | ✅ 완료 (Figma node 26:2) | 웹 채팅 Claude |
| 4개 카테고리 페이지 디자인 | ✅ 완료 (Figma) | 웹 채팅 Claude |
| Work Detail 페이지 디자인 | ✅ 완료 (Figma node 148:59) | 웹 채팅 Claude |
| **Next.js 프론트엔드 구현** | **🔄 진행 예정** | **Claude Code (이 문서의 대상)** |
| Supabase 백엔드 구축 | ⏳ 미착수 | Claude Code |
| Vercel 배포 | ⏳ 미착수 | Claude Code |

## 0.3 Claude Code의 첫 작업 순서 (제안)

```jsx
1. 로컬 프로젝트 폴더 파악 — E:\PROJECT\visionflow
   ├─ package.json 읽기 → 현재 스택 확인 (Next.js 버전, App Router/Pages Router)
   ├─ tsconfig.json, next.config.* 확인
   ├─ 기존 폴더 구조 파악
   └─ 기존 컴포넌트가 있다면 컨벤션 분석

2. 본 문서 §3 (디자인 토큰) → globals.css 또는 styles/tokens.css 생성

3. 본 문서 §4 (폴더 구조 제안) → 누락된 폴더 생성

4. 본 문서 §5 (컴포넌트 우선순위) → 공통 컴포넌트부터 순차 구현
   ├─ Button, Header, Footer (P0)
   ├─ Hero, ServicesGrid, FAQ (P1)
   └─ 카테고리별 섹션 컴포넌트 (P2)

5. 본 문서 §6 (페이지 라우팅) → app 폴더 라우트 생성 후 컴포넌트 조립

6. Figma MCP로 각 노드의 디자인 컨텍스트 조회 (본 문서 §7 노드 ID 표 참조)

7. 매 컴포넌트 완성 시 npm run dev로 시각 검증
```

## 0.4 핵심 외부 자원 링크

| 자원 | 링크 / ID | 용도 |
| --- | --- | --- |
| Figma 파일 (전체) | fileKey: `1rwyWGJ7MAB86orHsoDaZp` | 모든 화면 시안 |
| Figma URL | https://www.figma.com/design/1rwyWGJ7MAB86orHsoDaZp/VisionFlow-Renewal | — |
| 전략 기획서 | [VisionFlow 리뉴얼 전략기획서](https://www.notion.so/VisionFlow-354b02bb4efb819d83d5c21f9c17bd2e?pvs=21) | 본 문서의 부모 |
| 로컬 프로젝트 | `E:\PROJECT\visionflow` | 구현 대상 |

---

# 1. 프로젝트 정체성 (Identity)

## 1.1 한 줄 포지셔닝

> "AI로 콘텐츠를 만들고, 그 콘텐츠가 동작하는 웹까지 한 팀이 책임진다."
> 

## 1.2 4개 서비스 카테고리

| 카테고리 | 한국어 라우트 | 영문 라우트(권장) | 핵심 차별점 |
| --- | --- | --- | --- |
| 웹 3D | `/web-3d` | `/web-3d` | Three.js + 웹 성능 최적화 |
| 광고 이미지 제작 | `/ad-visuals` | `/ad-visuals` | LoRA 파인튜닝 + 6채널 자동 변환 |
| 웹/앱 개발 | `/web-app` | `/web-app` | 풀스택 + 카테고리 1·2 결합 가능 |
| 데이터 대시보드 | `/dashboard` | `/dashboard` | AG Grid 50만 행 + KPI 워크숍 |

## 1.3 페르소나

- **마케팅팀 리드 (B2B)** — 광고 이미지 + 웹 3D 우선
- **이커머스 운영자** — 광고 이미지 + 웹/앱 + 대시보드 결합
- **스타트업 PO/CTO** — 웹/앱 + 대시보드 우선
- **엔터프라이즈 IT** — 대시보드 (RFP 검토 단계)

---

# 2. 기술 스택 (확정)

> 본 섹션은 전략기획서 §7.1에서 확정된 사항입니다. **변경 시 의사결정자 협의 필요.**
> 

## 2.1 코어 스택

| 영역 | 기술 | 버전 / 노트 |
| --- | --- | --- |
| 프레임워크 | Next.js | 14.x (App Router) |
| 언어 | TypeScript | 5.x, strict mode |
| 스타일 | **CSS Module** | 컴포넌트 단위 `*.module.css` |
| UI 라이브러리 | Ant Design | 5.x — 폼·모달·날짜 등 표준 컴포넌트만 사용 |
| 데이터 그리드 | AG Grid Community | 대시보드 카테고리만 사용 |
| 3D | Three.js + React Three Fiber | 웹 3D 카테고리 + Web 3D 페이지 |
| 차트 | Recharts (기본) + Apache ECharts (복잡 차트) | 대시보드용 |
| 폰트 | Inter (영문) + Pretendard (한글) | next/font/google + 자체 호스팅 |

## 2.2 백엔드·인프라

| 영역 | 기술 | 용도 |
| --- | --- | --- |
| DB / Auth / Storage | Supabase | PostgreSQL + RLS + Storage + Edge Functions |
| 호스팅 | Vercel | ISR + Preview Deploy |
| 분석 | GA4 + Plausible (백업) | — |
| 에러 추적 | Sentry | — |

## 2.3 스타일링 컨벤션 (중요)

**CSS Module을 채택했으므로** 다음 원칙을 따릅니다:

- 모든 컴포넌트는 `Component.tsx` + `Component.module.css` 페어로 구성
- 글로벌 스타일은 `app/globals.css` 1개에만 정의 (reset + 토큰 + body 기본값)
- 디자인 토큰은 CSS Variables로 `:root`에 정의 → 모든 module.css에서 `var(--color-primary)` 형태로 사용
- 클래스명은 camelCase (예: `.heroTitle`, `.ctaPrimary`)
- BEM 미사용 (CSS Module이 자동 스코프 분리)
- Tailwind 미사용 (전략기획서에서 CSS Module 채택)

---

# 3. 디자인 토큰 (코드 변환 준비됨)

> 본 섹션은 Figma에서 실제 사용 중인 토큰을 그대로 CSS Variable 형태로 정리한 것. **`app/globals.css`에 그대로 복사하여 사용 가능.**
> 

## 3.1 globals.css 전체 코드

```css
/* app/globals.css */

/* ===== Reset ===== */
*, *::before, *::after { box-sizing: border-box; }
html, body { margin: 0; padding: 0; }
body {
  font-family: var(--font-pretendard), var(--font-inter), system-ui, sans-serif;
  color: var(--color-text);
  background: var(--color-bg);
  -webkit-font-smoothing: antialiased;
}
img, video { max-width: 100%; display: block; }
button { font: inherit; cursor: pointer; }
a { color: inherit; text-decoration: none; }

/* ===== Design Tokens ===== */
:root {
  /* Colors — Brand */
  --color-primary: #004fff;
  --color-primary-light: #3d6fff;
  --color-primary-dark: #0040f1;
  --color-on-primary: #ffffff;

  /* Colors — Neutral */
  --color-text: #171a1a;
  --color-text-secondary: #6b7280;
  --color-muted: #75787f;
  --color-bg: #ffffff;
  --color-surface: #f9fafb;
  --color-surface-2: #f6f8fb;
  --color-border: #e8eef2;
  --color-border-strong: #d1d5db;

  /* Colors — Status */
  --color-success: #03c75a;
  --color-warning: #f59e0b;
  --color-danger: #ef4444;

  /* Colors — Category Accents (Hero gradients) */
  --color-web3d-from: #0e1428;
  --color-web3d-to: #051026;
  --color-ad-from: #140f29;
  --color-ad-via: #3b144a;
  --color-ad-to: #0a0519;
  --color-ad-pink: #ec4899;
  --color-ad-purple: #a855f7;
  --color-dashboard-from: #0f1428;
  --color-dashboard-to: #051026;

  /* Typography — Sizes */
  --fs-h1-hero: 56px;
  --fs-h1: 36px;
  --fs-h2: 24px;
  --fs-h3: 20px;
  --fs-body-lg: 18px;
  --fs-body: 16px;
  --fs-small: 14px;
  --fs-caption: 13px;
  --fs-micro: 12px;
  --fs-tiny: 11px;

  /* Typography — Weights */
  --fw-regular: 400;
  --fw-medium: 500;
  --fw-semibold: 600;
  --fw-bold: 700;

  /* Typography — Line Heights */
  --lh-tight: 1.2;
  --lh-snug: 1.3;
  --lh-normal: 1.5;
  --lh-relaxed: 1.65;
  --lh-loose: 1.75;

  /* Typography — Letter Spacing */
  --ls-tighter: -0.02em;
  --ls-tight: -0.01em;
  --ls-normal: 0;
  --ls-wide: 0.05em;
  --ls-wider: 0.08em;
  --ls-widest: 0.12em;

  /* Spacing (4px base) */
  --space-1: 4px;
  --space-2: 8px;
  --space-3: 12px;
  --space-4: 16px;
  --space-5: 20px;
  --space-6: 24px;
  --space-8: 32px;
  --space-10: 40px;
  --space-12: 48px;
  --space-16: 64px;
  --space-20: 80px;
  --space-24: 96px;

  /* Layout */
  --container-max: 1200px;
  --page-padding-x: 120px;
  --page-padding-x-mobile: 24px;

  /* Radius */
  --radius-xs: 4px;
  --radius-sm: 6px;
  --radius-md: 8px;
  --radius-lg: 12px;
  --radius-xl: 16px;
  --radius-pill: 999px;

  /* Shadows */
  --shadow-sm: 0 1px 2px rgba(0, 0, 0, 0.04);
  --shadow-md: 0 4px 12px rgba(0, 0, 0, 0.06);
  --shadow-lg: 0 12px 32px rgba(0, 0, 0, 0.10);
  --shadow-cta: 0 4px 12px rgba(0, 79, 255, 0.30);

  /* Transitions */
  --transition-fast: 150ms ease;
  --transition-base: 200ms ease;
  --transition-slow: 300ms ease;
}

/* ===== Breakpoints (reference, used in module.css via media queries) =====
  Mobile  : < 768px
  Tablet  : 768 ~ 1023px
  Desktop : 1024 ~ 1639px
  Wide    : >= 1640px
*/
```

## 3.2 컬러 팔레트 시각 매핑

| 토큰 | HEX | 용도 | Figma 사용처 |
| --- | --- | --- | --- |
| `--color-primary` | #004FFF | 핵심 CTA, 링크, eyebrow chip | 모든 페이지 Primary 버튼 |
| `--color-text` | #171A1A | 본문 텍스트 | H1, H2, Body |
| `--color-muted` | #75787F | 서브 텍스트, 비활성 | Sub, Caption |
| `--color-surface` | #F9FAFB | 섹션 배경 (홀수 섹션) | Tech Stack, FAQ 섹션 |
| `--color-border` | #E8EEF2 | 카드 테두리, 디바이더 | 모든 카드 stroke |
| `--color-success` | #03C75A | 체크 아이콘, 성공 라벨 | Deliverables ✓, LIVE 점 |
| `--color-danger` | #EF4444 | Don't 컬럼, 에러 | Don't 섹션 |
| `--color-ad-pink` | #EC4899 | 광고 이미지 카테고리 액센트 | Ad Visuals 페이지 그라데이션 |
| `--color-ad-purple` | #A855F7 | 광고 이미지 카테고리 보조 | Ad Visuals 그라데이션 |

## 3.3 타이포그래피 사용 패턴

| 역할 | 토큰 | 두께 | 줄간격 | 자간 |
| --- | --- | --- | --- | --- |
| Hero H1 | --fs-h1-hero (56px) | --fw-bold | --lh-tight (1.2) | --ls-tighter (-0.02em) |
| Section H1 | --fs-h1 (36px) | --fw-bold | --lh-snug (1.3) | --ls-tight (-0.01em) |
| Card Title | --fs-h2 (24px) | --fw-bold | --lh-snug | --ls-tight |
| Body Large | --fs-body-lg (18px) | --fw-regular | --lh-relaxed (1.65) | --ls-normal |
| Body | --fs-body (16px) | --fw-regular | --lh-relaxed | --ls-normal |
| Eyebrow chip | --fs-micro (12px) | --fw-bold | — | --ls-wider (0.08em) |
| Caption | --fs-caption (13px) | --fw-medium | --lh-normal | --ls-normal |

## 3.4 레이아웃 그리드

```
┌─ Page (1440px) ─────────────────────────────────────────┐
│                                                          │
│  ←--120--→ ┌─ Container (1200px) ──────────────┐ ←--120-→
│            │                                    │
│            │  Content                           │
│            │                                    │
│            └────────────────────────────────────┘
│                                                          │
└──────────────────────────────────────────────────────────┘
```

- Desktop: `padding: 0 120px;` content max-width 1200px
- Tablet: `padding: 0 48px;` content fluid
- Mobile: `padding: 0 24px;` content fluid

---

# 4. 권장 폴더 구조

> Next.js 14 App Router 표준 + 현 프로젝트 규모에 적합한 구조. Claude Code는 기존 `E:\PROJECT\visionflow` 폴더를 먼저 파악한 후, 누락된 부분만 생성하는 방식으로 적용.
> 

## 4.1 전체 구조

```jsx
E:\PROJECT\visionflow\
├── app\
│   ├── layout.tsx                    // 루트 레이아웃 (Header + Footer 공통)
│   ├── page.tsx                      // 메인 (/)
│   ├── globals.css                   // 디자인 토큰 + 리셋
│   ├── web-3d\page.tsx               // 웹 3D (/web-3d)
│   ├── ad-visuals\page.tsx           // 광고 이미지 (/ad-visuals)
│   ├── web-app\page.tsx              // 웹/앱 (/web-app)
│   ├── dashboard\page.tsx            // 대시보드 (/dashboard)
│   ├── work\
│   │   ├── page.tsx                  // Work 인덱스
│   │   └── [slug]\page.tsx           // Work Detail (/work/...)
│   ├── about\page.tsx                // About (/about)
│   ├── contact\page.tsx              // Contact (/contact)
│   └── admin\                        // 관리자 (별도 레이아웃)
│       ├── layout.tsx
│       └── ...
│
├── components\
│   ├── common\                       // 공통 컴포넌트
│   │   ├── Button\
│   │   │   ├── Button.tsx
│   │   │   ├── Button.module.css
│   │   │   └── index.ts
│   │   ├── Header\
│   │   ├── Footer\
│   │   ├── Container\
│   │   ├── EyebrowChip\
│   │   ├── SectionHead\               // eyebrow + H1 + sub 묶음
│   │   └── CTAButton\
│   │
│   ├── sections\                     // 페이지 섹션 단위
│   │   ├── Hero\
│   │   │   ├── HeroBase.tsx          // 다크 그라데이션 + 좌측 카피 + 우측 비주얼
│   │   │   ├── HeroBase.module.css
│   │   │   └── variants\
│   │   │       ├── HeroAdVisuals.tsx     // 6컷 그리드
│   │   │       ├── HeroDashboard.tsx     // 라이브 차트 mockup
│   │   │       └── HeroWeb3d.tsx         // 3D 큐브
│   │   ├── ServicesGrid\             // 4개 서비스 카드 2x2
│   │   ├── ProcessTimeline\          // 5단계 타임라인
│   │   ├── ComparisonTable\          // 4컬럼 비교표 (대시보드, 광고)
│   │   ├── FeaturedCases\            // 3개 케이스 카드
│   │   ├── DoDont\                   // Do/Don't 2컬럼
│   │   ├── FAQ\                      // 8개 아코디언
│   │   ├── CTAFooter\                // 페이지 하단 CTA
│   │   └── interactive\
│   │       ├── BeforeAfterSlider\        // 광고 페이지 핵심
│   │       ├── ChannelAutoConvert\       // 광고 페이지 6채널
│   │       ├── LiveDashboardDemo\        // 대시보드 페이지 핵심
│   │       ├── BigGridDemo\              // 대시보드 50만 행
│   │       └── Web3DSofaConfigurator\    // 웹 3D 페이지 핵심
│   │
│   └── icons\                        // 인라인 SVG 아이콘
│
├── lib\
│   ├── supabase\
│   │   ├── client.ts                 // 클라이언트용
│   │   ├── server.ts                 // 서버용 (RSC, Route Handler)
│   │   └── types.ts                  // DB 타입 자동 생성
│   ├── ga4.ts                        // GA4 이벤트 헬퍼
│   └── utils.ts                      // 공통 유틸
│
├── content\                          // 정적 콘텐츠 (MDX 또는 TS)
│   ├── services.ts                   // 4개 카테고리 데이터
│   ├── faqs\                         // 페이지별 FAQ
│   └── cases.ts                      // Featured Cases 시드
│
├── public\
│   ├── fonts\                        // Pretendard
│   ├── images\
│   └── favicon.ico
│
├── supabase\                         // Supabase 마이그레이션
│   ├── migrations\
│   └── functions\                    // Edge Functions
│
├── package.json
├── tsconfig.json
├── next.config.mjs
└── README.md
```

## 4.2 컴포넌트 폴더 컨벤션

각 컴포넌트는 다음 3개 파일로 구성:

```jsx
components\common\Button\
├── Button.tsx          // 컴포넌트 본체
├── Button.module.css   // 스타일
└── index.ts            // export { default } from './Button'
```

`index.ts`로 import 경로를 깔끔하게 유지:

```tsx
// 사용 측
import Button from '@/components/common/Button';
// (Button.tsx 직접 import 안 함)
```

---

# 5. 컴포넌트 빌드 우선순위

## 5.1 P0 — 공통 컴포넌트 (먼저 만들어야 모든 페이지가 동작)

| 컴포넌트 | 설명 | props 요약 |
| --- | --- | --- |
| Button | 4 hierarchy × 3 size (Primary / Secondary / Tertiary / Ghost) | variant, size, leftIcon, rightIcon, disabled, onClick, href |
| Container | max-width 1200px + padding 0 120px | children, as (default 'div') |
| EyebrowChip | 아이콘+텍스트 칩 (라이트/다크 variant) | icon?, text, variant ('light' | 'dark') |
| SectionHead | Eyebrow + H1 + Sub 묶음 (모든 섹션 도입부) | eyebrow, title, sub, isDark?, headWidth? |
| Header | 고정 헤더 (로고, 네비 6개, CTA) | activeNav? ('web-3d' | 'ad-visuals' | ...) |
| Footer | 다크 푸터 (4컬럼) | — |

## 5.2 P1 — 공용 섹션 컴포넌트 (모든 페이지에 등장)

| 컴포넌트 | 등장 페이지 | props 요약 |
| --- | --- | --- |
| HeroBase | 4개 카테고리 (variants로 우측 비주얼 swap) | eyebrow, title, sub, stats[], primaryCTA, ghostCTA, gradient, RightVisual (children) |
| ServicesGrid | 4개 카테고리 (4개 세부 서비스 2x2) | services[] {title, cat, duration, price, desc, deliverables[], gradient, Visual} |
| ProcessTimeline | 4개 카테고리 (5단계 vertical) | steps[] {num, title, dur, desc, deliverables[]}, accentColor |
| FeaturedCases | 4개 카테고리 (3개 케이스) | cases[] {title, subtitle, metric, metricLabel, desc, gradient, Pattern} |
| DoDont | 4개 카테고리 (2컬럼) | doItems[], dontItems[] {title, desc?} |
| FAQ | 4개 카테고리 (8 아코디언) | items[] {q, a, defaultOpen?} |
| CTAFooter | 4개 카테고리 | eyebrow, title, sub, primaryCTA, ghostCTA, trustItems[], gradient |
| ComparisonTable | 대시보드, 광고 페이지 | columns[], rows[] (vfHighlight 컬럼 자동 강조) |

## 5.3 P2 — 카테고리별 핵심 인터랙션 (HERO INTERACTION)

각 카테고리 페이지에 1~2개씩 있는 차별화 컴포넌트:

| 컴포넌트 | 페이지 | 핵심 동작 |
| --- | --- | --- |
| BeforeAfterSlider | 광고 이미지 §4 | 슬라이더 핸들 좌우 드래그 → Before/After clip-path 변경. 카테고리 탭 5개 (제품·인물·푸드·인테리어·패션) |
| ChannelAutoConvert | 광고 이미지 §5 | 마스터 이미지 1장 → 6채널 자동 변환 표시 (네이버·카카오·인스타 피드/스토리/릴스·구글) |
| BrandToneWorkflow | 광고 이미지 §6 | 3 step 카드 (레퍼런스 수집 → LoRA 파인튜닝 → 일관성 검증). 핑크→퍼플 그라데이션 번호 박스 |
| LiveDashboardDemo | 대시보드 §7 | 좌측 사이드바 시나리오 4개 (이커머스·SaaS·핀테크·콘텐츠) → 메트릭 4종 + 차트 + 그리드 swap |
| BigGridDemo | 대시보드 §8 | 행 수 슬라이더 (1만~100만) → AG Grid 가상 스크롤 + FPS·메모리·렌더 라이브 표시 |
| Web3DSofaConfigurator | 웹 3D §7 | Three.js 소파 컨피규레이터 (색상·소재·다리 옵션) |

## 5.4 권장 빌드 순서 (Claude Code용)

```jsx
Week 1: P0 공통 컴포넌트
  Day 1: globals.css 토큰 + Container + Button
  Day 2: EyebrowChip + SectionHead + Header + Footer
  Day 3: app/layout.tsx 조립 + 메인 페이지 골조

Week 2: P1 공용 섹션
  Day 1-2: HeroBase + ServicesGrid + ProcessTimeline
  Day 3: FeaturedCases + DoDont + FAQ + CTAFooter
  Day 4: ComparisonTable

Week 3: 카테고리 페이지 + P2 인터랙션
  Day 1: /ad-visuals 페이지 (BeforeAfterSlider 우선)
  Day 2: /dashboard 페이지 (LiveDashboardDemo + BigGridDemo)
  Day 3: /web-3d 페이지 (Web3DSofaConfigurator)
  Day 4: /web-app 페이지 + Work 페이지

Week 4: Supabase 연동 + 배포
```

---

# 6. 페이지별 구현 명세

## 6.1 메인 페이지 (`/`)

- **Figma node**: 26:2
- **기획서**: [VisionFlow 메인페이지 세부 전략](https://www.notion.so/VisionFlow-354b02bb4efb81d7a5a5e3d4f70930d9?pvs=21)
- **섹션 11개**: Hero / 4 카테고리 카드 / 케이스 / 프로세스 / 고객사 로고 / 후기 / FAQ / CTA Footer 등

## 6.2 카테고리 페이지 4종

| 카테고리 | 라우트 | Figma node | 기획서 | 섹션 수 |
| --- | --- | --- | --- | --- |
| 웹 3D | /web-3d | 241:2 | [웹 3D 메뉴 기획서](https://www.notion.so/3D-357b02bb4efb819788dccae78646c92f?pvs=21) | 11 (+Header +Footer) |
| 광고 이미지 제작 | /ad-visuals | 261:3 | [광고 이미지 메뉴 기획서](https://www.notion.so/357b02bb4efb81cf9efbd1f86f9a96db?pvs=21) | 12 (+Header +Footer) |
| 웹/앱 개발 | /web-app | 190:2 | [웹/앱 개발 메뉴 기획서](https://www.notion.so/357b02bb4efb8143ab86d6760d2f0f8c?pvs=21) | 13 (+Header +Footer) |
| 데이터 대시보드 | /dashboard | 261:2 | [데이터 대시보드 메뉴 기획서](https://www.notion.so/357b02bb4efb81d7ac6bd6e3964ac27a?pvs=21) | 12 (+Header +Footer) |

## 6.3 공통 페이지

| 페이지 | 라우트 | Figma node | 상태 |
| --- | --- | --- | --- |
| Work 인덱스 | /work | 148:58 (빈 페이지) | 디자인 미완료 |
| Work Detail | /work/[slug] | 148:59 | 디자인 완료 (14 섹션) |
| About | /about | — | 디자인 미완료 |
| Contact | /contact | — | 디자인 미완료 |
| Admin CMS | /admin | — | 디자인 미완료, 기능명세만 있음 |

---

# 7. Figma 노드 ID 빠른 참조

> Claude Code가 Figma MCP로 디자인 컨텍스트를 조회할 때 사용. fileKey는 모두 `1rwyWGJ7MAB86orHsoDaZp`.
> 

## 7.1 페이지 단위 노드

| nodeId | 이름 | 대응 라우트 |
| --- | --- | --- |
| 0:1 | Design System | — |
| 26:2 | Main Landing | / |
| 148:58 | Work Index | /work (빈 페이지) |
| 148:59 | Work Detail | /work/[slug] |
| 190:2 | Web/App Service Page | /web-app |
| 241:2 | Web 3D Service Page | /web-3d |
| 261:2 | Dashboard Service Page | /dashboard |
| 261:3 | Advertising Service Page | /ad-visuals |

## 7.2 Claude Code에서 Figma MCP 사용 예시

```tsx
// Figma 노드의 디자인 컨텍스트(코드+스크린샷+메타) 조회
Figma:get_design_context({
  fileKey: "1rwyWGJ7MAB86orHsoDaZp",
  nodeId: "261:3",  // Ad Visuals 페이지
  clientFrameworks: "react,next.js",
  clientLanguages: "typescript,css"
});

// 특정 섹션만 조회 (페이지 메타 먼저 보고 자식 노드 ID 파악)
Figma:get_metadata({
  fileKey: "1rwyWGJ7MAB86orHsoDaZp",
  nodeId: "261:3"
});
// → 응답에서 자식 노드 ID 확인 후 get_design_context 호출

// 시각 검증
Figma:get_screenshot({
  fileKey: "1rwyWGJ7MAB86orHsoDaZp",
  nodeId: "261:3"
});
```

---

# 8. Supabase 데이터 모델 (요약)

> 각 카테고리 기획서에 상세 스키마가 있음. 여기는 인덱스 + 핵심 의사결정만 요약.
> 

## 8.1 자체 CMS 핵심 테이블

| 테이블 | 용도 | 상세 스키마 위치 |
| --- | --- | --- |
| contact_inquiries | 일반 문의 접수 | [Admin CMS 백엔드 명세](https://www.notion.so/Admin-CMS-Contact-Work-357b02bb4efb81699980cae2df7f8f62?pvs=21) |
| partnership_inquiries | 제휴 문의 | (위 동일) |
| qna_posts | Q&A 게시판 (비밀글 지원) | (위 동일) |
| qna_replies | Q&A 답변 | (위 동일) |
| announcements | 공지사항 | (위 동일) |
| work_cases | 포트폴리오 케이스 | [Work 메뉴 기획서 v2](https://www.notion.so/Work-v2-356b02bb4efb8164bee4c886297287f4?pvs=21) |

## 8.2 카테고리별 부가 테이블 (선택적)

| 카테고리 | 주요 테이블 | 상세 스키마 |
| --- | --- | --- |
| 광고 이미지 | ad_visual_packages, ad_visual_before_after, ad_visual_inquiries, ad_visual_faqs | [광고 이미지 기획서 §9](https://www.notion.so/357b02bb4efb81cf9efbd1f86f9a96db?pvs=21) |
| 대시보드 | dashboard_packages, dashboard_inquiries, dashboard_faqs, dashboard_demo_metrics | [대시보드 기획서 §10](https://www.notion.so/357b02bb4efb81d7ac6bd6e3964ac27a?pvs=21) |
| 웹 3D | web3d_packages, web3d_inquiries, web3d_faqs | [웹 3D 기획서](https://www.notion.so/3D-357b02bb4efb819788dccae78646c92f?pvs=21) |
| 웹/앱 | webapp_packages, webapp_inquiries, webapp_faqs | [웹/앱 기획서](https://www.notion.so/357b02bb4efb8143ab86d6760d2f0f8c?pvs=21) |

## 8.3 RLS 정책 표준 패턴

```sql
-- 모든 *_inquiries 테이블 공통
alter table xxx_inquiries enable row level security;
create policy "insert from anyone" on xxx_inquiries
  for insert with check (true);
create policy "select admin only" on xxx_inquiries
  for select using (auth.role() = 'service_role');
```

## 8.4 Edge Function 후보

| Function | 트리거 | 동작 |
| --- | --- | --- |
| send-inquiry-notification | *_inquiries INSERT | 관리자에게 이메일 발송 (Resend) |
| channel-resize | 광고 이미지 마스터 컷 업로드 | 6채널 규격 자동 리사이즈 |
| book-kpi-workshop | 대시보드 워크숍 신청 | Google Calendar 가용 시간 제안 |

---

# 9. 코드 작성 컨벤션

## 9.1 컴포넌트 작성 표준

```tsx
// components/common/Button/Button.tsx
import Link from 'next/link';
import styles from './Button.module.css';

type ButtonVariant = 'primary' | 'secondary' | 'tertiary' | 'ghost';
type ButtonSize = 'l' | 'm' | 's';

interface ButtonProps {
  variant?: ButtonVariant;
  size?: ButtonSize;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  href?: string;
  disabled?: boolean;
  onClick?: () => void;
  children: React.ReactNode;
}

export default function Button({
  variant = 'primary',
  size = 'm',
  leftIcon,
  rightIcon,
  href,
  disabled,
  onClick,
  children,
}: ButtonProps) {
  const className = [
    styles.btn,
    styles[`variant_${variant}`],
    styles[`size_${size}`],
    disabled && styles.disabled,
  ].filter(Boolean).join(' ');

  const inner = (
    <>
      {leftIcon && <span className={styles.icon}>{leftIcon}</span>}
      <span className={styles.label}>{children}</span>
      {rightIcon && <span className={styles.icon}>{rightIcon}</span>}
    </>
  );

  if (href && !disabled) {
    return (
      <Link href={href} className={className}>
        {inner}
      </Link>
    );
  }

  return (
    <button className={className} onClick={onClick} disabled={disabled}>
      {inner}
    </button>
  );
}
```

```css
/* components/common/Button/Button.module.css */
.btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: var(--space-2);
  border: none;
  border-radius: var(--radius-md);
  font-weight: var(--fw-bold);
  transition: background var(--transition-base), transform var(--transition-base);
  cursor: pointer;
}
.btn:active { transform: translateY(1px); }

/* Variants */
.variant_primary {
  background: var(--color-primary);
  color: var(--color-on-primary);
}
.variant_primary:hover { background: var(--color-primary-light); }
.variant_primary:active { background: var(--color-primary-dark); }

.variant_secondary {
  background: transparent;
  color: var(--color-primary);
  border: 1px solid var(--color-primary);
}
.variant_secondary:hover { background: rgba(0, 79, 255, 0.06); }

.variant_ghost {
  background: transparent;
  color: var(--color-text);
  border: 1px solid var(--color-border);
}
.variant_ghost:hover { background: var(--color-surface); }

/* Sizes */
.size_l { height: 56px; padding: 0 var(--space-6); font-size: 18px; }
.size_m { height: 44px; padding: 0 var(--space-4); font-size: 16px; }
.size_s { height: 36px; padding: 0 var(--space-3); font-size: 14px; }

.disabled {
  opacity: 0.4;
  pointer-events: none;
}

.icon { display: inline-flex; }
.label { display: inline-block; }
```

```tsx
// components/common/Button/index.ts
export { default } from './Button';
```

## 9.2 페이지 컴포지션 표준 (예: /ad-visuals)

```tsx
// app/ad-visuals/page.tsx
import HeroAdVisuals from '@/components/sections/Hero/variants/HeroAdVisuals';
import ServicesGrid from '@/components/sections/ServicesGrid';
import BeforeAfterSlider from '@/components/sections/interactive/BeforeAfterSlider';
import ChannelAutoConvert from '@/components/sections/interactive/ChannelAutoConvert';
import BrandToneWorkflow from '@/components/sections/interactive/BrandToneWorkflow';
import ProcessTimeline from '@/components/sections/ProcessTimeline';
import ComparisonTable from '@/components/sections/ComparisonTable';
import FeaturedCases from '@/components/sections/FeaturedCases';
import DoDont from '@/components/sections/DoDont';
import FAQ from '@/components/sections/FAQ';
import CTAFooter from '@/components/sections/CTAFooter';
import { adVisualsContent } from '@/content/services';

export const metadata = {
  title: '광고 이미지 제작 — VisionFlow | AI 기반 캠페인·이커머스·브랜딩 비주얼',
  description: 'AI로 빠르게, 브랜드 톤은 일관되게. 평균 5일 납기, 채널별 규격 자동 변환.',
};

export default function AdVisualsPage() {
  return (
    <>
      <HeroAdVisuals {...adVisualsContent.hero} />
      <ServicesGrid {...adVisualsContent.services} />
      <BeforeAfterSlider categories={adVisualsContent.beforeAfter} />
      <ChannelAutoConvert {...adVisualsContent.channels} />
      <BrandToneWorkflow steps={adVisualsContent.workflow} />
      <ProcessTimeline steps={adVisualsContent.process} accentColor="ad" />
      <ComparisonTable {...adVisualsContent.comparison} />
      <FeaturedCases cases={adVisualsContent.cases} />
      <DoDont doItems={adVisualsContent.doItems} dontItems={adVisualsContent.dontItems} />
      <FAQ items={adVisualsContent.faqs} />
      <CTAFooter {...adVisualsContent.cta} />
    </>
  );
}
```

## 9.3 콘텐츠 분리 (content/services.ts)

```tsx
// content/services.ts — 모든 카테고리 데이터를 한 곳에 (UI ⇄ 데이터 분리)
export const adVisualsContent = {
  hero: {
    eyebrow: 'Ad Visuals · AI-powered',
    title: '클릭을 부르는\n한 장의 이미지',
    sub: '제품 컷부터 캠페인 키 비주얼까지...',
    stats: [
      { value: '2,400+', label: '누적 컷 수' },
      { value: '5일', label: '평균 납기' },
      { value: '95%+', label: '톤 일관성' },
      { value: '6채널', label: '동시 출력' },
    ],
    primaryCTA: { label: 'Before/After 보기', href: '#before-after' },
    ghostCTA: { label: '포트폴리오 보기', href: '/work?category=ad-visuals' },
  },
  services: { /* ... */ },
  // ...
};
```

## 9.4 Import 경로 규칙

```tsx
// tsconfig.json paths 설정 후
import Button from '@/components/common/Button';
import { adVisualsContent } from '@/content/services';
import { createClient } from '@/lib/supabase/server';
```

`@/*` alias 사용 — 상대경로 (`../../components/...`) 지양.

## 9.5 한글 처리

- `next/font`로 Pretendard 자체 호스팅 + Inter 구글 폰트
- 한글 자간: `letter-spacing: -0.02em` (큰 제목), `0` (본문)
- 줄바꿈: `\n`을 
``로 치환하거나 `white-space: pre-line` 사용

```tsx
// 줄바꿈 컴포넌트 패턴
<h1 className={styles.title}>
  {title.split('\n').map((line, i) => (
    <span key={i}>
      {line}
      {i < title.split('\n').length - 1 && <br />}
    </span>
  ))}
</h1>
```

## 9.6 반응형 처리

```css
/* Component.module.css */
.section {
  padding: 96px 120px;
}

@media (max-width: 1023px) {
  .section { padding: 64px 48px; }
}
@media (max-width: 767px) {
  .section { padding: 48px 24px; }
}
```

---

# 10. SEO·메타데이터 표준

## 10.1 페이지별 메타데이터

각 `page.tsx`에 `export const metadata` 정의:

```tsx
export const metadata: Metadata = {
  title: '페이지명 — VisionFlow | 한 줄 부제',
  description: '120자 이내 설명. 핵심 키워드 + 가치 제안.',
  openGraph: {
    title: '...',
    description: '...',
    images: [{ url: '/og/{page}.jpg', width: 1200, height: 630 }],
    locale: 'ko_KR',
    type: 'website',
  },
  alternates: { canonical: 'https://visionflow.kr/{path}' },
};
```

## 10.2 구조화 데이터 (JSON-LD)

```tsx
// app/ad-visuals/page.tsx 등에 추가
<script
  type="application/ld+json"
  dangerouslySetInnerHTML={{
    __html: JSON.stringify({
      '@context': 'https://schema.org',
      '@type': 'Service',
      provider: { '@type': 'Organization', name: 'VisionFlow' },
      areaServed: 'KR',
      serviceType: '광고 이미지 제작',
    }),
  }}
/>
```

## 10.3 sitemap.ts / robots.ts

```tsx
// app/sitemap.ts
export default function sitemap() {
  return [
    { url: 'https://visionflow.kr/', priority: 1.0 },
    { url: 'https://visionflow.kr/web-3d', priority: 0.9 },
    { url: 'https://visionflow.kr/ad-visuals', priority: 0.9 },
    { url: 'https://visionflow.kr/web-app', priority: 0.9 },
    { url: 'https://visionflow.kr/dashboard', priority: 0.9 },
    // ...
  ];
}
```

---

# 11. GA4 이벤트 명세

> 각 카테고리 기획서에 상세 이벤트 정의가 있음. 여기는 통합 헬퍼 패턴.
> 

## 11.1 이벤트 헬퍼

```tsx
// lib/ga4.ts
declare global {
  interface Window { gtag?: (...args: any[]) => void; }
}

export function trackEvent(name: string, params?: Record<string, any>) {
  if (typeof window === 'undefined' || !window.gtag) return;
  window.gtag('event', name, params);
}
```

## 11.2 페이지별 핵심 이벤트

| 페이지 | 이벤트명 | 발생 조건 |
| --- | --- | --- |
| 광고 이미지 | ba_handle_dragged | Before/After 슬라이더 드래그 |
| 광고 이미지 | ba_category_changed | 카테고리 탭 전환 |
| 대시보드 | dashboard_scenario_switched | 시나리오 사이드바 클릭 |
| 대시보드 | perf_slider_changed | 50만 행 슬라이더 조작 |
| 모든 카테고리 | category_inquiry_clicked | CTA "무료 견적 받기" 클릭 |

---

# 12. 첫 세션용 Claude Code 프롬프트 템플릿

> Claude Code 첫 진입 시 다음 메시지를 그대로 보내면 빠르게 시작 가능.
> 

```jsx
안녕. 이 프로젝트는 VisionFlow.kr 사이트 리뉴얼이야. 인계 문서를 먼저 읽어줘:
https://www.notion.so/[이 페이지 URL]

이 문서 0.3에 첫 작업 순서가 있어. 다음 순서로 진행해:

1. 현재 폴더(E:\PROJECT\visionflow) 파악
   - package.json, tsconfig.json 읽기
   - 폴더 구조 분석
   - 기존에 만들어진 컴포넌트 있다면 컨벤션 확인
   - 결과를 요약해서 보고해줘

2. 그 다음 단계는 내가 별도로 지시할게.

주의:
- 인계 문서 §2 (기술 스택), §3 (디자인 토큰), §9 (코드 컨벤션)을 
  반드시 따라야 해. 멋대로 다른 방식 도입하지 말 것.
- Tailwind 사용 금지 (CSS Module 채택됨)
- 디자인 변경 필요한 부분은 Figma MCP로 원본 확인 
  (fileKey: 1rwyWGJ7MAB86orHsoDaZp)
```

---

# 13. 자주 빠지는 함정 (PITFALLS)

Claude Code가 흔히 저지르는 실수 + 회피 방법:

- ❌ Tailwind CSS 임의 도입
    
    전략기획서 §7.1에서 **CSS Module을 명시적으로 채택**했음. Claude Code가 "Tailwind가 더 빠른데"라며 멋대로 도입하면 디자인 토큰 일관성이 깨짐. 반드시 CSS Module + CSS Variables 조합 유지.
    
- ❌ 디자인 토큰 무시하고 색상 하드코딩
    
    `color: #004FFF` 직접 쓰지 말고 항상 `color: var(--color-primary)`. Figma MCP가 반환한 코드에 하드코딩 컬러가 있으면 토큰으로 치환 후 사용.
    
- ❌ 페이지 단위 거대 컴포넌트
    
    `AdVisualsPage.tsx` 1개에 1500줄 작성하면 재사용 불가. **항상 섹션 단위로 분해 →** `app/ad-visuals/page.tsx`는 단순 조립만, 각 섹션은 `components/sections/*` 안에.
    
- ❌ 콘텐츠와 마크업 혼재
    
    한국어 카피를 JSX 안에 직접 적지 말고 `content/*.ts`로 분리. 디자인/카피 변경 시 컴포넌트 코드 수정 불필요.
    
- ❌ Server Component vs Client Component 구분 누락
    
    인터랙션 있는 컴포넌트(BeforeAfterSlider, LiveDashboardDemo 등)는 `'use client'` 디렉티브 명시. 정적 섹션(Hero, ServicesGrid, FAQ)은 기본 Server Component로 두어 SEO·LCP 우위.
    
- ❌ Figma 픽셀값 그대로 옮기기 (반응형 무시)
    
    Figma는 1440px 데스크톱 기준. 모바일에서 56px 폰트는 너무 큼. **반응형 미디어 쿼리 필수** (§9.6 참조).
    
- ❌ Supabase 클라이언트를 컴포넌트마다 생성
    
    `lib/supabase/{client,server}.ts`에서 단일 인스턴스 export. RSC에서는 `server.ts`, Client Component에서는 `client.ts` 사용 구분.
    
- ❌ 한글 폰트 lazy load 누락 → FOUT
    
    `next/font/local`로 Pretendard 자체 호스팅 시 `display: 'swap'` + preload 설정. 한글 페이지 LCP 지연 방지.
    

---

# 14. 변경 이력

| 날짜 | 변경 | 작성 |
| --- | --- | --- |
| 2026.05.07 | 최초 작성 — Notion + Figma 작업 종료 시점 인계 기준 | 웹 채팅 Claude |

---

## 부록 — 관련 문서

- [VisionFlow 리뉴얼 전략기획서](https://www.notion.so/VisionFlow-354b02bb4efb819d83d5c21f9c17bd2e?pvs=21) — 본 문서의 부모
- [VisionFlow 메인페이지 세부 전략 & 카피라이팅](https://www.notion.so/VisionFlow-354b02bb4efb81d7a5a5e3d4f70930d9?pvs=21)
- [VisionFlow 디자인 시스템 - 컴포넌트 학습 가이드](https://www.notion.so/VisionFlow-354b02bb4efb81eca1a5ddfdc8105dd5?pvs=21)
- [VisionFlow Button System (Designbase 기반 재작성)](https://www.notion.so/VisionFlow-Button-System-Designbase-354b02bb4efb81678e38c2c46e8a02e7?pvs=21)
- [Claude + Figma MCP로 실무 디자이너급 디자인 퀄리티 내는 법](https://www.notion.so/Claude-Figma-MCP-354b02bb4efb815d8973c325aaf7b499?pvs=21)

### 카테고리 기획서

- [웹 3D 메뉴 기획서](https://www.notion.so/3D-357b02bb4efb819788dccae78646c92f?pvs=21)
- [광고 이미지 메뉴 기획서](https://www.notion.so/357b02bb4efb81cf9efbd1f86f9a96db?pvs=21)
- [웹/앱 개발 메뉴 기획서](https://www.notion.so/357b02bb4efb8143ab86d6760d2f0f8c?pvs=21)
- [데이터 대시보드 메뉴 기획서](https://www.notion.so/357b02bb4efb81d7ac6bd6e3964ac27a?pvs=21)

### 공통 페이지 기획서

- [About 메뉴 기획서](https://www.notion.so/About-355b02bb4efb81a7808bf2474ec48de1?pvs=21)
- [Work 메뉴 기획서 (v2)](https://www.notion.so/Work-v2-356b02bb4efb8164bee4c886297287f4?pvs=21)
- [Contact 메뉴 기획서](https://www.notion.so/Contact-355b02bb4efb811c90f5e62f81d94cbf?pvs=21)

### Admin CMS

- [Admin CMS 기획서 — Contact & Work 운영](https://www.notion.so/Admin-CMS-Contact-Work-357b02bb4efb81b1adf2db67d07bc518?pvs=21)
- [Admin CMS 백엔드 기능명세서](https://www.notion.so/Admin-CMS-Contact-Work-357b02bb4efb81699980cae2df7f8f62?pvs=21)