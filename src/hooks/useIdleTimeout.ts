import { useEffect, useRef, useCallback } from 'react';
import { useAppDispatch, useAppSelector } from '../store';
import { logoutAction } from '../Actions/authActions';

// ── VAPT Security: Inactivity / idle session timeout ─────────────────────────
// If the user is authenticated but has not interacted with the page for
// IDLE_TIMEOUT_MS milliseconds, automatically log them out.
// This complements the server-side JWT TTL (1 hour) set in auth.ts.

const IDLE_TIMEOUT_MS = 60 * 60 * 1000; // 1 hour — matches server SESSION_IDLE_MS
const WARNING_BEFORE_MS = 2 * 60 * 1000; // show warning 2 minutes before timeout

const ACTIVITY_EVENTS: (keyof WindowEventMap)[] = [
  'mousemove', 'mousedown', 'keydown', 'touchstart', 'scroll', 'click',
];

interface UseIdleTimeoutOptions {
  onWarning?: (secondsLeft: number) => void;
}

export function useIdleTimeout({ onWarning }: UseIdleTimeoutOptions = {}) {
  const dispatch    = useAppDispatch();
  const isAuth      = useAppSelector((s) => s.auth.isAuthenticated);
  const timerRef    = useRef<ReturnType<typeof setTimeout> | null>(null);
  const warnRef     = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearTimers = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    if (warnRef.current)  clearTimeout(warnRef.current);
  }, []);

  const resetTimer = useCallback(() => {
    if (!isAuth) return;
    clearTimers();

    // Warning timer
    if (onWarning) {
      warnRef.current = setTimeout(() => {
        onWarning(Math.round(WARNING_BEFORE_MS / 1000));
      }, IDLE_TIMEOUT_MS - WARNING_BEFORE_MS);
    }

    // Logout timer
    timerRef.current = setTimeout(() => {
      dispatch(logoutAction());
    }, IDLE_TIMEOUT_MS);
  }, [isAuth, clearTimers, dispatch, onWarning]);

  useEffect(() => {
    if (!isAuth) {
      clearTimers();
      return;
    }

    resetTimer();

    ACTIVITY_EVENTS.forEach((evt) =>
      window.addEventListener(evt, resetTimer, { passive: true })
    );

    return () => {
      clearTimers();
      ACTIVITY_EVENTS.forEach((evt) =>
        window.removeEventListener(evt, resetTimer)
      );
    };
  }, [isAuth, resetTimer, clearTimers]);
}
