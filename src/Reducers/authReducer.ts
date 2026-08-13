import { createSlice, PayloadAction } from '@reduxjs/toolkit';

import type { AuthState, User } from '../types';

import { STORAGE_KEYS } from '../options/Option';

const getInitialState = (): AuthState => {
  try {
    const stored = localStorage.getItem(STORAGE_KEYS.USER);

    if (stored) {
      const user = JSON.parse(stored) as User;

      // Validate that the stored object has the required identity fields
      if (user && user.email && user.role) {
        return {
          error: null,
          isAuthenticated: true,
          loading: false,
          user,
        };
      }
    }
  } catch {
    // corrupted storage — clear it
    localStorage.removeItem(STORAGE_KEYS.USER);
  }

  return {
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
    loginSuccess(state, action: PayloadAction<{ user: User }>) {
      state.loading = false;
      state.user = action.payload.user;
      state.isAuthenticated = true;
      state.error = null;
      const { email, name, role, storeName } = action.payload.user;
      localStorage.setItem(STORAGE_KEYS.USER, JSON.stringify({ email, name, role, storeName }));
    },
    logout(state) {
      state.user = null;
      state.isAuthenticated = false;
      state.loading = false;
      state.error = null;
      localStorage.removeItem(STORAGE_KEYS.USER);
    },
    sessionExpired(state) {
      state.user = null;
      state.isAuthenticated = false;
      state.loading = false;
      state.error = 'Your session expired because you signed in from another location.';
      localStorage.removeItem(STORAGE_KEYS.USER);
    },
  },
});

export const { loginFailure, loginStart, loginSuccess, logout, sessionExpired } = authSlice.actions;
export default authSlice.reducer;
