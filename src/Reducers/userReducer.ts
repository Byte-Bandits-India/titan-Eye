import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import type { ManagedUser, UserState } from '../types';

const initialState: UserState = {
  users: [],
  loading: false,
  error: null,
};

const userSlice = createSlice({
  name: 'users',
  initialState,
  reducers: {
    fetchUsersStart(state) {
      state.loading = true;
      state.error = null;
    },
    fetchUsersSuccess(state, action: PayloadAction<ManagedUser[]>) {
      state.loading = false;
      state.users = action.payload;
    },
    fetchUsersFailure(state, action: PayloadAction<string>) {
      state.loading = false;
      state.error = action.payload;
    },
    userCreated(state, action: PayloadAction<ManagedUser>) {
      state.users = [...state.users, action.payload];
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
    userDeleted(state, action: PayloadAction<{ email: string }>) {
      state.users = state.users.filter((u) => u.email !== action.payload.email);
    },
  },
});

export const {
  fetchUsersStart,
  fetchUsersSuccess,
  fetchUsersFailure,
  userCreated,
  userStatusUpdated,
  userUpdated,
  userDeleted,
} = userSlice.actions;

export default userSlice.reducer;
