import { supabaseAdmin } from '@/lib/supabase-admin';
import { providers } from '@visionflow/auth';
import { ROUTES } from '@visionflow/routes';
import type { UserRole } from '@visionflow/shared';
import NextAuth from 'next-auth';

const USER_ROLES = ['SuperAdmin', 'Operator', 'Viewer'] as const;

const isUserRole = (role: unknown): role is UserRole =>
  typeof role === 'string' &&
  USER_ROLES.includes(role as (typeof USER_ROLES)[number]);

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

      if (existingUser) {
        await supabaseAdmin
          .from('users')
          .update({ name: user.name })
          .eq('email', user.email);
      } else {
        await supabaseAdmin.from('users').insert({
          email: user.email,
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
      session.accessToken = token;
      if (session.user) {
        session.user.role = isUserRole(token.role) ? token.role : 'Viewer';
      }
      return session;
    },
  },
});
