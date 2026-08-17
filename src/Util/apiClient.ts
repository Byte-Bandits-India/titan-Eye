import axios from 'axios';

import { API_BASE_URL } from '../options/Option';
import { decryptClientPayload, encryptClientPayload, isEncryptedEnvelope } from './cryptoClient';

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'x-e2ee-client': 'true',
  },
  withCredentials: true,
});

let _store: import('../store').AppStore | null = null;

export function setStore(store: import('../store').AppStore) {
  _store = store;
}

apiClient.interceptors.request.use(async (config) => {
  if (
    config.data &&
    typeof config.data === 'object' &&
    !(config.data instanceof FormData) &&
    !(config.data instanceof Blob) &&
    !isEncryptedEnvelope(config.data)
  ) {
    try {
      config.data = await encryptClientPayload(config.data as object);
    } catch {
      /* fallback to plaintext if encryption unconfigured */
    }
  }

  return config;
});

apiClient.interceptors.response.use(
  async (response) => {
    if (response.data && typeof response.data === 'object' && isEncryptedEnvelope(response.data)) {
      try {
        response.data = await decryptClientPayload(response.data);
      } catch {
        /* fallback */
      }
    }

    return response;
  },
  (error) => {
    if (axios.isAxiosError(error) && error.response) {
      const status = error.response.status;
      const data = error.response.data as { error?: string; message?: string };

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
