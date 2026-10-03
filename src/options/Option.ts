import type { OptometristRxValues, RxValues } from '../types';

export const rxFields: (keyof RxValues)[] = ['sph', 'cyl', 'axis', 'pd', 'prism', 'base', 'add'];
export const optometristFields: (keyof OptometristRxValues)[] = [
  'sph',
  'cyl',
  'axis',
  'prism',
  'base',
  'va',
  'add',
];

export const rxHeaders: string[] = ['Sph', 'Cyl', 'Axis', 'PD', 'Prism', 'Base', 'ADD'];
export const optometristHeaders: string[] = ['Sph', 'Cyl', 'Axis', 'Prism', 'Base', 'VA', 'ADD'];

export const MANDATORY_OPTOMETRIST_FIELDS: (keyof OptometristRxValues)[] = ['sph', 'cyl', 'axis', 'va'];

export function isOptometristRxComplete(
  rx: null | undefined | { le: OptometristRxValues; re: OptometristRxValues }
): boolean {
  if (!rx) {
    return false;
  }

  return (['re', 'le'] as const).every((eye) =>
    MANDATORY_OPTOMETRIST_FIELDS.every((field) => Boolean(rx[eye]?.[field]))
  );
}

export function isObjectiveRxComplete(
  rx: null | undefined | { autoRefLe?: RxValues; autoRefRe?: RxValues }
): boolean {
  if (!rx?.autoRefRe || !rx?.autoRefLe) {
    return false;
  }

  const { autoRefLe, autoRefRe } = rx;

  return Boolean(
    autoRefRe.sph?.trim() &&
    autoRefRe.cyl?.trim() &&
    autoRefRe.axis?.trim() &&
    autoRefRe.pd?.trim() &&
    autoRefLe.sph?.trim() &&
    autoRefLe.cyl?.trim() &&
    autoRefLe.axis?.trim() &&
    autoRefLe.pd?.trim()
  );
}

export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? '';

export const PAGINATION = {
  OPTOMETRIST_PAGE_SIZE: 6,
  STORE_PAGE_SIZE: 8,
} as const;

export const STORAGE_KEYS = {
  CREATE_CUSTOMER_DRAFT: 'titan_create_customer_draft',
  REMEMBERED_EMAIL: 'titan_remembered_email',
  /** @deprecated Removed for CWE-312/CWE-614 compliance. Used only for legacy storage purging */
  USER: 'titan_user',
} as const;

export const APP_CONFIG = {
  COMPANY_ADDRESS: 'Veer Sandra, Electronic City, Bengaluru, Karnataka 560100',
  COMPANY_NAME: 'Titan Company Limited',
  COMPANY_URL: 'titan.co.in',
  NETWORK_POLL_INTERVAL_MS: 10_000,
  PRESENCE_PING_INTERVAL_MS: 10_000,
} as const;

export const NAME_REGEX = /^[A-Za-z\s]{3,50}$/;
export const CUSTOMER_NAME_REGEX = /^[A-Za-z\s]{3,20}$/;
export const AGE_REGEX = /^(?:[1-9][0-9]?|1[0-1][0-9]|120)$/;
export const MOBILE_REGEX = /^[1-9]\d{9}$/;
export const CUSTOMER_MOBILE_REGEX = /^[6-9]\d{9}$/;
export const EMAIL_REGEX = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
export const PASSWORD_REGEX =
  /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?~` ]).{8,128}$/;

export function validateClientPassword(
  password: string,
  userContext?: { email?: string; storeName?: string }
): null | string {
  if (!password) {
    return 'Password is required';
  }

  if (password.length < 8) {
    return 'Password must be at least 8 characters';
  }

  if (password.length > 128) {
    return 'Password must not exceed 128 characters';
  }

  if (!/[a-z]/.test(password)) {
    return 'Password must include at least one lowercase letter (a-z)';
  }

  if (!/[A-Z]/.test(password)) {
    return 'Password must include at least one uppercase letter (A-Z)';
  }

  if (!/[0-9]/.test(password)) {
    return 'Password must include at least one number (0-9)';
  }

  if (!/[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?~` ]/.test(password)) {
    return 'Password must include at least one special character (!@#$%^&*...)';
  }

  if (userContext?.email) {
    const prefix = userContext.email.split('@')[0]?.toLowerCase();

    if (prefix && prefix.length >= 3 && password.toLowerCase().includes(prefix)) {
      return 'Password must not contain your email address or username';
    }
  }

  if (userContext?.storeName) {
    const store = userContext.storeName.toLowerCase();

    if (store && store.length >= 3 && password.toLowerCase().includes(store)) {
      return 'Password must not contain your store code';
    }
  }

  return null;
}

export const SPH_REGEX = /^[+-]?(?:[0-9]|[1-2][0-9]|30)(?:\.\d{1,2})?$/;
export const CYL_REGEX = /^[+-]?(?:[0-9]|[1-2][0-9]|30)(?:\.\d{1,2})?$/;
export const AXIS_REGEX = /^(?:[0-9]|[1-9][0-9]|1[0-7][0-9]|180)$/;
export const PD_REGEX = /^(?:[0-9]|[1-9][0-9]|100)(?:\.\d{1,2})?$/;
export const PRISM_REGEX = /^(?:[0-9]|1[0-9]|20)(?:\.\d{1,2})?$/;
export const ADD_REGEX = /^(?:[0-3](?:\.\d{1,2})?|4(?:\.0{1,2})?)$/;

export const POWER_OPTIONS: string[] = (() => {
  const opts: string[] = [];

  for (let i = -1900; i <= 1900; i += 25) {
    const num = i / 100;
    const val = num.toFixed(2);
    opts.push(num > 0 ? `+${val}` : val);
  }

  return opts;
})();

export const CYL_OPTIONS: string[] = (() => {
  const opts: string[] = [];

  for (let i = -875; i <= 875; i += 25) {
    const num = i / 100;
    const val = num.toFixed(2);
    opts.push(num > 0 ? `+${val}` : val);
  }

  return opts;
})();

export const ADD_OPTIONS: string[] = (() => {
  const opts: string[] = [];

  for (let i = -75; i <= 300; i += 25) {
    const num = i / 100;
    const val = num.toFixed(2);
    opts.push(num > 0 ? `+${val}` : val);
  }

  return opts;
})();

export const SUBJECTIVE_ADD_OPTIONS: string[] = (() => {
  const opts: string[] = [];

  for (let i = 75; i <= 400; i += 25) {
    opts.push(`+${(i / 100).toFixed(2)}`);
  }

  return opts;
})();

export const AXIS_OPTIONS: string[] = (() => {
  const opts: string[] = [];

  for (let i = 0; i <= 180; i += 1) {
    opts.push(String(i));
  }

  return opts;
})();

export const PD_OPTIONS: string[] = (() => {
  const opts: string[] = [];

  for (let i = 200; i <= 600; i += 5) {
    opts.push((i / 10).toFixed(1));
  }

  return opts;
})();

export const PRISM_OPTIONS: string[] = (() => {
  const opts: string[] = [];

  for (let i = 0; i <= 1000; i += 25) {
    opts.push((i / 100).toFixed(2));
  }

  return opts;
})();

export const BASE_OPTIONS: string[] = ['In', 'Out', 'Up', 'Down'];

export const VA_OPTIONS: string[] = ['6/6', '6/7.5', '6/9', '6/12', '6/15'];

export const emptyRxValues: RxValues = {
  add: '',
  axis: '',
  base: '',
  cyl: '',
  pd: '',
  prism: '',
  sph: '',
};

export const LANGUAGES: string[] = [
  'English',
  'Hindi',
  'Tamil',
  'Telugu',
  'Kannada',
  'Malayalam',
  'Marathi',
  'Bengali',
  'Gujarati',
];

export const emptyOptometristRxValues: OptometristRxValues = {
  add: '',
  axis: '',
  base: '',
  cyl: '',
  prism: '',
  sph: '',
  va: '',
};

export { POWER_OPTIONS as SPH_OPTIONS };
