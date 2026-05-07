export const ROUTES = {
  // ─── Web ───────────────────────────────
  HOME: '/',

  ABOUT: {
    ROOT: '/about',
    LOGIN: '/about',
    REGISTER: '/about',
  },

  WEB_3D: '/web-3d',
  AD_VISUALS: '/ad-visuals',
  WEB_APP: '/web-app',
  DASHBOARD: '/dashboard',
  WORK: '/work',
  CONTACT: '/contact',
  KAKAO: '/kakao',
  TERMS: '/terms',
  PRIVACY: '/privacy',

  NOTICES: {
    ROOT: '/notice',
    DETAIL: (id: string) => `/notice/${id}`,
  },

  QNA: {
    ORDERS: '/qna',
    DETAIL: (id: string) => `/qna/${id}`,
    WRITE: (id: string) => `/qna/write`,
    EDIT: (id: string) => `/notice/${id}/edit`,
  },

  // ─── Admin ─────────────────────────────
  ADMIN: {
    HOME: '/',
    NOTICES: '/notice',
    DASHBOARD: '/admin/dashboard',

    USERS: {
      ROOT: '/admin/users',
      DETAIL: (id: string) => `/admin/users/${id}`,
      EDIT: (id: string) => `/admin/users/${id}/edit`,
    },

    PRODUCTS: {
      ROOT: '/admin/products',
      CREATE: '/admin/products/create',
      EDIT: (id: string) => `/admin/products/${id}/edit`,
    },

    ORDERS: {
      ROOT: '/admin/orders',
      DETAIL: (id: string) => `/admin/orders/${id}`,
    },
  },
} as const
