import { Router, Request, Response } from 'express';
import { get, run } from '../db/database.js';
import { broadcastEvent } from '../utils/sse.js';

const router = Router();

router.post('/call-event', async (req: Request, res: Response) => {
  try {
    const signature = req.headers['x-webhook-signature'];
    const webhookSecret = process.env.WEBHOOK_SECRET;

    if (!webhookSecret) {
      console.error('WEBHOOK_SECRET environment variable is missing.');
      return res.status(500).json({ error: 'Internal configuration error' });
    }

    if (signature !== webhookSecret) {
      return res.status(401).json({ error: 'Unauthorized webhook source' });
    }

    const { id, eventType, user } = req.body;
    if (!id || !eventType) {
      return res.status(400).json({ error: 'id and eventType are required' });
    }

    const customer = await get('SELECT * FROM customer_summary WHERE id = ?', [id]);
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

      const updatedRow = await get('SELECT * FROM customer_summary WHERE id = ?', [id]);
      const updatedCustomer = {
        ...updatedRow,
        activeProfile: updatedRow.activeProfile === 1,
        callActive: true,
        rxData: updatedRow.rxData ? JSON.parse(updatedRow.rxData) : undefined,
        optomRxData: updatedRow.optomRxData ? JSON.parse(updatedRow.optomRxData) : undefined
      };
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

      const updatedRow = await get('SELECT * FROM customer_summary WHERE id = ?', [id]);
      const updatedCustomer = {
        ...updatedRow,
        activeProfile: updatedRow.activeProfile === 1,
        callActive: false,
        rxData: updatedRow.rxData ? JSON.parse(updatedRow.rxData) : undefined,
        optomRxData: updatedRow.optomRxData ? JSON.parse(updatedRow.optomRxData) : undefined
      };
      broadcastEvent('CUSTOMER_UPDATED', updatedCustomer);
      return res.json({ ok: true, customer: updatedCustomer });
    } else {
      return res.status(400).json({ error: 'Invalid eventType' });
    }
  } catch (err: any) {
    console.error('Webhook event error:', err.message);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
