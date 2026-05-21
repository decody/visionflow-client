import { supabaseAdmin } from '@/lib/supabase-admin';
import { providers } from '@visionflow/auth';
import { ROUTES } from '@visionflow/routes';
import type { UserRole } from '@visionflow/shared';
import bcrypt from 'bcryptjs';
import NextAuth from 'next-auth';
import Credentials from 'next-auth/providers/credentials';
import { headers } from 'next/headers';

const USER_ROLES = ['SuperAdmin', 'Operator', 'Viewer'] as const;
const EIGHT_HOURS_IN_SECONDS = 8 * 60 * 60;

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
      user_agent: requestHeaders.get('user-agent'),
    };
  } catch {
    return {
      last_login_at: new Date().toISOString(),
      last_login_ip: null,
      last_login_location: null,
      user_agent: null,
    };
  }
};

type LoginAuditStatus = 'success' | 'failure';

type CredentialUserRecord = {
  email: string;
  id: string;
  name: string | null;
  password_hash: string | null;
  status: string | null;
};

const canUseCredentialsLogin = (status: string | null) =>
  status === 'active' || status === 'pending_invite';

const writeLoginAuditLog = async ({
  email,
  provider,
  reason,
  status,
  userId,
}: {
  email?: string | null;
  provider: string;
  reason?: string | null;
  status: LoginAuditStatus;
  userId?: string | null;
}) => {
  const metadata = await getLoginMetadata();

  const { error } = await supabaseAdmin.from('auth_audit_logs').insert({
    email: email ?? null,
    event_type: 'login',
    ip: metadata.last_login_ip,
    location: metadata.last_login_location,
    provider,
    reason: reason ?? null,
    status,
    user_agent: metadata.user_agent,
    user_id: userId ?? null,
  });

  if (error) {
    console.error('Failed to write auth audit log.', error);
  }
};

const upsertAppUser = async ({
  email,
  name,
}: {
  email: string;
  name?: string | null;
}) => {
  const { data: existingUser } = await supabaseAdmin
    .from('users')
    .select('id')
    .eq('email', email)
    .maybeSingle();
  const { user_agent: _userAgent, ...loginMetadata } =
    await getLoginMetadata();

  if (existingUser) {
    const { data, error } = await supabaseAdmin
      .from('users')
      .update({
        name,
        ...loginMetadata,
      })
      .eq('email', email)
      .select('id')
      .single();

    if (error) {
      throw error;
    }

    return data;
  }

  const { data, error } = await supabaseAdmin
    .from('users')
    .insert({
      email,
      ...loginMetadata,
      name,
      role: 'Viewer',
    })
    .select('id')
    .single();

  if (error) {
    throw error;
  }

  return data;
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
          await writeLoginAuditLog({
            email,
            provider: 'credentials',
            reason: 'missing_credentials',
            status: 'failure',
          });
          return null;
        }

        const { data, error } = await supabaseAdmin
          .from('users')
          .select('id,email,name,status,password_hash')
          .eq('email', email)
          .maybeSingle();

        if (error) {
          await writeLoginAuditLog({
            email,
            provider: 'credentials',
            reason: error.message,
            status: 'failure',
          });
          return null;
        }

        const appUser = data as CredentialUserRecord | null;

        if (!appUser?.password_hash) {
          await writeLoginAuditLog({
            email,
            provider: 'credentials',
            reason: 'missing_password_hash',
            status: 'failure',
            userId: appUser?.id,
          });
          return null;
        }

        if (!canUseCredentialsLogin(appUser.status)) {
          await writeLoginAuditLog({
            email,
            provider: 'credentials',
            reason: 'inactive_user',
            status: 'failure',
            userId: appUser.id,
          });
          return null;
        }

        const isValidPassword = await bcrypt.compare(
          password,
          appUser.password_hash,
        );

        if (!isValidPassword) {
          await writeLoginAuditLog({
            email,
            provider: 'credentials',
            reason: 'invalid_credentials',
            status: 'failure',
            userId: appUser.id,
          });
          return null;
        }

        const { user_agent: _userAgent, ...loginMetadata } =
          await getLoginMetadata();
        const { error: updateError } = await supabaseAdmin
          .from('users')
          .update({
            ...loginMetadata,
            ...(appUser.status === 'pending_invite'
              ? { status: 'active' }
              : {}),
          })
          .eq('id', appUser.id);

        if (updateError) {
          await writeLoginAuditLog({
            email,
            provider: 'credentials',
            reason: updateError.message,
            status: 'failure',
            userId: appUser.id,
          });
          return null;
        }

        return {
          email: appUser.email,
          id: appUser.id,
          name: appUser.name ?? appUser.email,
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
    signIn: ROUTES.ADMIN.LOGIN,
  },

  callbacks: {
    async signIn({ account, user }) {
      if (!user.email) {
        await writeLoginAuditLog({
          provider: account?.provider ?? 'unknown',
          reason: 'missing_email',
          status: 'failure',
        });
        return false;
      }

      try {
        if (account?.provider === 'credentials') {
          await writeLoginAuditLog({
            email: user.email,
            provider: 'credentials',
            status: 'success',
            userId: user.id,
          });
          return true;
        }

        const appUser = await upsertAppUser({
          email: user.email,
          name: user.name,
        });

        await writeLoginAuditLog({
          email: user.email,
          provider: account?.provider ?? 'unknown',
          status: 'success',
          userId: appUser.id,
        });

        return true;
      } catch (error) {
        await writeLoginAuditLog({
          email: user.email,
          provider: account?.provider ?? 'unknown',
          reason:
            error instanceof Error
              ? error.message
              : 'user_profile_sync_failed',
          status: 'failure',
        });
        return false;
      }
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
