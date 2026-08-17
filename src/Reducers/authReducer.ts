import { createSlice, PayloadAction } from '@reduxjs/toolkit';

import type { AuthState, User } from '../types';

import { STORAGE_KEYS } from '../options/Option';

interface StoredUserPayload {
  email?: string;
  microsoftUpn?: string | null;
  mobile?: string | null;
  name?: string;
  role?: string;
  storeName?: string | null;
}

function isUser(obj: StoredUserPayload | object | null | undefined): obj is User {
  if (!obj || typeof obj !== 'object') {
    return false;
  }

  const candidate = obj as StoredUserPayload;

  return (
    typeof candidate.email === 'string' &&
    typeof candidate.name === 'string' &&
    (candidate.role === 'admin' || candidate.role === 'optometrist' || candidate.role === 'store')
  );
}

const getInitialState = (): AuthState => {
  try {
    const stored = sessionStorage.getItem(STORAGE_KEYS.USER) || localStorage.getItem(STORAGE_KEYS.USER);

    if (stored) {
      const parsed = JSON.parse(stored);

      if (isUser(parsed)) {
        return {
          authChecked: true,
          error: null,
          isAuthenticated: true,
          loading: false,
          user: parsed,
        };
      }
    }
  } catch {
    localStorage.removeItem(STORAGE_KEYS.USER);
    sessionStorage.removeItem(STORAGE_KEYS.USER);
  }

  // No cached copy in this tab (e.g. a freshly opened tab, such as TV Mode's kiosk tab, whose
  // sessionStorage doesn't inherit from the opener). The session cookie may still be valid, so
  // stay unauthenticated-but-unverified until SessionGuard's /me check confirms one way or the
  // other, instead of bouncing straight to /login.
  return {
    authChecked: false,
    error: null,
    isAuthenticated: false,
    loading: false,
    user: null,
  };
};

const authSlice = createSlice({
  initialState: getInitialState(),
  name: 'auth',
  reducers: {
    authCheckFailed(state) {
      state.authChecked = true;
      state.isAuthenticated = false;
      state.user = null;
      localStorage.removeItem(STORAGE_KEYS.USER);
      sessionStorage.removeItem(STORAGE_KEYS.USER);
    },
    loginFailure(state, action: PayloadAction<string>) {
      state.loading = false;
      state.error = action.payload;
      state.isAuthenticated = false;
      state.user = null;
    },
    loginStart(state) {
      state.loading = true;
      state.error = null;
    },
    loginSuccess(state, action: PayloadAction<{ rememberMe?: boolean; user: User }>) {
      state.authChecked = true;
      state.loading = false;
      state.user = action.payload.user;
      state.isAuthenticated = true;
      state.error = null;
      const { email, name, role, storeName } = action.payload.user;
      const serialized = JSON.stringify({ email, name, role, storeName });

      if (action.payload.rememberMe) {
        localStorage.setItem(STORAGE_KEYS.USER, serialized);
        sessionStorage.removeItem(STORAGE_KEYS.USER);
      } else {
        sessionStorage.setItem(STORAGE_KEYS.USER, serialized);
        localStorage.removeItem(STORAGE_KEYS.USER);
      }
    },
    logout(state) {
      state.authChecked = true;
      state.user = null;
      state.isAuthenticated = false;
      state.loading = false;
      state.error = null;
      localStorage.removeItem(STORAGE_KEYS.USER);
      sessionStorage.removeItem(STORAGE_KEYS.USER);
    },
    sessionExpired(state) {
      state.authChecked = true;
      state.user = null;
      state.isAuthenticated = false;
      state.loading = false;
      state.error = 'Your session expired because you signed in from another location.';
      localStorage.removeItem(STORAGE_KEYS.USER);
      sessionStorage.removeItem(STORAGE_KEYS.USER);
    },
  },
});

export const { authCheckFailed, loginFailure, loginStart, loginSuccess, logout, sessionExpired } =
  authSlice.actions;
export default authSlice.reducer;
