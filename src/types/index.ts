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

export type OptomRxValues = CommonRxValues & {
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
  optomFeedback?: string;
  status: CustomerStatus;
  activeProfile: boolean;
  createdOn?: string | null;
  lastUpdatedOn?: string;
  callStartTime?: string | null;
  callActive?: boolean;
  callTakenBy?: string | null;
  storeContactEmail?: string | null;
  callDuration?: number;
  optomCallStartTime?: string | null;
  offeredToOptomEmail?: string | null;
  patientFeedback?: string | null;
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
};

export type CustomerLog = {
  id: number;
  customerId: string;
  lastUpdatedOn: string | null;
  status: CustomerStatus;
  callDuration: number | null;
  callTakenBy: string | null;
};

export type UserRole = 'store' | 'optom' | 'admin';

export type User = {
  email: string;
  name: string;
  role: UserRole;
  storeName?: string | null;
  mobile?: string | null;
  microsoftUpn?: string | null;
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
  isLoggedIn?: boolean;
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

export type AuditLog = {
  id: number | string;
  customerId: string;
  customerName?: string;
  storeName?: string;
  lastUpdatedOn: string | null;
  status: CustomerStatus;
  callDuration: number | null;
  callTakenBy: string | null;
  callStartTime?: string | null;
  optomCallStartTime?: string | null;
  role?: UserRole;
};

export type AppLayoutProps = {
  consoleLabel?: string;
  children: React.ReactNode;
  activeTab?: 'users' | 'customers' | 'auditLogs';
  setActiveTab?: (tab: 'users' | 'customers' | 'auditLogs') => void;
  onSelectCustomer?: (customerId: string) => void;
  searchValue?: string;
  onSearchChange?: (value: string) => void;
  searchPlaceholder?: string;
};

export type HeaderProps = {
  consoleLabel?: string;
  activeTab?: 'users' | 'customers' | 'auditLogs';
  setActiveTab?: (tab: 'users' | 'customers' | 'auditLogs') => void;
  onSelectCustomer?: (customerId: string) => void;
  searchValue?: string;
  onSearchChange?: (value: string) => void;
  searchPlaceholder?: string;
};

export interface ColumnOption {
  id: string;
  label: string;
  isMandatory?: boolean;
}

export type PaginationBarProps = {
  currentPage: number;
  totalPages: number;
  totalItems: number;
  itemsPerPage: number;
  onPrev: () => void;
  onNext: () => void;
  onItemsPerPageChange?: (size: number) => void;
  columns?: ColumnOption[];
  visibleColumns?: string[];
  onToggleColumn?: (columnId: string) => void;
  onResetColumns?: () => void;
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
  maxDurationSeconds?: number;
  onTimeout?: () => void;
};

export type OptomPatientDetailsProps = {
  selectedCustomer: Customer | null;
  onBack: () => void;
};

export type StorePatientDetailsProps = {
  isAddingNew: boolean;
  selectedCustomer: Customer | null;
  onBack: () => void;
  setSelectedCustomerId: (id: string | null) => void;
  layout?: 'page' | 'sheet';
};

export type StoreRxDetailsProps = {
  selectedCustomer: Customer | null;
  onBack: () => void;
};
