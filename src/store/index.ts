import { configureStore } from '@reduxjs/toolkit';
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
