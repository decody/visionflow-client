import type { DefaultSession } from 'next-auth';
import type { JWT } from 'next-auth/jwt';
import type { UserRole } from '@visionflow/shared';

declare module 'next-auth' {
  interface Session extends DefaultSession {
    accessToken?: JWT;
    user?: DefaultSession['user'] & {
      role?: UserRole;
    };
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    role?: UserRole;
  }
}
