import { supabaseAdmin } from '@/lib/supabase-admin';
import { providers } from '@visionflow/auth';
import { ROUTES } from '@visionflow/routes';
import NextAuth from 'next-auth';

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers,
  secret: process.env.AUTH_SECRET ?? process.env.BETTER_AUTH_SECRET,
  trustHost: true,
  pages: {
    signIn: ROUTES.ADMIN.LOGIN,
  },

  callbacks: {
    async signIn({ user }) {
      // SSO 로그인 시 users 테이블에 없으면 생성, 있으면 그냥 통과
      await supabaseAdmin.from('users').upsert(
        {
          email: user.email,
          name: user.name,
          role: 'Viewer', // 기본 역할
        },
        { onConflict: 'email' },
      );
      return true;
    },

    async jwt({ token, user }) {
      if (user) token.email = user.email;
      return token;
    },

    async session({ session, token }) {
      session.accessToken = token;
      return session;
    },
  },
});
