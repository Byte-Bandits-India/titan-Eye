/**
 * Input validation utilities for customer data.
 * Prevents stored XSS, enforces field constraints, and ensures data integrity.
 */

const MAX_NAME_LENGTH = 100;
const MAX_MOBILE_LENGTH = 15;
const MAX_FEEDBACK_LENGTH = 2000;
const MAX_GENERIC_LENGTH = 200;

const VALID_GENDERS = ['Male', 'Female', 'Other'];
const VALID_CUSTOMER_TYPES = ['Walk-in', 'Appointment', 'Online', 'Referral', 'Follow-up'];
const VALID_STATUSES = ['Pending', 'Accepted', 'Initiated', 'Completed', 'Cancelled'];

/** Strip HTML tags from a string to prevent stored XSS */
function stripHtml(input: string): string {
  return input.replace(/<[^>]*>/g, '').trim();
}

/** Validate a string field: non-empty, max length, stripped of HTML */
function validateString(value: unknown, fieldName: string, maxLength: number): { valid: boolean; error?: string; sanitized?: string } {
  if (value === undefined || value === null || (typeof value === 'string' && value.trim() === '')) {
    return { valid: false, error: `${fieldName} is required` };
  }
  if (typeof value !== 'string') {
    return { valid: false, error: `${fieldName} must be a string` };
  }
  const sanitized = stripHtml(value);
  if (sanitized.length === 0) {
    return { valid: false, error: `${fieldName} cannot be empty after sanitization` };
  }
  if (sanitized.length > maxLength) {
    return { valid: false, error: `${fieldName} must be at most ${maxLength} characters` };
  }
  return { valid: true, sanitized };
}

/** Validate an optional string field: allowed to be empty/null, but if present must be valid */
function validateOptionalString(value: unknown, fieldName: string, maxLength: number): { valid: boolean; error?: string; sanitized?: string } {
  if (value === undefined || value === null || (typeof value === 'string' && value.trim() === '')) {
    return { valid: true, sanitized: '' };
  }
  return validateString(value, fieldName, maxLength);
}

/** Validate mobile number: digits, optional + prefix, bounded length */
function validateMobile(value: unknown): { valid: boolean; error?: string; sanitized?: string } {
  if (typeof value !== 'string' || value.trim() === '') {
    return { valid: false, error: 'Mobile number is required' };
  }
  const sanitized = value.trim();
  if (!/^\+?[\d\s\-()]{6,15}$/.test(sanitized)) {
    return { valid: false, error: 'Mobile number format is invalid' };
  }
  return { valid: true, sanitized };
}

/** Validate age: must be a reasonable numeric string */
function validateAge(value: unknown): { valid: boolean; error?: string; sanitized?: string } {
  if (value === undefined || value === null || (typeof value === 'string' && value.trim() === '')) {
    return { valid: false, error: 'Age is required' };
  }
  const str = String(value).trim();
  const num = parseInt(str, 10);
  if (isNaN(num) || num < 0 || num > 150) {
    return { valid: false, error: 'Age must be a valid number between 0 and 150' };
  }
  return { valid: true, sanitized: str };
}

/** Validate against an allowlist */
function validateEnum(value: unknown, fieldName: string, allowed: string[]): { valid: boolean; error?: string; sanitized?: string } {
  if (typeof value !== 'string' || !allowed.includes(value)) {
    return { valid: false, error: `${fieldName} must be one of: ${allowed.join(', ')}` };
  }
  return { valid: true, sanitized: value };
}

export interface CustomerValidationResult {
  valid: boolean;
  errors: string[];
  sanitized: Record<string, any>;
}

/**
 * Validate and sanitize a customer data payload.
 * Returns sanitized data if valid, or a list of errors if not.
 */
export function validateCustomerData(data: Record<string, any>, isUpdate: boolean = false): CustomerValidationResult {
  const errors: string[] = [];
  const sanitized: Record<string, any> = {};

  // Required string fields
  const nameResult = validateString(data.name, 'Name', MAX_NAME_LENGTH);
  if (!nameResult.valid) errors.push(nameResult.error!);
  else sanitized.name = nameResult.sanitized;

  const ageResult = validateAge(data.age);
  if (!ageResult.valid) errors.push(ageResult.error!);
  else sanitized.age = ageResult.sanitized;

  const genderResult = validateEnum(data.gender, 'Gender', VALID_GENDERS);
  if (!genderResult.valid) errors.push(genderResult.error!);
  else sanitized.gender = genderResult.sanitized;

  const mobileResult = validateMobile(data.mobile);
  if (!mobileResult.valid) errors.push(mobileResult.error!);
  else sanitized.mobile = mobileResult.sanitized;

  const customerTypeResult = validateEnum(data.customerType, 'Customer type', VALID_CUSTOMER_TYPES);
  if (!customerTypeResult.valid) errors.push(customerTypeResult.error!);
  else sanitized.customerType = customerTypeResult.sanitized;

  const storeNameResult = validateString(data.storeName, 'Store name', MAX_GENERIC_LENGTH);
  if (!storeNameResult.valid) errors.push(storeNameResult.error!);
  else sanitized.storeName = storeNameResult.sanitized;

  // Language fields — required but flexible values
  const langResult = validateString(data.preferredLanguage, 'Preferred language', MAX_GENERIC_LENGTH);
  if (!langResult.valid) errors.push(langResult.error!);
  else sanitized.preferredLanguage = langResult.sanitized;

  const lang2Result = validateOptionalString(data.preferredLanguage2, 'Preferred language 2', MAX_GENERIC_LENGTH);
  if (!lang2Result.valid) errors.push(lang2Result.error!);
  else sanitized.preferredLanguage2 = lang2Result.sanitized;

  // Feedback fields — optional, longer max
  const storeFeedbackResult = validateOptionalString(data.storeFeedback, 'Store feedback', MAX_FEEDBACK_LENGTH);
  if (!storeFeedbackResult.valid) errors.push(storeFeedbackResult.error!);
  else sanitized.storeFeedback = storeFeedbackResult.sanitized;

  const optumFeedbackResult = validateOptionalString(data.optumFeedback, 'Optum feedback', MAX_FEEDBACK_LENGTH);
  if (!optumFeedbackResult.valid) errors.push(optumFeedbackResult.error!);
  else sanitized.optumFeedback = optumFeedbackResult.sanitized;

  // Status — validate against allowed list
  const statusResult = validateEnum(data.status, 'Status', VALID_STATUSES);
  if (!statusResult.valid) errors.push(statusResult.error!);
  else sanitized.status = statusResult.sanitized;

  // Boolean/passthrough fields — sanitize types
  sanitized.activeProfile = data.activeProfile === true || data.activeProfile === 1;
  sanitized.lastUpdatedOn = typeof data.lastUpdatedOn === 'string' ? stripHtml(data.lastUpdatedOn).slice(0, MAX_GENERIC_LENGTH) : '';

  // JSON data fields — validate structure if present (accept objects, reject strings with HTML)
  if (data.rxData !== undefined && data.rxData !== null) {
    if (typeof data.rxData === 'object') {
      sanitized.rxData = data.rxData;
    } else {
      errors.push('rxData must be a valid object');
    }
  } else {
    sanitized.rxData = null;
  }

  if (data.optomRxData !== undefined && data.optomRxData !== null) {
    if (typeof data.optomRxData === 'object') {
      sanitized.optomRxData = data.optomRxData;
    } else {
      errors.push('optomRxData must be a valid object');
    }
  } else {
    sanitized.optomRxData = null;
  }

  // Call-related fields — passthrough with type enforcement
  sanitized.callStartTime = typeof data.callStartTime === 'string' ? data.callStartTime : null;
  sanitized.callActive = data.callActive === true || data.callActive === 1;
  sanitized.callTakenBy = typeof data.callTakenBy === 'string' ? stripHtml(data.callTakenBy).slice(0, MAX_NAME_LENGTH) : null;

  return {
    valid: errors.length === 0,
    errors,
    sanitized,
  };
}
