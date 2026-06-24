import axios from 'axios';
import { API_BASE_URL, STORAGE_KEYS } from '../options/Option';
import type { User } from '../types';

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true,
});

const getAuthToken = (): string | null => {
  try {
    const rawUser = localStorage.getItem(STORAGE_KEYS.USER);
    if (!rawUser) return null;
    const user = JSON.parse(rawUser) as User;
    return user.token || null;
  } catch (error) {
    console.warn('Failed to retrieve auth token from storage:', error);
    return null;
  }
};

apiClient.interceptors.request.use(
  (config) => {
    const token = getAuthToken();
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);