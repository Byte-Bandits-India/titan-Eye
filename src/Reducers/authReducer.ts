import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import type { User, AuthState } from '../types';
import { STORAGE_KEYS } from '../options/Option';

// ── VAPT Fix #8/#14: Only non-sensitive, non-token data stored in localStorage ──
// Token is now in httpOnly cookie only — never readable by JavaScript.
// On page load we restore user identity (name/role/email) from localStorage
// so the UI knows who is logged in, but actual authentication happens via cookie.

const getInitialState = (): AuthState => {
  try {
    const stored = localStorage.getItem(STORAGE_KEYS.USER);
    if (stored) {
      const user = JSON.parse(stored) as User;
      // Validate that the stored object has the required identity fields
      if (user && user.email && user.role) {
        return {
          user,
          isAuthenticated: true,
          loading: false,
          error: null,
        };
      }
    }
  } catch {
    // corrupted storage — clear it
    localStorage.removeItem(STORAGE_KEYS.USER);
  }
  return {
    user: null,
    isAuthenticated: false,
    loading: false,
    error: null,
  };
};

const authSlice = createSlice({
  name: 'auth',
  initialState: getInitialState(),
  reducers: {
    loginStart(state) {
      state.loading = true;
      state.error = null;
    },
    loginSuccess(state, action: PayloadAction<{ user: User }>) {
      state.loading = false;
      state.user = action.payload.user;
      state.isAuthenticated = true;
      state.error = null;
      // Store ONLY non-sensitive identity fields — NO token (VAPT fix)
      const { email, name, role, storeName } = action.payload.user;
      localStorage.setItem(STORAGE_KEYS.USER, JSON.stringify({ email, name, role, storeName }));
    },
    loginFailure(state, action: PayloadAction<string>) {
      state.loading = false;
      state.error = action.payload;
      state.isAuthenticated = false;
      state.user = null;
    },
    logout(state) {
      state.user = null;
      state.isAuthenticated = false;
      state.loading = false;
      state.error = null;
      localStorage.removeItem(STORAGE_KEYS.USER);
    },
    // Dispatched when the server returns SESSION_EXPIRED (single-session kick)
    sessionExpired(state) {
      state.user = null;
      state.isAuthenticated = false;
      state.loading = false;
      state.error = 'Your session expired because you signed in from another location.';
      localStorage.removeItem(STORAGE_KEYS.USER);
    },
  },
});

export const { loginStart, loginSuccess, loginFailure, logout, sessionExpired } = authSlice.actions;
export default authSlice.reducer;
