/**
 * Centralized route definitions for VisionFlow apps.
 *
 * Convention:
 *   - Top-level keys → web app (apps/web). Some are planned but not yet implemented.
 *   - ROUTES.ADMIN.*  → admin app (apps/admin).
 *   - Web와 Admin은 별도 Next.js 앱이라 같은 경로(/pages/contact 등)도 도메인이 다르면 충돌 없음.
 *
 * Note (불일치, 추후 정합성 검토):
 *   - Web NOTICES.ROOT = '/pages/notices' (복수)
 *   - Admin NOTICE.ROOT = '/pages/notice'  (단수)
 */
export const ROUTES = {
  // ─── Web ───────────────────────────────
  HOME: '/',

  // 상단 카테고리 (계획됨 — 아직 페이지 미구현, nav/footer에서 참조)
  WEB_3D: '/pages/web-3d',
  AD_VISUALS: '/pages/ad-visuals',
  WEB_APP: '/pages/web-app',
  DASHBOARD: '/pages/dashboard',

  // 공통 페이지
  ABOUT: '/pages/about',
  WORK: '/pages/work',
  CONTACT: '/pages/contact',
  KAKAO: '/pages/kakao',
  QNA: '/pages/qna',

  // 약관 / 정책 (계획됨)
  TERMS: '/pages/terms',
  PRIVACY: '/pages/privacy',

  NOTICES: {
    ROOT: '/pages/notices',
    DETAIL: (id: string) => `/pages/notices/${id}`,
  },

  // ─── Admin ─────────────────────────────
  ADMIN: {
    HOME: '/', // = Dashboard
    LOGIN: '/login',
    SIGNIN: '/signin', // 초대 토큰 기반 계정 등록

    // 사이드바 OVERVIEW (HOME = Dashboard, 아래는 계획됨)
    ANALYTICS: '/pages/analytics',

    // 사이드바 CONTENTS
    QNA: {
      ROOT: '/pages/qna',
      DETAIL: (id: string | number) => `/pages/qna/${id}`,
    },
    PARTNERSHIP: {
      ROOT: '/pages/partnership',
      DETAIL: (id: string | number) => `/pages/partnership/${id}`,
    },
    GENERAL_INQUIRY: {
      ROOT: '/pages/general-inquiry',
      DETAIL: (id: string | number) => `/pages/general-inquiry/${id}`,
    },
    QUOTE_REQUEST: {
      ROOT: '/pages/quote-request',
      DETAIL: (id: string | number) => `/pages/quote-request/${id}`,
    },
    WORK_PORTFOLIO: {
      ROOT: '/pages/work-portfolio',
      DETAIL: (id: string | number) => `/pages/work-portfolio/${id}`,
      CREATE: '/pages/work-portfolio/new',
    },

    // 사이드바 SYSTEM (계획됨)
    USERS: '/pages/users',
    SETTINGS: '/pages/settings',

    // 구 라우트 (제거 검토 — HOME과 동일한 대시보드를 가리킴, 사용처 없음)
    DASHBOARD: '/pages/dashboard',

    // 공지사항 (페이지 구현됨)
    // NOTICES는 NOTICE.ROOT와 동일 — 호환 위해 유지 (현재 not-found.tsx 1곳에서 참조)
    NOTICES: '/pages/notice',
    NOTICE: {
      ROOT: '/pages/notice',
      DETAIL: (id: string | number) => `/pages/notice/${id}`,
      EDIT: (id: string | number) => `/pages/notice/${id}/edit`,
      WRITE: () => '/pages/notice/write',
    },

    // FAQ (페이지 구현됨)
    FAQ: {
      ROOT: '/pages/faq',
      DETAIL: (id: string | number) => `/pages/faq/${id}`,
      EDIT: (id: string | number) => `/pages/faq/${id}/edit`,
      WRITE: () => '/pages/faq/write',
    },

    // Contact (페이지 구현됨, DETAIL은 계획됨)
    CONTACT: {
      ROOT: '/pages/contact',
      DETAIL: (id: string | number) => `/pages/contact/${id}`,
    },

    // Orders (계획됨 — 페이지 미구현)
    ORDERS: {
      ROOT: '/pages/orders',
      DETAIL: (id: string) => `/pages/orders/${id}`,
    },
  },
} as const;
