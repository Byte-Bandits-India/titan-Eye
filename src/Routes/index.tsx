import { Navigate } from 'react-router-dom';
import { useAppSelector } from '../store';
import { LoginScreen } from '../screens/auth/LoginScreen';
import { StoreScreen } from '../screens/store/StoreScreen';
import { OptumScreen } from '../screens/optum/OptumScreen';
import { AdminScreen } from '../screens/admin/AdminScreen';
import { SsoCallbackScreen } from '../screens/auth/SsoCallbackScreen';
import type { RouteProps, ProtectedRouteProps, UserRole } from '../types';

export function getHomeRoute(role: UserRole): string {
  if (role === 'store') return '/store';
  if (role === 'admin') return '/admin';
  return '/optum';
}

export function ProtectedRoute({ children, allowedRole }: ProtectedRouteProps) {
  const { isAuthenticated, user } = useAppSelector((state) => state.auth);

  if (!isAuthenticated || !user) {
    return <Navigate to="/login" replace />;
  }

  if (user.role !== allowedRole) {
    return <Navigate to={getHomeRoute(user.role)} replace />;
  }

  return children;
}

export function PublicRoute({ children }: RouteProps) {
  const { isAuthenticated, user } = useAppSelector((state) => state.auth);

  if (isAuthenticated && user) {
    return <Navigate to={getHomeRoute(user.role)} replace />;
  }

  return children;
}

export function BaseRedirect() {
  const { isAuthenticated, user } = useAppSelector((state) => state.auth);

  if (!isAuthenticated || !user) {
    return <Navigate to="/login" replace />;
  }

  return <Navigate to={getHomeRoute(user.role)} replace />;
}

export const routes = [
  {
    path: '/login',
    element: (
      <PublicRoute>
        <LoginScreen />
      </PublicRoute>
    ),
  },
  {
    path: '/store',
    element: (
      <ProtectedRoute allowedRole="store">
        <StoreScreen />
      </ProtectedRoute>
    ),
  },
  {
    path: '/optum',
    element: (
      <ProtectedRoute allowedRole="optum">
        <OptumScreen />
      </ProtectedRoute>
    ),
  },
  {
    path: '/admin',
    element: (
      <ProtectedRoute allowedRole="admin">
        <AdminScreen />
      </ProtectedRoute>
    ),
  },
  {
    path: '/sso/callback',
    element: <SsoCallbackScreen />,
  },
  {
    path: '/',
    element: <BaseRedirect />,
  },
  {
    path: '*',
    element: <BaseRedirect />,
  },
];
