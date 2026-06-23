import { AppDispatch } from '../store';
import { loginStart, loginSuccess, loginFailure, logout } from '../Reducers/authReducer';
import { apiClient } from '../Util/apiClient';
import type { LoginResponse } from '../types';
import axios from 'axios';

export const loginAction = (email: string, password: string) => async (dispatch: AppDispatch) => {
  dispatch(loginStart());
  try {
    const response = await apiClient.post<LoginResponse>('/login', { email, password });
    dispatch(loginSuccess(response.data));
  } catch (err: any) {
    let message = 'An error occurred during login.';
    if (axios.isAxiosError(err) && err.response?.data) {
      const data = err.response.data as { error?: string };
      message = data.error || message;
    }
    dispatch(loginFailure(message));
    throw err;
  }
};

export const logoutAction = () => (dispatch: AppDispatch) => {
  dispatch(logout());
};
