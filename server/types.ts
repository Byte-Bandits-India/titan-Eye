export interface RxValues {
  sph: string;
  cyl: string;
  axis: string;
  pd: string;
  prism: string;
  base: string;
  add: string;
}

export interface OptumRxValues {
  sph: string;
  cyl: string;
  axis: string;
  prism: string;
  base: string;
  va: string;
  add: string;
}

export interface CustomerRxData {
  autoRefRe: RxValues;
  autoRefLe: RxValues;
  pgpRe: RxValues;
  pgpLe: RxValues;
}

export interface CustomerOptumRxData {
  re: OptumRxValues;
  le: OptumRxValues;
}

export interface CustomerInput {
  id?: string;
  name?: string;
  age?: string;
  gender?: string;
  mobile?: string;
  customerType?: string;
  storeName?: string;
  preferredLanguage?: string;
  preferredLanguage2?: string;
  storeFeedback?: string;
  optumFeedback?: string;
  status?: string;
  activeProfile?: boolean | number;
  lastUpdatedOn?: string;
  rxData?: CustomerRxData | null;
  optumRxData?: CustomerOptumRxData | null;
  callStartTime?: string | null;
  callActive?: boolean | number;
  callTakenBy?: string | null;
  callDuration?: number;
}

export interface SanitizedCustomer {
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
  status: string;
  activeProfile: boolean;
  lastUpdatedOn: string;
  rxData: CustomerRxData | null;
  optumRxData: CustomerOptumRxData | null;
  callStartTime: string | null;
  callActive: boolean;
  callTakenBy: string | null;
  callDuration: number;
}

export interface WebhookCallEventBody {
  id?: string;
  eventType?: string;
  user?: string;
}

export interface ErrorResponse {
  error: string;
  details?: string[];
}

export interface AuthUserResponse {
  email: string;
  name: string;
  role: string;
  storeName?: string | null;
  mobile?: string | null;
  microsoftUpn?: string | null;
  token: string;
}

export interface ApiCustomer {
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
  status: string;
  activeProfile: boolean;
  lastUpdatedOn: string | null;
  rxData: CustomerRxData | undefined;
  optumRxData: CustomerOptumRxData | undefined;
  callStartTime: string | null;
  callActive: boolean;
  callTakenBy: string | null;
  callDuration: number;
}

export interface ManagedUserResponse {
  email: string;
  name: string;
  role: string;
  storeName: string | null;
  mobile: string | null;
  lastLogin: string | null;
  status: string;
}
