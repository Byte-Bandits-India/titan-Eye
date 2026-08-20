/* eslint-disable react-refresh/only-export-components */
import { Loader2 } from 'lucide-react';
import { Navigate, useLocation } from 'react-router-dom';

import type { ProtectedRouteProps, RouteProps, UserRole } from '../types';

import { AdminScreen } from '../screens/admin/AdminScreen';
import { LoginScreen } from '../screens/auth/LoginScreen';
import { SsoCallbackScreen } from '../screens/auth/SsoCallbackScreen';
import { OptometristScreen } from '../screens/optometrist/OptometristScreen';
import { FeedbackScreen } from '../screens/public/FeedbackScreen';
import { StoreScreen } from '../screens/store/StoreScreen';
import { TvModeScreen } from '../screens/store/TvModeScreen';
import { useAppSelector } from '../store';

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

  if (role === 'admin') {
    return '/admin';
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

  if (user.role !== allowedRole) {
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
        <StoreScreen />
      </ProtectedRoute>
    ),
    path: '/store',
  },
  {
    element: (
      <ProtectedRoute allowedRole="store">
        <TvModeScreen />
      </ProtectedRoute>
    ),
    path: '/store/tvmode',
  },
  {
    element: (
      <ProtectedRoute allowedRole="optometrist">
        <OptometristScreen />
      </ProtectedRoute>
    ),
    path: '/optometrist',
  },
  {
    element: (
      <ProtectedRoute allowedRole="admin">
        <AdminScreen />
      </ProtectedRoute>
    ),
    path: '/admin',
  },
  {
    element: <SsoCallbackScreen />,
    path: '/sso/callback',
  },
  {
    element: <FeedbackScreen />,
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
