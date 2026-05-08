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

  QNA: {
    ORDERS: '/pages/qna',
    DETAIL: (id: string) => `/qna/${id}`,
    WRITE: () => `/qna/write`,
    EDIT: (id: string) => `/notice/${id}/edit`,
  },

  // ─── Admin ─────────────────────────────
  ADMIN: {
    HOME: '/',
    NOTICES: '/pages/notice',
    DASHBOARD: '/pages/dashboard',

    FAQ: {
      ROOT: '/pages/faq',
      DETAIL: (id: string | number) => `/pages/faq/${id}`,
      EDIT: (id: string | number) => `/pages/faq/${id}/edit`,
      WRITE: () => '/pages/faq/write',
    },

    PRODUCTS: {
      ROOT: '/pages/products',
      CREATE: '/pages/products/create',
      EDIT: (id: string) => `/pages/products/${id}/edit`,
    },

    ORDERS: {
      ROOT: '/pages/orders',
      DETAIL: (id: string) => `/pages/orders/${id}`,
    },
  },
} as const
