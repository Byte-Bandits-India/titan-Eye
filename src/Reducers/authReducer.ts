import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import type { User, AuthState } from '../types';
import { STORAGE_KEYS } from '../options/Option';

const getInitialState = (): AuthState => {
  try {
    const stored = localStorage.getItem(STORAGE_KEYS.USER);
    if (stored) {
      const user = JSON.parse(stored) as User;
      if (user.token) {
        return {
          user,
          token: user.token,
          isAuthenticated: true,
          loading: false,
          error: null,
        };
      }
    }
  } catch {
  }
  return {
    user: null,
    token: null,
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
      state.token = action.payload.user.token ?? null;
      state.isAuthenticated = true;
      state.error = null;
      localStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(action.payload.user));
    },
    loginFailure(state, action: PayloadAction<string>) {
      state.loading = false;
      state.error = action.payload;
      state.isAuthenticated = false;
      state.user = null;
      state.token = null;
    },
    logout(state) {
      state.user = null;
      state.token = null;
      state.isAuthenticated = false;
      state.loading = false;
      state.error = null;
      localStorage.removeItem(STORAGE_KEYS.USER);
    },
  },
});

export const { loginStart, loginSuccess, loginFailure, logout } = authSlice.actions;
export default authSlice.reducer;
