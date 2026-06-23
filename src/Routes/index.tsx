import { Navigate } from 'react-router-dom';
import { useAppSelector } from '../store';
import { LoginScreen } from '../features/auth/LoginScreen';
import { StoreScreen } from '../features/store/StoreScreen';
import { OptemScreen } from '../features/optem/OptemScreen';
import type { RouteProps, ProtectedRouteProps } from '../types';

export function ProtectedRoute({ children, allowedRole }: ProtectedRouteProps) {
  const { isAuthenticated, user } = useAppSelector((state) => state.auth);

  if (!isAuthenticated || !user) {
    return <Navigate to="/login" replace />;
  }

  if (user.role !== allowedRole) {
    return <Navigate to={user.role === 'store' ? '/store' : '/optem'} replace />;
  }

  return children;
}

export function PublicRoute({ children }: RouteProps) {
  const { isAuthenticated, user } = useAppSelector((state) => state.auth);

  if (isAuthenticated && user) {
    return <Navigate to={user.role === 'store' ? '/store' : '/optem'} replace />;
  }

  return children;
}

export function BaseRedirect() {
  const { isAuthenticated, user } = useAppSelector((state) => state.auth);

  if (!isAuthenticated || !user) {
    return <Navigate to="/login" replace />;
  }

  return <Navigate to={user.role === 'store' ? '/store' : '/optem'} replace />;
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
    path: '/optem',
    element: (
      <ProtectedRoute allowedRole="optem">
        <OptemScreen />
      </ProtectedRoute>
    ),
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
