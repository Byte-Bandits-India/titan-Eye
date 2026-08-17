import { useEffect, useRef } from 'react';
import { Provider } from 'react-redux';
import { createBrowserRouter, RouterProvider } from 'react-router-dom';

import { NotificationLogProvider } from './components/ui/notificationLog';
import { ToastProvider, useToast } from './components/ui/toast';
import { usePresenceHeartbeat } from './hooks/usePresenceHeartbeat';
import { useSSE } from './hooks/useSSE';
import { authCheckFailed, loginSuccess } from './Reducers/authReducer';
import { routes } from './Routes';
import { store } from './store';
import { useAppDispatch, useAppSelector } from './store';
import { apiClient } from './Util/apiClient';

function SessionGuard() {
  const { toast } = useToast();
  const dispatch = useAppDispatch();
  const isAuthenticated = useAppSelector((s) => s.auth.isAuthenticated);
  const authChecked = useAppSelector((s) => s.auth.authChecked);
  const authError = useAppSelector((s) => s.auth.error);
  const prevError = useRef<null | string>(null);
  const didVerifyRef = useRef(false);

  useEffect(() => {
    if (didVerifyRef.current) {
      return;
    }

    // Verify against the session cookie once on mount: either to refresh a cached session, or
    // to resolve a fresh tab that hasn't confirmed auth state yet (e.g. TV Mode's kiosk tab,
    // whose sessionStorage doesn't carry over from the opener) instead of bouncing it straight
    // to /login before we know whether its cookie is actually valid.
    if (!isAuthenticated && authChecked) {
      return;
    }

    didVerifyRef.current = true;

    apiClient
      .get('/me')
      .then((res) => {
        dispatch(loginSuccess({ user: res.data.user }));
      })
      .catch((err) => {
        console.warn('Session verification failed on mount:', err);
        dispatch(authCheckFailed());
      });
  }, [isAuthenticated, authChecked, dispatch]);

  useEffect(() => {
    if (
      authError &&
      authError !== prevError.current &&
      authError.includes('signed in from another location')
    ) {
      toast({
        description: authError,
        title: 'Session Ended',
        type: 'error',
      });
    }

    prevError.current = authError;
  }, [authError, toast]);

  return null;
}

function SSEBridge() {
  useSSE();

  return null;
}

function PresenceBridge() {
  usePresenceHeartbeat();

  return null;
}

const theme: 'dark' | 'light' = 'light';

const router = createBrowserRouter(routes);

export default function App() {
  useEffect(() => {
    const root = window.document.documentElement;

    if (theme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
  }, []);

  return (
    <Provider store={store}>
      <ToastProvider>
        <NotificationLogProvider>
          <SSEBridge />
          <PresenceBridge />
          <SessionGuard />
          <div className="flex min-h-screen flex-col font-sans antialiased">
            <RouterProvider router={router} />
          </div>
        </NotificationLogProvider>
      </ToastProvider>
    </Provider>
  );
}
