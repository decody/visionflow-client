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
});
