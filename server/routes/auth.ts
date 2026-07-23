import { Router, Request, Response } from 'express';
import { ParamsDictionary } from 'express-serve-static-core';
import { db, get, run, UserRow } from '../db/database.js';
import { generateToken, verifyToken } from '../config/jwt.js';
import { verifyPassword } from '../utils/hash.js';
import { revokeToken } from '../utils/tokenBlacklist.js';
import { authenticateToken, AuthenticatedRequest } from '../middleware/auth.js';
import type { AuthUserResponse, ErrorResponse } from '../types.js';

const router = Router();

// ─── VAPT Security Constants ───────────────────────────────────────────────
const LOCKOUT_THRESHOLD    = 5;                      // failed attempts before lockout
const LOCKOUT_DURATION_MS  = 30 * 60 * 1000;         // 30 minutes lockout
const SESSION_IDLE_MS      = 60 * 60 * 1000;          // 1 hour idle timeout (server-side expiry in JWT)
const TOKEN_MAX_AGE_MS     = 24 * 60 * 60 * 1000;    // 24 hours absolute token max age

interface LoginBody {
  email?: string;
  password?: string;
}

type LoginResponseBody = { user: AuthUserResponse } | ErrorResponse;

// ─── POST /login ──────────────────────────────────────────────────────────
router.post('/login', async (req: Request<ParamsDictionary, LoginResponseBody, LoginBody>, res: Response<LoginResponseBody>) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    const user = await get<UserRow>(
      `SELECT email, name, role, storeName, status, password,
              failedLoginAttempts, lockedUntil, activeTokenSig
       FROM users WHERE LOWER(email) = LOWER(?)`,
      [email.trim()]
    );

    // ── VAPT Fix #21: Account lockout check ────────────────────────────
    if (user && user.lockedUntil) {
      const lockExpiry = new Date(user.lockedUntil).getTime();
      if (Date.now() < lockExpiry) {
        const minutesLeft = Math.ceil((lockExpiry - Date.now()) / 60000);
        return res.status(423).json({
          error: `Account locked due to too many failed attempts. Try again in ${minutesLeft} minute(s).`
        });
      }
      // Lock expired — reset counter
      await run('UPDATE users SET failedLoginAttempts = 0, lockedUntil = NULL WHERE email = ?', [user.email]);
    }

    if (user && verifyPassword(password, user.password)) {
      if (user.status === 'inactive') {
        return res.status(403).json({ error: 'This account has been deactivated' });
      }

      // ── VAPT Fix #7 + #8: Generate token, store signature for single-session ─
      const token = generateToken(
        { email: user.email, name: user.name, role: user.role, storeName: user.storeName ?? undefined },
        SESSION_IDLE_MS  // token expires after 1 hour of issue (idle timeout)
      );
      const newTokenSig = token.split('.')[2]; // JWT signature part

      // Revoke any previous active token from the blacklist isn't possible without
      // the full old token, but setting activeTokenSig to the new value invalidates
      // the old session in the middleware check.
      await run(
        `UPDATE users SET lastLogin = ?, failedLoginAttempts = 0, lockedUntil = NULL, activeTokenSig = ?
         WHERE email = ?`,
        [new Date().toISOString(), newTokenSig, user.email]
      );

      res.cookie('token', token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: TOKEN_MAX_AGE_MS,
      });

      // ── VAPT Fix #8/#14: Do NOT return token in the JSON body ──────────
      return res.json({
        user: {
          email: user.email,
          name:  user.name,
          role:  user.role,
          storeName: user.storeName,
        },
      });
    } else {
      // ── VAPT Fix #21: Increment failed attempts on wrong password ──────
      if (user) {
        const newCount = (user.failedLoginAttempts || 0) + 1;
        if (newCount >= LOCKOUT_THRESHOLD) {
          const lockUntil = new Date(Date.now() + LOCKOUT_DURATION_MS).toISOString();
          await run(
            'UPDATE users SET failedLoginAttempts = ?, lockedUntil = ? WHERE email = ?',
            [newCount, lockUntil, user.email]
          );
          return res.status(423).json({
            error: 'Account locked due to too many failed attempts. Try again after 30 minutes.'
          });
        }
        await run('UPDATE users SET failedLoginAttempts = ? WHERE email = ?', [newCount, user.email]);
      }
      return res.status(401).json({ error: 'Invalid email or password' });
    }
  } catch (err) {
    const error = err as Error;
    console.error('Login error:', error.message);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// ─── GET /me ──────────────────────────────────────────────────────────────
type MeResponseBody = { user: AuthUserResponse } | ErrorResponse;

router.get('/me', authenticateToken, async (req: AuthenticatedRequest, res: Response<MeResponseBody>) => {
  try {
    const email = req.user!.email;
    const user = await get<UserRow>(
      'SELECT email, name, role, storeName, mobile, microsoftUpn, status FROM users WHERE LOWER(email) = LOWER(?)',
      [email]
    );
    if (!user || user.status === 'inactive') {
      return res.status(401).json({ error: 'Session is no longer valid' });
    }
    // ── VAPT Fix #8: No token in JSON body, return current user profile ────────────
    return res.json({
      user: {
        email:        user.email,
        name:         user.name,
        role:         user.role,
        storeName:    user.storeName,
        mobile:       user.mobile,
        microsoftUpn: user.microsoftUpn,
      },
    });
  } catch (err) {
    const error = err as Error;
    console.error('Fetch current user error:', error.message);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// ─── POST /logout ─────────────────────────────────────────────────────────
type LogoutResponseBody = { ok: true; message: string };

router.post('/logout', (req: Request, res: Response<LogoutResponseBody>) => {
  let token = req.cookies?.token;
  if (!token) {
    const authHeader = req.headers['authorization'];
    token = authHeader && authHeader.split(' ')[1];
  }

  if (token) {
    revokeToken(token);
    // ── VAPT Fix #7: Clear activeTokenSig so old token is invalidated ──
    const payload = verifyToken(token);
    if (payload) {
      try {
        db.prepare('UPDATE users SET activeTokenSig = NULL WHERE LOWER(email) = LOWER(?)').run(payload.email);
      } catch (e) {
        // non-fatal
      }
    }
  }

  res.clearCookie('token', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
  });

  return res.json({ ok: true, message: 'Logged out successfully' });
});

export default router;
