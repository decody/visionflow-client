import { ROUTES } from '@visionflow/routes';
import { NextResponse } from 'next/server';

import { auth } from './auth';

const PUBLIC_PREFIXES = [ROUTES.ADMIN.LOGIN, ROUTES.ADMIN.SIGNIN, '/api/auth'] as const;

export const proxy = auth((request) => {
  const { pathname } = request.nextUrl;
  const isPublicPath = PUBLIC_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );

  if (isPublicPath || request.auth) {
    return NextResponse.next();
  }

  const loginUrl = new URL(ROUTES.ADMIN.LOGIN, request.nextUrl.origin);
  loginUrl.searchParams.set('callbackUrl', `${request.nextUrl.pathname}${request.nextUrl.search}`);

  return NextResponse.redirect(loginUrl);
});

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\..*).*)'],
};
