import { Router } from 'express';
import { get } from '../db/database.js';
import { generateToken } from '../config/jwt.js';
import { verifyPassword } from '../utils/hash.js';
import { revokeToken } from '../utils/tokenBlacklist.js';

const router = Router();

router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }
    const user = await get('SELECT email, name, role, storeName, password FROM users WHERE LOWER(email) = LOWER(?)', [email.trim()]);
    if (user && verifyPassword(password, user.password)) {
      const token = generateToken({ email: user.email, name: user.name, role: user.role, storeName: user.storeName });
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
  } catch (err: any) {
    console.error('Login error:', err.message);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/logout', (req, res) => {
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

