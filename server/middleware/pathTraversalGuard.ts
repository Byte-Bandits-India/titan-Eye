import { NextFunction, Request, Response } from 'express';
import path from 'path';
import { logSecurityEvent } from '../utils/logger.js';

// Regex matching unencoded, single-encoded, double-encoded, and backslash directory traversal sequences
const TRAVERSAL_PATTERN = /(\.\.[/\\]|\.\.%2[fF]|\.\.%5[cC]|%2[eE]%2[eE][/\\]|%2[eE]%2[eE]%2[fF]|%2[eE]%2[eE]%5[cC]|%252[eE]%252[eE]|%252[fF])/;

/**
 * Robustly multi-pass decodes a URI string to catch single and double-encoded traversal sequences.
 */
function multiPassDecode(input: string): string {
  let decoded = input;
  let previous = '';
  let passes = 0;

  while (decoded !== previous && passes < 3) {
    previous = decoded;
    passes++;
    try {
      decoded = decodeURIComponent(decoded);
    } catch {
      // If malformed URI sequence, return current state
      break;
    }
  }

  return decoded;
}

export function pathTraversalGuard(req: Request, res: Response, next: NextFunction) {
  const rawUrl = req.originalUrl || req.url || '';
  const reqPath = req.path || '';

  // Check 1: Direct regex match on raw and unencoded representations
  if (TRAVERSAL_PATTERN.test(rawUrl) || TRAVERSAL_PATTERN.test(reqPath)) {
    logSecurityEvent('PATH_TRAVERSAL_BLOCKED', {
      ip: req.ip,
      method: req.method,
      path: rawUrl,
      reason: 'TRAVERSAL_PATTERN_DETECTED',
      requestId: (req as Request & { requestId?: string }).requestId,
    });

    return res.status(400).json({
      error: 'Directory traversal sequence detected. Request rejected.',
    });
  }

  // Check 2: Multi-pass decoding to detect obfuscated or double-encoded sequences (e.g. ..%2f, %2e%2e%2f)
  const decodedUrl = multiPassDecode(rawUrl);
  if (
    decodedUrl.includes('../') ||
    decodedUrl.includes('..\\') ||
    decodedUrl.includes('/..') ||
    decodedUrl.includes('\\..')
  ) {
    logSecurityEvent('PATH_TRAVERSAL_BLOCKED', {
      decodedUrl,
      ip: req.ip,
      method: req.method,
      path: rawUrl,
      reason: 'DECODED_TRAVERSAL_DETECTED',
      requestId: (req as Request & { requestId?: string }).requestId,
    });

    return res.status(400).json({
      error: 'Directory traversal sequence detected. Request rejected.',
    });
  }

  // Check 3: POSIX Path canonicalization check
  // If normalized path differs structurally by moving up directories
  const normalizedPath = path.posix.normalize(reqPath);
  if (normalizedPath.startsWith('/../') || normalizedPath === '/..' || normalizedPath.includes('/../')) {
    logSecurityEvent('PATH_TRAVERSAL_BLOCKED', {
      ip: req.ip,
      method: req.method,
      normalizedPath,
      path: rawUrl,
      reason: 'NORMALIZED_TRAVERSAL_DETECTED',
      requestId: (req as Request & { requestId?: string }).requestId,
    });

    return res.status(400).json({
      error: 'Directory traversal sequence detected. Request rejected.',
    });
  }

  next();
}
