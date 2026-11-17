import './env.js';
import crypto from 'crypto';

/**
 * Validates and retrieves the master JWT secret.
 * Fails hard if JWT_SECRET is missing, empty, or shorter than 32 bytes (256 bits).
 */
export function getJwtSecret(): string {
  const secret = process.env.JWT_SECRET;
  if (!secret || typeof secret !== 'string' || Buffer.byteLength(secret, 'utf8') < 32) {
    const errorMsg =
      'FATAL: JWT_SECRET environment variable is missing, empty, or shorter than 32 bytes (256 bits). ' +
      'A cryptographically secure secret (minimum 32 bytes) is required to prevent token forgery.';
    throw new Error(errorMsg);
  }
  return secret;
}

// Backward-compatible export; runtime functions use getJwtSecret()
export const JWT_SECRET = process.env.JWT_SECRET ?? '';

// RFC 7519 standard expirations (in seconds)
export const JWT_EXPIRY_ADMIN_SEC = 2 * 60 * 60; // 2 hours for privileged admin accounts
export const JWT_EXPIRY_STANDARD_SEC = 8 * 60 * 60; // 8 hours for standard clinic staff (working shift)
export const JWT_EXPIRY_SHORT_SEC = 2 * 60 * 60; // 2 hours for non-remembered sessions

// Legacy fallback compatibility in milliseconds (8 hours instead of 30 days)
export const JWT_TTL_MS = JWT_EXPIRY_STANDARD_SEC * 1000;
export const PRESENCE_IDLE_MS = 35 * 1000;
export const SESSION_ABANDONED_MS = 10 * 60 * 1000;

export interface UserPayload {
  authTime?: number; // Absolute timestamp (seconds since epoch) when the user initially logged in
  email: string;
  exp?: number; // Expiration time (seconds since Unix epoch per RFC 7519)
  iat?: number; // Issued at (seconds since Unix epoch per RFC 7519)
  jti?: string; // Unique JWT identifier
  name: string;
  nbf?: number; // Not before (seconds since Unix epoch per RFC 7519)
  rememberMe?: boolean; // Whether the user selected Remember Me at login
  role: string;
  storeName?: string;
}

/**
 * Returns role-appropriate token TTL in seconds based on security privilege level.
 */
export function getTtlSecondsForUser(role: string, rememberMe = false): number {
  if (role === 'admin') {
    return JWT_EXPIRY_ADMIN_SEC;
  }

  return rememberMe ? JWT_EXPIRY_STANDARD_SEC : JWT_EXPIRY_SHORT_SEC;
}

/**
 * Generates an RFC 7519 compliant JSON Web Token.
 * All standard time claims (iat, nbf, exp) are strictly formatted in SECONDS since Unix epoch.
 */
export function generateToken(payload: UserPayload, ttlSeconds: number = JWT_EXPIRY_STANDARD_SEC): string {
  const secret = getJwtSecret();
  // Guard against callers mistakenly passing milliseconds (> 10 million)
  const normalizedTtlSec = ttlSeconds > 10_000_000 ? Math.floor(ttlSeconds / 1000) : ttlSeconds;
  const nowSec = Math.floor(Date.now() / 1000);

  const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url');
  const fullPayload: UserPayload = {
    ...payload,
    authTime: payload.authTime ?? nowSec,
    exp: nowSec + normalizedTtlSec,
    iat: nowSec,
    jti: crypto.randomUUID(),
    nbf: nowSec,
    rememberMe: payload.rememberMe ?? false,
  };

  const body = Buffer.from(JSON.stringify(fullPayload)).toString('base64url');
  const signature = crypto.createHmac('sha256', secret).update(`${header}.${body}`).digest('base64url');

  return `${header}.${body}.${signature}`;
}

export function verifyToken(token: string): null | UserPayload {
  try {
    const secret = getJwtSecret();
    const parts = token.split('.');

    if (parts.length !== 3) {
      return null;
    }

    const [headerStr, bodyStr, signature] = parts;

    if (!headerStr || !bodyStr || !signature) {
      return null;
    }

    // 1. Verify algorithm to prevent "none" or algorithm-confusion attacks
    const header = JSON.parse(Buffer.from(headerStr, 'base64url').toString('utf8'));

    if (!header || header.alg !== 'HS256' || header.typ !== 'JWT') {
      return null;
    }

    // 2. Constant-time signature verification
    const expectedSignature = crypto
      .createHmac('sha256', secret)
      .update(`${headerStr}.${bodyStr}`)
      .digest('base64url');

    const sigBuf = Buffer.from(signature);
    const expectedBuf = Buffer.from(expectedSignature);

    if (sigBuf.length !== expectedBuf.length || !crypto.timingSafeEqual(sigBuf, expectedBuf)) {
      return null;
    }

    // 3. Validate payload claims
    const payload = JSON.parse(Buffer.from(bodyStr, 'base64url').toString('utf8'));

    if (!payload || typeof payload !== 'object') {
      return null;
    }

    if (typeof payload.email !== 'string' || typeof payload.name !== 'string') {
      return null;
    }

    const nowSec = Math.floor(Date.now() / 1000);
    const nowMs = Date.now();

    // 4. Validate Not Before (nbf) claim with 60s clock skew tolerance
    if (payload.nbf && payload.nbf > nowSec + 60) {
      return null;
    }

    // 5. Validate Expiration (exp) claim: handles RFC 7519 seconds and legacy milliseconds
    if (payload.exp) {
      const isSeconds = payload.exp < 100_000_000_000;

      if (isSeconds) {
        if (nowSec > payload.exp) {
          return null;
        }
      } else {
        if (nowMs > payload.exp) {
          return null;
        }
      }
    }

    return payload;
  } catch {
    return null;
  }
}
