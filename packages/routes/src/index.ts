/**
 * Centralized route definitions for VisionFlow apps.
 *
 * Convention:
 *   - Top-level keys → web app (apps/web).
 *   - ROUTES.ADMIN.*  → admin app (apps/admin), all under `/settings/*`.
 *   - Web와 Admin은 별도 Next.js 앱이라 prefix만 다르면 충돌 없음.
 *
 * Note (불일치, 추후 정합성 검토):
 *   - Web NOTICES.ROOT = '/notices' (복수)
 *   - Admin NOTICE.ROOT = '/settings/notice'  (단수)
 */
export const ROUTES = {
  // ─── Web ───────────────────────────────
  HOME: '/',

  // 상단 카테고리 (계획됨 — 아직 페이지 미구현, nav/footer에서 참조)
  WEB_3D: '/web-3d',
  AD_VISUALS: '/ad-visuals',
  WEB_APP: '/web-app',
  DASHBOARD: '/dashboard',

  // 공통 페이지
  ABOUT: '/about',
  WORK: '/work',

  CONTACT: {
    ROOT: '/contact',
    GENERAL: '/contact/general',
    QUOTE: '/contact/quote',
    PARTNERSHIP: '/contact/partnership',
  },

  KAKAO: '/kakao',
  QNA: '/qna',

  // 약관 / 정책 (계획됨)
  TERMS: '/terms',
  PRIVACY: '/privacy',

  NOTICES: {
    ROOT: '/notices',
    DETAIL: (id: string) => `/notices/${id}`,
  },

  // ─── Admin (`/settings/*`) ─────────────
  ADMIN: {
    HOME: '/settings', // = Dashboard
    LOGIN: '/settings/login',
    SIGNIN: '/settings/signin', // 초대 토큰 기반 계정 등록

    // 사이드바 OVERVIEW (HOME = Dashboard, 아래는 계획됨)
    ANALYTICS: '/settings/analytics',

    // 사이드바 CONTENTS
    QNA: {
      ROOT: '/settings/qna',
      DETAIL: (id: string | number) => `/settings/qna/${id}`,
    },
    PARTNERSHIP: {
      ROOT: '/settings/partnership',
      DETAIL: (id: string | number) => `/settings/partnership/${id}`,
    },
    GENERAL_INQUIRY: {
      ROOT: '/settings/general-inquiry',
      DETAIL: (id: string | number) =>
        `/settings/general-inquiry/${id}`,
    },
    QUOTE_REQUEST: {
      ROOT: '/settings/quote-request',
      DETAIL: (id: string | number) =>
        `/settings/quote-request/${id}`,
    },
    WORK_PORTFOLIO: {
      ROOT: '/settings/work-portfolio',
      DETAIL: (id: string | number) =>
        `/settings/work-portfolio/${id}`,
      EDIT: (id: string | number) =>
        `/settings/work-portfolio/${id}/edit`,
      CREATE: '/settings/work-portfolio/new',
      WRITE: () => '/settings/work-portfolio/write',
    },

    // 사이드바 SYSTEM
    USERS: {
      ROOT: '/settings/users',
      DETAIL: (id: string) => `/settings/users/${id}`,
      INVITE: '/settings/users/new',
    },

    // 공지사항 (페이지 구현됨)
    // NOTICES는 NOTICE.ROOT와 동일 — 호환 위해 유지 (현재 not-found.tsx 1곳에서 참조)
    NOTICES: '/settings/notice',
    NOTICE: {
      ROOT: '/settings/notice',
      DETAIL: (id: string | number) => `/settings/notice/${id}`,
      EDIT: (id: string | number) => `/settings/notice/${id}/edit`,
      WRITE: () => '/settings/notice/write',
    },

    // FAQ (페이지 구현됨)
    FAQ: {
      ROOT: '/settings/faq',
      DETAIL: (id: string | number) => `/settings/faq/${id}`,
      EDIT: (id: string | number) => `/settings/faq/${id}/edit`,
      WRITE: () => '/settings/faq/write',
    },

    // Contact (페이지 구현됨, DETAIL은 계획됨)
    CONTACT: {
      ROOT: '/settings/contact',
      DETAIL: (id: string | number) => `/settings/contact/${id}`,
    },

    // Orders (계획됨 — 페이지 미구현)
    ORDERS: {
      ROOT: '/settings/orders',
      DETAIL: (id: string) => `/settings/orders/${id}`,
    },
  },
} as const;
