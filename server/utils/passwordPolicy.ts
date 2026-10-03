/**
 * Enterprise Password Policy Validator (CWE-255 / CWE-521 Compliance)
 * Enforces strong password requirements, character diversity, contextual checks,
 * and a blocklist of commonly breached/guessable passwords.
 */

export interface PasswordValidationContext {
  email?: string;
  name?: string;
  storeName?: string;
}

export interface PasswordValidationResult {
  error?: string;
  valid: boolean;
}

const MIN_LENGTH = 8;
const MAX_LENGTH = 128;

// Common breached or easily predictable passwords (normalized to lowercase)
const COMMON_WEAK_PASSWORDS = new Set([
  '000000',
  '00000000',
  '000000000000',
  '111111',
  '11111111',
  '111111111111',
  '123456',
  '12345678',
  '123456789',
  '1234567890',
  '123456789012',
  'abcdefghijkl',
  'admin',
  'admin123',
  'admin123456',
  'admin@123',
  'admin@123456',
  'adminpassword',
  'administrator',
  'changeit',
  'changeme',
  'changeme123',
  'iloveyou',
  'letmein12345',
  'pass@123',
  'pass@123456',
  'password',
  'password123',
  'password1234',
  'password123456',
  'password@123',
  'password@123456',
  'qwerty123456',
  'titan123456',
  'titan@123',
  'titan@123456',
  'titanremote',
  'titanremote123',
  'trvc123456',
  'trvc@123',
  'trvc@123456',
  'welcome',
  'welcome123',
  'welcome123456',
  'welcome@123',
  'welcome@123456',
]);

export function validatePassword(
  password?: unknown,
  context?: PasswordValidationContext
): PasswordValidationResult {
  if (typeof password !== 'string' || !password) {
    return {
      error: 'Password is required and must be a string.',
      valid: false,
    };
  }

  // 1. Length requirements
  if (password.length < MIN_LENGTH) {
    return {
      error: `Password must be at least ${MIN_LENGTH} characters long.`,
      valid: false,
    };
  }

  if (password.length > MAX_LENGTH) {
    return {
      error: `Password must not exceed ${MAX_LENGTH} characters.`,
      valid: false,
    };
  }

  // 2. Character diversity checks
  const hasLower = /[a-z]/.test(password);
  const hasUpper = /[A-Z]/.test(password);
  const hasDigit = /[0-9]/.test(password);
  const hasSymbol = /[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?~` ]/.test(password);

  const missingRequirements: string[] = [];
  if (!hasLower) missingRequirements.push('one lowercase letter (a-z)');
  if (!hasUpper) missingRequirements.push('one uppercase letter (A-Z)');
  if (!hasDigit) missingRequirements.push('one number (0-9)');
  if (!hasSymbol) missingRequirements.push('one special character (!@#$%^&*...)');

  if (missingRequirements.length > 0) {
    return {
      error: `Password must contain at least ${missingRequirements.join(', ')}.`,
      valid: false,
    };
  }

  // 3. Common breached / trivial passwords check
  const lowerPassword = password.toLowerCase();
  if (COMMON_WEAK_PASSWORDS.has(lowerPassword)) {
    return {
      error: 'This password is too common or easily guessable. Please choose a stronger password.',
      valid: false,
    };
  }

  // 4. Repeated character sequence check (e.g. "aaaaa" or "11111")
  if (/(.)\1{4,}/.test(password)) {
    return {
      error: 'Password must not contain repeated characters (e.g. 5 identical characters in a row).',
      valid: false,
    };
  }

  // 5. Contextual user identity checks (disallow username / store name in password)
  if (context?.email) {
    const emailPrefix = context.email.split('@')[0]?.trim().toLowerCase();
    if (emailPrefix && emailPrefix.length >= 3 && lowerPassword.includes(emailPrefix)) {
      return {
        error: 'Password must not contain your email address or username.',
        valid: false,
      };
    }
  }

  if (context?.storeName) {
    const store = context.storeName.trim().toLowerCase();
    if (store && store.length >= 3 && lowerPassword.includes(store)) {
      return {
        error: 'Password must not contain your store code or store name.',
        valid: false,
      };
    }
  }

  if (context?.name) {
    const nameParts = context.name
      .trim()
      .toLowerCase()
      .split(/\s+/)
      .filter((part) => part.length >= 4);

    for (const part of nameParts) {
      if (lowerPassword.includes(part)) {
        return {
          error: 'Password must not contain parts of your personal name.',
          valid: false,
        };
      }
    }
  }

  return { valid: true };
}
