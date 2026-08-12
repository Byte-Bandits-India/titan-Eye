import { Navigate } from 'react-router-dom';
import { useAppSelector } from '../store';
import { LoginScreen } from '../screens/auth/LoginScreen';
import { StoreScreen } from '../screens/store/StoreScreen';
import { OptomScreen } from '../screens/optom/OptomScreen';
import { AdminScreen } from '../screens/admin/AdminScreen';
import { SsoCallbackScreen } from '../screens/auth/SsoCallbackScreen';
import { FeedbackScreen } from '../screens/public/FeedbackScreen';
import type { RouteProps, ProtectedRouteProps, UserRole } from '../types';

export function getHomeRoute(role: UserRole): string {
  if (role === 'store') return '/store';
  if (role === 'admin') return '/admin';
  return '/optom';
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
    path: '/optom',
    element: (
      <ProtectedRoute allowedRole="optom">
        <OptomScreen />
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
    path: '/feedback/:token',
    element: <FeedbackScreen />,
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
