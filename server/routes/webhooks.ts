import crypto from 'crypto';
import { Request, Response, Router } from 'express';
import { ParamsDictionary } from 'express-serve-static-core';

import type { ApiCustomer, ErrorResponse, WebhookCallEventBody } from '../types.js';

import { CustomerRow, get, run } from '../db/database.js';
import { alertCritical, logger, logSecurityEvent } from '../utils/logger.js';
import { broadcastEvent } from '../utils/sse.js';

const router = Router();

type CallEventResponseBody = ErrorResponse | { customer: ApiCustomer; ok: true; };

function toApiCustomer(row: CustomerRow, callActiveOverride?: boolean): ApiCustomer {
  return {
    ...row,
    activeProfile: row.activeProfile === 1,
    callActive: callActiveOverride ?? row.callActive === 1,
    optomCallStartTime: row.optomCallStartTime || null,
    optomFeedback: row.optomFeedback || '',
    optomRxData: row.optomRxData ? JSON.parse(row.optomRxData) : undefined,
    rxData: row.rxData ? JSON.parse(row.rxData) : undefined,
  };
}

router.post('/call-event', async (req: Request<ParamsDictionary, CallEventResponseBody, WebhookCallEventBody>, res: Response<CallEventResponseBody>) => {
  try {
    const signature = req.headers['x-webhook-signature'];
    const webhookSecret = process.env.WEBHOOK_SECRET;

    if (!webhookSecret) {
      logger.error('WEBHOOK_SECRET environment variable is missing.', { requestId: req.requestId });

      return res.status(500).json({ error: 'Internal configuration error' });
    }

    if (typeof signature !== 'string') {
      logSecurityEvent('WEBHOOK_AUTH_FAILED', { ip: req.ip, reason: 'missing_signature', requestId: req.requestId });

      return res.status(401).json({ error: 'Unauthorized webhook source' });
    }

    const sigBuf = Buffer.from(signature);
    const secretBuf = Buffer.from(webhookSecret);

    if (sigBuf.length !== secretBuf.length || !crypto.timingSafeEqual(sigBuf, secretBuf)) {
      logSecurityEvent('WEBHOOK_AUTH_FAILED', { ip: req.ip, reason: 'invalid_signature', requestId: req.requestId });
      alertCritical('Webhook request with an invalid signature', { ip: req.ip });

      return res.status(401).json({ error: 'Unauthorized webhook source' });
    }

    const { eventType, id, user } = req.body;

    if (!id || !eventType) {
      return res.status(400).json({ error: 'id and eventType are required' });
    }

    const customer = await get<CustomerRow>('SELECT * FROM customer_summary WHERE id = ?', [id]);

    if (!customer) {
      return res.status(404).json({ error: 'Customer not found' });
    }

    const timestamp = new Date().toLocaleString('en-US', {
      day: 'numeric',
      hour: 'numeric',
      hour12: true,
      minute: '2-digit',
      month: 'short',
      second: '2-digit',
      year: 'numeric',
    });

    if (eventType === 'callStarted') {
      if (customer.callActive === 1) {
        return res.status(409).json({ error: 'Call already active' });
      }

      const nowMs = String(Date.now());
      await run(`
        UPDATE customers SET
          callActive = 1,
          callStartTime = ?,
          callTakenBy = ?,
          status = 'Initiated',
          lastUpdatedOn = ?
        WHERE id = ?
      `, [nowMs, user || 'Teams Webhook', timestamp, id]);

      const updatedRow = await get<CustomerRow>('SELECT * FROM customer_summary WHERE id = ?', [id]);

      if (!updatedRow) {
        return res.status(500).json({ error: 'Internal server error' });
      }

      const updatedCustomer = toApiCustomer(updatedRow, true);
      broadcastEvent('CUSTOMER_UPDATED', updatedCustomer);

      return res.json({ customer: updatedCustomer, ok: true });
    }

 if (eventType === 'callEnded') {
      await run(`
        UPDATE customers SET
          callActive = 0,
          callStartTime = NULL,
          callTakenBy = NULL,
          status = 'Accepted',
          lastUpdatedOn = ?
        WHERE id = ?
      `, [timestamp, id]);

      const updatedRow = await get<CustomerRow>('SELECT * FROM customer_summary WHERE id = ?', [id]);

      if (!updatedRow) {
        return res.status(500).json({ error: 'Internal server error' });
      }

      const updatedCustomer = toApiCustomer(updatedRow, false);
      broadcastEvent('CUSTOMER_UPDATED', updatedCustomer);

      return res.json({ customer: updatedCustomer, ok: true });
    }

      return res.status(400).json({ error: 'Invalid eventType' });

  } catch (err) {
    const error = err as Error;
    logger.error('Webhook event error', { errorMessage: error.message, requestId: req.requestId });

    return res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
