import { Router } from 'express';
import { get } from '../db/database.js';
import { generateToken } from '../config/jwt.js';

const router = Router();

router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }
    const user = await get('SELECT email, name, role FROM users WHERE LOWER(email) = LOWER(?) AND password = ?', [email.trim(), password]);
    if (user) {
      const token = generateToken({ email: user.email, name: user.name, role: user.role });
      return res.json({ user: { ...user, token } });
    } else {
      return res.status(401).json({ error: 'Invalid email or password' });
    }
  } catch (err: any) {
    console.error('Login error:', err.message);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
