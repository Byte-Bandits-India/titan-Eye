import crypto from 'crypto';

export interface EncryptedEnvelope {
  __encrypted: true;
  ciphertext: string;
  iv: string;
  tag: string;
  timestamp: number;
}

const ALGORITHM = 'aes-256-gcm';

export function isEncryptedEnvelope(value: object | null | undefined): value is EncryptedEnvelope {
  if (!value || typeof value !== 'object') {
    return false;
  }

  const v = value as Record<string, string | number | boolean | undefined>;

  return (
    v.__encrypted === true &&
    typeof v.ciphertext === 'string' &&
    typeof v.iv === 'string' &&
    typeof v.tag === 'string' &&
    typeof v.timestamp === 'number'
  );
}

function getEncryptionKey(secretHex?: string): Buffer {
  const secret = secretHex || process.env.E2EE_SECRET || process.env.INTER_SERVER_SECRET;
  if (!secret) {
    throw new Error('E2EE_SECRET / INTER_SERVER_SECRET is not configured for payload encryption.');
  }

  return crypto.createHash('sha256').update(secret).digest();
}

/**
 * Encrypts data using AES-256-GCM authenticated encryption.
 */
export function encryptPayload<T extends object>(data: T, secretKeyHex?: string): EncryptedEnvelope {
  const key = getEncryptionKey(secretKeyHex);
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);

  const serialized = JSON.stringify(data);
  let ciphertext = cipher.update(serialized, 'utf8', 'base64');
  ciphertext += cipher.final('base64');

  const tag = cipher.getAuthTag().toString('base64');

  return {
    __encrypted: true,
    ciphertext,
    iv: iv.toString('base64'),
    tag,
    timestamp: Date.now(),
  };
}

/**
 * Decrypts and verifies an AES-256-GCM envelope with replay attack protection.
 */
export function decryptPayload<T extends object>(
  envelope: EncryptedEnvelope,
  secretKeyHex?: string,
  maxAgeMs: number = 5 * 60 * 1000
): T {
  if (!envelope || !envelope.ciphertext || !envelope.iv || !envelope.tag || !envelope.timestamp) {
    throw new Error('Invalid encrypted payload envelope structure.');
  }

  if (Math.abs(Date.now() - envelope.timestamp) > maxAgeMs) {
    throw new Error('Encrypted payload timestamp is expired or outside valid time window.');
  }

  const key = getEncryptionKey(secretKeyHex);
  const iv = Buffer.from(envelope.iv, 'base64');
  const tag = Buffer.from(envelope.tag, 'base64');

  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(tag);

  let decrypted = decipher.update(envelope.ciphertext, 'base64', 'utf8');
  decrypted += decipher.final('utf8');

  const parsed = JSON.parse(decrypted);
  if (!parsed || typeof parsed !== 'object') {
    throw new Error('Decrypted payload is not a valid object.');
  }

  return parsed as T;
}

/**
 * Generates an HMAC-SHA256 signature for server-to-server requests.
 */
export function signServerPayload(payloadString: string, timestamp: number, secretKey?: string): string {
  const key = secretKey || process.env.E2EE_SECRET || process.env.INTER_SERVER_SECRET;
  if (!key) {
    throw new Error('E2EE_SECRET / INTER_SERVER_SECRET is not configured for signing.');
  }

  return crypto.createHmac('sha256', key).update(`${timestamp}.${payloadString}`).digest('hex');
}

/**
 * Verifies an HMAC-SHA256 signature with constant-time equality check and timestamp validation.
 */
export function verifyServerPayloadSignature(
  payloadString: string,
  signature: string,
  timestampStr: string,
  secretKey?: string,
  maxAgeMs: number = 60 * 1000
): boolean {
  const timestamp = Number(timestampStr);
  if (!timestamp || isNaN(timestamp) || Math.abs(Date.now() - timestamp) > maxAgeMs) {
    return false;
  }

  const expectedSignature = signServerPayload(payloadString, timestamp, secretKey);
  const sigBuf = Buffer.from(signature, 'hex');
  const expBuf = Buffer.from(expectedSignature, 'hex');

  if (sigBuf.length !== expBuf.length) {
    return false;
  }

  return crypto.timingSafeEqual(sigBuf, expBuf);
}
