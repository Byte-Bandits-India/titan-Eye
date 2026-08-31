import type { Request } from 'express';

import { Response, Router } from 'express';

import { CustomerRow, FeedbackTokenRow, get, run } from '../db/database.js';
import { logger } from '../utils/logger.js';

const router = Router();

const FEEDBACK_EASE_OPTIONS = ['Very Easy', 'Easy', 'Okay', 'Difficult'] as const;
const FEEDBACK_EXPERIENCE_OPTIONS = ['Excellent', 'Good', 'Average', 'Poor'] as const;
const FEEDBACK_RECOMMEND_OPTIONS = ['Yes', 'Maybe', 'No'] as const;

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
    const error = err instanceof Error ? err : new Error(String(err));
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

    const { feedbackEase, feedbackExperience, feedbackRecommend } = req.body ?? {};

    if (
      !FEEDBACK_EASE_OPTIONS.includes(feedbackEase) ||
      !FEEDBACK_EXPERIENCE_OPTIONS.includes(feedbackExperience) ||
      !FEEDBACK_RECOMMEND_OPTIONS.includes(feedbackRecommend)
    ) {
      return res.status(400).json({ error: 'Please answer all 3 questions.' });
    }

    await run('UPDATE customers SET feedbackEase = ?, feedbackExperience = ?, feedbackRecommend = ? WHERE id = ?', [
      feedbackEase,
      feedbackExperience,
      feedbackRecommend,
      tokenRow.customerId,
    ]);
    await run('UPDATE feedback_tokens SET usedAt = ? WHERE token = ?', [new Date().toISOString(), token]);

    return res.json({ ok: true });
  } catch (err) {
    const error = err instanceof Error ? err : new Error(String(err));
    logger.error('Submit feedback error', { errorMessage: error.message, requestId: req.requestId });

    return res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
