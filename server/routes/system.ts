import { Response, Router } from 'express';
import fs from 'fs';
import path from 'path';

import { get, run, UserRow } from '../db/database.js';
import { AuthenticatedRequest } from '../middleware/auth.js';
import { authorizeRoles } from '../middleware/rbac.js';
import { findUserByEmail, getUserPhoto, getUserPresence } from '../services/microsoft/graph.js';
import { logger, resolveLogDir } from '../utils/logger.js';

const router = Router();

async function resolveEntraUserId(email: string): Promise<null | string> {
  const dbUser = await get<UserRow>('SELECT azureObjectId FROM users WHERE email = ?', [email]);

  if (dbUser?.azureObjectId) {
    return dbUser.azureObjectId;
  }

  const match = await findUserByEmail(email);

  if (!match) {
    return null;
  }

  await run('UPDATE users SET azureObjectId = ?, microsoftUpn = ? WHERE email = ?', [
    match.id,
    match.userPrincipalName,
    email,
  ]);

  return match.id;
}

router.get('/me/presence', async (req: AuthenticatedRequest, res: Response) => {
  if (!req.user) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  try {
    const entraId = await resolveEntraUserId(req.user.email);

    if (!entraId) {
      return res
        .status(404)
        .json({ message: 'No matching Microsoft account found for this email', success: false });
    }

    const presence = await getUserPresence(entraId);

    return res.json({ data: presence, success: true });
  } catch (err) {
    const error = err instanceof Error ? err : new Error(String(err));
    logger.error('Graph presence error', { errorMessage: error.message, requestId: req.requestId });

    return res
      .status(500)
      .json({ message: error.message || 'Failed to get Microsoft presence', success: false });
  }
});

router.get('/me/photo', async (req: AuthenticatedRequest, res: Response) => {
  if (!req.user) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  try {
    const entraId = await resolveEntraUserId(req.user.email);

    if (!entraId) {
      return res.status(204).end();
    }

    const photo = await getUserPhoto(entraId);

    if (!photo) {
      return res.status(204).end();
    }

    res.setHeader('Content-Type', photo.contentType);
    res.setHeader('Cache-Control', 'private, max-age=3600');

    return res.send(photo.buffer);
  } catch (err) {
    const error = err instanceof Error ? err : new Error(String(err));
    logger.error('Graph photo error', { errorMessage: error.message, requestId: req.requestId });

    return res
      .status(500)
      .json({ message: error.message || 'Failed to get Microsoft photo', success: false });
  }
});

router.get('/users/:email/photo', async (req: AuthenticatedRequest, res: Response) => {
  if (!req.user) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  const email = String(req.params.email).toLowerCase();
  const callerEmail = req.user.email.toLowerCase();
  const isAdmin = req.user.role === 'admin';

  // N13 Remediation: Only admin or the account owner can request profile photos
  if (!isAdmin && callerEmail !== email) {
    return res.status(403).json({ error: 'Access denied: You cannot view other users photos.' });
  }

  try {
    const targetUser = await get<UserRow>('SELECT email FROM users WHERE LOWER(email) = LOWER(?)', [email]);

    // N13 Remediation: Return 204 for missing users or absent photos (eliminates user-enumeration)
    if (!targetUser) {
      return res.status(204).end();
    }

    const entraId = await resolveEntraUserId(targetUser.email);

    if (!entraId) {
      return res.status(204).end();
    }

    const photo = await getUserPhoto(entraId);

    if (!photo) {
      return res.status(204).end();
    }

    res.setHeader('Content-Type', photo.contentType);
    res.setHeader('Cache-Control', 'private, max-age=3600');

    return res.send(photo.buffer);
  } catch (err) {
    const error = err instanceof Error ? err : new Error(String(err));
    logger.error('Graph photo error', { errorMessage: error.message, requestId: req.requestId });

    return res.status(204).end();
  }
});

router.get('/audit-logs', authorizeRoles('admin'), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const logDir = resolveLogDir();
    if (!fs.existsSync(logDir)) {
      return res.json({ logs: [] });
    }

    const auditDir = fs.existsSync(path.join(logDir, 'audit')) ? path.join(logDir, 'audit') : logDir;
    const files = fs
      .readdirSync(auditDir)
      .filter((f) => /^(audit|security)-\d{4}-\d{2}-\d{2}\.log$/.test(f))
      .sort()
      .reverse();

    const resultLogs: Record<string, unknown>[] = [];
    const limit = parseInt(String(req.query.limit || '150'), 10);

    for (const file of files) {
      if (resultLogs.length >= limit) {
        break;
      }

      const content = fs.readFileSync(path.join(auditDir, file), 'utf8');
      const lines = content.split('\n').filter(Boolean).reverse();
      for (const line of lines) {
        if (resultLogs.length >= limit) {
          break;
        }

        try {
          const parsed = JSON.parse(line) as Record<string, unknown>;
          resultLogs.push(parsed);
        } catch {}
      }
    }

    return res.json({ logs: resultLogs });
  } catch (err) {
    const error = err instanceof Error ? err : new Error(String(err));
    logger.error('Fetch audit logs error', { errorMessage: error.message, requestId: req.requestId });

    return res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
