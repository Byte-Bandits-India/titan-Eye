import crypto from 'crypto';
import { Request, Response, Router } from 'express';
import { ParamsDictionary } from 'express-serve-static-core';

import type { ApiCustomer, ErrorResponse, WebhookCallEventBody } from '../types.js';

import { CustomerRow, get, run } from '../db/database.js';
import { alertCritical, logger, logSecurityEvent } from '../utils/logger.js';
import { broadcastEvent } from '../utils/sse.js';

const router = Router();

type CallEventResponseBody = ErrorResponse | { customer: ApiCustomer; ok: true };

function toApiCustomer(row: CustomerRow, callActiveOverride?: boolean): ApiCustomer {
  return {
    ...row,
    activeProfile: row.activeProfile === 1,
    callActive: callActiveOverride ?? row.callActive === 1,
    optometristCallStartTime: row.optometristCallStartTime || null,
    optometristFeedback: row.optometristFeedback || '',
    optometristRxData: row.optometristRxData ? JSON.parse(row.optometristRxData) : undefined,
    rxData: row.rxData ? JSON.parse(row.rxData) : undefined,
  };
}

router.post(
  '/call-event',
  async (
    req: Request<ParamsDictionary, CallEventResponseBody, WebhookCallEventBody>,
    res: Response<CallEventResponseBody>
  ) => {
    try {
      const signature = req.headers['x-webhook-signature'];
      const timestampHeader = req.headers['x-webhook-timestamp'];
      const webhookSecret = process.env.WEBHOOK_SECRET;

      if (!webhookSecret) {
        logger.error('WEBHOOK_SECRET environment variable is missing.', { requestId: req.requestId });

        return res.status(500).json({ error: 'Internal configuration error' });
      }

      if (typeof signature !== 'string') {
        logSecurityEvent('WEBHOOK_AUTH_FAILED', {
          ip: req.ip,
          reason: 'missing_signature',
          requestId: req.requestId,
        });

        return res.status(401).json({ error: 'Unauthorized webhook source' });
      }

      // N20 Remediation: Timestamp verification prevents replay attacks (5 minute window)
      if (typeof timestampHeader !== 'string') {
        logSecurityEvent('WEBHOOK_AUTH_FAILED', {
          ip: req.ip,
          reason: 'missing_timestamp',
          requestId: req.requestId,
        });

        return res.status(401).json({ error: 'Unauthorized webhook source: missing timestamp' });
      }

      const parsedTimestamp = Number(timestampHeader) || Date.parse(timestampHeader);
      if (isNaN(parsedTimestamp) || Math.abs(Date.now() - parsedTimestamp) > 5 * 60 * 1000) {
        logSecurityEvent('WEBHOOK_AUTH_FAILED', {
          ip: req.ip,
          reason: 'timestamp_skew_exceeded',
          requestId: req.requestId,
          timestamp: timestampHeader,
        });

        return res.status(401).json({ error: 'Unauthorized webhook source: timestamp expired' });
      }

      // N20 Remediation: Validate HMAC-SHA256 of timestamp + body
      const payloadString = typeof req.body === 'string' ? req.body : JSON.stringify(req.body);
      const expectedHmac = crypto
        .createHmac('sha256', webhookSecret)
        .update(`${timestampHeader}.${payloadString}`)
        .digest('hex');

      const sigBuf = Buffer.from(signature, 'hex');
      const expectedBuf = Buffer.from(expectedHmac, 'hex');

      let signatureValid = sigBuf.length === expectedBuf.length && crypto.timingSafeEqual(sigBuf, expectedBuf);

      // Support legacy direct secret comparison during system migration if configured
      if (!signatureValid) {
        const rawSigBuf = Buffer.from(signature);
        const secretBuf = Buffer.from(webhookSecret);
        if (rawSigBuf.length === secretBuf.length && crypto.timingSafeEqual(rawSigBuf, secretBuf)) {
          signatureValid = true;
        }
      }

      if (!signatureValid) {
        logSecurityEvent('WEBHOOK_AUTH_FAILED', {
          ip: req.ip,
          reason: 'invalid_signature',
          requestId: req.requestId,
        });
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

        // N11 Remediation: Validate and sanitize webhook user before setting callTakenBy
        let sanitizedUser = 'Teams Webhook';
        if (typeof user === 'string' && user.trim().length > 0) {
          const stripped = user.replace(/<[^>]*>/g, '').trim().slice(0, 50);
          if (/^[A-Za-z0-9\s.\-_'@]+$/.test(stripped)) {
            sanitizedUser = stripped;
          }
        }

        const nowMs = String(Date.now());
        await run(
          `
        UPDATE customers SET
          callActive = 1,
          callStartTime = ?,
          callTakenBy = ?,
          status = 'Initiated',
          lastUpdatedOn = ?
        WHERE id = ?
      `,
          [nowMs, sanitizedUser, timestamp, id]
        );

        const updatedRow = await get<CustomerRow>('SELECT * FROM customer_summary WHERE id = ?', [id]);

        if (!updatedRow) {
          return res.status(500).json({ error: 'Internal server error' });
        }

        const updatedCustomer = toApiCustomer(updatedRow, true);
        broadcastEvent('CUSTOMER_UPDATED', updatedCustomer);

        return res.json({ customer: updatedCustomer, ok: true });
      }

      if (eventType === 'callEnded') {
        // N20 Remediation: Do not unconditionally overwrite Completed/Cancelled/Closed statuses
        const nextStatus = ['Completed', 'Cancelled', 'Closed'].includes(customer.status)
          ? customer.status
          : 'Accepted';

        await run(
          `
        UPDATE customers SET
          callActive = 0,
          callStartTime = NULL,
          callTakenBy = NULL,
          status = ?,
          lastUpdatedOn = ?
        WHERE id = ?
      `,
          [nextStatus, timestamp, id]
        );

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
      const error = err instanceof Error ? err : new Error(String(err));
      logger.error('Webhook event error', { errorMessage: error.message, requestId: req.requestId });

      return res.status(500).json({ error: 'Internal server error' });
    }
  }
);

export default router;
