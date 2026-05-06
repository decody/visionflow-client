import * as Sentry from '@sentry/react';

export function initSentry() {
  const dsn = process.env.NEXT_PUBLIC_SENTRY_DSN;

  Sentry.init({
    dsn,
    enabled: Boolean(dsn),
    tracesSampleRate: 1,
  });
}
