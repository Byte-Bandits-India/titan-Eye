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

// ── VAPT Fix #14: Always call server logout to revoke the httpOnly cookie ───
// Without this call the browser would hold onto the cookie even after the user
// clicks "Log Out", allowing the token to remain usable until it expires.
export const logoutAction = () => async (dispatch: AppDispatch) => {
  try {
    await apiClient.post('/logout');
  } catch {
    // Non-fatal — clear local state regardless
  }
  dispatch(logout());
};
