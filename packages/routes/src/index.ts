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
    WRITE: (id: string) => `/qna/write`,
    EDIT: (id: string) => `/notice/${id}/edit`,
  },

  // ─── Admin ─────────────────────────────
  ADMIN: {
    HOME: '/',
    NOTICES: '/admin/pages/notice',
    DASHBOARD: '/admin/pages/dashboard',

    USERS: {
      ROOT: '/admin/pages/users',
      DETAIL: (id: string) => `/admin/pages/users/${id}`,
      EDIT: (id: string) => `/admin/pages/users/${id}/edit`,
    },

    PRODUCTS: {
      ROOT: '/admin/pages/products',
      CREATE: '/admin/pages/products/create',
      EDIT: (id: string) => `/admin/pages/products/${id}/edit`,
    },

    ORDERS: {
      ROOT: '/admin/pages/orders',
      DETAIL: (id: string) => `/admin/pages/orders/${id}`,
    },
  },
} as const
