import {
  backendUrl,
  signBackendToken,
  type SpringLoginResponse,
} from '@/lib/backend';
import { providers } from '@visionflow/auth';
import { ROUTES } from '@visionflow/routes';
import type { UserRole } from '@visionflow/shared';
import NextAuth from 'next-auth';
import Credentials from 'next-auth/providers/credentials';
import { headers } from 'next/headers';

const EIGHT_HOURS_IN_SECONDS = 8 * 60 * 60;

const isVercelRuntime =
  process.env.VERCEL === '1' || process.env.VERCEL === 'true';

const authUrl = process.env.AUTH_URL;
if (isVercelRuntime && authUrl) {
  try {
    const { hostname } = new URL(authUrl);

    if (hostname === 'localhost' || hostname === '127.0.0.1') {
      delete process.env.AUTH_URL;
    }
  } catch {
    delete process.env.AUTH_URL;
  }
}

const normalizeUserRole = (role: unknown): UserRole | null => {
  if (typeof role !== 'string') {
    return null;
  }

  const normalizedRole = role.trim().toLowerCase().replace(/[\s_-]/g, '');

  if (normalizedRole === 'superadmin') {
    return 'SuperAdmin';
  }

  if (normalizedRole === 'admin') {
    return 'admin';
  }

  if (normalizedRole === 'viewer' || normalizedRole === 'user') {
    return 'Viewer';
  }

  return null;
};

const getFirstHeaderValue = (requestHeaders: Headers, names: string[]) => {
  for (const name of names) {
    const value = requestHeaders.get(name);

    if (value?.trim()) {
      return value.trim();
    }
  }

  return null;
};

const getClientIp = (requestHeaders: Headers) => {
  const value = getFirstHeaderValue(requestHeaders, [
    'cf-connecting-ip',
    'x-real-ip',
    'x-vercel-forwarded-for',
    'x-forwarded-for',
  ]);

  return value?.split(',')[0]?.trim() || null;
};

const decodeHeaderValue = (value: string | null) => {
  if (!value) {
    return null;
  }

  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
};

const getClientLocation = (requestHeaders: Headers) => {
  const city = decodeHeaderValue(
    getFirstHeaderValue(requestHeaders, ['x-vercel-ip-city']),
  );
  const region = decodeHeaderValue(
    getFirstHeaderValue(requestHeaders, ['x-vercel-ip-country-region']),
  );
  const country = decodeHeaderValue(
    getFirstHeaderValue(requestHeaders, [
      'x-vercel-ip-country',
      'cf-ipcountry',
    ]),
  );

  return [city, region, country].filter(Boolean).join(', ') || null;
};

type LoginMetadata = {
  ip: string | null;
  location: string | null;
  userAgent: string | null;
};

const getLoginMetadata = async (): Promise<LoginMetadata> => {
  try {
    const requestHeaders = await headers();

    return {
      ip: getClientIp(requestHeaders),
      location: getClientLocation(requestHeaders),
      userAgent: requestHeaders.get('user-agent'),
    };
  } catch {
    return { ip: null, location: null, userAgent: null };
  }
};

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const isUuid = (value: unknown): value is string =>
  typeof value === 'string' && UUID_PATTERN.test(value);

/**
 * Spring 자격증명 로그인. 비인증 서버-서버 호출(BFF JWT 불필요) — Spring 이 비번을 검증하고
 * 감사·last_login 을 기록한다. 실패(401/inactive/오답)면 null 을 돌려 로그인 실패로 이어진다.
 */
const springLogin = async (
  email: string,
  password: string,
  metadata: LoginMetadata,
): Promise<SpringLoginResponse | null> => {
  try {
    const response = await fetch(backendUrl('/api/auth/login'), {
      body: JSON.stringify({ email, password, ...metadata }),
      cache: 'no-store',
      headers: { 'Content-Type': 'application/json' },
      method: 'POST',
    });

    if (!response.ok) {
      return null;
    }

    return (await response.json()) as SpringLoginResponse;
  } catch {
    return null;
  }
};

/**
 * SSO 로그인 프로비저닝. OAuth 인증(NextAuth)은 이미 끝났고, users 레코드는 Spring 이 소유하므로
 * 이메일로 upsert 후 역할을 받아온다. 실패 시 예외를 던져 signIn 콜백이 오류 리다이렉트하도록 한다.
 */
const springSsoLogin = async (
  email: string,
  name?: string | null,
): Promise<SpringLoginResponse> => {
  const response = await fetch(backendUrl('/api/auth/sso-login'), {
    body: JSON.stringify({ email, name: name ?? null }),
    cache: 'no-store',
    headers: {
      Authorization: `Bearer ${signBackendToken({
        role: 'Viewer',
        userId: 'visionflow-bff-sso',
      })}`,
      'Content-Type': 'application/json',
    },
    method: 'POST',
  });

  if (!response.ok) {
    throw new Error('sso_provision_failed');
  }

  return (await response.json()) as SpringLoginResponse;
};

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [
    ...providers,
    Credentials({
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        const email =
          typeof credentials?.email === 'string'
            ? credentials.email.trim().toLowerCase()
            : '';
        const password =
          typeof credentials?.password === 'string'
            ? credentials.password
            : '';

        if (!email || !password) {
          return null;
        }

        const metadata = await getLoginMetadata();
        const user = await springLogin(email, password, metadata);

        if (!user) {
          return null;
        }

        // role 은 jwt 콜백이 토큰에 싣도록 반환 객체에 실어 보낸다(Spring 이 UI 어휘로 반환).
        return {
          email: user.email,
          id: user.id,
          name: user.name ?? user.email,
          role: user.role,
        };
      },
    }),
  ],
  secret: process.env.AUTH_SECRET ?? process.env.BETTER_AUTH_SECRET,
  session: {
    maxAge: EIGHT_HOURS_IN_SECONDS,
    updateAge: 15 * 60,
  },
  trustHost: true,
  pages: {
    error: ROUTES.ADMIN.LOGIN,
    signIn: ROUTES.ADMIN.LOGIN,
  },

  callbacks: {
    async signIn({ account, user }) {
      // 자격증명 로그인은 authorize 에서 이미 Spring 검증·감사 완료.
      if (account?.provider === 'credentials') {
        return true;
      }

      if (!user.email) {
        const loginUrl = new URL(
          ROUTES.ADMIN.LOGIN,
          process.env.AUTH_URL ?? 'http://localhost:3000',
        );
        loginUrl.searchParams.set('mode', 'sso');
        loginUrl.searchParams.set('error', 'MissingEmail');

        return `${loginUrl.pathname}${loginUrl.search}`;
      }

      try {
        const appUser = await springSsoLogin(user.email, user.name);

        // 후속 jwt 콜백이 읽도록 Spring 신원/역할을 user 객체에 실어 둔다.
        user.id = appUser.id;
        (user as { role?: UserRole }).role = appUser.role;

        return true;
      } catch {
        const loginUrl = new URL(
          ROUTES.ADMIN.LOGIN,
          process.env.AUTH_URL ?? 'http://localhost:3000',
        );
        loginUrl.searchParams.set('mode', 'sso');
        loginUrl.searchParams.set('error', 'SsoSyncFailed');

        return `${loginUrl.pathname}${loginUrl.search}`;
      }
    },

    async jwt({ token, user }) {
      // 로그인 시점에만 신원/역할을 토큰에 싣는다(이후 요청은 토큰 값을 그대로 사용).
      // 역할 변경은 다음 로그인(최대 세션 8시간) 시 반영된다.
      if (user) {
        if (user.email) {
          token.email = user.email;
        }
        if (isUuid(user.id)) {
          token.userId = user.id;
        }
        const role = (user as { role?: unknown }).role;
        if (role) {
          token.role = normalizeUserRole(role) ?? 'Viewer';
        }
      }

      return token;
    },

    async session({ session, token }) {
      if (session.user) {
        if (token.userId) {
          session.user.id = String(token.userId);
        }
        session.user.role = normalizeUserRole(token.role) ?? 'Viewer';
      }
      return session;
    },
  },
});
