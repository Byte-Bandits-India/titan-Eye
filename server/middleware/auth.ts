import { NextFunction, Request, Response } from 'express';

import { UserPayload, verifyToken } from '../config/jwt.js';
import { db } from '../db/database.js';
import { logger, logSecurityEvent } from '../utils/logger.js';
import { isRevoked } from '../utils/tokenBlacklist.js';

import { ParamsDictionary, Query } from 'express-serve-static-core';

export interface AuthenticatedRequest<
  P = ParamsDictionary,
  ResBody = object | string | number | boolean | null,
  ReqBody = object | string | number | boolean | null,
  ReqQuery = Query,
> extends Request<P, ResBody, ReqBody, ReqQuery> {
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
      .prepare('SELECT role, name, storeName, status, activeTokenSig FROM users WHERE LOWER(email) = LOWER(?)')
      .get(user.email) as
      | undefined
      | {
          activeTokenSig: null | string;
          name: string;
          role: string;
          status: string;
          storeName: null | string;
        };

    if (!row) {
      return res.status(401).json({ error: 'User account no longer exists' });
    }

    if (row.status !== 'active') {
      return res.status(401).json({ error: 'This account has been deactivated' });
    }

    // N9 Remediation: Dynamically synchronize role and profile from database on every request.
    // Neutralizes JWT stale-role privilege escalation (e.g. demoted admins retaining admin powers).
    user.role = row.role;
    user.name = row.name;
    if (row.storeName) {
      user.storeName = row.storeName;
    }

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
      errorMessage: e instanceof Error ? e.message : String(e),
      requestId: req.requestId,
    });
    return res.status(500).json({ error: 'Internal security authentication check failed' });
  }

  req.user = user;
  next();
}
