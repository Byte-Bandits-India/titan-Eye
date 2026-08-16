export interface ApiCustomer {
  activeProfile: boolean;
  age: string;
  callActive: boolean;
  callDuration: number;
  callStartTime: null | string;
  callTakenBy: null | string;
  createdOn: null | string;
  customerType: string;
  gender: string;
  id: string;
  lastUpdatedOn: null | string;
  mobile: string;
  name: string;
  optometristCallStartTime: null | string;
  optometristFeedback: string;
  optometristRxData: CustomerOptometristRxData | undefined;
  patientFeedback: null | string;
  preferredLanguage: string;
  preferredLanguage2: string;
  rxData: CustomerRxData | undefined;
  status: string;
  storeContactEmail: null | string;
  storeFeedback: string;
  storeName: string;
}

export interface AuthUserResponse {
  email: string;
  microsoftUpn?: null | string;
  mobile?: null | string;
  name: string;
  role: string;
  storeName?: null | string;
}

export interface CustomerInput {
  activeProfile?: boolean | number;
  age?: string;
  callActive?: boolean | number;
  callDuration?: number;
  callStartTime?: null | string;
  callTakenBy?: null | string;
  customerType?: string;
  gender?: string;
  id?: string;
  lastUpdatedOn?: string;
  mobile?: string;
  name?: string;
  optometristCallStartTime?: null | string;
  optometristFeedback?: string;
  optometristRxData?: CustomerOptometristRxData | null;
  preferredLanguage?: string;
  preferredLanguage2?: string;
  rxData?: CustomerRxData | null;
  status?: string;
  storeFeedback?: string;
  storeName?: string;
}

export interface CustomerOptometristRxData {
  le: OptometristRxValues;
  re: OptometristRxValues;
}

export interface CustomerRxData {
  autoRefLe: RxValues;
  autoRefRe: RxValues;
  pgpLe: RxValues;
  pgpRe: RxValues;
}

export interface ErrorResponse {
  details?: string[];
  error: string;
}

export interface ManagedUserResponse {
  city: null | string;
  email: string;
  isLoggedIn?: boolean;
  languages: null | string[];
  lastLogin: null | string;
  location: null | string;
  mobile: null | string;
  name: string;
  role: string;
  status: string;
  storeName: null | string;
}

export interface OptometristRxValues {
  add: string;
  axis: string;
  base: string;
  cyl: string;
  prism: string;
  sph: string;
  va: string;
}

export interface RxValues {
  add: string;
  axis: string;
  base: string;
  cyl: string;
  pd: string;
  prism: string;
  sph: string;
}

export interface SanitizedCustomer {
  activeProfile: boolean;
  age: string;
  callActive: boolean;
  callDuration: number;
  callStartTime: null | string;
  callTakenBy: null | string;
  customerType: string;
  gender: string;
  lastUpdatedOn: string;
  mobile: string;
  name: string;
  optometristCallStartTime?: null | string;
  optometristFeedback: string;
  optometristRxData: CustomerOptometristRxData | null;
  preferredLanguage: string;
  preferredLanguage2: string;
  rxData: CustomerRxData | null;
  status: string;
  storeFeedback: string;
  storeName: string;
}

export interface WebhookCallEventBody {
  eventType?: string;
  id?: string;
  user?: string;
}
