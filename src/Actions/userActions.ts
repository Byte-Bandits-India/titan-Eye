import { AppDispatch } from '../store';
import {
  fetchUsersStart,
  fetchUsersSuccess,
  fetchUsersFailure,
  userCreated,
  userStatusUpdated,
  userUpdated,
  userDeleted,
} from '../Reducers/userReducer';
import { logout } from '../Reducers/authReducer';
import { apiClient } from '../Util/apiClient';
import type { ManagedUser, CreateUserPayload, UpdateUserPayload } from '../types';
import axios from 'axios';

const handleApiError = (err: Error, dispatch: AppDispatch, defaultMsg: string): string => {
  if (axios.isAxiosError(err)) {
    if (err.response?.status === 401 || err.response?.status === 403) {
      if (err.response.status === 401) {
        dispatch(logout());
      }
      const data = err.response?.data as { error?: string } | undefined;
      return data?.error || 'Session expired. Please log in again.';
    }
    const data = err.response?.data as { error?: string } | undefined;
    return data?.error || defaultMsg;
  }
  return defaultMsg;
};

export const fetchUsersAction = () => async (dispatch: AppDispatch) => {
  dispatch(fetchUsersStart());
  try {
    const response = await apiClient.get<ManagedUser[]>('/users');
    dispatch(fetchUsersSuccess(response.data));
  } catch (e) {
    const err = e as Error;
    const msg = handleApiError(err, dispatch, 'Failed to fetch users.');
    dispatch(fetchUsersFailure(msg));
  }
};

export const createUserAction = (payload: CreateUserPayload) => async (dispatch: AppDispatch) => {
  try {
    const response = await apiClient.post<ManagedUser>('/users', payload);
    dispatch(userCreated(response.data));
  } catch (e) {
    const err = e as Error;
    let message = 'Failed to create user.';
    if (axios.isAxiosError(err) && err.response?.data) {
      const data = err.response.data as { error?: string };
      message = data.error || message;
    }
    throw new Error(message);
  }
};

export const toggleUserStatusAction = (email: string, status: 'active' | 'inactive') => async (dispatch: AppDispatch) => {
  try {
    await apiClient.put(`/users/${encodeURIComponent(email)}/status`, { status });
    dispatch(userStatusUpdated({ email, status }));
  } catch (e) {
    const err = e as Error;
    let message = 'Failed to update user status.';
    if (axios.isAxiosError(err) && err.response?.data) {
      const data = err.response.data as { error?: string };
      message = data.error || message;
    }
    throw new Error(message);
  }
};

export const updateUserAction = (email: string, payload: UpdateUserPayload) => async (dispatch: AppDispatch) => {
  try {
    const response = await apiClient.put<ManagedUser>(`/users/${encodeURIComponent(email)}`, payload);
    dispatch(userUpdated(response.data));
  } catch (e) {
    const err = e as Error;
    let message = 'Failed to update user.';
    if (axios.isAxiosError(err) && err.response?.data) {
      const data = err.response.data as { error?: string };
      message = data.error || message;
    }
    throw new Error(message);
  }
};

export const deleteUserAction = (email: string) => async (dispatch: AppDispatch) => {
  try {
    await apiClient.delete(`/users/${encodeURIComponent(email)}`);
    dispatch(userDeleted({ email }));
  } catch (e) {
    const err = e as Error;
    let message = 'Failed to delete user.';
    if (axios.isAxiosError(err) && err.response?.data) {
      const data = err.response.data as { error?: string };
      message = data.error || message;
    }
    throw new Error(message);
  }
};
