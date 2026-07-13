import type { RxValues, OptumRxValues } from '../types';

export const rxFields: (keyof RxValues)[] = ['sph', 'cyl', 'axis', 'pd', 'prism', 'base', 'add'];
export const optumFields: (keyof OptumRxValues)[] = ['sph', 'cyl', 'axis', 'prism', 'base', 'va', 'add'];

export const rxHeaders: string[] = ['Sph', 'Cyl', 'Axis', 'PD', 'Prism', 'Base', 'ADD'];
export const optumHeaders: string[] = ['Sph', 'Cyl', 'Axis', 'Prism', 'Base', 'VA', 'ADD'];

export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001/api';

export const PAGINATION = {
  STORE_PAGE_SIZE: 8,
  OPTUM_PAGE_SIZE: 6,
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
