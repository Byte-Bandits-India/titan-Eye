/**
 * Input Validation & Sanitization Utility (Finding 14 Remediation)
 * CWE-74: Improper Neutralization of Special Elements in Output Used by a Downstream Component ('Injection')
 */

// Patterns indicating active script, event handlers, or executable markup injection
const SCRIPT_INJECTION_PATTERN =
  /<script[\s\S]*?>[\s\S]*?<\/script>|<script[\s\S]*?>|<\/script>|javascript:|vbscript:|data:text\/html|on[a-z]{3,15}\s*=|eval\s*\(|alert\s*\(|document\.cookie|window\.location|<iframe[\s\S]*?>|<object[\s\S]*?>|<embed[\s\S]*?>/i;

// Control characters: null bytes, bell, backspace, form feeds, etc. (excluding standard tabs and newlines)
const CONTROL_CHARACTERS_REGEX = /[\x00-\x08\x0B\x0C\x0E-\x1F\x7F-\x9F]/g;

// HTML tag pattern
const HTML_TAG_REGEX = /<[^>]*>/g;

// Safe characters allowed in titles (alphanumeric, spaces, standard clinical/title punctuation)
const SAFE_TITLE_REGEX = /^[A-Za-z0-9\s.\-_,:;?!'\"()&/%#@+=[\]]+$/;

// Safe characters allowed in names, city, location
const SAFE_SHORT_TEXT_REGEX = /^[A-Za-z0-9\s.\-',()&/]+$/;

// Customer ID pattern: optional '#' prefix followed by 1 to 10 digits (e.g. #0001, #0007, 7)
const CUSTOMER_ID_REGEX = /^#?[0-9]{1,10}$/;

// Feedback image slot pattern: strictly 1 or 2
const SLOT_REGEX = /^[12]$/;

export interface SanitizationResult {
  error?: string;
  sanitized?: string;
  valid: boolean;
}

/**
 * Checks if input string contains active script tags, javascript: protocols, or DOM event handlers.
 */
export function containsScriptOrInjection(text: string): boolean {
  if (!text || typeof text !== 'string') {
    return false;
  }

  return SCRIPT_INJECTION_PATTERN.test(text);
}

/**
 * Strips HTML tags from input string.
 */
export function stripHtmlTags(input: string): string {
  if (!input || typeof input !== 'string') {
    return '';
  }

  return input.replace(HTML_TAG_REGEX, '').trim();
}

/**
 * Removes non-printable and dangerous control characters.
 */
export function removeControlCharacters(input: string): string {
  if (!input || typeof input !== 'string') {
    return '';
  }

  return input.replace(CONTROL_CHARACTERS_REGEX, '');
}

/**
 * Validates and sanitizes multi-line clinical notes, feedback, and comments.
 * Rejects explicit script/HTML tags, strips control characters, and normalizes text.
 */
export function sanitizeClinicalText(
  value: string | undefined,
  fieldName: string,
  maxLength: number
): SanitizationResult {
  if (value === undefined || value === null) {
    return { sanitized: '', valid: true };
  }

  if (typeof value !== 'string') {
    return { error: `${fieldName} must be a string`, valid: false };
  }

  const rawTrimmed = value.trim();
  if (rawTrimmed === '') {
    return { sanitized: '', valid: true };
  }

  // Check 1: Detect active script tags or injection attempts
  if (containsScriptOrInjection(rawTrimmed)) {
    return {
      error: `${fieldName} contains prohibited special characters, HTML tags, or script sequences.`,
      valid: false,
    };
  }

  // Check 2: Strip any residual HTML tags
  const stripped = stripHtmlTags(rawTrimmed);

  // Check 3: Remove control characters
  const clean = removeControlCharacters(stripped);

  if (clean.length > maxLength) {
    return {
      error: `${fieldName} exceeds maximum permitted length of ${maxLength} characters.`,
      valid: false,
    };
  }

  return { sanitized: clean, valid: true };
}

/**
 * Validates video titles (up to 200 characters, alphanumeric and safe punctuation).
 */
export function validateVideoTitle(title: string | undefined): SanitizationResult {
  if (!title || typeof title !== 'string' || !title.trim()) {
    return { error: 'Video title is required', valid: false };
  }

  const rawTrimmed = title.trim();

  // Check 1: Script injection detection
  if (containsScriptOrInjection(rawTrimmed)) {
    return {
      error: 'Video title contains prohibited script tags or injection sequences.',
      valid: false,
    };
  }

  // Check 2: HTML tags check
  if (HTML_TAG_REGEX.test(rawTrimmed)) {
    return {
      error: 'Video title cannot contain HTML tags or angle brackets.',
      valid: false,
    };
  }

  const clean = removeControlCharacters(rawTrimmed);

  if (clean.length > 200) {
    return {
      error: 'Video title must be at most 200 characters.',
      valid: false,
    };
  }

  if (!SAFE_TITLE_REGEX.test(clean)) {
    return {
      error: 'Video title contains invalid special characters.',
      valid: false,
    };
  }

  return { sanitized: clean, valid: true };
}

/**
 * Validates short descriptive fields like city, location, and user names.
 */
export function validateSafeShortText(
  value: string | undefined,
  fieldName: string,
  maxLength: number
): SanitizationResult {
  if (value === undefined || value === null) {
    return { sanitized: '', valid: true };
  }

  if (typeof value !== 'string') {
    return { error: `${fieldName} must be a string`, valid: false };
  }

  const rawTrimmed = value.trim();
  if (rawTrimmed === '') {
    return { sanitized: '', valid: true };
  }

  if (containsScriptOrInjection(rawTrimmed)) {
    return {
      error: `${fieldName} contains prohibited script tags or injection sequences.`,
      valid: false,
    };
  }

  const clean = removeControlCharacters(stripHtmlTags(rawTrimmed));

  if (clean.length > maxLength) {
    return {
      error: `${fieldName} must be at most ${maxLength} characters.`,
      valid: false,
    };
  }

  if (!SAFE_SHORT_TEXT_REGEX.test(clean)) {
    return {
      error: `${fieldName} contains invalid special characters.`,
      valid: false,
    };
  }

  return { sanitized: clean, valid: true };
}

/**
 * Validates customer ID route parameters (must be #0001 or numeric integer).
 */
export function validateCustomerId(id: string | undefined): boolean {
  if (!id || typeof id !== 'string') {
    return false;
  }

  return CUSTOMER_ID_REGEX.test(id.trim());
}

/**
 * Validates feedback image slot parameter (strictly 1 or 2).
 */
export function validateFeedbackImageSlot(slot: string | undefined): boolean {
  if (!slot || typeof slot !== 'string') {
    return false;
  }

  return SLOT_REGEX.test(slot.trim());
}
