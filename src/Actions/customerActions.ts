import { AppDispatch } from '../store';
import {
  fetchStart,
  fetchSuccess,
  fetchFailure,
  customerCreated,
  customerUpdated,
} from '../Reducers/customerReducer';
import { logout } from '../Reducers/authReducer';
import { apiClient } from '../Util/apiClient';
import type { Customer } from '../types';
import axios from 'axios';

const handleApiError = (err: Error, dispatch: AppDispatch, defaultMsg: string): string => {
  if (axios.isAxiosError(err)) {
    if (err.response?.status === 401 || err.response?.status === 403) {
      dispatch(logout());
      return 'Session expired. Please log in again.';
    }
    const data = err.response?.data as { error?: string } | undefined;
    return data?.error || defaultMsg;
  }
  return defaultMsg;
};

export const fetchCustomersAction = () => async (dispatch: AppDispatch) => {
  dispatch(fetchStart());
  try {
    const response = await apiClient.get<Customer[]>('/customers');
    dispatch(fetchSuccess(response.data));
  } catch (e) {
    const err = e as Error;
    const msg = handleApiError(err, dispatch, 'Failed to fetch customers.');
    dispatch(fetchFailure(msg));
  }
};

export const createCustomerAction = (customer: Partial<Customer>) => async (dispatch: AppDispatch) => {
  try {
    const response = await apiClient.post<{ ok: boolean; id: string }>('/customers', customer);
    const created: Customer = {
      ...customer,
      id: response.data.id,
    } as Customer;
    dispatch(customerCreated(created));
    return created;
  } catch (e) {
    const err = e as Error;
    const msg = handleApiError(err, dispatch, 'Failed to register customer.');
    throw new Error(msg);
  }
};

export const updateCustomerAction = (id: string, customer: Partial<Customer>) => async (dispatch: AppDispatch) => {
  try {
    const response = await apiClient.put<{ ok: boolean; customer: Customer }>(`/customers/${encodeURIComponent(id)}`, customer);
    dispatch(customerUpdated(response.data.customer));
  } catch (e) {
    const err = e as Error;
    const msg = handleApiError(err, dispatch, 'Failed to update customer.');
    throw new Error(msg);
  }
};

export const initiateCallAction = (id: string) => async (dispatch: AppDispatch) => {
  try {
    const response = await apiClient.post<{ ok: boolean; customer: Customer }>(`/customers/${encodeURIComponent(id)}/initiate-call`);
    if (response.data.customer) {
      dispatch(customerUpdated(response.data.customer));
    }
    return response.data;
  } catch (e) {
    const err = e as Error;
    const msg = handleApiError(err, dispatch, 'Failed to initiate call.');
    throw new Error(msg);
  }
};

export const endCallAction = (id: string) => async (dispatch: AppDispatch) => {
  try {
    const response = await apiClient.post<{ ok: boolean; customer: Customer }>(`/customers/${encodeURIComponent(id)}/end-call`);
    if (response.data.customer) {
      dispatch(customerUpdated(response.data.customer));
    }
    return response.data;
  } catch (e) {
    const err = e as Error;
    const msg = handleApiError(err, dispatch, 'Failed to end call.');
    throw new Error(msg);
  }
};

export const fetchCustomerLogsAction = (id: string) => async (dispatch: AppDispatch) => {
  try {
    const response = await apiClient.get<any[]>(`/customers/${encodeURIComponent(id)}/logs`);
    return response.data;
  } catch (e) {
    const err = e as Error;
    const msg = handleApiError(err, dispatch, 'Failed to fetch customer logs.');
    throw new Error(msg);
  }
};
