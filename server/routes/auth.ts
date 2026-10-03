import { Request, Response, Router } from 'express';
import { ParamsDictionary } from 'express-serve-static-core';

import type { AuthUserResponse, ErrorResponse } from '../types.js';

import { generateToken, getTtlSecondsForUser, verifyToken } from '../config/jwt.js';
import {
  AUTH_COOKIE_NAME,
  AUTH_COOKIE_PATH,
  getAuthCookieOptions,
  isConnectionSecure,
} from '../config/cookie.js';
import { db, get, run, UserRow } from '../db/database.js';
import { AuthenticatedRequest, authenticateToken } from '../middleware/auth.js';
import { generateCaptcha, verifyCaptcha } from '../utils/captcha.js';
import { verifyPassword } from '../utils/hash.js';
import { alertCritical, logger, logSecurityEvent } from '../utils/logger.js';
import { broadcastEvent } from '../utils/sse.js';
import { revokeToken } from '../utils/tokenBlacklist.js';

const router = Router();

const LOCKOUT_THRESHOLD = 5;
const LOCKOUT_DURATION_MS = 30 * 60 * 1000;

interface LoginBody {
  captchaId?: string;
  captchaSolution?: string;
  email?: string;
  password?: string;
  rememberMe?: boolean;
}

type LoginResponseBody = ErrorResponse | { user: AuthUserResponse };

router.get('/auth/captcha', (_req: Request, res: Response) => {
  const captcha = generateCaptcha();

  return res.json(captcha);
});

router.get('/captcha', (_req: Request, res: Response) => {
  const captcha = generateCaptcha();

  return res.json(captcha);
});

router.post(
  '/login',
  async (req: Request<ParamsDictionary, LoginResponseBody, LoginBody>, res: Response<LoginResponseBody>) => {
    try {
      const { captchaId, captchaSolution, email, password, rememberMe } = req.body;

      if (!email || !password) {
        return res.status(400).json({ error: 'Email and password are required' });
      }

      // Enforce CAPTCHA challenge-response verification against automated brute force & credential stuffing
      if (!captchaId || !captchaSolution || !verifyCaptcha(captchaId, captchaSolution)) {
        logSecurityEvent('LOGIN_CAPTCHA_FAILED', {
          email: email.trim(),
          ip: req.ip,
          requestId: req.requestId,
        });

        return res.status(400).json({
          error: 'Invalid or expired CAPTCHA code. Please enter the code shown in the image.',
        });
      }

      const user = await get<UserRow>(
        `SELECT email, name, role, storeName, status, password,
              failedLoginAttempts, lockedUntil, activeTokenSig
       FROM users WHERE LOWER(email) = LOWER(?)`,
        [email.trim()]
      );

      if (user && user.lockedUntil) {
        const lockExpiry = new Date(user.lockedUntil).getTime();

        if (Date.now() < lockExpiry) {
          const minutesLeft = Math.ceil((lockExpiry - Date.now()) / 60000);
          logSecurityEvent('LOGIN_BLOCKED_ACCOUNT_LOCKED', {
            email: user.email,
            ip: req.ip,
            requestId: req.requestId,
          });

          return res.status(423).json({
            error: `Account locked due to too many failed attempts. Try again in ${minutesLeft} minute(s).`,
          });
        }

        await run('UPDATE users SET failedLoginAttempts = 0, lockedUntil = NULL WHERE email = ?', [
          user.email,
        ]);
      }

      if (user && verifyPassword(password, user.password)) {
        if (user.status === 'inactive') {
          return res.status(403).json({ error: 'This account has been deactivated' });
        }

        const ttlSec = getTtlSecondsForUser(user.role, Boolean(rememberMe));
        const token = generateToken(
          { email: user.email, name: user.name, role: user.role, storeName: user.storeName ?? undefined },
          ttlSec
        );
        const newTokenSig = token.split('.')[2];
        const loginTimestamp = new Date().toISOString();

        await run(
          `UPDATE users SET lastLogin = ?, failedLoginAttempts = 0, lockedUntil = NULL, activeTokenSig = ?
         WHERE email = ?`,
          [loginTimestamp, newTokenSig, user.email]
        );

        broadcastEvent('USER_UPDATED', {
          email: user.email,
          isLoggedIn: true,
          lastLogin: loginTimestamp,
          name: user.name,
          role: user.role,
          status: user.status,
        });

        logSecurityEvent('LOGIN_SUCCESS', {
          email: user.email,
          ip: req.ip,
          requestId: req.requestId,
          role: user.role,
        });

        res.cookie(
          AUTH_COOKIE_NAME,
          token,
          getAuthCookieOptions(req, {
            maxAgeMs: rememberMe ? ttlSec * 1000 : undefined,
            sameSite: 'strict',
          })
        );

        return res.json({
          user: {
            email: user.email,
            name: user.name,
            role: user.role,
            storeName: user.storeName,
          },
        });
      }

      if (user) {
        const newCount = (user.failedLoginAttempts || 0) + 1;

        if (newCount >= LOCKOUT_THRESHOLD) {
          const lockUntil = new Date(Date.now() + LOCKOUT_DURATION_MS).toISOString();
          await run('UPDATE users SET failedLoginAttempts = ?, lockedUntil = ? WHERE email = ?', [
            newCount,
            lockUntil,
            user.email,
          ]);
          logSecurityEvent('ACCOUNT_LOCKED', {
            email: user.email,
            failedAttempts: newCount,
            ip: req.ip,
            requestId: req.requestId,
          });
          alertCritical('Account locked after repeated failed logins', {
            email: user.email,
            failedAttempts: newCount,
            ip: req.ip,
          });

          return res.status(423).json({
            error: 'Account locked due to too many failed attempts. Try again after 30 minutes.',
          });
        }

        await run('UPDATE users SET failedLoginAttempts = ? WHERE email = ?', [newCount, user.email]);
        logSecurityEvent('LOGIN_FAILED', {
          email: user.email,
          failedAttempts: newCount,
          ip: req.ip,
          requestId: req.requestId,
        });
      } else {
        logSecurityEvent('LOGIN_FAILED_UNKNOWN_EMAIL', { ip: req.ip, requestId: req.requestId });
      }

      return res.status(401).json({ error: 'Invalid email or password' });
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err));
      logger.error('Login error', { errorMessage: error.message, requestId: req.requestId });

      return res.status(500).json({ error: 'Internal server error' });
    }
  }
);

type MeResponseBody = ErrorResponse | { user: AuthUserResponse };

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

    if (req.user?.exp) {
      const nowSec = Math.floor(Date.now() / 1000);
      const expSec = req.user.exp < 100_000_000_000 ? req.user.exp : Math.floor(req.user.exp / 1000);
      const ttlSec = getTtlSecondsForUser(user.role, true);

      // If more than 50% of the token's lifetime has elapsed, slide/refresh token
      if (expSec - nowSec < ttlSec / 2) {
        const refreshedToken = generateToken(
          { email: user.email, name: user.name, role: user.role, storeName: user.storeName ?? undefined },
          ttlSec
        );
        const refreshedTokenSig = refreshedToken.split('.')[2];

        await run('UPDATE users SET activeTokenSig = ? WHERE LOWER(email) = LOWER(?)', [
          refreshedTokenSig,
          user.email,
        ]);

        res.cookie(
          AUTH_COOKIE_NAME,
          refreshedToken,
          getAuthCookieOptions(req, {
            maxAgeMs: ttlSec * 1000,
            sameSite: 'strict',
          })
        );
      }
    }

    return res.json({
      user: {
        email: user.email,
        microsoftUpn: user.microsoftUpn,
        mobile: user.mobile,
        name: user.name,
        role: user.role,
        storeName: user.storeName,
      },
    });
  } catch (err) {
    const error = err instanceof Error ? err : new Error(String(err));
    logger.error('Fetch current user error', { errorMessage: error.message, requestId: req.requestId });

    return res.status(500).json({ error: 'Internal server error' });
  }
});

type LogoutResponseBody = { message: string; ok: true };

router.post('/logout', (req: Request, res: Response<LogoutResponseBody>) => {
  let token = req.cookies?.token;

  if (!token) {
    const authHeader = req.headers['authorization'];
    token = authHeader && authHeader.split(' ')[1];
  }

  if (token) {
    revokeToken(token);
    const payload = verifyToken(token);

    if (payload) {
      try {
        db.prepare('UPDATE users SET activeTokenSig = NULL WHERE LOWER(email) = LOWER(?)').run(payload.email);
        broadcastEvent('USER_UPDATED', { email: payload.email, isLoggedIn: false });
        logSecurityEvent('LOGOUT', { email: payload.email, ip: req.ip, requestId: req.requestId });
      } catch (e) {
        logger.warn('Logout cleanup failed', {
          errorMessage: e instanceof Error ? e.message : String(e),
          requestId: req.requestId,
        });
      }
    }
  }

  const isSecure = isConnectionSecure(req);

  res.clearCookie(AUTH_COOKIE_NAME, {
    httpOnly: true,
    path: AUTH_COOKIE_PATH,
    sameSite: 'strict',
    secure: isSecure,
  });

  // Defense-in-depth: Clear legacy root path cookie to ensure seamless session migration
  res.clearCookie(AUTH_COOKIE_NAME, {
    httpOnly: true,
    path: '/',
    sameSite: 'strict',
    secure: isSecure,
  });

  return res.json({ message: 'Logged out successfully', ok: true });
});

export default router;
