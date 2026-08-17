import { useEffect, useRef } from 'react';
import { Provider } from 'react-redux';
import { createBrowserRouter, RouterProvider } from 'react-router-dom';

import { NotificationLogProvider } from './components/ui/notificationLog';
import { ToastProvider, useToast } from './components/ui/toast';
import { useIdleTimeout } from './hooks/useIdleTimeout';
import { useSSE } from './hooks/useSSE';
import { loginSuccess } from './Reducers/authReducer';
import { routes } from './Routes';
import { store } from './store';
import { useAppDispatch, useAppSelector } from './store';
import { apiClient } from './Util/apiClient';

function SessionGuard() {
  const { toast } = useToast();
  const dispatch = useAppDispatch();
  const isAuthenticated = useAppSelector((s) => s.auth.isAuthenticated);
  const authError = useAppSelector((s) => s.auth.error);
  const prevError = useRef<null | string>(null);

  useEffect(() => {
    if (isAuthenticated) {
      apiClient
        .get('/me')
        .then((res) => {
          dispatch(loginSuccess({ user: res.data.user }));
        })
        .catch((err) => {
          console.warn('Session verification failed on mount:', err);
        });
    }
  }, [isAuthenticated, dispatch]);

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

  const isKioskScreen = window.location.pathname.startsWith('/store/kiosk');

  useIdleTimeout({
    enabled: !isKioskScreen,
    onWarning: (secondsLeft) => {
      toast({
        description: `You will be automatically logged out in ${Math.round(secondsLeft / 60)} minute(s) due to inactivity.`,
        title: 'Session Expiring Soon',
        type: 'error',
      });
    },
  });

  return null;
}

function SSEBridge() {
  useSSE();

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
          <SessionGuard />
          <div className="flex min-h-screen flex-col font-sans antialiased">
            {' '}
            {/* use select none */}
            <RouterProvider router={router} />
          </div>
        </NotificationLogProvider>
      </ToastProvider>
    </Provider>
  );
}
