import { supabaseAdmin } from '@/lib/supabase-admin';
import { providers } from '@visionflow/auth';
import { ROUTES } from '@visionflow/routes';
import type { UserRole } from '@visionflow/shared';
import NextAuth from 'next-auth';
import Credentials from 'next-auth/providers/credentials';
import { headers } from 'next/headers';

const EIGHT_HOURS_IN_SECONDS = 8 * 60 * 60;
const DEFAULT_DB_ROLE = 'user';

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

const isUserRole = (role: unknown): role is UserRole =>
  normalizeUserRole(role) !== null;

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
  status: string | null;
};

const canUseCredentialsLogin = (status: string | null) =>
  !status || status === 'active' || status === 'pending_invite';

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

const getErrorMessage = (error: unknown, fallback: string) => {
  if (error instanceof Error) {
    return error.message;
  }

  if (
    error &&
    typeof error === 'object' &&
    'message' in error &&
    typeof error.message === 'string'
  ) {
    return error.message;
  }

  return fallback;
};

const findAuthUserByEmail = async (email: string) => {
  const { data, error } = await supabaseAdmin.auth.admin.listUsers({
    page: 1,
    perPage: 1000,
  });

  if (error) {
    throw error;
  }

  return (
    data.users.find(
      (user) => user.email?.toLowerCase() === email.toLowerCase(),
    ) ?? null
  );
};

const ensureDefaultRole = async (userId: string) => {
  const { data, error } = await supabaseAdmin
    .from('user_roles')
    .select('role')
    .eq('user_id', userId)
    .maybeSingle();

  if (error) {
    throw error;
  }

  if (data) {
    return;
  }

  const { error: insertError } = await supabaseAdmin
    .from('user_roles')
    .insert({ role: DEFAULT_DB_ROLE, user_id: userId });

  if (insertError) {
    throw insertError;
  }
};

const getRoleByUserId = async (userId: string) => {
  const { data, error } = await supabaseAdmin
    .from('user_roles')
    .select('role')
    .eq('user_id', userId)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return normalizeUserRole(data?.role) ?? 'Viewer';
};

const upsertAppUser = async ({
  email,
  id,
  name,
}: {
  email: string;
  id: string;
  name?: string | null;
}) => {
  const { user_agent: _userAgent, ...loginMetadata } =
    await getLoginMetadata();

  const { data, error } = await supabaseAdmin
    .from('profiles')
    .upsert(
      {
        email,
        id,
        ...loginMetadata,
        name,
        status: 'active',
      },
      { onConflict: 'id' },
    )
    .select('id,name,status')
    .single();

  if (error) {
    throw error;
  }

  await ensureDefaultRole(id);

  return { ...data, email } as CredentialUserRecord;
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

        const { data: authData, error } =
          await supabaseAdmin.auth.signInWithPassword({
            email,
            password,
          });

        if (error) {
          await writeLoginAuditLog({
            email,
            provider: 'credentials',
            reason: error.message,
            status: 'failure',
          });
          return null;
        }

        if (!authData.user?.id || !authData.user.email) {
          await writeLoginAuditLog({
            email,
            provider: 'credentials',
            reason: 'missing_auth_user',
            status: 'failure',
          });
          return null;
        }

        const { user_agent: _userAgent, ...loginMetadata } =
          await getLoginMetadata();
        const { data: existingProfile, error: existingProfileError } =
          await supabaseAdmin
            .from('profiles')
            .select('name,status')
            .eq('id', authData.user.id)
            .maybeSingle();

        if (existingProfileError) {
          await writeLoginAuditLog({
            email,
            provider: 'credentials',
            reason: existingProfileError.message,
            status: 'failure',
            userId: authData.user.id,
          });
          return null;
        }

        if (!canUseCredentialsLogin(existingProfile?.status ?? null)) {
          await writeLoginAuditLog({
            email,
            provider: 'credentials',
            reason: 'inactive_user',
            status: 'failure',
            userId: authData.user.id,
          });
          return null;
        }

        const { data: profile, error: profileError } =
          await supabaseAdmin
            .from('profiles')
            .upsert(
              {
                email: authData.user.email,
                id: authData.user.id,
                ...loginMetadata,
                name:
                  existingProfile?.name ??
                  authData.user.user_metadata?.name ??
                  authData.user.email,
                status: existingProfile?.status ?? 'active',
              },
              { onConflict: 'id' },
            )
            .select('id,name,status')
            .single();

        if (profileError) {
          await writeLoginAuditLog({
            email,
            provider: 'credentials',
            reason: profileError.message,
            status: 'failure',
            userId: authData.user.id,
          });
          return null;
        }

        const appUser = {
          email: authData.user.email,
          id: authData.user.id,
          name:
            typeof profile.name === 'string'
              ? profile.name
              : authData.user.email,
          status:
            typeof profile.status === 'string'
              ? profile.status
              : null,
        };

        await ensureDefaultRole(appUser.id);

        if (appUser.status === 'pending_invite') {
          await supabaseAdmin
            .from('profiles')
            .update({ status: 'active' })
            .eq('id', appUser.id);
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

        let authUser = await findAuthUserByEmail(user.email);

        if (!authUser) {
          const { data: createdUser, error: createUserError } =
            await supabaseAdmin.auth.admin.createUser({
              email: user.email,
              email_confirm: true,
              user_metadata: { name: user.name },
            });

          if (createUserError) {
            throw createUserError;
          }

          authUser = createdUser.user;
        }

        if (!authUser) {
          throw new Error('auth_user_sync_failed');
        }

        const appUser = await upsertAppUser({
          email: user.email,
          id: authUser.id,
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
          reason: getErrorMessage(error, 'user_profile_sync_failed'),
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
        const authUser = await findAuthUserByEmail(String(token.email));
        token.role = authUser
          ? await getRoleByUserId(authUser.id)
          : 'Viewer';
      }

      return token;
    },

    async session({ session, token }) {
      if (session.user) {
        session.user.role = normalizeUserRole(token.role) ?? 'Viewer';
      }
      return session;
    },
  },
});
