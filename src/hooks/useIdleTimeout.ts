import { useCallback, useEffect, useRef } from 'react';

import { logoutAction } from '../Actions/authActions';
import { useAppDispatch, useAppSelector } from '../store';

const IDLE_TIMEOUT_MS = 60 * 60 * 1000;
const WARNING_BEFORE_MS = 2 * 60 * 1000;

const ACTIVITY_EVENTS: (keyof WindowEventMap)[] = [
  'mousemove',
  'mousedown',
  'keydown',
  'touchstart',
  'scroll',
  'click',
];

interface UseIdleTimeoutOptions {
  enabled?: boolean;
  onWarning?: (secondsLeft: number) => void;
}

export function useIdleTimeout({ enabled = true, onWarning }: UseIdleTimeoutOptions = {}) {
  const dispatch = useAppDispatch();
  const isAuth = useAppSelector((s) => s.auth.isAuthenticated);
  const timerRef = useRef<null | ReturnType<typeof setTimeout>>(null);
  const warnRef = useRef<null | ReturnType<typeof setTimeout>>(null);

  const clearTimers = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
    }

    if (warnRef.current) {
      clearTimeout(warnRef.current);
    }
  }, []);

  const resetTimer = useCallback(() => {
    if (!isAuth || !enabled) {
      return;
    }

    clearTimers();

    if (onWarning) {
      warnRef.current = setTimeout(() => {
        onWarning(Math.round(WARNING_BEFORE_MS / 1000));
      }, IDLE_TIMEOUT_MS - WARNING_BEFORE_MS);
    }

    timerRef.current = setTimeout(() => {
      dispatch(logoutAction());
    }, IDLE_TIMEOUT_MS);
  }, [isAuth, enabled, clearTimers, dispatch, onWarning]);

  useEffect(() => {
    if (!isAuth || !enabled) {
      clearTimers();

      return;
    }

    resetTimer();

    ACTIVITY_EVENTS.forEach((evt) => window.addEventListener(evt, resetTimer, { passive: true }));

    return () => {
      clearTimers();
      ACTIVITY_EVENTS.forEach((evt) => window.removeEventListener(evt, resetTimer));
    };
  }, [isAuth, enabled, resetTimer, clearTimers]);
}
