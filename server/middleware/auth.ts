import { Request, Response, NextFunction } from 'express';
import { verifyToken, UserPayload } from '../config/jwt.js';
import { isRevoked } from '../utils/tokenBlacklist.js';
import { db } from '../db/database.js';

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
    return res.status(401).json({ error: 'Token has been revoked' });
  }

  const user = verifyToken(token);
  if (!user) {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }

  // ── VAPT Fix #7: User session & Single-session validation ──────────────
  // Verify that the user exists in the database, is active, and the token's
  // signature matches the stored activeTokenSig.
  try {
    const tokenSig = token.split('.')[2];
    const row = db
      .prepare('SELECT status, activeTokenSig FROM users WHERE LOWER(email) = LOWER(?)')
      .get(user.email) as { status: string; activeTokenSig: string | null } | undefined;

    if (!row) {
      return res.status(401).json({ error: 'User account no longer exists' });
    }

    if (row.status !== 'active') {
      return res.status(401).json({ error: 'This account has been deactivated' });
    }

    if (row.activeTokenSig !== null && row.activeTokenSig !== tokenSig) {
      return res.status(401).json({
        error: 'SESSION_EXPIRED',
        message: 'Your session has ended because you signed in from another location.',
      });
    }
  } catch (e) {
    console.error('[auth middleware] user session verification check failed:', (e as Error).message);
  }

  req.user = user;
  next();
}
