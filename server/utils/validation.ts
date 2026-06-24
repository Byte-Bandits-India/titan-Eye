const MAX_NAME_LENGTH = 100;
const MAX_FEEDBACK_LENGTH = 2000;
const MAX_GENERIC_LENGTH = 200;

const VALID_GENDERS = ['Male', 'Female', 'Other'];
const VALID_CUSTOMER_TYPES = ['New', 'Existing', 'VIP'];
const VALID_STATUSES = ['Created', 'Initiated', 'Accepted', 'Completed'];

function stripHtml(input: string): string {
  return input.replace(/<[^>]*>/g, '').trim();
}
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

function validateOptionalString(value: unknown, fieldName: string, maxLength: number): { valid: boolean; error?: string; sanitized?: string } {
  if (value === undefined || value === null || (typeof value === 'string' && value.trim() === '')) {
    return { valid: true, sanitized: '' };
  }
  return validateString(value, fieldName, maxLength);
}

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

export function validateCustomerData(data: Record<string, any>, isUpdate: boolean = false): CustomerValidationResult {
  const errors: string[] = [];
  const sanitized: Record<string, any> = {};

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

  const langResult = validateString(data.preferredLanguage, 'Preferred language', MAX_GENERIC_LENGTH);
  if (!langResult.valid) errors.push(langResult.error!);
  else sanitized.preferredLanguage = langResult.sanitized;

  const lang2Result = validateOptionalString(data.preferredLanguage2, 'Preferred language 2', MAX_GENERIC_LENGTH);
  if (!lang2Result.valid) errors.push(lang2Result.error!);
  else sanitized.preferredLanguage2 = lang2Result.sanitized;

  const storeFeedbackResult = validateOptionalString(data.storeFeedback, 'Store feedback', MAX_FEEDBACK_LENGTH);
  if (!storeFeedbackResult.valid) errors.push(storeFeedbackResult.error!);
  else sanitized.storeFeedback = storeFeedbackResult.sanitized;

  const optemFeedbackResult = validateOptionalString(data.optemFeedback, 'Optem feedback', MAX_FEEDBACK_LENGTH);
  if (!optemFeedbackResult.valid) errors.push(optemFeedbackResult.error!);
  else sanitized.optemFeedback = optemFeedbackResult.sanitized;

  const statusResult = validateEnum(data.status, 'Status', VALID_STATUSES);
  if (!statusResult.valid) errors.push(statusResult.error!);
  else sanitized.status = statusResult.sanitized;

  sanitized.activeProfile = data.activeProfile === true || data.activeProfile === 1;
  sanitized.lastUpdatedOn = typeof data.lastUpdatedOn === 'string' ? stripHtml(data.lastUpdatedOn).slice(0, MAX_GENERIC_LENGTH) : '';

  if (data.rxData !== undefined && data.rxData !== null) {
    if (typeof data.rxData === 'object') {
      sanitized.rxData = data.rxData;
    } else {
      errors.push('rxData must be a valid object');
    }
  } else {
    sanitized.rxData = null;
  }

  if (data.optemRxData !== undefined && data.optemRxData !== null) {
    if (typeof data.optemRxData === 'object') {
      sanitized.optemRxData = data.optemRxData;
    } else {
      errors.push('optemRxData must be a valid object');
    }
  } else {
    sanitized.optemRxData = null;
  }

  sanitized.callStartTime = typeof data.callStartTime === 'string' ? data.callStartTime : null;
  sanitized.callActive = data.callActive === true || data.callActive === 1;
  sanitized.callTakenBy = typeof data.callTakenBy === 'string' ? stripHtml(data.callTakenBy).slice(0, MAX_NAME_LENGTH) : null;

  return {
    valid: errors.length === 0,
    errors,
    sanitized,
  };
}
