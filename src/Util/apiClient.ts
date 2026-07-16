import axios from 'axios';
import { API_BASE_URL } from '../options/Option';

// ── VAPT Fix #8/#14: No longer reading token from localStorage ──────────────
// Authentication is handled exclusively by the httpOnly cookie sent by the browser
// on every request via `withCredentials: true`.
// The Authorization header approach has been removed (token was in localStorage,
// which is accessible to JS and therefore vulnerable to XSS).

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true,  // sends the httpOnly auth cookie automatically
});

// ── Response interceptor: handle session-related 401s globally ───────────────
// Importing store lazily to avoid circular dependency
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

      // Single-session kick: another login invalidated this session
      if (status === 401) {
        if (data?.error === 'SESSION_EXPIRED') {
          if (_store) {
            import('../Reducers/authReducer').then(({ sessionExpired }) => {
              _store!.dispatch(sessionExpired());
            });
          }
        } else {
          // Token expired, user deactivated, database reset, or invalid credentials
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