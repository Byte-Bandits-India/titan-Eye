import * as React from 'react';
export type { DateFilterRange } from '../utils/dateFilter';

export type AdminTab = 'auditLogs' | 'customers' | 'feedback' | 'users' | 'videos';
export type FeedbackFilterTab = 'all' | 'optometrist' | 'patient' | 'store';

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
  optometristCallStartTime?: null | string;
  role?: UserRole;
  status: CustomerStatus;
  storeName?: string;
};

export type ManagedVideo = {
  id: number;
  mimeType: null | string;
  originalName: null | string;
  size: null | number;
  sourceType: 'upload' | 'youtube';
  storedName: null | string;
  title: string;
  uploadedAt: string;
  uploadedBy: string;
  youtubeUrl: null | string;
};

export type AuthState = {
  authChecked: boolean;
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
  city?: string;
  email: string;
  languages?: string[];
  location?: string;
  mobile?: string;
  name?: string;
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
  cancellationReason?: null | string;
  conversionStatus?: null | string;
  createdOn?: null | string;
  customerType: string;
  gender: string;
  id: string;
  isPriority?: boolean;
  lastUpdatedOn?: string;
  mobile: string;
  name: string;
  nonConversionComment?: null | string;
  nonConversionReason?: null | string;
  offeredToOptometristEmail?: null | string;
  optometristCallStartTime?: null | string;
  optometristFeedback?: string;
  optometristRxData?: {
    le: OptometristRxValues;
    re: OptometristRxValues;
  };
  orderDate?: null | string;
  patientFeedback?: null | string;
  preferredLanguage: string;
  preferredLanguage2: string;
  queuePosition?: null | number;
  rxData?: {
    autoRefLe: RxValues;
    autoRefRe: RxValues;
    pgpLe: RxValues;
    pgpRe: RxValues;
  };
  salesOrderNumber?: null | string;
  status: CustomerStatus;
  storeContactEmail?: null | string;
  storeFeedback: string;
  storeFeedbackImage1?: null | string;
  storeFeedbackImage2?: null | string;
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

export type CustomerStatus =
  | 'Accepted'
  | 'Cancelled'
  | 'Closed'
  | 'Completed'
  | 'Created'
  | 'Drop'
  | 'Initiated'
  | 'Queued'
  | 'Test Completed'
  | 'Testing';

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

export type LogNotificationType =
  | 'assessment_accepted'
  | 'assessment_complete'
  | 'call_closed'
  | 'call_ended'
  | 'call_initiated'
  | 'no_optometrist_available'
  | 'optometrist_available'
  | 'patient_registered';

export type ManagedUser = {
  city?: null | string;
  email: string;
  isLoggedIn?: boolean;
  languages?: null | string[];
  lastLogin?: null | string;
  location?: null | string;
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

export type NoOptometristEventPayload = {
  customerId: string;
  customerName: string;
  storeName: null | string;
};

export type NotificationPopoverProps = {
  autoOpen?: boolean;
  onSelectCustomer?: (customerId: string) => void;
  showTrigger?: boolean;
  trigger?: React.ReactNode;
  variant?: 'drawer' | 'popover' | 'toast';
};

export type OptometristPatientDetailsProps = {
  activeCallTakenByMe?: Customer | null;
  onBack: () => void;
  readOnly?: boolean;
  selectedCustomer: Customer | null;
};

export type OptometristRxValues = CommonRxValues & {
  va: string;
};

export type OptometristUserAvailability = {
  badgeClass: string;
  dotClass: string;
  ping: boolean;
  statusLabel: string;
};

export type OptometristUserRow = ManagedUser & {
  activeCall: Customer | null;
  avail: OptometristUserAvailability;
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

export type CallSessionPayload = {
  acsEndpoint: string;
  acsToken: string;
  acsUserId: string;
  customerId: string;
  displayName: string;
  groupId?: string;
  meetingUrl?: string;
  role: 'optometrist' | 'store';
};

export type SSEEventDetail =
  | {
      data: Customer;
      type: 'ADMIN_LOG_CREATED' | 'USER_CREATED' | 'USER_DELETED' | 'USER_STATUS_CHANGE' | 'USER_UPDATED';
    }
  | { data: Customer; type: 'CUSTOMER_CREATED' | 'CUSTOMER_UPDATED' }
  | { data: { id: string }; type: 'CUSTOMER_DELETED' }
  | { data: NoOptometristEventPayload; type: 'NO_OPTOMETRIST_AVAILABLE' | 'OPTOMETRIST_NO_RESPONSE' }
  | { data: CallSessionPayload; type: 'CALL_SESSION_READY' }
  | { data: { customerId: string }; type: 'CALL_SESSION_ENDED' }
  | { data: { videoId: null | number }; type: 'TVMODE_VIDEO_CHANGED' };

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

export type StoreCustomerTestPageProps = {
  onBack: () => void;
  selectedCustomer: Customer | null;
  setSelectedCustomerId: (id: null | string) => void;
};

export type StoreUpdateStatusPageProps = {
  onBack: () => void;
  readOnly?: boolean;
  selectedCustomer: Customer | null;
};

export type TabCounts = {
  all: number;
  completed: number;
  inProgress: number;
  pending: number;
};

export type UpdateUserPayload = {
  city?: string;
  languages?: string[];
  location?: string;
  mobile?: string;
  name?: string;
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
  city: string;
  email: string;
  languages: string[];
  location: string;
  mobile: string;
  name: string;
  password: string;
  role: UserRole;
  storeName: string;
};

export type UserRole = 'admin' | 'optometrist' | 'store';

export type UserState = {
  error: null | string;
  loading: boolean;
  users: ManagedUser[];
};
