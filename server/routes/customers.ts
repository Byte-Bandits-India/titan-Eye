import { Router, Response } from 'express';
import { AuthenticatedRequest } from '../middleware/auth.js';
import { all, run, get } from '../db/database.js';
import { broadcastEvent } from '../utils/sse.js';
import { validateCustomerData } from '../utils/validation.js';

const router = Router();

router.get('/', async (req: AuthenticatedRequest, res: Response) => {
  try {
    let query = 'SELECT * FROM customer_summary';
    const params: any[] = [];

    if (req.user && req.user.role === 'store') {
      query += ' WHERE storeName = ?';
      params.push(req.user.storeName);
    }

    query += ' ORDER BY lastUpdatedOn DESC';
    const rows = await all(query, params);
    const customers = rows.map(c => ({
      ...c,
      activeProfile: c.activeProfile === 1,
      callActive: c.callActive === 1,
      rxData: c.rxData ? JSON.parse(c.rxData) : undefined,
      optemRxData: c.optemRxData ? JSON.parse(c.optemRxData) : undefined
    }));
    return res.json(customers);
  } catch (err: any) {
    console.error('Fetch customers error:', err.message);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const c = req.body;
    if (req.user && req.user.role === 'store') {
      c.storeName = req.user.storeName;
    }

    const validation = validateCustomerData(c);
    if (!validation.valid) {
      return res.status(400).json({ error: 'Validation failed', details: validation.errors });
    }
    Object.assign(c, validation.sanitized);

    let finalId = c.id;
    const exists = await get('SELECT id FROM customers WHERE id = ?', [finalId]);
    if (exists || !finalId) {
      const lastRow = await get("SELECT id FROM customers ORDER BY CAST(REPLACE(id, '#', '') AS INTEGER) DESC LIMIT 1");
      let nextNum = 1;
      if (lastRow && lastRow.id) {
        const numPart = lastRow.id.replace('#', '');
        nextNum = (parseInt(numPart, 10) || 0) + 1;
      }
      finalId = `#${String(nextNum).padStart(4, '0')}`;
    }
    await run(`
      INSERT INTO customers (
        id, name, age, gender, mobile, customerType, storeName,
        preferredLanguage, preferredLanguage2, storeFeedback, optemFeedback,
        status, activeProfile, lastUpdatedOn, rxData, optemRxData,
        callStartTime, callActive, callTakenBy, callDuration
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      finalId, c.name, c.age, c.gender, c.mobile, c.customerType, c.storeName,
      c.preferredLanguage, c.preferredLanguage2, c.storeFeedback, c.optemFeedback || '',
      c.status, c.activeProfile ? 1 : 0, c.lastUpdatedOn || '',
      c.rxData ? JSON.stringify(c.rxData) : null,
      c.optemRxData ? JSON.stringify(c.optemRxData) : null,
      c.callStartTime || null,
      c.callActive ? 1 : 0,
      c.callTakenBy || null,
      c.callDuration || 0
    ]);

    const row = await get('SELECT * FROM customer_summary WHERE id = ?', [finalId]);
    const createdCustomer = {
      ...row,
      activeProfile: row.activeProfile === 1,
      callActive: row.callActive === 1,
      rxData: row.rxData ? JSON.parse(row.rxData) : undefined,
      optemRxData: row.optemRxData ? JSON.parse(row.optemRxData) : undefined
    };
    broadcastEvent('CUSTOMER_CREATED', createdCustomer);

    return res.status(201).json({ ok: true, id: finalId });
  } catch (err: any) {
    console.error('Create customer error:', err.message);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

router.put('/:id', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    const c = req.body;

    const existing = await get('SELECT * FROM customers WHERE id = ?', [id]);
    if (!existing) {
      return res.status(404).json({ error: 'Customer not found' });
    }

    if (req.user && req.user.role === 'store') {
      if (existing.storeName !== req.user.storeName) {
        return res.status(403).json({ error: 'Access Denied: Store location mismatch' });
      }
      c.optemRxData = existing.optemRxData ? JSON.parse(existing.optemRxData) : null;
      c.optemFeedback = existing.optemFeedback;
      c.storeName = req.user.storeName;
    }

    if (c.rxData === undefined) {
      c.rxData = existing.rxData ? JSON.parse(existing.rxData) : null;
    }
    if (c.optemRxData === undefined) {
      c.optemRxData = existing.optemRxData ? JSON.parse(existing.optemRxData) : null;
    }
    if (c.optemFeedback === undefined) c.optemFeedback = existing.optemFeedback;
    if (c.storeFeedback === undefined) c.storeFeedback = existing.storeFeedback;
    if (c.callStartTime === undefined) c.callStartTime = existing.callStartTime;
    if (c.callActive === undefined) c.callActive = existing.callActive === 1;
    if (c.callTakenBy === undefined) c.callTakenBy = existing.callTakenBy;
    if (c.callDuration === undefined) c.callDuration = existing.callDuration || 0;

    const validation = validateCustomerData(c, true);
    if (!validation.valid) {
      return res.status(400).json({ error: 'Validation failed', details: validation.errors });
    }
    Object.assign(c, validation.sanitized);

    let finalStatus = c.status;

    await run(`
      UPDATE customers SET
        name = ?, age = ?, gender = ?, mobile = ?, customerType = ?, storeName = ?,
        preferredLanguage = ?, preferredLanguage2 = ?, storeFeedback = ?, optemFeedback = ?,
        status = ?, activeProfile = ?, lastUpdatedOn = ?, rxData = ?, optemRxData = ?,
        callStartTime = ?, callActive = ?, callTakenBy = ?, callDuration = ?
      WHERE id = ?
    `, [
      c.name, c.age, c.gender, c.mobile, c.customerType, c.storeName,
      c.preferredLanguage, c.preferredLanguage2, c.storeFeedback, c.optemFeedback || '',
      finalStatus, c.activeProfile ? 1 : 0, c.lastUpdatedOn || '',
      c.rxData ? JSON.stringify(c.rxData) : null,
      c.optemRxData ? JSON.stringify(c.optemRxData) : null,
      c.callStartTime || null,
      c.callActive ? 1 : 0,
      c.callTakenBy || null,
      c.callDuration || 0,
      id
    ]);

    const row = await get('SELECT * FROM customer_summary WHERE id = ?', [id]);
    const updatedCustomer = {
      ...row,
      activeProfile: row.activeProfile === 1,
      callActive: row.callActive === 1,
      rxData: row.rxData ? JSON.parse(row.rxData) : undefined,
      optemRxData: row.optemRxData ? JSON.parse(row.optemRxData) : undefined
    };
    broadcastEvent('CUSTOMER_UPDATED', updatedCustomer);

    return res.json({ ok: true, customer: updatedCustomer });
  } catch (err: any) {
    console.error('Update customer error:', err.message);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/:id/initiate-call', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    const customer = await get('SELECT * FROM customer_summary WHERE id = ?', [id]);
    if (!customer) {
      return res.status(404).json({ error: 'Customer not found' });
    }
    if (customer.callActive === 1) {
      const currentHolder = await get('SELECT role FROM users WHERE name = ?', [customer.callTakenBy]);
      const requesterRole = req.user ? req.user.role : '';

      let isStoreHolder = currentHolder && currentHolder.role === 'store';
      if (!currentHolder && customer.callTakenBy) {
        const lowerName = customer.callTakenBy.toLowerCase();
        if (lowerName.includes('store')) {
          isStoreHolder = true;
        }
      }
      const isOptemRequester = requesterRole === 'optem';

      if (!(isStoreHolder && isOptemRequester)) {
        return res.status(409).json({ error: `Call is already taken by ${customer.callTakenBy || 'another agent'}` });
      }
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
    const nowMs = String(Date.now());
    const callerName = req.user ? req.user.name : 'Unknown';

    await run(`
      UPDATE customers SET
        callActive = 1,
        callStartTime = ?,
        callTakenBy = ?,
        status = 'Initiated',
        lastUpdatedOn = ?
      WHERE id = ?
    `, [nowMs, callerName, timestamp, id]);

    const updatedRow = await get('SELECT * FROM customer_summary WHERE id = ?', [id]);
    const updatedCustomer = {
      ...updatedRow,
      activeProfile: updatedRow.activeProfile === 1,
      callActive: updatedRow.callActive === 1,
      rxData: updatedRow.rxData ? JSON.parse(updatedRow.rxData) : undefined,
      optemRxData: updatedRow.optemRxData ? JSON.parse(updatedRow.optemRxData) : undefined
    };

    broadcastEvent('CUSTOMER_UPDATED', updatedCustomer);
    return res.json({ ok: true, customer: updatedCustomer });
  } catch (err: any) {
    console.error('Initiate call error:', err.message);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/:id/end-call', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
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

    let durationSec = 0;
    if (customer.callStartTime) {
      const startMs = parseInt(customer.callStartTime, 10);
      if (!isNaN(startMs)) {
        durationSec = Math.floor((Date.now() - startMs) / 1000);
      }
    }

    await run(`
      UPDATE customers SET
        callActive = 0,
        callStartTime = NULL,
        callTakenBy = NULL,
        status = 'Accepted',
        lastUpdatedOn = ?,
        callDuration = ?
      WHERE id = ?
    `, [timestamp, durationSec, id]);

    const updatedRow = await get('SELECT * FROM customer_summary WHERE id = ?', [id]);
    const updatedCustomer = {
      ...updatedRow,
      activeProfile: updatedRow.activeProfile === 1,
      callActive: false,
      rxData: updatedRow.rxData ? JSON.parse(updatedRow.rxData) : undefined,
      optemRxData: updatedRow.optemRxData ? JSON.parse(updatedRow.optemRxData) : undefined
    };

    broadcastEvent('CUSTOMER_UPDATED', updatedCustomer);
    return res.json({ ok: true, customer: updatedCustomer });
  } catch (err: any) {
    console.error('End call error:', err.message);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/:id/logs', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    const rows = await all('SELECT * FROM customer_logs WHERE customerId = ? ORDER BY id DESC', [id]);
    const logs = rows.map(l => ({
      ...l,
      activeProfile: l.activeProfile === 1,
      callActive: l.callActive === 1,
      rxData: l.rxData ? JSON.parse(l.rxData) : undefined,
      optemRxData: l.optemRxData ? JSON.parse(l.optemRxData) : undefined
    }));
    return res.json(logs);
  } catch (err: any) {
    console.error('Fetch customer logs error:', err.message);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
