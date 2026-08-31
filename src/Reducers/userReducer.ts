import { createSlice, PayloadAction } from '@reduxjs/toolkit';

import type { ManagedUser, UserState } from '../types';

const initialState: UserState = {
  error: null,
  loading: false,
  users: [],
};

const userSlice = createSlice({
  initialState,
  name: 'users',
  reducers: {
    fetchUsersFailure(state, action: PayloadAction<string>) {
      state.loading = false;
      state.error = action.payload;
    },
    fetchUsersStart(state) {
      state.loading = true;
      state.error = null;
    },
    fetchUsersSuccess(state, action: PayloadAction<ManagedUser[]>) {
      state.loading = false;

      const incoming = action.payload;
      const existing = state.users;

      // Skip update when data is unchanged to preserve reference identity
      if (
        incoming.length === existing.length &&
        incoming.every(
          (u, i) =>
            existing[i] &&
            u.email === existing[i].email &&
            u.status === existing[i].status &&
            u.isLoggedIn === existing[i].isLoggedIn &&
            u.role === existing[i].role
        )
      ) {
        return;
      }

      state.users = incoming;
    },
    userCreated(state, action: PayloadAction<ManagedUser>) {
      state.users = [...state.users, action.payload];
    },
    userDeleted(state, action: PayloadAction<{ email: string }>) {
      state.users = state.users.filter((u) => u.email !== action.payload.email);
    },
    userStatusUpdated(state, action: PayloadAction<{ email: string; status: 'active' | 'inactive' }>) {
      state.users = state.users.map((u) =>
        u.email === action.payload.email ? { ...u, status: action.payload.status } : u
      );
    },
    userUpdated(state, action: PayloadAction<ManagedUser>) {
      state.users = state.users.map((u) =>
        u.email === action.payload.email ? { ...u, ...action.payload } : u
      );
    },
  },
});

export const {
  fetchUsersFailure,
  fetchUsersStart,
  fetchUsersSuccess,
  userCreated,
  userDeleted,
  userStatusUpdated,
  userUpdated,
} = userSlice.actions;

export default userSlice.reducer;
