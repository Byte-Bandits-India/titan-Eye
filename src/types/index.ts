import * as React from 'react';

export type CustomerStatus = 'Created' | 'Initiated' | 'Accepted' | 'Completed';

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
  callStartTime?: string;
  callActive?: boolean;
  callTakenBy?: string;
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
  token?: string;
}

export interface Session {
  user: User | null;
  isAuthenticated: boolean;
}

export interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  loading: boolean;
  error: string | null;
}

export interface CustomerState {
  customers: Customer[];
  loading: boolean;
  error: string | null;
}

export interface RouteProps {
  children: React.ReactElement;
}

export interface ProtectedRouteProps extends RouteProps {
  allowedRole: UserRole;
}

export interface UseFullscreenReturn {
  isFullscreen: boolean;
  toggleFullscreen: () => void;
}

export interface NetworkStatus {
  speed: string;
  statusLabel: string;
  statusColor: string;
  wifiIconColor: string;
}

export interface UsePaginationReturn<T> {
  paginatedItems: T[];
  currentPage: number;
  totalPages: number;
  totalItems: number;
  goToPage: (page: number) => void;
  nextPage: () => void;
  prevPage: () => void;
  resetPage: () => void;
}

export interface LoginResponse {
  user: User;
}

export interface AppLayoutProps {
  consoleLabel: string;
  children: React.ReactNode;
}

export interface HeaderProps {
  consoleLabel?: string;
}

export interface PaginationBarProps {
  currentPage: number;
  totalPages: number;
  totalItems: number;
  itemsPerPage: number;
  onPrev: () => void;
  onNext: () => void;
}

export interface StatsGridProps {
  customers: Customer[];
}

export interface CollisionModalProps {
  takenBy: string;
  onCancel: () => void;
  onViewData: () => void;
}

export interface CallTimerProps {
  startTime?: string;
  active?: boolean;
}

export interface OptemPatientDetailsProps {
  selectedCustomer: Customer | null;
  onBack: () => void;
}

export interface StorePatientDetailsProps {
  isAddingNew: boolean;
  selectedCustomer: Customer | null;
  onBack: () => void;
  setSelectedCustomerId: (id: string | null) => void;
}
