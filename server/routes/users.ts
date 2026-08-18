import { Response, Router } from 'express';
import { ParamsDictionary } from 'express-serve-static-core';

import type { ErrorResponse, ManagedUserResponse } from '../types.js';

import { PRESENCE_IDLE_MS, SESSION_ABANDONED_MS } from '../config/jwt.js';
import { all, get, run, UserRow } from '../db/database.js';
import { AuthenticatedRequest } from '../middleware/auth.js';
import { hashPassword } from '../utils/hash.js';
import { logger, logSecurityEvent } from '../utils/logger.js';
import { broadcastEvent } from '../utils/sse.js';

// "Online" is derived purely from the app sending recent presence pings, not just a live
// session/token, so status drops to offline shortly after the app is closed rather than
// staying "online" for the full session-idle window.
function isPresenceOnline(u: Pick<UserRow, 'activeTokenSig' | 'lastPing'>): boolean {
  if (!u.activeTokenSig || !u.lastPing) {
    return false;
  }

  return Date.now() - new Date(u.lastPing).getTime() < PRESENCE_IDLE_MS;
}

const router = Router();

// In-memory snapshot of which users were online at the last presence sweep, used to broadcast
// USER_UPDATED only when a user's online state actually flips (not on every tick).
const onlineEmails = new Set<string>();

const VALID_ROLES = ['store', 'optometrist', 'admin'];
const STORE_CODE_REGEX = /^[A-Za-z0-9]{1,4}$/;

interface CreateUserBody {
  city?: string;
  email?: string;
  languages?: string[];
  location?: string;
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
  city?: string;
  languages?: string[];
  location?: string;
  mobile?: string;
  name?: string;
  password?: string;
  role?: string;
  storeName?: string;
}

function deriveName(role: string, email: string, name?: string, storeName?: string): string {
  if (role === 'optometrist' && name?.trim()) {
    return name.trim();
  }

  if (role === 'store' && storeName?.trim()) {
    return storeName.trim();
  }

  return email.split('@')[0];
}

function parseLanguages(raw: null | string): null | string[] {
  if (!raw) {
    return null;
  }

  try {
    const parsed = JSON.parse(raw);

    return Array.isArray(parsed) ? parsed.filter((v): v is string => typeof v === 'string') : null;
  } catch {
    return null;
  }
}

function serializeLanguages(role: string, languages?: string[]): null | string {
  if (role !== 'optometrist' || !Array.isArray(languages) || languages.length === 0) {
    return null;
  }

  return JSON.stringify(languages.filter((l) => typeof l === 'string' && l.trim()));
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
    const rows = await all<UserRow>(
      'SELECT email, name, role, storeName, mobile, location, city, languages, lastLogin, lastPing, status, activeTokenSig FROM users ORDER BY email'
    );
    const result = rows.map((u) => ({
      city: u.city,
      email: u.email,
      isLoggedIn: isPresenceOnline(u),
      languages: parseLanguages(u.languages),
      lastLogin: u.lastLogin,
      location: u.location,
      mobile: u.mobile,
      name: u.name,
      role: u.role,
      status: u.status,
      storeName: u.storeName,
    }));

    return res.json(result);
  } catch (err) {
    const error = err instanceof Error ? err : new Error(String(err));
    logger.error('Fetch users error', { errorMessage: error.message, requestId: _req.requestId });

    return res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/ping', async (req: AuthenticatedRequest, res: Response) => {
  if (!req.user?.email) {
    return res.status(401).json({ error: 'Not authenticated' });
  }

  try {
    await run('UPDATE users SET lastPing = ? WHERE LOWER(email) = LOWER(?)', [
      new Date().toISOString(),
      req.user.email,
    ]);

    return res.status(204).end();
  } catch (err) {
    const error = err instanceof Error ? err : new Error(String(err));
    logger.error('Presence ping error', { errorMessage: error.message, requestId: req.requestId });

    return res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/offline', async (req: AuthenticatedRequest, res: Response) => {
  if (!req.user?.email) {
    return res.status(401).json({ error: 'Not authenticated' });
  }

  try {
    const email = req.user.email;
    const wasOnline = onlineEmails.has(email.toLowerCase());

    await run('UPDATE users SET lastPing = NULL WHERE LOWER(email) = LOWER(?)', [email]);
    onlineEmails.delete(email.toLowerCase());

    if (wasOnline) {
      broadcastEvent('USER_UPDATED', { email, isLoggedIn: false });
    }

    return res.status(204).end();
  } catch (err) {
    const error = err instanceof Error ? err : new Error(String(err));
    logger.error('Presence offline error', { errorMessage: error.message, requestId: req.requestId });

    return res.status(500).json({ error: 'Internal server error' });
  }
});

router.use(requireAdmin);

router.post(
  '/',
  async (
    req: AuthenticatedRequest<ParamsDictionary, ManagedUserResponseBody, CreateUserBody>,
    res: Response<ManagedUserResponseBody>
  ) => {
    try {
      const { city, email, languages, location, mobile, name, password, role, storeName } = req.body;

      if (!email || typeof email !== 'string' || !email.trim()) {
        return res.status(400).json({ error: 'Email is required' });
      }

      if (!password || typeof password !== 'string' || password.length < 6) {
        return res.status(400).json({ error: 'Password must be at least 6 characters' });
      }

      if (!role || !VALID_ROLES.includes(role)) {
        return res.status(400).json({ error: `Role must be one of: ${VALID_ROLES.join(', ')}` });
      }

      if (role === 'store' && (!storeName || !STORE_CODE_REGEX.test(storeName.trim()))) {
        return res.status(400).json({ error: 'Store code must be at most 4 letters/digits' });
      }

      const normalizedEmail = email.trim().toLowerCase();
      const existing = await get<{ email: string }>('SELECT email FROM users WHERE LOWER(email) = ?', [
        normalizedEmail,
      ]);

      if (existing) {
        return res.status(409).json({ error: 'A user with this email already exists' });
      }

      const finalStoreName = role === 'store' ? storeName || null : null;
      const derivedName = deriveName(role, normalizedEmail, name, storeName);
      const finalLanguages = serializeLanguages(role, languages);

      await run(
        'INSERT INTO users (email, name, role, storeName, mobile, location, city, languages, status, password) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
        [
          normalizedEmail,
          derivedName,
          role,
          finalStoreName,
          mobile || null,
          location || null,
          city || null,
          finalLanguages,
          'active',
          hashPassword(password),
        ]
      );

      const adminEmail = req.user?.email || 'admin@gmail.com';
      const adminName = req.user?.name || 'Admin';
      const timestamp = getFormattedTimestamp();

      await run(
        'INSERT INTO admin_logs (adminEmail, adminName, action, target, details, timestamp) VALUES (?, ?, ?, ?, ?, ?)',
        [
          adminEmail,
          adminName,
          'USER_CREATED',
          normalizedEmail,
          `Role: ${role.toUpperCase()}${finalStoreName ? `, Store: ${finalStoreName}` : ''}`,
          timestamp,
        ]
      );
      broadcastEvent('ADMIN_LOG_CREATED', { action: 'USER_CREATED', target: normalizedEmail });
      broadcastEvent('USER_CREATED', { email: normalizedEmail, name: derivedName, role });
      logSecurityEvent('ADMIN_USER_CREATED', {
        adminEmail,
        requestId: req.requestId,
        role,
        target: normalizedEmail,
      });

      return res.status(201).json({
        city: city || null,
        email: normalizedEmail,
        languages: parseLanguages(finalLanguages),
        lastLogin: null,
        location: location || null,
        mobile: mobile || null,
        name: derivedName,
        role,
        status: 'active',
        storeName: finalStoreName,
      });
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err));
      logger.error('Create user error', { errorMessage: error.message, requestId: req.requestId });

      return res.status(500).json({ error: 'Internal server error' });
    }
  }
);

router.put(
  '/:email',
  async (
    req: AuthenticatedRequest<{ email: string }, ManagedUserResponseBody, UpdateUserBody>,
    res: Response<ManagedUserResponseBody>
  ) => {
    try {
      const email = String(req.params.email);
      const { city, languages, location, mobile, name, password, role, storeName } = req.body;

      const existing = await get<UserRow>(
        'SELECT email, name, role, storeName, mobile, location, city, languages, lastLogin, status, password FROM users WHERE LOWER(email) = LOWER(?)',
        [email]
      );

      if (!existing) {
        return res.status(404).json({ error: 'User not found' });
      }

      if (!role || !VALID_ROLES.includes(role)) {
        return res.status(400).json({ error: `Role must be one of: ${VALID_ROLES.join(', ')}` });
      }

      if (role === 'store' && (!storeName || !STORE_CODE_REGEX.test(storeName.trim()))) {
        return res.status(400).json({ error: 'Store code must be at most 4 letters/digits' });
      }

      if (
        password !== undefined &&
        password !== '' &&
        (typeof password !== 'string' || password.length < 6)
      ) {
        return res.status(400).json({ error: 'Password must be at least 6 characters' });
      }

      const finalStoreName = role === 'store' ? storeName || null : null;
      const newPassword = password ? hashPassword(password) : existing.password;
      const derivedName = deriveName(role, existing.email, name, storeName);
      const finalLanguages = serializeLanguages(role, languages);

      await run(
        'UPDATE users SET name = ?, role = ?, storeName = ?, mobile = ?, location = ?, city = ?, languages = ?, password = ? WHERE LOWER(email) = LOWER(?)',
        [
          derivedName,
          role,
          finalStoreName,
          mobile || null,
          location || null,
          city || null,
          finalLanguages,
          newPassword,
          email,
        ]
      );

      const adminEmail = req.user?.email || 'admin@gmail.com';
      const adminName = req.user?.name || 'Admin';
      const timestamp = getFormattedTimestamp();

      await run(
        'INSERT INTO admin_logs (adminEmail, adminName, action, target, details, timestamp) VALUES (?, ?, ?, ?, ?, ?)',
        [adminEmail, adminName, 'USER_UPDATED', existing.email, `Role: ${role.toUpperCase()}`, timestamp]
      );
      broadcastEvent('ADMIN_LOG_CREATED', { action: 'USER_UPDATED', target: existing.email });
      broadcastEvent('USER_UPDATED', { email: existing.email, name: derivedName, role });
      logSecurityEvent('ADMIN_USER_UPDATED', {
        adminEmail,
        passwordChanged: Boolean(password),
        requestId: req.requestId,
        role,
        target: existing.email,
      });

      return res.json({
        city: city || null,
        email: existing.email,
        languages: parseLanguages(finalLanguages),
        lastLogin: existing.lastLogin,
        location: location || null,
        mobile: mobile || null,
        name: derivedName,
        role,
        status: existing.status,
        storeName: finalStoreName,
      });
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err));
      logger.error('Update user error', { errorMessage: error.message, requestId: req.requestId });

      return res.status(500).json({ error: 'Internal server error' });
    }
  }
);

router.delete('/:email', async (req: AuthenticatedRequest, res: Response<DeleteUserResponseBody>) => {
  try {
    const email = String(req.params.email);

    if (req.user && req.user.email.toLowerCase() === email.toLowerCase()) {
      return res.status(400).json({ error: 'You cannot delete your own account' });
    }

    const existing = await get<{ email: string }>('SELECT email FROM users WHERE LOWER(email) = LOWER(?)', [
      email,
    ]);

    if (!existing) {
      return res.status(404).json({ error: 'User not found' });
    }

    await run('DELETE FROM users WHERE LOWER(email) = LOWER(?)', [email]);

    const adminEmail = req.user?.email || 'admin@gmail.com';
    const adminName = req.user?.name || 'Admin';
    const timestamp = getFormattedTimestamp();

    await run(
      'INSERT INTO admin_logs (adminEmail, adminName, action, target, details, timestamp) VALUES (?, ?, ?, ?, ?, ?)',
      [
        adminEmail,
        adminName,
        'USER_DELETED',
        existing.email,
        `Deleted user account ${existing.email}`,
        timestamp,
      ]
    );
    broadcastEvent('ADMIN_LOG_CREATED', { action: 'USER_DELETED', target: existing.email });
    broadcastEvent('USER_DELETED', { email: existing.email });
    logSecurityEvent('ADMIN_USER_DELETED', { adminEmail, requestId: req.requestId, target: existing.email });

    return res.json({ ok: true });
  } catch (err) {
    const error = err instanceof Error ? err : new Error(String(err));
    logger.error('Delete user error', { errorMessage: error.message, requestId: req.requestId });

    return res.status(500).json({ error: 'Internal server error' });
  }
});

router.put(
  '/:email/status',
  async (
    req: AuthenticatedRequest<{ email: string }, UpdateStatusResponseBody, UpdateStatusBody>,
    res: Response<UpdateStatusResponseBody>
  ) => {
    try {
      const email = String(req.params.email);
      const { status } = req.body;

      if (status !== 'active' && status !== 'inactive') {
        return res.status(400).json({ error: "Status must be 'active' or 'inactive'" });
      }

      const existing = await get<{ email: string }>('SELECT email FROM users WHERE LOWER(email) = LOWER(?)', [
        email,
      ]);

      if (!existing) {
        return res.status(404).json({ error: 'User not found' });
      }

      await run('UPDATE users SET status = ? WHERE LOWER(email) = LOWER(?)', [status, email]);

      const adminEmail = req.user?.email || 'admin@gmail.com';
      const adminName = req.user?.name || 'Admin';
      const timestamp = getFormattedTimestamp();

      await run(
        'INSERT INTO admin_logs (adminEmail, adminName, action, target, details, timestamp) VALUES (?, ?, ?, ?, ?, ?)',
        [
          adminEmail,
          adminName,
          'USER_STATUS_CHANGE',
          existing.email,
          `Account status updated to ${status.toUpperCase()}`,
          timestamp,
        ]
      );
      broadcastEvent('ADMIN_LOG_CREATED', { action: 'USER_STATUS_CHANGE', target: existing.email });
      broadcastEvent('USER_STATUS_CHANGE', { email: existing.email, status });
      logSecurityEvent('ADMIN_USER_STATUS_CHANGE', {
        adminEmail,
        requestId: req.requestId,
        status,
        target: existing.email,
      });

      return res.json({ email: existing.email, status });
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err));
      logger.error('Update user status error', { errorMessage: error.message, requestId: req.requestId });

      return res.status(500).json({ error: 'Internal server error' });
    }
  }
);

// Abandoned-session sweep: sessions are meant to last as long as the app stays open (pings keep
// arriving), so this only invalidates a token once pings have stopped for a long grace period —
// i.e. the tab was actually closed/crashed without the pagehide beacon firing — not on a fixed
// clock from login time.
setInterval(async () => {
  try {
    const cutoff = new Date(Date.now() - SESSION_ABANDONED_MS).toISOString();
    const staleUsers = await all<Pick<UserRow, 'email' | 'lastLogin' | 'name' | 'role' | 'status'>>(
      `SELECT email, name, role, status, lastLogin FROM users WHERE activeTokenSig IS NOT NULL AND COALESCE(lastPing, lastLogin) < ?`,
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
    logger.error('Session expiry sweep failed', {
      errorMessage: err instanceof Error ? err.message : String(err),
    });
  }
}, 60 * 1000);

// Presence sweep: recomputes who is online from recent ping activity and broadcasts
// USER_UPDATED only for users whose online state flipped since the last tick, so closing
// the app (no more pings) flips a user to offline shortly after, without needing a beacon.
setInterval(async () => {
  try {
    const rows = await all<Pick<UserRow, 'activeTokenSig' | 'email' | 'lastPing'>>(
      'SELECT email, activeTokenSig, lastPing FROM users WHERE activeTokenSig IS NOT NULL'
    );
    const currentlyOnline = new Set(
      rows.filter((u) => isPresenceOnline(u)).map((u) => u.email.toLowerCase())
    );

    for (const email of currentlyOnline) {
      if (!onlineEmails.has(email)) {
        broadcastEvent('USER_UPDATED', { email, isLoggedIn: true });
      }
    }

    for (const email of onlineEmails) {
      if (!currentlyOnline.has(email)) {
        broadcastEvent('USER_UPDATED', { email, isLoggedIn: false });
      }
    }

    onlineEmails.clear();
    currentlyOnline.forEach((email) => onlineEmails.add(email));
  } catch (err) {
    logger.error('Presence sweep failed', {
      errorMessage: err instanceof Error ? err.message : String(err),
    });
  }
}, 10 * 1000);

export default router;
