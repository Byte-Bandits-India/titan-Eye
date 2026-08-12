import { Request, Response, Router } from 'express';
import { ParamsDictionary } from 'express-serve-static-core';

import type { ErrorResponse, ManagedUserResponse } from '../types.js';

import { SESSION_IDLE_MS } from '../config/jwt.js';
import { all, get, run, UserRow } from '../db/database.js';
import { AuthenticatedRequest } from '../middleware/auth.js';
import { hashPassword } from '../utils/hash.js';
import { logger, logSecurityEvent } from '../utils/logger.js';
import { broadcastEvent } from '../utils/sse.js';

// activeTokenSig is only cleared on explicit logout, not on token expiry, so a
// non-null value alone doesn't mean the session is still live — also require
// the login to be within the token's lifetime.
function isSessionLive(u: Pick<UserRow, 'activeTokenSig' | 'lastLogin'>): boolean {
  if (!u.activeTokenSig || !u.lastLogin) {return false;}

  return Date.now() - new Date(u.lastLogin).getTime() < SESSION_IDLE_MS;
}

const router = Router();

const VALID_ROLES = ['store', 'optom', 'admin'];

interface CreateUserBody {
  email?: string;
  mobile?: string;
  name?: string;
  password?: string;
  role?: string;
  storeName?: string;
}

type DeleteUserResponseBody = ErrorResponse | { ok: true };

type ManagedUserResponseBody = ErrorResponse | ManagedUserResponse;

interface UpdateStatusBody {
  status?: string;
}

type UpdateStatusResponseBody = ErrorResponse | { email: string; status: string };
interface UpdateUserBody {
  mobile?: string;
  name?: string;
  password?: string;
  role?: string;
  storeName?: string;
}
type UserListResponseBody = ErrorResponse | ManagedUserResponse[];

function getFormattedTimestamp(): string {
  return new Date().toLocaleString('en-US', {
    day: 'numeric',
    hour: 'numeric',
    hour12: true,
    minute: '2-digit',
    month: 'short',
    second: '2-digit',
    year: 'numeric',
  });
}

function requireAdmin(req: AuthenticatedRequest, res: Response, next: () => void) {
  if (!req.user || req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Admin access required' });
  }

  next();
}

router.get('/', async (_req: AuthenticatedRequest, res: Response<UserListResponseBody>) => {
  try {
    const rows = await all<UserRow>('SELECT email, name, role, storeName, mobile, lastLogin, status, activeTokenSig FROM users ORDER BY email');
    const result = rows.map((u) => ({
      email: u.email,
      isLoggedIn: isSessionLive(u),
      lastLogin: u.lastLogin,
      mobile: u.mobile,
      name: u.name,
      role: u.role,
      status: u.status,
      storeName: u.storeName,
    }));

    return res.json(result);
  } catch (err) {
    const error = err as Error;
    logger.error('Fetch users error', { errorMessage: error.message, requestId: _req.requestId });

    return res.status(500).json({ error: 'Internal server error' });
  }
});

router.use(requireAdmin);

router.post('/', async (req: Request<ParamsDictionary, ManagedUserResponseBody, CreateUserBody>, res: Response<ManagedUserResponseBody>) => {
  try {
    const { email, mobile, name, password, role, storeName } = req.body;

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

    const adminReq = req as unknown as AuthenticatedRequest;
    const adminEmail = adminReq.user?.email || 'admin@gmail.com';
    const adminName = adminReq.user?.name || 'Admin';
    const timestamp = getFormattedTimestamp();

    await run(
      'INSERT INTO admin_logs (adminEmail, adminName, action, target, details, timestamp) VALUES (?, ?, ?, ?, ?, ?)',
      [adminEmail, adminName, 'USER_CREATED', normalizedEmail, `Role: ${role.toUpperCase()}, Name: ${name.trim()}${finalStoreName ? `, Store: ${finalStoreName}` : ''}`, timestamp]
    );
    broadcastEvent('ADMIN_LOG_CREATED', { action: 'USER_CREATED', target: normalizedEmail });
    broadcastEvent('USER_CREATED', { email: normalizedEmail, name: name.trim(), role });
    logSecurityEvent('ADMIN_USER_CREATED', { adminEmail, requestId: req.requestId, role, target: normalizedEmail });

    return res.status(201).json({
      email: normalizedEmail,
      lastLogin: null,
      mobile: mobile || null,
      name: name.trim(),
      role,
      status: 'active',
      storeName: finalStoreName,
    });
  } catch (err) {
    const error = err as Error;
    logger.error('Create user error', { errorMessage: error.message, requestId: req.requestId });

    return res.status(500).json({ error: 'Internal server error' });
  }
});

router.put('/:email', async (req: Request<{ email: string }, ManagedUserResponseBody, UpdateUserBody>, res: Response<ManagedUserResponseBody>) => {
  try {
    const email = String(req.params.email);
    const { mobile, name, password, role, storeName } = req.body;

    const existing = await get<UserRow>(
      'SELECT email, name, role, storeName, mobile, lastLogin, status, password FROM users WHERE LOWER(email) = LOWER(?)',
      [email]
    );

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

    const adminReq = req as unknown as AuthenticatedRequest;
    const adminEmail = adminReq.user?.email || 'admin@gmail.com';
    const adminName = adminReq.user?.name || 'Admin';
    const timestamp = getFormattedTimestamp();

    await run(
      'INSERT INTO admin_logs (adminEmail, adminName, action, target, details, timestamp) VALUES (?, ?, ?, ?, ?, ?)',
      [adminEmail, adminName, 'USER_UPDATED', existing.email, `Role: ${role.toUpperCase()}, Name: ${name.trim()}`, timestamp]
    );
    broadcastEvent('ADMIN_LOG_CREATED', { action: 'USER_UPDATED', target: existing.email });
    broadcastEvent('USER_UPDATED', { email: existing.email, name: name.trim(), role });
    logSecurityEvent('ADMIN_USER_UPDATED', {
      adminEmail,
      passwordChanged: Boolean(password),
      requestId: req.requestId,
      role,
      target: existing.email,
    });

    return res.json({
      email: existing.email,
      lastLogin: existing.lastLogin,
      mobile: mobile || null,
      name: name.trim(),
      role,
      status: existing.status,
      storeName: finalStoreName,
    });
  } catch (err) {
    const error = err as Error;
    logger.error('Update user error', { errorMessage: error.message, requestId: req.requestId });

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

    const adminEmail = req.user?.email || 'admin@gmail.com';
    const adminName = req.user?.name || 'Admin';
    const timestamp = getFormattedTimestamp();

    await run(
      'INSERT INTO admin_logs (adminEmail, adminName, action, target, details, timestamp) VALUES (?, ?, ?, ?, ?, ?)',
      [adminEmail, adminName, 'USER_DELETED', existing.email, `Deleted user account ${existing.email}`, timestamp]
    );
    broadcastEvent('ADMIN_LOG_CREATED', { action: 'USER_DELETED', target: existing.email });
    broadcastEvent('USER_DELETED', { email: existing.email });
    logSecurityEvent('ADMIN_USER_DELETED', { adminEmail, requestId: req.requestId, target: existing.email });

    return res.json({ ok: true });
  } catch (err) {
    const error = err as Error;
    logger.error('Delete user error', { errorMessage: error.message, requestId: req.requestId });

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

    const adminReq = req as unknown as AuthenticatedRequest;
    const adminEmail = adminReq.user?.email || 'admin@gmail.com';
    const adminName = adminReq.user?.name || 'Admin';
    const timestamp = getFormattedTimestamp();

    await run(
      'INSERT INTO admin_logs (adminEmail, adminName, action, target, details, timestamp) VALUES (?, ?, ?, ?, ?, ?)',
      [adminEmail, adminName, 'USER_STATUS_CHANGE', existing.email, `Account status updated to ${status.toUpperCase()}`, timestamp]
    );
    broadcastEvent('ADMIN_LOG_CREATED', { action: 'USER_STATUS_CHANGE', target: existing.email });
    broadcastEvent('USER_STATUS_CHANGE', { email: existing.email, status });
    logSecurityEvent('ADMIN_USER_STATUS_CHANGE', { adminEmail, requestId: req.requestId, status, target: existing.email });

    return res.json({ email: existing.email, status });
  } catch (err) {
    const error = err as Error;
    logger.error('Update user status error', { errorMessage: error.message, requestId: req.requestId });

    return res.status(500).json({ error: 'Internal server error' });
  }
});

// activeTokenSig is only cleared on explicit logout, so a session that simply
// times out never pushes a status change on its own. Sweep periodically and
// broadcast USER_UPDATED for anyone whose session has just gone stale, so
// clients see the "Available" status flip live instead of on next refetch.
setInterval(async () => {
  try {
    const cutoff = new Date(Date.now() - SESSION_IDLE_MS).toISOString();
    const staleUsers = await all<Pick<UserRow, 'email' | 'lastLogin' | 'name' | 'role' | 'status'>>(
      `SELECT email, name, role, status, lastLogin FROM users WHERE activeTokenSig IS NOT NULL AND lastLogin < ?`,
      [cutoff]
    );

    for (const u of staleUsers) {
      await run('UPDATE users SET activeTokenSig = NULL WHERE email = ?', [u.email]);
      broadcastEvent('USER_UPDATED', {
        email: u.email,
        isLoggedIn: false,
        lastLogin: u.lastLogin,
        name: u.name,
        role: u.role,
        status: u.status,
      });
    }
  } catch (err) {
    logger.error('Session expiry sweep failed', { errorMessage: (err as Error).message });
  }
}, 60 * 1000);

export default router;
