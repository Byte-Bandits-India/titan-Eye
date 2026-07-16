import * as React from 'react';

export type CustomerStatus = 'Created' | 'Initiated' | 'Accepted' | 'Completed' | 'Closed';

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

export type OptumRxValues = CommonRxValues & {
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
  optumFeedback: string;
  status: CustomerStatus;
  activeProfile: boolean;
  lastUpdatedOn?: string;
  callStartTime?: string | null;
  callActive?: boolean;
  callTakenBy?: string | null;
  callDuration?: number;
  rxData?: {
    autoRefRe: RxValues;
    autoRefLe: RxValues;
    pgpRe: RxValues;
    pgpLe: RxValues;
  };
  optumRxData?: {
    re: OptumRxValues;
    le: OptumRxValues;
  };
};

export type CustomerLog = {
  id: number;
  customerId: string;
  lastUpdatedOn: string | null;
  status: CustomerStatus;
  callDuration: number | null;
  callTakenBy: string | null;
};

export type UserRole = 'store' | 'optum' | 'admin';

export type User = {
  email: string;
  name: string;
  role: UserRole;
  storeName?: string | null;
  mobile?: string | null;
  microsoftUpn?: string | null;
  // token removed — auth uses httpOnly cookie only (VAPT fix #8)
};

export type ManagedUser = {
  email: string;
  name: string;
  role: UserRole;
  storeName?: string | null;
  mobile?: string | null;
  microsoftUpn?: string | null;
  lastLogin?: string | null;
  status: 'active' | 'inactive';
};

export type CreateUserPayload = {
  email: string;
  name: string;
  password: string;
  role: UserRole;
  mobile?: string;
  storeName?: string;
};

export type UpdateUserPayload = {
  name: string;
  password?: string;
  role: UserRole;
  mobile?: string;
  storeName?: string;
};

export type UserState = {
  users: ManagedUser[];
  loading: boolean;
  error: string | null;
};

export type Session = {
  user: User | null;
  isAuthenticated: boolean;
};

export type AuthState = {
  user: User | null;
  // token removed — auth uses httpOnly cookie only (VAPT fix #8)
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
  activeTab?: 'users' | 'customers';
  setActiveTab?: (tab: 'users' | 'customers') => void;
};

export type HeaderProps = {
  consoleLabel?: string;
  activeTab?: 'users' | 'customers';
  setActiveTab?: (tab: 'users' | 'customers') => void;
};

export type PaginationBarProps = {
  currentPage: number;
  totalPages: number;
  totalItems: number;
  itemsPerPage: number;
  onPrev: () => void;
  onNext: () => void;
  onItemsPerPageChange?: (size: number) => void;
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
  onTimeout?: () => void;
};

export type OptumPatientDetailsProps = {
  selectedCustomer: Customer | null;
  onBack: () => void;
};

export type StorePatientDetailsProps = {
  isAddingNew: boolean;
  selectedCustomer: Customer | null;
  onBack: () => void;
  setSelectedCustomerId: (id: string | null) => void;
};
