export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001/api';

export const PAGINATION = {
  STORE_PAGE_SIZE: 8,
  OPTEM_PAGE_SIZE: 6,
} as const;

export const STORAGE_KEYS = {
  USER: 'titan_user',
} as const;

export const APP_CONFIG = {
  NETWORK_POLL_INTERVAL_MS: 10_000,
  COMPANY_NAME: 'Titan Company Limited',
  COMPANY_ADDRESS: 'Veer Sandra, Electronic City, Bengaluru, Karnataka 560100',
  COMPANY_URL: 'titan.co.in',
} as const;
