import axios from 'axios';

import { API_BASE_URL } from '../options/Option';

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true,  // sends the httpOnly auth cookie automatically
});

let _store: import('../store').AppStore | null = null;

export function setStore(store: import('../store').AppStore) {
  _store = store;
}

apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (axios.isAxiosError(error) && error.response) {
      const status = error.response.status;
      const data   = error.response.data as { error?: string; message?: string };

      if (status === 401) {
        if (data?.error === 'SESSION_EXPIRED') {
          if (_store) {
            import('../Reducers/authReducer').then(({ sessionExpired }) => {
              _store!.dispatch(sessionExpired());
            });
          }
        } else {
          if (_store) {
            import('../Reducers/authReducer').then(({ logout }) => {
              _store!.dispatch(logout());
            });
          }
        }
      }
    }

    return Promise.reject(error);
  }
);
