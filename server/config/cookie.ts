import { CookieOptions, Request } from 'express';

export const AUTH_COOKIE_NAME = 'token';
export const AUTH_COOKIE_PATH = '/api';

export const SSO_STATE_COOKIE_NAME = 'ms_auth_state';
export const SSO_STATE_COOKIE_PATH = '/api/auth/microsoft';

/**
 * Determines whether the connection is secure (HTTPS/TLS) across direct and reverse proxy configurations.
 */
export function isConnectionSecure(req: Request): boolean {
  return (
    process.env.NODE_ENV === 'production' ||
    req.secure ||
    req.headers['x-forwarded-proto'] === 'https' ||
    Boolean(req.headers.host && !req.headers.host.includes('localhost') && !req.headers.host.includes('127.0.0.1'))
  );
}

export interface AuthCookieHelperOptions {
  maxAgeMs?: number;
  sameSite?: 'strict' | 'lax' | 'none';
}

/**
 * Returns hardened cookie options for authentication cookies.
 * Enforces narrow /api path, HttpOnly, SameSite, and Secure flags.
 */
export function getAuthCookieOptions(
  req: Request,
  options?: AuthCookieHelperOptions
): CookieOptions {
  const isSecure = isConnectionSecure(req);

  return {
    httpOnly: true,
    path: AUTH_COOKIE_PATH,
    sameSite: options?.sameSite ?? 'strict',
    secure: isSecure,
    ...(options?.maxAgeMs ? { maxAge: options.maxAgeMs } : {}),
  };
}
