import { Loader2 } from 'lucide-react';
import * as React from 'react';
import { Navigate } from 'react-router-dom';

import type { User } from '../../types';

import { loginFailure, loginSuccess } from '../../Reducers/authReducer';
import { getHomeRoute } from '../../Routes';
import { useAppDispatch } from '../../store';
import { apiClient } from '../../Util/apiClient';

export function SsoCallbackScreen() {
  const dispatch = useAppDispatch();
  const [redirectTo, setRedirectTo] = React.useState<null | string>(null);

  React.useEffect(() => {
    let cancelled = false;

    apiClient
      .get<{ user: User }>('/me')
      .then((response) => {
        if (cancelled) {
          return;
        }

        dispatch(loginSuccess({ user: response.data.user }));
        setRedirectTo(getHomeRoute(response.data.user.role));
      })
      .catch(() => {
        if (cancelled) {
          return;
        }

        dispatch(loginFailure('Microsoft sign-in failed.'));
        setRedirectTo('/login?error=sso_failed');
      });

    return () => {
      cancelled = true;
    };
  }, [dispatch]);

  if (redirectTo) {
    return <Navigate replace to={redirectTo} />;
  }

  return (
    <div className="flex min-h-[80vh] flex-1 items-center justify-center">
      <div className="flex flex-col items-center gap-3 text-muted-foreground">
        <Loader2 className="h-6 w-6 animate-spin" />
        <span className="text-sm font-medium">Completing sign-in...</span>
      </div>
    </div>
  );
}
