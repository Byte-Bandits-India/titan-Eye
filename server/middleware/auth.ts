import { NextFunction, Request, Response } from 'express';

import { UserPayload, verifyToken } from '../config/jwt.js';
import { db } from '../db/database.js';
import { logger, logSecurityEvent } from '../utils/logger.js';
import { isRevoked } from '../utils/tokenBlacklist.js';

export interface AuthenticatedRequest extends Request {
  user?: UserPayload;
}

export function authenticateToken(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  let token = req.cookies?.token;

  if (!token) {
    const authHeader = req.headers['authorization'];
    token = authHeader && authHeader.split(' ')[1];
  }

  if (!token) {
    return res.status(401).json({ error: 'Access token required' });
  }

  if (isRevoked(token)) {
    logSecurityEvent('REVOKED_TOKEN_USED', { ip: req.ip, path: req.path, requestId: req.requestId });

    return res.status(401).json({ error: 'Token has been revoked' });
  }

  const user = verifyToken(token);

  if (!user) {
    logSecurityEvent('INVALID_TOKEN', { ip: req.ip, path: req.path, requestId: req.requestId });

    return res.status(401).json({ error: 'Invalid or expired token' });
  }

  try {
    const tokenSig = token.split('.')[2];
    const row = db
      .prepare('SELECT status, activeTokenSig FROM users WHERE LOWER(email) = LOWER(?)')
      .get(user.email) as undefined | { activeTokenSig: null | string; status: string };

    if (!row) {
      return res.status(401).json({ error: 'User account no longer exists' });
    }

    if (row.status !== 'active') {
      return res.status(401).json({ error: 'This account has been deactivated' });
    }

    // Store accounts may be logged in on multiple devices at once (e.g. a kiosk
    // screen alongside the main register), so they're exempt from the
    // single-active-session check that applies to optometrist/admin accounts.
    if (user.role !== 'store') {
      if (row.activeTokenSig !== null && row.activeTokenSig !== tokenSig) {
        logSecurityEvent('SESSION_SUPERSEDED', { email: user.email, ip: req.ip, requestId: req.requestId });

        return res.status(401).json({
          error: 'SESSION_EXPIRED',
          message: 'Your session has ended because you signed in from another location.',
        });
      }

      if (row.activeTokenSig === null && tokenSig) {
        db.prepare('UPDATE users SET activeTokenSig = ? WHERE LOWER(email) = LOWER(?)').run(
          tokenSig,
          user.email
        );
      }
    }
  } catch (e) {
    logger.error('[auth middleware] user session verification check failed', {
      errorMessage: (e as Error).message,
      requestId: req.requestId,
    });
  }

  req.user = user;
  next();
}
