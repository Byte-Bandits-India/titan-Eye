import type { CustomerInput, SanitizedCustomer } from '../types.js';
import { containsScriptOrInjection, sanitizeClinicalText } from './inputSanitizer.js';

const MAX_NAME_LENGTH = 100;
const MAX_CUSTOMER_NAME_LENGTH = 20;
const MAX_FEEDBACK_LENGTH = 2000;
const MAX_GENERIC_LENGTH = 200;
const MAX_STORE_CODE_LENGTH = 4;
const MAX_COMMENT_LENGTH = 500;

const VALID_GENDERS = ['Male', 'Female', 'Other'];
const VALID_CUSTOMER_TYPES = ['New', 'Existing', 'VIP'];
const VALID_STATUSES = [
  'Created',
  'Queued',
  'Initiated',
  'Testing',
  'Accepted',
  'Test Completed',
  'TestCompleted',
  'Completed',
  'Cancelled',
  'Closed',
  'Drop',
];
const VALID_CONVERSION_STATUSES = ['Converted', 'Not Converted'];
const VALID_NON_CONVERSION_REASONS = [
  'Price is high',
  'Prescription not suitable',
  'Customer will buy later',
  'Product not available in store',
  'Customer not interested',
  'Already purchased elsewhere',
  'Need more time to decide',
  'Other (Please specify)',
];

interface FieldResult {
  error?: string;
  sanitized?: string;
  valid: boolean;
}

function stripHtml(input: string): string {
  return input.replace(/<[^>]*>/g, '').trim();
}

function validateOptionalString(
  value: string | undefined,
  fieldName: string,
  maxLength: number,
  strip: boolean = true
): FieldResult {
  if (value === undefined || (typeof value === 'string' && value.trim() === '')) {
    return { sanitized: '', valid: true };
  }

  return validateString(value, fieldName, maxLength, strip);
}

function validateOptionalEnum(
  value: null | string | undefined,
  fieldName: string,
  allowed: string[]
): FieldResult {
  if (value === undefined || value === null || (typeof value === 'string' && value.trim() === '')) {
    return { sanitized: undefined, valid: true };
  }

  if (typeof value !== 'string') {
    return { error: `${fieldName} must be a string`, valid: false };
  }

  if (!allowed.includes(value)) {
    return { error: `${fieldName} must be one of: ${allowed.join(', ')}`, valid: false };
  }

  return { sanitized: value, valid: true };
}

export function validateString(
  value: string | undefined,
  fieldName: string,
  maxLength: number,
  strip: boolean = true
): FieldResult {
  if (value === undefined || (typeof value === 'string' && value.trim() === '')) {
    return { error: `${fieldName} is required`, valid: false };
  }

  if (typeof value !== 'string') {
    return { error: `${fieldName} must be a string`, valid: false };
  }

  if (containsScriptOrInjection(value)) {
    return { error: `${fieldName} contains prohibited special characters or script tags`, valid: false };
  }

  const sanitized = strip ? stripHtml(value) : value.trim();

  if (sanitized.length === 0) {
    return { error: `${fieldName} cannot be empty after sanitization`, valid: false };
  }

  if (sanitized.length > maxLength) {
    return { error: `${fieldName} must be at most ${maxLength} characters`, valid: false };
  }

  return { sanitized, valid: true };
}

const SAFE_NAME_REGEX = /^[A-Za-z][A-Za-z\s.\-']*$/;

export interface CustomerValidationResult {
  errors: string[];
  sanitized: Partial<SanitizedCustomer>;
  valid: boolean;
}

function validateRxObject(rx: unknown, fieldName: string): { valid: boolean; error?: string; sanitized?: any } {
  if (rx === undefined || rx === null || rx === '') {
    return { sanitized: null, valid: true };
  }
  let parsed = rx;
  if (typeof rx === 'string') {
    try {
      parsed = JSON.parse(rx);
    } catch {
      return { error: `${fieldName} must be valid JSON`, valid: false };
    }
  }
  if (typeof parsed !== 'object' || Array.isArray(parsed)) {
    return { error: `${fieldName} must be an object`, valid: false };
  }
  const str = JSON.stringify(parsed);
  if (str.length > 8192) {
    return { error: `${fieldName} exceeds maximum size of 8KB`, valid: false };
  }
  if (/("__proto__"|"constructor"|"prototype")/i.test(str)) {
    return { error: `${fieldName} contains forbidden properties`, valid: false };
  }
  return { sanitized: parsed, valid: true };
}

export function validateCustomerData(
  data: CustomerInput,
  _isUpdate: boolean = false
): CustomerValidationResult {
  const errors: string[] = [];
  const sanitized: Partial<SanitizedCustomer> = {};

  // N10 Remediation: Strictly validate firstName and lastName to neutralize XSS (<svg/onload=alert(1)>)
  if (data.firstName !== undefined && data.firstName !== null && String(data.firstName).trim() !== '') {
    const fnResult = validateName(String(data.firstName), 'First name', MAX_CUSTOMER_NAME_LENGTH);
    if (!fnResult.valid) {
      errors.push(fnResult.error!);
    } else {
      sanitized.firstName = fnResult.sanitized;
    }
  }

  if (data.lastName !== undefined && data.lastName !== null && String(data.lastName).trim() !== '') {
    const lnResult = validateName(String(data.lastName), 'Last name', MAX_CUSTOMER_NAME_LENGTH);
    if (!lnResult.valid) {
      errors.push(lnResult.error!);
    } else {
      sanitized.lastName = lnResult.sanitized;
    }
  }

  if (!data.name) {
    data.name = [sanitized.firstName || '', sanitized.lastName || ''].filter(Boolean).join(' ');
  }

  const nameResult = validateName(data.name, 'Name', MAX_CUSTOMER_NAME_LENGTH * 2);

  if (!nameResult.valid) {
    errors.push(nameResult.error!);
  } else {
    sanitized.name = nameResult.sanitized;
    const parts = (sanitized.name || '').split(/\s+/);
    if (!sanitized.firstName) {
      sanitized.firstName = parts[0] || '';
    }
    if (!sanitized.lastName) {
      sanitized.lastName = parts.slice(1).join(' ') || '';
    }
  }

  const ageResult = validateAge(data.age);

  if (!ageResult.valid) {
    errors.push(ageResult.error!);
  } else {
    sanitized.age = ageResult.sanitized;
  }

  const genderResult = validateEnum(data.gender, 'Gender', VALID_GENDERS);

  if (!genderResult.valid) {
    errors.push(genderResult.error!);
  } else {
    sanitized.gender = genderResult.sanitized;
  }


  const customerTypeResult = validateEnum(data.customerType, 'Customer type', VALID_CUSTOMER_TYPES);

  if (!customerTypeResult.valid) {
    errors.push(customerTypeResult.error!);
  } else {
    sanitized.customerType = customerTypeResult.sanitized;
  }

  const storeNameResult = validateString(data.storeName, 'Store code', MAX_STORE_CODE_LENGTH);

  if (!storeNameResult.valid) {
    errors.push(storeNameResult.error!);
  } else {
    sanitized.storeName = storeNameResult.sanitized;
  }

  const langResult = validateString(data.preferredLanguage, 'Preferred language', MAX_GENERIC_LENGTH);

  if (!langResult.valid) {
    errors.push(langResult.error!);
  } else {
    sanitized.preferredLanguage = langResult.sanitized;
  }

  const lang2Result = validateOptionalString(
    data.preferredLanguage2,
    'Preferred language 2',
    MAX_GENERIC_LENGTH
  );

  if (!lang2Result.valid) {
    errors.push(lang2Result.error!);
  } else {
    sanitized.preferredLanguage2 = lang2Result.sanitized;
  }

  const storeFeedbackResult = sanitizeClinicalText(
    data.storeFeedback,
    'Store feedback',
    MAX_FEEDBACK_LENGTH
  );

  if (!storeFeedbackResult.valid) {
    errors.push(storeFeedbackResult.error!);
  } else {
    sanitized.storeFeedback = storeFeedbackResult.sanitized;
  }

  const optometristFeedbackResult = sanitizeClinicalText(
    data.optometristFeedback,
    'Optometrist feedback',
    MAX_FEEDBACK_LENGTH
  );

  if (!optometristFeedbackResult.valid) {
    errors.push(optometristFeedbackResult.error!);
  } else {
    sanitized.optometristFeedback = optometristFeedbackResult.sanitized;
  }

  const statusResult = validateEnum(data.status, 'Status', VALID_STATUSES);

  if (!statusResult.valid) {
    errors.push(statusResult.error!);
  } else {
    sanitized.status = statusResult.sanitized;
  }

  const conversionStatusResult = validateOptionalEnum(
    data.conversionStatus,
    'Conversion status',
    VALID_CONVERSION_STATUSES
  );

  if (!conversionStatusResult.valid) {
    errors.push(conversionStatusResult.error!);
  } else {
    sanitized.conversionStatus = conversionStatusResult.sanitized ?? null;
  }

  const nonConversionReasonResult = validateOptionalEnum(
    data.nonConversionReason,
    'Non-conversion reason',
    VALID_NON_CONVERSION_REASONS
  );

  if (!nonConversionReasonResult.valid) {
    errors.push(nonConversionReasonResult.error!);
  } else {
    sanitized.nonConversionReason = nonConversionReasonResult.sanitized ?? null;
  }

  const nonConversionCommentResult = sanitizeClinicalText(
    data.nonConversionComment ?? undefined,
    'Non-conversion comment',
    MAX_COMMENT_LENGTH
  );

  if (!nonConversionCommentResult.valid) {
    errors.push(nonConversionCommentResult.error!);
  } else {
    sanitized.nonConversionComment = nonConversionCommentResult.sanitized || null;
  }

  const salesOrderNumberResult = validateOptionalString(
    data.salesOrderNumber ?? undefined,
    'Sales order number',
    MAX_GENERIC_LENGTH
  );

  if (!salesOrderNumberResult.valid) {
    errors.push(salesOrderNumberResult.error!);
  } else {
    sanitized.salesOrderNumber = salesOrderNumberResult.sanitized || null;
  }

  const orderDateResult = validateOptionalString(
    data.orderDate ?? undefined,
    'Order date',
    MAX_GENERIC_LENGTH
  );

  if (!orderDateResult.valid) {
    errors.push(orderDateResult.error!);
  } else {
    sanitized.orderDate = orderDateResult.sanitized || null;
  }

  const cancellationReasonResult = sanitizeClinicalText(
    data.cancellationReason ?? undefined,
    'Cancellation reason',
    MAX_FEEDBACK_LENGTH
  );

  if (!cancellationReasonResult.valid) {
    errors.push(cancellationReasonResult.error!);
  } else {
    sanitized.cancellationReason = cancellationReasonResult.sanitized || null;
  }

  sanitized.activeProfile = data.activeProfile === true || data.activeProfile === 1;

  // N11 Remediation: Validate lastUpdatedOn format
  if (data.lastUpdatedOn !== undefined && data.lastUpdatedOn !== null) {
    const updatedStr = stripHtml(String(data.lastUpdatedOn)).trim();
    sanitized.lastUpdatedOn = updatedStr.slice(0, 50);
  } else {
    sanitized.lastUpdatedOn = '';
  }

  // N11 Remediation: Validate rxData and optometristRxData JSON structure & size
  const rxResult = validateRxObject(data.rxData, 'rxData');
  if (!rxResult.valid) {
    errors.push(rxResult.error!);
  } else {
    sanitized.rxData = rxResult.sanitized;
  }

  const optomRxResult = validateRxObject(data.optometristRxData, 'optometristRxData');
  if (!optomRxResult.valid) {
    errors.push(optomRxResult.error!);
  } else {
    sanitized.optometristRxData = optomRxResult.sanitized;
  }

  // N11 Remediation: Validate callStartTime format
  if (data.callStartTime !== undefined && data.callStartTime !== null) {
    const startStr = String(data.callStartTime).trim();
    if (startStr === '') {
      sanitized.callStartTime = null;
    } else if (/^[0-9]{1,16}$/.test(startStr) || !isNaN(Date.parse(startStr))) {
      sanitized.callStartTime = startStr.slice(0, 50);
    } else {
      errors.push('callStartTime must be a valid timestamp or numeric string');
    }
  } else {
    sanitized.callStartTime = null;
  }

  // N11 Remediation: Validate lastUpdatedOn format
  if (data.lastUpdatedOn !== undefined && data.lastUpdatedOn !== null) {
    const updatedStr = String(data.lastUpdatedOn).trim();
    if (updatedStr === '') {
      sanitized.lastUpdatedOn = undefined;
    } else if (updatedStr.length <= 50 && (!isNaN(Date.parse(updatedStr)) || /^[A-Za-z0-9,:\s\-]+$/.test(updatedStr))) {
      sanitized.lastUpdatedOn = updatedStr;
    } else {
      errors.push('lastUpdatedOn must be a valid date or timestamp string');
    }
  }

  sanitized.callActive = data.callActive === true || data.callActive === 1;

  if (typeof data.callTakenBy === 'string') {
    const stripped = stripHtml(data.callTakenBy).slice(0, MAX_NAME_LENGTH);
    sanitized.callTakenBy = SAFE_NAME_REGEX.test(stripped) ? stripped : null;
  } else {
    sanitized.callTakenBy = null;
  }

  sanitized.callDuration =
    typeof data.callDuration === 'number' ? data.callDuration : parseInt(String(data.callDuration), 10) || 0;

  return {
    errors,
    sanitized,
    valid: errors.length === 0,
  };
}

function validateAge(value: unknown): FieldResult {
  if (value === undefined || value === null) {
    return { error: 'Age is required', valid: false };
  }

  const str = String(value).trim();
  if (str === '') {
    return { error: 'Age is required', valid: false };
  }

  const num = parseInt(str, 10);

  if (isNaN(num) || num < 1 || num > 120) {
    return { error: 'Age must be a valid number between 1 and 120', valid: false };
  }

  return { sanitized: str, valid: true };
}

function validateEnum(value: string | undefined, fieldName: string, allowed: string[]): FieldResult {
  if (typeof value !== 'string' || !allowed.includes(value)) {
    return { error: `${fieldName} must be one of: ${allowed.join(', ')}`, valid: false };
  }

  return { sanitized: value, valid: true };
}



function validateName(value: string | undefined, fieldName: string, maxLength: number): FieldResult {
  const base = validateString(value, fieldName, maxLength);

  if (!base.valid) {
    return base;
  }

  if (!SAFE_NAME_REGEX.test(base.sanitized!)) {
    return {
      error: `${fieldName} contains invalid characters. Only letters, spaces, hyphens, periods, and apostrophes are allowed.`,
      valid: false,
    };
  }

  return base;
}
