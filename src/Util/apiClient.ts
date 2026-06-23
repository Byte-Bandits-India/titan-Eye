import axios from 'axios';
import { API_BASE_URL, STORAGE_KEYS } from '../constants';
import type { User } from '../types';

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true,
});

apiClient.interceptors.request.use(
  (config) => {
    try {
      const rawUser = localStorage.getItem(STORAGE_KEYS.USER);
      if (rawUser) {
        const user = JSON.parse(rawUser) as User;
        if (user.token) {
          config.headers.Authorization = `Bearer ${user.token}`;
        }
      }
    } catch {
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);