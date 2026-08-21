import type { CustomerInput, SanitizedCustomer } from '../types.js';

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
  if (value === undefined || value === null || value.trim() === '') {
    return { sanitized: undefined, valid: true };
  }

  if (!allowed.includes(value)) {
    return { error: `${fieldName} must be one of: ${allowed.join(', ')}`, valid: false };
  }

  return { sanitized: value, valid: true };
}

function validateString(
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

export function validateCustomerData(
  data: CustomerInput,
  _isUpdate: boolean = false
): CustomerValidationResult {
  const errors: string[] = [];
  const sanitized: Partial<SanitizedCustomer> = {};

  const nameResult = validateName(data.name, 'Name', MAX_CUSTOMER_NAME_LENGTH);

  if (!nameResult.valid) {
    errors.push(nameResult.error!);
  } else {
    sanitized.name = nameResult.sanitized;
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

  const mobileResult = validateMobile(data.mobile);

  if (!mobileResult.valid) {
    errors.push(mobileResult.error!);
  } else {
    sanitized.mobile = mobileResult.sanitized;
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

  const storeFeedbackResult = validateOptionalString(
    data.storeFeedback,
    'Store feedback',
    MAX_FEEDBACK_LENGTH,
    false
  );

  if (!storeFeedbackResult.valid) {
    errors.push(storeFeedbackResult.error!);
  } else {
    sanitized.storeFeedback = storeFeedbackResult.sanitized;
  }

  const optometristFeedbackResult = validateOptionalString(
    data.optometristFeedback,
    'Optometrist feedback',
    MAX_FEEDBACK_LENGTH,
    false
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

  const nonConversionCommentResult = validateOptionalString(
    data.nonConversionComment ?? undefined,
    'Non-conversion comment',
    MAX_COMMENT_LENGTH,
    false
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

  sanitized.activeProfile = data.activeProfile === true || data.activeProfile === 1;
  sanitized.lastUpdatedOn =
    typeof data.lastUpdatedOn === 'string' ? stripHtml(data.lastUpdatedOn).slice(0, MAX_GENERIC_LENGTH) : '';

  sanitized.rxData = data.rxData ?? null;
  sanitized.optometristRxData = data.optometristRxData ?? null;

  sanitized.callStartTime = typeof data.callStartTime === 'string' ? data.callStartTime : null;
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

function validateAge(value: string | undefined): FieldResult {
  if (value === undefined || value.trim() === '') {
    return { error: 'Age is required', valid: false };
  }

  const str = value.trim();
  const num = parseInt(str, 10);

  if (isNaN(num) || num < 0 || num > 120) {
    return { error: 'Age must be a valid number between 0 and 120', valid: false };
  }

  return { sanitized: str, valid: true };
}

function validateEnum(value: string | undefined, fieldName: string, allowed: string[]): FieldResult {
  if (typeof value !== 'string' || !allowed.includes(value)) {
    return { error: `${fieldName} must be one of: ${allowed.join(', ')}`, valid: false };
  }

  return { sanitized: value, valid: true };
}

function validateMobile(value: string | undefined): FieldResult {
  if (typeof value !== 'string' || value.trim() === '') {
    return { error: 'Mobile number is required', valid: false };
  }

  const sanitized = value.trim();

  if (!/^\+?[\d\s\-()]{6,15}$/.test(sanitized)) {
    return { error: 'Mobile number format is invalid', valid: false };
  }

  return { sanitized, valid: true };
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
