import axios from 'axios';

import type { Customer, CustomerLog } from '../types';

import { logout } from '../Reducers/authReducer';
import {
  customerCreated,
  customerDeleted,
  customerUpdated,
  fetchFailure,
  fetchStart,
  fetchSuccess,
} from '../Reducers/customerReducer';
import { AppDispatch } from '../store';
import { apiClient } from '../Util/apiClient';

const handleApiError = (err: Error, dispatch: AppDispatch, defaultMsg: string): string => {
  if (axios.isAxiosError(err)) {
    if (err.response?.status === 401 || err.response?.status === 403) {
      dispatch(logout());

      return 'Session expired. Please log in again.';
    }

    const data = err.response?.data as undefined | { error?: string };

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
    const err = e instanceof Error ? e : new Error(String(e));
    const msg = handleApiError(err, dispatch, 'Failed to fetch customers.');
    dispatch(fetchFailure(msg));
  }
};

export const createCustomerAction = (customer: Partial<Customer>) => async (dispatch: AppDispatch) => {
  try {
    const response = await apiClient.post<{ id: string; ok: boolean }>('/customers', customer);
    const created: Customer = {
      ...customer,
      id: response.data.id,
    } as Customer;
    dispatch(customerCreated(created));

    return created;
  } catch (e) {
    const err = e instanceof Error ? e : new Error(String(e));
    const msg = handleApiError(err, dispatch, 'Failed to register customer.');
    throw new Error(msg);
  }
};

export const updateCustomerAction =
  (id: string, customer: Partial<Customer>) => async (dispatch: AppDispatch) => {
    try {
      const response = await apiClient.put<{ customer: Customer; ok: boolean }>(
        `/customers/${encodeURIComponent(id)}`,
        customer
      );
      dispatch(customerUpdated(response.data.customer));
    } catch (e) {
      const err = e instanceof Error ? e : new Error(String(e));
      const msg = handleApiError(err, dispatch, 'Failed to update customer.');
      throw new Error(msg);
    }
  };

export const deleteCustomerAction = (id: string) => async (dispatch: AppDispatch) => {
  try {
    await apiClient.delete<{ ok: boolean }>(`/customers/${encodeURIComponent(id)}`);
    dispatch(customerDeleted(id));
  } catch (e) {
    const err = e instanceof Error ? e : new Error(String(e));
    const msg = handleApiError(err, dispatch, 'Failed to delete customer.');
    throw new Error(msg);
  }
};

export const initiateCallAction = (id: string) => async (dispatch: AppDispatch) => {
  try {
    const response = await apiClient.post<{ customer: Customer; ok: boolean }>(
      `/customers/${encodeURIComponent(id)}/initiate-call`
    );

    if (response.data.customer) {
      dispatch(customerUpdated(response.data.customer));
    }

    return response.data;
  } catch (e) {
    const err = e instanceof Error ? e : new Error(String(e));
    const msg = handleApiError(err, dispatch, 'Failed to initiate call.');
    throw new Error(msg);
  }
};

export const dropCustomerAction = (id: string, reason: string) => async (dispatch: AppDispatch) => {
  try {
    const response = await apiClient.post<{ customer: Customer; ok: boolean }>(
      `/customers/${encodeURIComponent(id)}/drop-customer`,
      { reason }
    );

    if (response.data.customer) {
      dispatch(customerUpdated(response.data.customer));
    }

    return response.data;
  } catch (e) {
    const err = e instanceof Error ? e : new Error(String(e));
    const msg = handleApiError(err, dispatch, 'Failed to drop customer.');
    throw new Error(msg);
  }
};

export const rejectCallAction = (id: string) => async (dispatch: AppDispatch) => {
  try {
    const response = await apiClient.post<{ customer: Customer; ok: boolean }>(
      `/customers/${encodeURIComponent(id)}/reject-call`
    );

    if (response.data.customer) {
      dispatch(customerUpdated(response.data.customer));
    }

    return response.data;
  } catch (e) {
    const err = e instanceof Error ? e : new Error(String(e));
    const msg = handleApiError(err, dispatch, 'Failed to reject call.');
    throw new Error(msg);
  }
};

export const dropCallAction = (id: string) => async (dispatch: AppDispatch) => {
  try {
    const response = await apiClient.post<{ customer: Customer; ok: boolean }>(
      `/customers/${encodeURIComponent(id)}/drop-call`
    );

    if (response.data.customer) {
      dispatch(customerUpdated(response.data.customer));
    }

    return response.data;
  } catch (e) {
    const err = e instanceof Error ? e : new Error(String(e));
    const msg = handleApiError(err, dispatch, 'Failed to drop call.');
    throw new Error(msg);
  }
};

export const endCallAction = (id: string) => async (dispatch: AppDispatch) => {
  try {
    const response = await apiClient.post<{ customer: Customer; ok: boolean }>(
      `/customers/${encodeURIComponent(id)}/end-call`
    );

    if (response.data.customer) {
      dispatch(customerUpdated(response.data.customer));
    }

    return response.data;
  } catch (e) {
    const err = e instanceof Error ? e : new Error(String(e));
    const msg = handleApiError(err, dispatch, 'Failed to end call.');
    throw new Error(msg);
  }
};

export const completeCallAction = (id: string) => async (dispatch: AppDispatch) => {
  try {
    const response = await apiClient.post<{ customer: Customer; ok: boolean; token: string }>(
      `/customers/${encodeURIComponent(id)}/complete`
    );

    if (response.data.customer) {
      dispatch(customerUpdated(response.data.customer));
    }

    return response.data;
  } catch (e) {
    const err = e instanceof Error ? e : new Error(String(e));
    const msg = handleApiError(err, dispatch, 'Failed to mark the call as completed.');
    throw new Error(msg);
  }
};

export const fetchCustomerLogsAction = (id: string) => async (dispatch: AppDispatch) => {
  try {
    const response = await apiClient.get<CustomerLog[]>(`/customers/${encodeURIComponent(id)}/logs`);

    return response.data;
  } catch (e) {
    const err = e instanceof Error ? e : new Error(String(e));
    const msg = handleApiError(err, dispatch, 'Failed to fetch customer logs.');
    throw new Error(msg);
  }
};
