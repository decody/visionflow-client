import { supabaseAdmin } from '@/lib/supabase-admin';
import { providers } from '@visionflow/auth';
import { ROUTES } from '@visionflow/routes';
import type { UserRole } from '@visionflow/shared';
import NextAuth from 'next-auth';
import { headers } from 'next/headers';

const USER_ROLES = ['SuperAdmin', 'Operator', 'Viewer'] as const;

const isUserRole = (role: unknown): role is UserRole =>
  typeof role === 'string' &&
  USER_ROLES.includes(role as (typeof USER_ROLES)[number]);

const getFirstHeaderValue = (
  requestHeaders: Headers,
  names: string[],
) => {
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

const getLoginMetadata = async () => {
  try {
    const requestHeaders = await headers();

    return {
      last_login_at: new Date().toISOString(),
      last_login_ip: getClientIp(requestHeaders),
      last_login_location: getClientLocation(requestHeaders),
    };
  } catch {
    return {
      last_login_at: new Date().toISOString(),
      last_login_ip: null,
      last_login_location: null,
    };
  }
};

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers,
  secret: process.env.AUTH_SECRET ?? process.env.BETTER_AUTH_SECRET,
  trustHost: true,
  pages: {
    signIn: ROUTES.ADMIN.LOGIN,
  },

  callbacks: {
    async signIn({ user }) {
      if (!user.email) {
        return false;
      }

      const { data: existingUser } = await supabaseAdmin
        .from('users')
        .select('id')
        .eq('email', user.email)
        .maybeSingle();
      const loginMetadata = await getLoginMetadata();

      if (existingUser) {
        await supabaseAdmin
          .from('users')
          .update({
            name: user.name,
            ...loginMetadata,
          })
          .eq('email', user.email);
      } else {
        await supabaseAdmin.from('users').insert({
          email: user.email,
          ...loginMetadata,
          name: user.name,
          role: 'Viewer',
        });
      }

      return true;
    },

    async jwt({ token, user }) {
      if (user) {
        token.email = user.email;
      }

      if (token.email) {
        const { data } = await supabaseAdmin
          .from('users')
          .select('role')
          .eq('email', token.email)
          .maybeSingle();

        const role = data?.role;
        token.role = isUserRole(role) ? role : 'Viewer';
      }

      return token;
    },

    async session({ session, token }) {
      if (session.user) {
        session.user.role = isUserRole(token.role) ? token.role : 'Viewer';
      }
      return session;
    },
  },
});
