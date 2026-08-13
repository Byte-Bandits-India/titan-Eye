import type { Request } from 'express';

import { Response, Router } from 'express';

import { CustomerRow, FeedbackTokenRow, get, run } from '../db/database.js';
import { logger } from '../utils/logger.js';

const router = Router();

const MAX_FEEDBACK_LENGTH = 2000;

async function findValidToken(token: string): Promise<FeedbackTokenRow | null> {
  const row = await get<FeedbackTokenRow>('SELECT * FROM feedback_tokens WHERE token = ?', [token]);

  if (!row) {
    return null;
  }

  if (row.usedAt) {
    return null;
  }

  if (new Date(row.expiresAt).getTime() < Date.now()) {
    return null;
  }

  return row;
}

// Public - the patient scans a QR code on their own device with no account
// or session of any kind, so this route intentionally sits outside the
// authenticateToken middleware (see server/index.ts). The token is a random
// 24-byte value scoped to one customer and expires/self-invalidates after
// first use, so it can't be used to browse or edit other records.
router.get('/:token', async (req: Request, res: Response) => {
  try {
    const token = String(req.params.token);
    const tokenRow = await findValidToken(token);

    if (!tokenRow) {
      return res.status(404).json({ error: 'This feedback link is invalid or has expired.' });
    }

    const customer = await get<Pick<CustomerRow, 'name' | 'storeName'>>(
      'SELECT name, storeName FROM customers WHERE id = ?',
      [tokenRow.customerId]
    );

    if (!customer) {
      return res.status(404).json({ error: 'This feedback link is invalid or has expired.' });
    }

    return res.json({ customerName: customer.name, storeName: customer.storeName });
  } catch (err) {
    const error = err as Error;
    logger.error('Fetch feedback link error', { errorMessage: error.message, requestId: req.requestId });

    return res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/:token', async (req: Request, res: Response) => {
  try {
    const token = String(req.params.token);
    const tokenRow = await findValidToken(token);

    if (!tokenRow) {
      return res.status(404).json({ error: 'This feedback link is invalid or has expired.' });
    }

    const rawFeedback = req.body?.feedback;
    const feedback = typeof rawFeedback === 'string' ? rawFeedback.trim().slice(0, MAX_FEEDBACK_LENGTH) : '';

    await run('UPDATE customers SET patientFeedback = ? WHERE id = ?', [
      feedback || null,
      tokenRow.customerId,
    ]);
    await run('UPDATE feedback_tokens SET usedAt = ? WHERE token = ?', [new Date().toISOString(), token]);

    return res.json({ ok: true });
  } catch (err) {
    const error = err as Error;
    logger.error('Submit feedback error', { errorMessage: error.message, requestId: req.requestId });

    return res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
