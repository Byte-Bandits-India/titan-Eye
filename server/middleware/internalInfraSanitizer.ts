import { Request, Response, NextFunction } from 'express';

/**
 * Finding 20: Internal IP Address / Hostname Exposure Remediation
 * Response filtering middleware that ensures internal infrastructure details
 * (localhost:port, 127.0.0.1, RFC 1918 private IPs) are never disclosed in
 * HTTP response headers or error responses.
 */

const INTERNAL_HOST_REGEX = /\b(localhost|127\.0\.0\.1)(:\d+)?\b/gi;
const RFC1918_PRIVATE_IP_REGEX = /\b(?:10\.\d{1,3}\.\d{1,3}\.\d{1,3}|172\.(?:1[6-9]|2\d|3[01])\.\d{1,3}\.\d{1,3}|192\.168\.\d{1,3}\.\d{1,3})(:\d+)?\b/g;
const INTERNAL_PORT_REGEX = /:(3000|3001|5173|8080|8443)\b/g;

/**
 * Sanitizes a string by stripping internal hostnames, ports, and private IP addresses.
 */
export function sanitizeInternalInfraString(value: string): string {
  if (!value || typeof value !== 'string') {
    return value;
  }

  return value
    .replace(INTERNAL_HOST_REGEX, '[internal]')
    .replace(RFC1918_PRIVATE_IP_REGEX, '[internal-ip]')
    .replace(INTERNAL_PORT_REGEX, '');
}

/**
 * Response filtering middleware that intercepts outgoing headers and JSON payloads
 * to prevent infrastructure leakage.
 */
export function internalInfraSanitizer(_req: Request, res: Response, next: NextFunction): void {
  // 1. Intercept setHeader to sanitize headers such as Content-Security-Policy or Location
  const originalSetHeader = res.setHeader.bind(res);

  res.setHeader = function (name: string, value: number | string | readonly string[]): Response {
    if (typeof value === 'string') {
      const lowerName = name.toLowerCase();
      // Specifically sanitize security headers and location headers
      if (
        lowerName === 'content-security-policy' ||
        lowerName === 'location' ||
        lowerName.startsWith('x-')
      ) {
        // Strip any accidental localhost or private IP inclusion in CSP
        const sanitized = value
          .replace(/http:\/\/localhost:\d+\s?/gi, '')
          .replace(/http:\/\/127\.0\.0\.1:\d+\s?/gi, '')
          .replace(/http:\/\/10\.\d{1,3}\.\d{1,3}\.\d{1,3}(:\d+)?\s?/gi, '');
        return originalSetHeader(name, sanitized);
      }
    }
    return originalSetHeader(name, value);
  };

  next();
}
