'use client';

import { ROUTES } from '@visionflow/routes';
import { signOut, useSession } from 'next-auth/react';
import { useEffect, useRef } from 'react';

const EIGHT_HOURS_IN_MS = 8 * 60 * 60 * 1000;
const CHECK_INTERVAL_IN_MS = 60 * 1000;
// const EIGHT_HOURS_IN_MS = 10000;
// const CHECK_INTERVAL_IN_MS = 1000;
const ACTIVITY_STORAGE_KEY = 'visionflow:last-activity-at';
const ACTIVITY_EVENTS = [
  'click',
  'keydown',
  'mousemove',
  'scroll',
  'touchstart',
] as const;

const getLastActivityAt = () => {
  const storedValue = window.localStorage.getItem(
    ACTIVITY_STORAGE_KEY,
  );
  const parsedValue = storedValue ? Number(storedValue) : NaN;

  return Number.isFinite(parsedValue) ? parsedValue : Date.now();
};

const setLastActivityAt = (value: number) => {
  window.localStorage.setItem(ACTIVITY_STORAGE_KEY, String(value));
};

export function IdleLogout() {
  const { status } = useSession();
  const isSigningOutRef = useRef(false);

  useEffect(() => {
    if (status !== 'authenticated') {
      return;
    }

    setLastActivityAt(Date.now());

    const markActivity = () => {
      if (!isSigningOutRef.current) {
        setLastActivityAt(Date.now());
      }
    };

    const checkIdleTime = () => {
      if (isSigningOutRef.current) {
        return;
      }

      if (Date.now() - getLastActivityAt() < EIGHT_HOURS_IN_MS) {
        return;
      }

      isSigningOutRef.current = true;
      void signOut({ callbackUrl: ROUTES.ADMIN.LOGIN });
    };

    for (const eventName of ACTIVITY_EVENTS) {
      window.addEventListener(eventName, markActivity, {
        passive: true,
      });
    }

    const intervalId = window.setInterval(
      checkIdleTime,
      CHECK_INTERVAL_IN_MS,
    );

    return () => {
      for (const eventName of ACTIVITY_EVENTS) {
        window.removeEventListener(eventName, markActivity);
      }

      window.clearInterval(intervalId);
    };
  }, [status]);

  return null;
}
