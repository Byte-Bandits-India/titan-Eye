import { createSlice, PayloadAction } from '@reduxjs/toolkit';

import type { AuthState, User } from '../types';

import { STORAGE_KEYS } from '../options/Option';

const getInitialState = (): AuthState => {
  // Proactively purge any legacy storage entries on boot
  try {
    localStorage.removeItem(STORAGE_KEYS.USER);
    sessionStorage.removeItem(STORAGE_KEYS.USER);
  } catch {}

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

      try {
        localStorage.removeItem(STORAGE_KEYS.USER);
        sessionStorage.removeItem(STORAGE_KEYS.USER);
      } catch {}
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
    loginSuccess(state, action: PayloadAction<{ rememberMe?: boolean; user?: User }>) {
      if (!action.payload?.user) {
        state.loading = false;
        state.error = 'Failed to process user authentication data.';
        state.isAuthenticated = false;
        state.user = null;

        return;
      }

      state.authChecked = true;
      state.loading = false;
      state.user = action.payload.user;
      state.isAuthenticated = true;
      state.error = null;

      // Keep user authorization and identity strictly in-memory (Redux); never write to Local Storage
      try {
        localStorage.removeItem(STORAGE_KEYS.USER);
        sessionStorage.removeItem(STORAGE_KEYS.USER);
      } catch {}
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
