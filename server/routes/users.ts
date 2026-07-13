import { Router, Request, Response } from 'express';
import { ParamsDictionary } from 'express-serve-static-core';
import { AuthenticatedRequest } from '../middleware/auth.js';
import { all, run, get, UserRow } from '../db/database.js';
import { hashPassword } from '../utils/hash.js';
import type { ManagedUserResponse, ErrorResponse } from '../types.js';

const router = Router();

const VALID_ROLES = ['store', 'optum', 'admin'];

interface CreateUserBody {
  email?: string;
  name?: string;
  password?: string;
  role?: string;
  mobile?: string;
  storeName?: string;
}

interface UpdateUserBody {
  name?: string;
  password?: string;
  role?: string;
  mobile?: string;
  storeName?: string;
}

interface UpdateStatusBody {
  status?: string;
}

type UserListResponseBody = Omit<UserRow, 'password' | 'azureObjectId' | 'microsoftUpn'>[] | ErrorResponse;
type ManagedUserResponseBody = ManagedUserResponse | ErrorResponse;
type DeleteUserResponseBody = { ok: true } | ErrorResponse;
type UpdateStatusResponseBody = { email: string; status: string } | ErrorResponse;

function requireAdmin(req: AuthenticatedRequest, res: Response, next: () => void) {
  if (!req.user || req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Admin access required' });
  }
  next();
}

router.use(requireAdmin);

router.get('/', async (_req: AuthenticatedRequest, res: Response<UserListResponseBody>) => {
  try {
    const rows = await all<Omit<UserRow, 'password' | 'azureObjectId' | 'microsoftUpn'>>('SELECT email, name, role, storeName, mobile, lastLogin, status FROM users ORDER BY email');
    return res.json(rows);
  } catch (err) {
    const error = err as Error;
    console.error('Fetch users error:', error.message);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/', async (req: Request<ParamsDictionary, ManagedUserResponseBody, CreateUserBody>, res: Response<ManagedUserResponseBody>) => {
  try {
    const { email, name, password, role, mobile, storeName } = req.body;

    if (!email || typeof email !== 'string' || !email.trim()) {
      return res.status(400).json({ error: 'Email is required' });
    }
    if (!name || typeof name !== 'string' || !name.trim()) {
      return res.status(400).json({ error: 'Name is required' });
    }
    if (!password || typeof password !== 'string' || password.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters' });
    }
    if (!role || !VALID_ROLES.includes(role)) {
      return res.status(400).json({ error: `Role must be one of: ${VALID_ROLES.join(', ')}` });
    }

    const normalizedEmail = email.trim().toLowerCase();
    const existing = await get<{ email: string }>('SELECT email FROM users WHERE LOWER(email) = ?', [normalizedEmail]);
    if (existing) {
      return res.status(409).json({ error: 'A user with this email already exists' });
    }

    const finalStoreName = role === 'store' ? (storeName || null) : null;

    await run(
      'INSERT INTO users (email, name, role, storeName, mobile, status, password) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [normalizedEmail, name.trim(), role, finalStoreName, mobile || null, 'active', hashPassword(password)]
    );

    return res.status(201).json({
      email: normalizedEmail,
      name: name.trim(),
      role,
      storeName: finalStoreName,
      mobile: mobile || null,
      lastLogin: null,
      status: 'active',
    });
  } catch (err) {
    const error = err as Error;
    console.error('Create user error:', error.message);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

router.put('/:email', async (req: Request<{ email: string }, ManagedUserResponseBody, UpdateUserBody>, res: Response<ManagedUserResponseBody>) => {
  try {
    const email = String(req.params.email);
    const { name, password, role, mobile, storeName } = req.body;

    const existing = await get<UserRow>('SELECT * FROM users WHERE LOWER(email) = LOWER(?)', [email]);
    if (!existing) {
      return res.status(404).json({ error: 'User not found' });
    }
    if (!name || typeof name !== 'string' || !name.trim()) {
      return res.status(400).json({ error: 'Name is required' });
    }
    if (!role || !VALID_ROLES.includes(role)) {
      return res.status(400).json({ error: `Role must be one of: ${VALID_ROLES.join(', ')}` });
    }
    if (password !== undefined && password !== '' && (typeof password !== 'string' || password.length < 6)) {
      return res.status(400).json({ error: 'Password must be at least 6 characters' });
    }

    const finalStoreName = role === 'store' ? (storeName || null) : null;
    const newPassword = password ? hashPassword(password) : existing.password;

    await run(
      'UPDATE users SET name = ?, role = ?, storeName = ?, mobile = ?, password = ? WHERE LOWER(email) = LOWER(?)',
      [name.trim(), role, finalStoreName, mobile || null, newPassword, email]
    );

    return res.json({
      email: existing.email,
      name: name.trim(),
      role,
      storeName: finalStoreName,
      mobile: mobile || null,
      lastLogin: existing.lastLogin,
      status: existing.status,
    });
  } catch (err) {
    const error = err as Error;
    console.error('Update user error:', error.message);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

router.delete('/:email', async (req: AuthenticatedRequest, res: Response<DeleteUserResponseBody>) => {
  try {
    const email = String(req.params.email);

    if (req.user && req.user.email.toLowerCase() === email.toLowerCase()) {
      return res.status(400).json({ error: 'You cannot delete your own account' });
    }

    const existing = await get<{ email: string }>('SELECT email FROM users WHERE LOWER(email) = LOWER(?)', [email]);
    if (!existing) {
      return res.status(404).json({ error: 'User not found' });
    }

    await run('DELETE FROM users WHERE LOWER(email) = LOWER(?)', [email]);
    return res.json({ ok: true });
  } catch (err) {
    const error = err as Error;
    console.error('Delete user error:', error.message);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

router.put('/:email/status', async (req: Request<{ email: string }, UpdateStatusResponseBody, UpdateStatusBody>, res: Response<UpdateStatusResponseBody>) => {
  try {
    const email = String(req.params.email);
    const { status } = req.body;

    if (status !== 'active' && status !== 'inactive') {
      return res.status(400).json({ error: "Status must be 'active' or 'inactive'" });
    }

    const existing = await get<{ email: string }>('SELECT email FROM users WHERE LOWER(email) = LOWER(?)', [email]);
    if (!existing) {
      return res.status(404).json({ error: 'User not found' });
    }

    await run('UPDATE users SET status = ? WHERE LOWER(email) = LOWER(?)', [status, email]);
    return res.json({ email: existing.email, status });
  } catch (err) {
    const error = err as Error;
    console.error('Update user status error:', error.message);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
