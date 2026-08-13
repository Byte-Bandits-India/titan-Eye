import * as React from 'react';
export type { DateFilterRange } from '../utils/dateFilter';

// ─── Admin Tab ────────────────────────────────────────────────────────────────
export type AdminTab = 'auditLogs' | 'customers' | 'users';

export type AppLayoutProps = {
  activeTab?: AdminTab;
  children: React.ReactNode;
  consoleLabel?: string;
  onSearchChange?: (value: string) => void;
  onSelectCustomer?: (customerId: string) => void;
  searchPlaceholder?: string;
  searchValue?: string;
  setActiveTab?: (tab: AdminTab) => void;
};

export type AuditLog = {
  callActive?: boolean;
  callDuration: null | number;
  callStartTime?: null | string;
  callTakenBy: null | string;
  customerId: string;
  customerName?: string;
  id: number | string;
  lastUpdatedOn: null | string;
  optomCallStartTime?: null | string;
  role?: UserRole;
  status: CustomerStatus;
  storeName?: string;
};

export type AuthState = {
  error: null | string;
  isAuthenticated: boolean;
  loading: boolean;
  user: null | User;
};

export type CallTimerProps = {
  active?: boolean;
  maxDurationSeconds?: number;
  onTimeout?: () => void;
  startTime?: string;
};

export type CollisionData = {
  id: string;
  name: string;
  takenBy: string;
  targetView?: 'info' | 'rx';
};

// ─── Optom Screen ─────────────────────────────────────────────────────────────
export type CollisionModalData = {
  id: string;
  name: string;
  takenBy: string;
};

export type CollisionModalProps = {
  onCancel: () => void;
  onViewData: () => void;
  takenBy: string;
};

export interface ColumnOption {
  id: string;
  isMandatory?: boolean;
  label: string;
}

export type CommonRxValues = {
  add: string;
  axis: string;
  base: string;
  cyl: string;
  prism: string;
  sph: string;
};

export type CreateUserPayload = {
  email: string;
  mobile?: string;
  name: string;
  password: string;
  role: UserRole;
  storeName?: string;
};

export type Customer = {
  activeProfile: boolean;
  age: string;
  callActive?: boolean;
  callDuration?: number;
  callStartTime?: null | string;
  callTakenBy?: null | string;
  createdOn?: null | string;
  customerType: string;
  gender: string;
  id: string;
  lastUpdatedOn?: string;
  mobile: string;
  name: string;
  offeredToOptomEmail?: null | string;
  optomCallStartTime?: null | string;
  optomFeedback?: string;
  optomRxData?: {
    le: OptomRxValues;
    re: OptomRxValues;
  };
  patientFeedback?: null | string;
  preferredLanguage: string;
  preferredLanguage2: string;
  rxData?: {
    autoRefLe: RxValues;
    autoRefRe: RxValues;
    pgpLe: RxValues;
    pgpRe: RxValues;
  };
  status: CustomerStatus;
  storeContactEmail?: null | string;
  storeFeedback: string;
  storeName: string;
};

export type CustomerLog = {
  callDuration: null | number;
  callTakenBy: null | string;
  customerId: string;
  id: number;
  lastUpdatedOn: null | string;
  status: CustomerStatus;
};

export type CustomerState = {
  customers: Customer[];
  error: null | string;
  loading: boolean;
};

export type CustomerStatus = 'Accepted' | 'Closed' | 'Completed' | 'Created' | 'Initiated';

// ─── Admin Screen ─────────────────────────────────────────────────────────────
export type CustomerStatusTab = 'all' | 'Completed' | 'InProgress' | 'Pending';

export type CustomerTabCounts = {
  all: number;
  completed: number;
  inProgress: number;
  pending: number;
};

export type HeaderProps = {
  activeTab?: AdminTab;
  consoleLabel?: string;
  onSearchChange?: (value: string) => void;
  onSelectCustomer?: (customerId: string) => void;
  searchPlaceholder?: string;
  searchValue?: string;
  setActiveTab?: (tab: AdminTab) => void;
};

export type LoginResponse = {
  user: User;
};

export type LogNotification = {
  customerId?: string;
  description: string;
  id: string;
  timestamp: number;
  title: string;
  type: LogNotificationType;
};

// ─── Notification Log ─────────────────────────────────────────────────────────
export type LogNotificationType =
  | 'assessment_accepted'
  | 'assessment_complete'
  | 'call_closed'
  | 'call_ended'
  | 'call_initiated'
  | 'no_optom_available'
  | 'optom_available'
  | 'patient_registered';

export type ManagedUser = {
  email: string;
  isLoggedIn?: boolean;
  lastLogin?: null | string;
  microsoftUpn?: null | string;
  mobile?: null | string;
  name: string;
  role: UserRole;
  status: 'active' | 'inactive';
  storeName?: null | string;
};

export type NetworkStatus = {
  speed: string;
  statusColor: string;
  statusLabel: string;
  wifiIconColor: string;
};

// ─── SSE Events ───────────────────────────────────────────────────────────────
export type NoOptomEventPayload = {
  customerId: string;
  customerName: string;
  storeName: null | string;
};

// ─── Notification Popover ─────────────────────────────────────────────────────
export type NotificationPopoverProps = {
  autoOpen?: boolean;
  onSelectCustomer?: (customerId: string) => void;
  trigger?: React.ReactNode;
  variant?: 'drawer' | 'popover';
};

export type OptomPatientDetailsProps = {
  onBack: () => void;
  selectedCustomer: Customer | null;
};

export type OptomRxValues = CommonRxValues & {
  va: string;
};

export type OptomUserAvailability = {
  badgeClass: string;
  dotClass: string;
  ping: boolean;
  statusLabel: string;
};

export type OptomUserRow = ManagedUser & {
  activeCall: Customer | null;
  avail: OptomUserAvailability;
};

export type PaginationBarProps = {
  columns?: ColumnOption[];
  currentPage: number;
  itemsPerPage: number;
  onItemsPerPageChange?: (size: number) => void;
  onNext: () => void;
  onPrev: () => void;
  onResetColumns?: () => void;
  onToggleColumn?: (columnId: string) => void;
  totalItems: number;
  totalPages: number;
  visibleColumns?: string[];
};

export type ProtectedRouteProps = RouteProps & {
  allowedRole: UserRole;
};

export type RouteProps = {
  children: React.ReactElement;
};

export type RxValues = CommonRxValues & {
  pd: string;
};

export type Session = {
  isAuthenticated: boolean;
  user: null | User;
};

export type SSEEventDetail =
  | {
      data: Customer;
      type: 'ADMIN_LOG_CREATED' | 'USER_CREATED' | 'USER_DELETED' | 'USER_STATUS_CHANGE' | 'USER_UPDATED';
    }
  | { data: Customer; type: 'CUSTOMER_CREATED' | 'CUSTOMER_UPDATED' }
  | { data: NoOptomEventPayload; type: 'NO_OPTOM_AVAILABLE' | 'OPTOM_NO_RESPONSE' };

export type StatsGridProps = {
  customers: Customer[];
};

// ─── Store Screen ─────────────────────────────────────────────────────────────
export type StatusTab = 'all' | 'Completed' | 'InProgress' | 'Pending';

export type StorePatientDetailsProps = {
  isAddingNew: boolean;
  layout?: 'page' | 'sheet';
  onBack: () => void;
  selectedCustomer: Customer | null;
  setSelectedCustomerId: (id: null | string) => void;
};

export type StoreRxDetailsProps = {
  onBack: () => void;
  selectedCustomer: Customer | null;
};

export type TabCounts = {
  all: number;
  completed: number;
  inProgress: number;
  pending: number;
};

export type UpdateUserPayload = {
  mobile?: string;
  name: string;
  password?: string;
  role: UserRole;
  storeName?: string;
};

export type UseFullscreenReturn = {
  isFullscreen: boolean;
  toggleFullscreen: () => void;
};

export type UsePaginationReturn<T> = {
  currentPage: number;
  goToPage: (page: number) => void;
  nextPage: () => void;
  paginatedItems: T[];
  prevPage: () => void;
  resetPage: () => void;
  totalItems: number;
  totalPages: number;
};

export type User = {
  email: string;
  microsoftUpn?: null | string;
  mobile?: null | string;
  name: string;
  role: UserRole;
  storeName?: null | string;
};

export type UserFormData = {
  email: string;
  mobile: string;
  name: string;
  password: string;
  role: UserRole;
  storeName: string;
};

export type UserRole = 'admin' | 'optom' | 'store';

export type UserState = {
  error: null | string;
  loading: boolean;
  users: ManagedUser[];
};
