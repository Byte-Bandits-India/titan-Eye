import type { RxValues, OptumRxValues } from '../types';

export const rxFields: (keyof RxValues)[] = ['sph', 'cyl', 'axis', 'pd', 'prism', 'base', 'add'];
export const optumFields: (keyof OptumRxValues)[] = ['sph', 'cyl', 'axis', 'prism', 'base', 'va', 'add'];

export const rxHeaders: string[] = ['Sph', 'Cyl', 'Axis', 'PD', 'Prism', 'Base', 'ADD'];
export const optumHeaders: string[] = ['Sph', 'Cyl', 'Axis', 'Prism', 'Base', 'VA', 'ADD'];

export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api';

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

// Validation Regular Expressions
export const NAME_REGEX = /^[A-Za-z\s]{3,50}$/;
export const AGE_REGEX = /^(?:[1-9][0-9]?|1[0-1][0-9]|120)$/; // 1 to 120
export const MOBILE_REGEX = /^[1-9]\d{9}$/; // 10 digit Indian mobile numbers
export const EMAIL_REGEX = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
export const PASSWORD_REGEX = /^.{6,50}$/; // Password must be 6 to 50 characters

export const SPH_REGEX = /^[+-]?(?:[0-9]|[1-2][0-9]|30)(?:\.\d{1,2})?$/;
export const CYL_REGEX = /^[+-]?(?:[0-9]|1[0-5])(?:\.\d{1,2})?$/;
export const AXIS_REGEX = /^(?:[0-9]|[1-9][0-9]|1[0-7][0-9]|180)$/;
export const PD_REGEX = /^(?:[0-9]|[1-9][0-9]|100)(?:\.\d{1,2})?$/; // PD value from 0 to 100
export const PRISM_REGEX = /^(?:[0-9]|1[0-9]|20)(?:\.\d{1,2})?$/;
export const ADD_REGEX = /^(?:[0-3](?:\.\d{1,2})?|4(?:\.0{1,2})?)$/;

