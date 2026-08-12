import axios from 'axios';

import type { LoginResponse } from '../types';

import { loginFailure, loginStart, loginSuccess, logout } from '../Reducers/authReducer';
import { AppDispatch } from '../store';
import { apiClient } from '../Util/apiClient';

export const loginAction = (email: string, password: string) => async (dispatch: AppDispatch) => {
  dispatch(loginStart());

  try {
    const response = await apiClient.post<LoginResponse>('/login', { email, password });
    dispatch(loginSuccess(response.data));
  } catch (e) {
    const err = e as Error;
    let message = 'An error occurred during login.';

    if (axios.isAxiosError(err) && err.response?.data) {
      const data = err.response.data as { error?: string };
      message = data.error || message;
    }

    dispatch(loginFailure(message));
    throw err;
  }
};

export const logoutAction = () => async (dispatch: AppDispatch) => {
  try {
    await apiClient.post('/logout');
  } catch {
  }

  dispatch(logout());
};
