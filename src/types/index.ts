import * as React from 'react';

export type CustomerStatus = 'Created' | 'Initiated' | 'Accepted' | 'Completed';

export type CommonRxValues = {
  sph: string;
  cyl: string;
  axis: string;
  prism: string;
  base: string;
  add: string;
};

export type RxValues = CommonRxValues & {
  pd: string;
};

export type OptemRxValues = CommonRxValues & {
  va: string;
};

export type Customer = {
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
  optemFeedback: string;
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
  optemRxData?: {
    re: OptemRxValues;
    le: OptemRxValues;
  };
};

export type UserRole = 'store' | 'optem';

export type User = {
  email: string;
  name: string;
  role: UserRole;
  token?: string;
};

export type Session = {
  user: User | null;
  isAuthenticated: boolean;
};

export type AuthState = {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  loading: boolean;
  error: string | null;
};

export type CustomerState = {
  customers: Customer[];
  loading: boolean;
  error: string | null;
};

export type RouteProps = {
  children: React.ReactElement;
};

export type ProtectedRouteProps = RouteProps & {
  allowedRole: UserRole;
};

export type UseFullscreenReturn = {
  isFullscreen: boolean;
  toggleFullscreen: () => void;
};

export type NetworkStatus = {
  speed: string;
  statusLabel: string;
  statusColor: string;
  wifiIconColor: string;
};

export type UsePaginationReturn<T> = {
  paginatedItems: T[];
  currentPage: number;
  totalPages: number;
  totalItems: number;
  goToPage: (page: number) => void;
  nextPage: () => void;
  prevPage: () => void;
  resetPage: () => void;
};

export type LoginResponse = {
  user: User;
};

export type AppLayoutProps = {
  consoleLabel: string;
  children: React.ReactNode;
};

export type HeaderProps = {
  consoleLabel?: string;
};

export type PaginationBarProps = {
  currentPage: number;
  totalPages: number;
  totalItems: number;
  itemsPerPage: number;
  onPrev: () => void;
  onNext: () => void;
};

export type StatsGridProps = {
  customers: Customer[];
};

export type CollisionModalProps = {
  takenBy: string;
  onCancel: () => void;
  onViewData: () => void;
};

export type CallTimerProps = {
  startTime?: string;
  active?: boolean;
};

export type OptemPatientDetailsProps = {
  selectedCustomer: Customer | null;
  onBack: () => void;
};

export type StorePatientDetailsProps = {
  isAddingNew: boolean;
  selectedCustomer: Customer | null;
  onBack: () => void;
  setSelectedCustomerId: (id: string | null) => void;
};
