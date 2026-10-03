/* eslint-disable react-refresh/only-export-components */
import { lazy, Suspense } from 'react';
import { Loader2 } from 'lucide-react';
import { Navigate, useLocation } from 'react-router-dom';

import type { ProtectedRouteProps, RouteProps, UserRole } from '../types';

import { LoginScreen } from '../screens/auth/LoginScreen';
import { useAppSelector } from '../store';

// VAPT Finding 17 Remediation: Dynamic code-splitting for protected routes
// Prevents exposing admin logic, customer deletion, and private APIs in the initial bundle
const SuperAdminScreen = lazy(() =>
  import('../screens/admin/SuperAdminScreen').then((m) => ({ default: m.SuperAdminScreen }))
);
const OptometristScreen = lazy(() =>
  import('../screens/optometrist/OptometristScreen').then((m) => ({ default: m.OptometristScreen }))
);
const StoreScreen = lazy(() =>
  import('../screens/store/StoreScreen').then((m) => ({ default: m.StoreScreen }))
);
const TvModeScreen = lazy(() =>
  import('../screens/store/TvModeScreen').then((m) => ({ default: m.TvModeScreen }))
);
const SsoCallbackScreen = lazy(() =>
  import('../screens/auth/SsoCallbackScreen').then((m) => ({ default: m.SsoCallbackScreen }))
);
const FeedbackScreen = lazy(() =>
  import('../screens/public/FeedbackScreen').then((m) => ({ default: m.FeedbackScreen }))
);

function AuthChecking() {
  return (
    <div className="flex min-h-[80vh] flex-1 items-center justify-center">
      <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
    </div>
  );
}

export function BaseRedirect() {
  const { authChecked, isAuthenticated, user } = useAppSelector((state) => state.auth);

  if (!authChecked) {
    return <AuthChecking />;
  }

  if (!isAuthenticated || !user) {
    return <Navigate replace to="/login" />;
  }

  return <Navigate replace to={getHomeRoute(user.role)} />;
}

export function getHomeRoute(role: UserRole): string {
  if (role === 'store') {
    return '/store';
  }

  if (role === 'super_admin') {
    return '/super-admin';
  }

  return '/optometrist';
}

export function ProtectedRoute({ allowedRole, children }: ProtectedRouteProps) {
  const { authChecked, isAuthenticated, user } = useAppSelector((state) => state.auth);
  const location = useLocation();

  if (!authChecked) {
    return <AuthChecking />;
  }

  if (!isAuthenticated || !user) {
    return <Navigate replace state={{ from: location }} to="/login" />;
  }

  const isAllowed = Array.isArray(allowedRole) ? allowedRole.includes(user.role) : user.role === allowedRole;

  if (!isAllowed) {
    return <Navigate replace to={getHomeRoute(user.role)} />;
  }

  return children;
}

export function PublicRoute({ children }: RouteProps) {
  const { authChecked, isAuthenticated, user } = useAppSelector((state) => state.auth);
  const location = useLocation();

  if (!authChecked) {
    return <AuthChecking />;
  }

  if (isAuthenticated && user) {
    const from = (location.state as { from?: { pathname: string; search: string } } | null)?.from;
    const target = from ? `${from.pathname}${from.search}` : getHomeRoute(user.role);

    return <Navigate replace to={target} />;
  }

  return children;
}

export const routes = [
  {
    element: (
      <PublicRoute>
        <LoginScreen />
      </PublicRoute>
    ),
    path: '/login',
  },
  {
    element: (
      <ProtectedRoute allowedRole="store">
        <Suspense fallback={<AuthChecking />}>
          <StoreScreen />
        </Suspense>
      </ProtectedRoute>
    ),
    path: '/store',
  },
  {
    element: (
      <ProtectedRoute allowedRole="store">
        <Suspense fallback={<AuthChecking />}>
          <TvModeScreen />
        </Suspense>
      </ProtectedRoute>
    ),
    path: '/store/tvmode',
  },
  {
    element: (
      <ProtectedRoute allowedRole={['optometrist', 'senior_optometrist']}>
        <Suspense fallback={<AuthChecking />}>
          <OptometristScreen />
        </Suspense>
      </ProtectedRoute>
    ),
    path: '/optometrist',
  },
  {
    element: (
      <ProtectedRoute allowedRole="super_admin">
        <Suspense fallback={<AuthChecking />}>
          <SuperAdminScreen />
        </Suspense>
      </ProtectedRoute>
    ),
    path: '/super-admin',
  },
  {
    element: (
      <Suspense fallback={<AuthChecking />}>
        <SsoCallbackScreen />
      </Suspense>
    ),
    path: '/sso/callback',
  },
  {
    element: (
      <Suspense fallback={<AuthChecking />}>
        <FeedbackScreen />
      </Suspense>
    ),
    path: '/feedback/:token',
  },
  {
    element: <BaseRedirect />,
    path: '/',
  },
  {
    element: <BaseRedirect />,
    path: '*',
  },
];
