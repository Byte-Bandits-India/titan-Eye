import { useEffect, useRef } from 'react';
import { createBrowserRouter, RouterProvider } from 'react-router-dom';
import { Provider } from 'react-redux';
import { store } from './store';
import { routes } from './Routes';
import { ToastProvider, useToast } from './components/ui/toast';
import { useSSE } from './hooks/useSSE';
import { useIdleTimeout } from './hooks/useIdleTimeout';
import { useAppDispatch, useAppSelector } from './store';
import { loginSuccess } from './Reducers/authReducer';
import { apiClient } from './Util/apiClient';

function SSEBridge() {
  useSSE();
  return null;
}

// ── Idle timeout + session-expired watcher ────────────────────────────────
function SessionGuard() {
  const { toast } = useToast();
  const dispatch = useAppDispatch();
  const isAuthenticated = useAppSelector((s) => s.auth.isAuthenticated);
  const authError  = useAppSelector((s) => s.auth.error);
  const prevError  = useRef<string | null>(null);

  // Verify session with the server on mount (checks if user still exists/is active in the DB)
  useEffect(() => {
    if (isAuthenticated) {
      apiClient.get('/me')
        .then((res) => {
          // Session is valid, refresh stored user details in state
          dispatch(loginSuccess({ user: res.data.user }));
        })
        .catch((err) => {
          // If the request fails with 401, the apiClient interceptor will trigger logout automatically.
          console.warn('Session verification failed on mount:', err);
        });
    }
  }, [isAuthenticated, dispatch]);

  // Show a toast when session is expired due to another login
  useEffect(() => {
    if (
      authError &&
      authError !== prevError.current &&
      authError.includes('signed in from another location')
    ) {
      toast({
        title: 'Session Ended',
        description: authError,
        type: 'error',
      });
    }
    prevError.current = authError;
  }, [authError, toast]);

  // Idle timeout — warns 2 minutes before auto-logout
  useIdleTimeout({
    onWarning: (secondsLeft) => {
      toast({
        title: 'Session Expiring Soon',
        description: `You will be automatically logged out in ${Math.round(secondsLeft / 60)} minute(s) due to inactivity.`,
        type: 'error',
      });
    },
  });

  return null;
}

const theme: 'light' | 'dark' = 'light';

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
        <SSEBridge />
        <SessionGuard />
        <div className="min-h-screen flex flex-col font-sans select-none antialiased">
          <RouterProvider router={router} />
        </div>
      </ToastProvider>
    </Provider>
  );
}
