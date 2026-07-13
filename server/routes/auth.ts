import { Router, Request, Response } from 'express';
import { ParamsDictionary } from 'express-serve-static-core';
import { get, run, UserRow } from '../db/database.js';
import { generateToken } from '../config/jwt.js';
import { verifyPassword } from '../utils/hash.js';
import { revokeToken } from '../utils/tokenBlacklist.js';
import { authenticateToken, AuthenticatedRequest } from '../middleware/auth.js';
import type { AuthUserResponse, ErrorResponse } from '../types.js';

const router = Router();

interface LoginBody {
  email?: string;
  password?: string;
}

type LoginResponseBody = { user: AuthUserResponse } | ErrorResponse;

router.post('/login', async (req: Request<ParamsDictionary, LoginResponseBody, LoginBody>, res: Response<LoginResponseBody>) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }
    const user = await get<UserRow>('SELECT email, name, role, storeName, status, password FROM users WHERE LOWER(email) = LOWER(?)', [email.trim()]);
    if (user && verifyPassword(password, user.password)) {
      if (user.status === 'inactive') {
        return res.status(403).json({ error: 'This account has been deactivated' });
      }
      await run('UPDATE users SET lastLogin = ? WHERE email = ?', [new Date().toISOString(), user.email]);
      const token = generateToken({ email: user.email, name: user.name, role: user.role, storeName: user.storeName ?? undefined });
      res.cookie('token', token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: 24 * 60 * 60 * 1000
      });
      return res.json({ user: { email: user.email, name: user.name, role: user.role, storeName: user.storeName, token } });
    } else {
      return res.status(401).json({ error: 'Invalid email or password' });
    }
  } catch (err) {
    const error = err as Error;
    console.error('Login error:', error.message);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

type MeResponseBody = { user: AuthUserResponse } | ErrorResponse;

router.get('/me', authenticateToken, async (req: AuthenticatedRequest, res: Response<MeResponseBody>) => {
  try {
    const email = req.user!.email;
    const user = await get<UserRow>('SELECT email, name, role, storeName, mobile, microsoftUpn, status FROM users WHERE LOWER(email) = LOWER(?)', [email]);
    if (!user || user.status === 'inactive') {
      return res.status(401).json({ error: 'Session is no longer valid' });
    }
    const token = generateToken({ email: user.email, name: user.name, role: user.role, storeName: user.storeName ?? undefined });
    return res.json({
      user: {
        email: user.email,
        name: user.name,
        role: user.role,
        storeName: user.storeName,
        mobile: user.mobile,
        microsoftUpn: user.microsoftUpn,
        token,
      },
    });
  } catch (err) {
    const error = err as Error;
    console.error('Fetch current user error:', error.message);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

type LogoutResponseBody = { ok: true; message: string };

router.post('/logout', (req: Request, res: Response<LogoutResponseBody>) => {
  let token = req.cookies?.token;
  if (!token) {
    const authHeader = req.headers['authorization'];
    token = authHeader && authHeader.split(' ')[1];
  }

  if (token) {
    revokeToken(token);
  }

  res.clearCookie('token', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
  });

  return res.json({ ok: true, message: 'Logged out successfully' });
});

export default router;
