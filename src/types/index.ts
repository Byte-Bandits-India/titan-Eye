export type CustomerStatus = 'Initiated' | 'Accepted' | 'Completed';

export interface RxValues {
  sph: string;
  cyl: string;
  axis: string;
  pd: string;
  prism: string;
  base: string;
  add: string;
}

export interface OptomRxValues {
  sph: string;
  cyl: string;
  axis: string;
  prism: string;
  base: string;
  va: string;
  add: string;
}

export interface Customer {
  id: string;
  name: string;
  age: string;
  gender: string;
  mobile: string;
  customerType: string;
  storeName: string;
  preferredLanguage: string;
  preferredLanguage2: string;
  storeFeedback: string;
  optumFeedback: string;
  status: CustomerStatus;
  activeProfile: boolean;
  lastUpdatedOn?: string;
  rxData?: {
    autoRefRe: RxValues;
    autoRefLe: RxValues;
    pgpRe: RxValues;
    pgpLe: RxValues;
  };
  optomRxData?: {
    re: OptomRxValues;
    le: OptomRxValues;
  };
}

export type UserRole = 'store' | 'optem';

export interface User {
  email: string;
  name: string;
  role: UserRole;
}

export interface Session {
  user: User | null;
  isAuthenticated: boolean;
}
