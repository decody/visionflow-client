export const ROUTES = {
  // ─── Web ───────────────────────────────
  HOME: '/',
  ABOUT: '/pages/about',
  WEB_3D: '/pages/web-3d',
  AD_VISUALS: '/pages/ad-visuals',
  WEB_APP: '/pages/web-app',
  DASHBOARD: '/pages/dashboard',
  WORK: '/pages/work',
  CONTACT: '/pages/contact',
  KAKAO: '/pages/kakao',
  TERMS: '/pages/terms',
  PRIVACY: '/pages/privacy',

  NOTICES: {
    ROOT: '/pages/notices',
    DETAIL: (id: string) => `/pages/notices/${id}`,
  },

  QNA: '/pages/qna',

  // ─── Admin ─────────────────────────────
  ADMIN: {
    HOME: '/',
    NOTICES: '/pages/notice',
    NOTICE: {
      ROOT: '/pages/notice',
      DETAIL: (id: string | number) => `/pages/notice/${id}`,
      EDIT: (id: string | number) => `/pages/notice/${id}/edit`,
      WRITE: () => '/pages/notice/write',
    },
    DASHBOARD: '/pages/dashboard',

    FAQ: {
      ROOT: '/pages/faq',
      DETAIL: (id: string | number) => `/pages/faq/${id}`,
      EDIT: (id: string | number) => `/pages/faq/${id}/edit`,
      WRITE: () => '/pages/faq/write',
    },

    CONTACT: {
      ROOT: '/pages/contact',
      DETAIL: (id: string | number) => `/pages/contact/${id}`,
    },

    ORDERS: {
      ROOT: '/pages/orders',
      DETAIL: (id: string) => `/pages/orders/${id}`,
    },
  },
} as const;
