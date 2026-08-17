import axios from 'axios';

import type { LoginResponse } from '../types';

import { loginFailure, loginStart, loginSuccess, logout } from '../Reducers/authReducer';
import { AppDispatch } from '../store';
import { apiClient } from '../Util/apiClient';

export const loginAction =
  (email: string, password: string, rememberMe = false) =>
  async (dispatch: AppDispatch) => {
    dispatch(loginStart());

    try {
      const response = await apiClient.post<LoginResponse>('/login', { email, password, rememberMe });
      dispatch(loginSuccess({ ...response.data, rememberMe }));
    } catch (e) {
      let message = 'An error occurred during login.';

      if (axios.isAxiosError(e) && e.response?.data) {
        const data = e.response.data as { error?: string };
        message = data.error || message;
      }

      dispatch(loginFailure(message));
      throw e instanceof Error ? e : new Error(message);
    }
  };

export const logoutAction = () => async (dispatch: AppDispatch) => {
  try {
    await apiClient.post('/logout');
  } catch {}

  dispatch(logout());
};
