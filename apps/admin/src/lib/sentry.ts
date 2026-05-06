import * as Sentry from '@sentry/react';

export function initSentry() {
  Sentry.init({
    dsn: import.meta.env.VITE_SENTRY_DSN,
    enabled: Boolean(import.meta.env.VITE_SENTRY_DSN),
    tracesSampleRate: 1,
  });
}
