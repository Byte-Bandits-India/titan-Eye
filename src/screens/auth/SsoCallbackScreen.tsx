import * as React from 'react';
import { Navigate } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { useAppDispatch } from '../../store';
import { loginSuccess, loginFailure } from '../../Reducers/authReducer';
import { apiClient } from '../../Util/apiClient';
import { getHomeRoute } from '../../Routes';
import type { User } from '../../types';

export function SsoCallbackScreen() {
  const dispatch = useAppDispatch();
  const [redirectTo, setRedirectTo] = React.useState<string | null>(null);

  React.useEffect(() => {
    let cancelled = false;

    apiClient.get<{ user: User }>('/auth/me')
      .then((response) => {
        if (cancelled) return;
        dispatch(loginSuccess({ user: response.data.user }));
        setRedirectTo(getHomeRoute(response.data.user.role));
      })
      .catch(() => {
        if (cancelled) return;
        dispatch(loginFailure('Microsoft sign-in failed.'));
        setRedirectTo('/login?error=sso_failed');
      });

    return () => {
      cancelled = true;
    };
  }, [dispatch]);

  if (redirectTo) {
    return <Navigate to={redirectTo} replace />;
  }

  return (
    <div className="flex-1 flex items-center justify-center min-h-[80vh]">
      <div className="flex flex-col items-center gap-3 text-muted-foreground">
        <Loader2 className="w-6 h-6 animate-spin" />
        <span className="text-sm font-medium">Completing sign-in...</span>
      </div>
    </div>
  );
}
