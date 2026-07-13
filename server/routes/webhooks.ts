import { Router, Request, Response } from 'express';
import { ParamsDictionary } from 'express-serve-static-core';
import crypto from 'crypto';
import { get, run, CustomerRow } from '../db/database.js';
import { broadcastEvent } from '../utils/sse.js';
import type { WebhookCallEventBody, ApiCustomer, ErrorResponse } from '../types.js';

const router = Router();

function toApiCustomer(row: CustomerRow, callActiveOverride?: boolean): ApiCustomer {
  return {
    ...row,
    activeProfile: row.activeProfile === 1,
    callActive: callActiveOverride ?? row.callActive === 1,
    rxData: row.rxData ? JSON.parse(row.rxData) : undefined,
    optumRxData: row.optumRxData ? JSON.parse(row.optumRxData) : undefined
  };
}

type CallEventResponseBody = { ok: true; customer: ApiCustomer } | ErrorResponse;

router.post('/call-event', async (req: Request<ParamsDictionary, CallEventResponseBody, WebhookCallEventBody>, res: Response<CallEventResponseBody>) => {
  try {
    const signature = req.headers['x-webhook-signature'];
    const webhookSecret = process.env.WEBHOOK_SECRET;

    if (!webhookSecret) {
      console.error('WEBHOOK_SECRET environment variable is missing.');
      return res.status(500).json({ error: 'Internal configuration error' });
    }

    if (typeof signature !== 'string') {
      return res.status(401).json({ error: 'Unauthorized webhook source' });
    }

    const sigBuf = Buffer.from(signature);
    const secretBuf = Buffer.from(webhookSecret);
    if (sigBuf.length !== secretBuf.length || !crypto.timingSafeEqual(sigBuf, secretBuf)) {
      return res.status(401).json({ error: 'Unauthorized webhook source' });
    }

    const { id, eventType, user } = req.body;
    if (!id || !eventType) {
      return res.status(400).json({ error: 'id and eventType are required' });
    }

    const customer = await get<CustomerRow>('SELECT * FROM customer_summary WHERE id = ?', [id]);
    if (!customer) {
      return res.status(404).json({ error: 'Customer not found' });
    }

    const timestamp = new Date().toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      second: '2-digit',
      hour12: true,
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
      return res.json({ ok: true, customer: updatedCustomer });
    } else if (eventType === 'callEnded') {
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
      return res.json({ ok: true, customer: updatedCustomer });
    } else {
      return res.status(400).json({ error: 'Invalid eventType' });
    }
  } catch (err) {
    const error = err as Error;
    console.error('Webhook event error:', error.message);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
