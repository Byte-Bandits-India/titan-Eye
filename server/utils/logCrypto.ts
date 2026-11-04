import '../config/env.js';
import crypto from 'crypto';

const PREFIX = 'ENC:v1:';
const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 12; // 96-bit IV for AES-GCM (NIST recommended)

let cachedKey: Buffer | null = null;

/**
 * Resolves the 256-bit (32-byte) log encryption key from environment.
 * Accepts a 64-char hex string, 32-byte base64, or derives a 32-byte key via SHA-256.
 */
export function getLogEncryptionKey(): Buffer | null {
  if (cachedKey) {
    return cachedKey;
  }

  const rawKey = process.env.LOG_ENCRYPTION_KEY || process.env.LOGS_SECRET;

  if (!rawKey) {
    // If explicit encryption is enabled but no key is set, derive one from JWT_SECRET as fallback
    if (process.env.LOG_ENCRYPTION_ENABLED === 'true') {
      const fallbackSecret = process.env.JWT_SECRET || process.env.INTER_SERVER_SECRET || 'titan-default-logs-salt-key';
      cachedKey = crypto.createHash('sha256').update(fallbackSecret).digest();
      return cachedKey;
    }
    return null;
  }

  const trimmed = rawKey.trim();

  // 64-char Hex format (32 bytes)
  if (/^[0-9a-fA-F]{64}$/.test(trimmed)) {
    cachedKey = Buffer.from(trimmed, 'hex');
    return cachedKey;
  }

  // 44-char Base64 format (32 bytes)
  if (trimmed.length === 44 && /^[A-Za-z0-9+/=]+$/.test(trimmed)) {
    try {
      const buf = Buffer.from(trimmed, 'base64');
      if (buf.length === 32) {
        cachedKey = buf;
        return cachedKey;
      }
    } catch {
      /* fallback below */
    }
  }

  // Fallback: Hash any passphrase to exactly 32 bytes using SHA-256
  cachedKey = crypto.createHash('sha256').update(trimmed, 'utf8').digest();
  return cachedKey;
}

/**
 * Checks whether log encryption is currently active.
 */
export function isLogEncryptionEnabled(): boolean {
  if (process.env.LOG_ENCRYPTION_ENABLED === 'false') {
    return false;
  }

  if (process.env.LOG_ENCRYPTION_ENABLED === 'true') {
    return true;
  }

  // Automatically enable if a valid key is provided
  return Boolean(process.env.LOG_ENCRYPTION_KEY || process.env.LOGS_SECRET);
}

/**
 * Checks if a string line is an encrypted log entry.
 */
export function isEncryptedLogLine(line: string): boolean {
  return typeof line === 'string' && line.startsWith(PREFIX);
}

/**
 * Encrypts a single plaintext log line using AES-256-GCM with a unique 12-byte IV.
 * Format: ENC:v1:<iv_b64>:<tag_b64>:<ciphertext_b64>
 */
export function encryptLogLine(plainText: string, key?: Buffer | null): string {
  const encKey = key || getLogEncryptionKey();

  if (!encKey) {
    return plainText;
  }

  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, encKey, iv);

  const encrypted = Buffer.concat([
    cipher.update(plainText, 'utf8'),
    cipher.final(),
  ]);

  const tag = cipher.getAuthTag();

  return `${PREFIX}${iv.toString('base64')}:${tag.toString('base64')}:${encrypted.toString('base64')}`;
}

/**
 * Decrypts an encrypted log entry line back to its original plaintext JSON string.
 * Validates the GCM authentication tag to prevent tampering.
 */
export function decryptLogLine(cipherLine: string, key?: Buffer | null): string {
  const trimmed = cipherLine.trim();

  if (!isEncryptedLogLine(trimmed)) {
    return cipherLine; // Already plaintext
  }

  const encKey = key || getLogEncryptionKey();

  if (!encKey) {
    throw new Error('Cannot decrypt log line: LOG_ENCRYPTION_KEY is not configured.');
  }

  const payload = trimmed.slice(PREFIX.length);
  const parts = payload.split(':');

  if (parts.length !== 3) {
    throw new Error('Invalid encrypted log entry format. Expected 3 components (iv:tag:ciphertext).');
  }

  const [ivB64, tagB64, dataB64] = parts;
  const iv = Buffer.from(ivB64, 'base64');
  const tag = Buffer.from(tagB64, 'base64');
  const encryptedData = Buffer.from(dataB64, 'base64');

  const decipher = crypto.createDecipheriv(ALGORITHM, encKey, iv);
  decipher.setAuthTag(tag);

  const decrypted = Buffer.concat([
    decipher.update(encryptedData),
    decipher.final(),
  ]);

  return decrypted.toString('utf8');
}

/**
 * Utility to generate a new cryptographically secure 256-bit key in hex format.
 */
export function generateLogEncryptionKeyHex(): string {
  return crypto.randomBytes(32).toString('hex');
}
