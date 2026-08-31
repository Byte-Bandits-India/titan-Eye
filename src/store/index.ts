import { configureStore, createSelector } from '@reduxjs/toolkit';
import { TypedUseSelectorHook, useDispatch, useSelector } from 'react-redux';

import authReducer from '../Reducers/authReducer';
import customerReducer from '../Reducers/customerReducer';
import userReducer from '../Reducers/userReducer';
import { setStore } from '../Util/apiClient';

export const store = configureStore({
  reducer: {
    auth: authReducer,
    customers: customerReducer,
    users: userReducer,
  },
});

setStore(store);

export type AppDispatch = typeof store.dispatch;
export type AppStore = typeof store;
export type RootState = ReturnType<typeof store.getState>;

export const useAppDispatch = () => useDispatch<AppDispatch>();
export const useAppSelector: TypedUseSelectorHook<RootState> = useSelector;

// ── Memoized selectors ──────────────────────────────────────────────────
export const selectCustomers = (state: RootState) => state.customers.customers;
export const selectCustomersLoading = (state: RootState) => state.customers.loading;
export const selectUsers = (state: RootState) => state.users.users;
export const selectUsersLoading = (state: RootState) => state.users.loading;
export const selectAuthUser = (state: RootState) => state.auth.user;
export const selectIsAuthenticated = (state: RootState) => state.auth.isAuthenticated;
export const selectAuthChecked = (state: RootState) => state.auth.authChecked;
export const selectAuthError = (state: RootState) => state.auth.error;

export const selectCustomerById = createSelector(
  [selectCustomers, (_state: RootState, id: null | string) => id],
  (customers, id) => (id ? customers.find((c) => c.id === id) ?? null : null)
);
