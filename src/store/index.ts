import { configureStore } from '@reduxjs/toolkit';
import { useDispatch, useSelector, TypedUseSelectorHook } from 'react-redux';
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

// Wire the store into apiClient so response interceptors can dispatch actions
setStore(store);

export type RootState = ReturnType<typeof store.getState>;
export type AppStore   = typeof store;
export type AppDispatch = typeof store.dispatch;

export const useAppDispatch = () => useDispatch<AppDispatch>();
export const useAppSelector: TypedUseSelectorHook<RootState> = useSelector;

