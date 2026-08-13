import type { ColumnOption, ManagedUser, UserFormData, UserRole } from '../../../types';

export const USER_TABLE_COLUMNS: ColumnOption[] = [
  { id: 'userId', label: 'User ID' },
  { id: 'name', isMandatory: true, label: 'User Name' },
  { id: 'email', label: 'Email' },
  { id: 'role', label: 'Role' },
  { id: 'mobile', label: 'Mobile' },
  { id: 'lastLogin', label: 'Last Login' },
  { id: 'status', label: 'Status' },
  { id: 'actions', isMandatory: true, label: 'Actions' },
];
export const DEFAULT_USER_COLUMNS = ['userId', 'name', 'email', 'role', 'status', 'actions'];

export const CUSTOMER_TABLE_COLUMNS: ColumnOption[] = [
  { id: 'id', label: 'ID' },
  { id: 'name', isMandatory: true, label: 'Patient Name' },
  { id: 'storeName', label: 'Store Name' },
  { id: 'timeStarted', label: 'Time Started' },
  { id: 'callDuration', label: 'Call Duration' },
  { id: 'ageGender', label: 'Age / Gender' },
  { id: 'mobile', label: 'Mobile' },
  { id: 'status', label: 'Status' },
  { id: 'lastUpdated', label: 'Last Updated' },
  { id: 'report', isMandatory: true, label: 'Report' },
];
export const DEFAULT_CUSTOMER_COLUMNS = ['id', 'name', 'storeName', 'callDuration', 'status', 'report'];

export const AUDIT_LOG_TABLE_COLUMNS: ColumnOption[] = [
  { id: 'id', isMandatory: true, label: 'Log ID' },
  { id: 'timestamp', label: 'Timestamp' },
  { id: 'customerName', label: 'Patient Name' },
  { id: 'customerId', label: 'Patient ID' },
  { id: 'storeName', label: 'Store Name' },
  { id: 'timeStarted', label: 'Time Started' },
  { id: 'callDuration', label: 'Call Duration' },
  { id: 'status', isMandatory: true, label: 'Status' },
  { id: 'performedBy', label: 'Performed By' },
];
export const DEFAULT_AUDIT_LOG_COLUMNS = [
  'id',
  'timestamp',
  'customerName',
  'storeName',
  'status',
  'performedBy',
];

export const FEEDBACK_TABLE_COLUMNS: ColumnOption[] = [
  { id: 'id', label: 'Patient ID' },
  { id: 'name', isMandatory: true, label: 'Patient Name' },
  { id: 'storeName', label: 'Store Name' },
  { id: 'storeContactEmail', label: 'Store Email' },
  { id: 'callTakenBy', label: 'Store Staff / User' },
  { id: 'patientFeedback', isMandatory: true, label: 'Patient Feedback' },
  { id: 'lastUpdated', label: 'Date' },
];
export const DEFAULT_FEEDBACK_COLUMNS = [
  'id',
  'name',
  'storeName',
  'storeContactEmail',
  'callTakenBy',
  'patientFeedback',
  'lastUpdated',
];

export const ROLE_OPTIONS = [
  { label: 'Store', value: 'store' },
  { label: 'Optom', value: 'optom' },
  { label: 'Admin', value: 'admin' },
];

export const EMPTY_FORM: UserFormData = {
  email: '',
  mobile: '',
  name: '',
  password: '',
  role: 'store' as UserRole,
  storeName: '',
};

export function formatSeconds(seconds: number): string {
  if (isNaN(seconds) || seconds <= 0) {
    return '00m:00s';
  }

  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;

  return `${String(mins).padStart(2, '0')}m:${String(secs).padStart(2, '0')}s`;
}

export function getRoleBasedUserId(user: ManagedUser, allUsers: ManagedUser[]): string {
  const sameRoleUsers = [...allUsers]
    .filter((u) => u.role === user.role)
    .sort((a, b) => a.email.localeCompare(b.email));

  const indexInRole = sameRoleUsers.findIndex((u) => u.email === user.email) + 1;
  const numStr = String(indexInRole > 0 ? indexInRole : 1).padStart(3, '0');

  switch (user.role.toLowerCase()) {
    case 'admin':
      return `ADMIN-${numStr}`;
    case 'optom':
      return `OPTOM-${numStr}`;
    case 'store':
      return `STORE-${numStr}`;
    default:
      return `USER-${numStr}`;
  }
}

export function parseTimestamp(val: null | number | string | undefined): number {
  if (!val) {
    return 0;
  }

  if (typeof val === 'number') {
    return val;
  }

  const num = parseInt(val, 10);

  if (!isNaN(num) && String(num).length >= 10) {
    return num;
  }

  const dateMs = new Date(val).getTime();

  return isNaN(dateMs) ? 0 : dateMs;
}
