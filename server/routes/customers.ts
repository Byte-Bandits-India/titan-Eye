import { Router, Response } from 'express';
import { AuthenticatedRequest } from '../middleware/auth.js';
import { all, run, get } from '../db/database.js';
import { broadcastEvent } from '../utils/sse.js';
import { validateCustomerData } from '../utils/validation.js';

const router = Router();

// Fetch all customers
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
      optomRxData: c.optomRxData ? JSON.parse(c.optomRxData) : undefined
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
    // Use sanitized data from this point forward
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
        preferredLanguage, preferredLanguage2, storeFeedback, optumFeedback,
        status, activeProfile, lastUpdatedOn, rxData, optomRxData,
        callStartTime, callActive, callTakenBy
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      finalId, c.name, c.age, c.gender, c.mobile, c.customerType, c.storeName,
      c.preferredLanguage, c.preferredLanguage2, c.storeFeedback, c.optumFeedback || '',
      c.status, c.activeProfile ? 1 : 0, c.lastUpdatedOn || '',
      c.rxData ? JSON.stringify(c.rxData) : null,
      c.optomRxData ? JSON.stringify(c.optomRxData) : null,
      c.callStartTime || null,
      c.callActive ? 1 : 0,
      c.callTakenBy || null
    ]);
    
    const row = await get('SELECT * FROM customer_summary WHERE id = ?', [finalId]);
    const createdCustomer = {
      ...row,
      activeProfile: row.activeProfile === 1,
      callActive: row.callActive === 1,
      rxData: row.rxData ? JSON.parse(row.rxData) : undefined,
      optomRxData: row.optomRxData ? JSON.parse(row.optomRxData) : undefined
    };
    broadcastEvent('CUSTOMER_CREATED', createdCustomer);

    return res.status(201).json({ ok: true, id: finalId });
  } catch (err: any) {
    console.error('Create customer error:', err.message);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// Update an existing customer
router.put('/:id', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    const c = req.body;

    const existing = await get('SELECT storeName, optomRxData, optumFeedback FROM customers WHERE id = ?', [id]);
    if (!existing) {
      return res.status(404).json({ error: 'Customer not found' });
    }

    if (req.user && req.user.role === 'store') {
      if (existing.storeName !== req.user.storeName) {
        return res.status(403).json({ error: 'Access Denied: Store location mismatch' });
      }
      c.optomRxData = existing.optomRxData ? JSON.parse(existing.optomRxData) : null;
      c.optumFeedback = existing.optumFeedback;
      c.storeName = req.user.storeName;
    }

    const validation = validateCustomerData(c, true);
    if (!validation.valid) {
      return res.status(400).json({ error: 'Validation failed', details: validation.errors });
    }
    Object.assign(c, validation.sanitized);
    
    let finalStatus = c.status;

    await run(`
      UPDATE customers SET
        name = ?, age = ?, gender = ?, mobile = ?, customerType = ?, storeName = ?,
        preferredLanguage = ?, preferredLanguage2 = ?, storeFeedback = ?, optumFeedback = ?,
        status = ?, activeProfile = ?, lastUpdatedOn = ?, rxData = ?, optomRxData = ?,
        callStartTime = ?, callActive = ?, callTakenBy = ?
      WHERE id = ?
    `, [
      c.name, c.age, c.gender, c.mobile, c.customerType, c.storeName,
      c.preferredLanguage, c.preferredLanguage2, c.storeFeedback, c.optumFeedback || '',
      finalStatus, c.activeProfile ? 1 : 0, c.lastUpdatedOn || '',
      c.rxData ? JSON.stringify(c.rxData) : null,
      c.optomRxData ? JSON.stringify(c.optomRxData) : null,
      c.callStartTime || null,
      c.callActive ? 1 : 0,
      c.callTakenBy || null,
      id
    ]);

    const row = await get('SELECT * FROM customer_summary WHERE id = ?', [id]);
    const updatedCustomer = {
      ...row,
      activeProfile: row.activeProfile === 1,
      callActive: row.callActive === 1,
      rxData: row.rxData ? JSON.parse(row.rxData) : undefined,
      optomRxData: row.optomRxData ? JSON.parse(row.optomRxData) : undefined
    };
    broadcastEvent('CUSTOMER_UPDATED', updatedCustomer);

    return res.json({ ok: true });
  } catch (err: any) {
    console.error('Update customer error:', err.message);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// Initiate call endpoint
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

      const isStoreHolder = currentHolder && currentHolder.role === 'store';
      const isOptomRequester = requesterRole === 'optem';

      if (!(isStoreHolder && isOptomRequester)) {
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
        callStartTime = COALESCE(callStartTime, ?),
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
      optomRxData: updatedRow.optomRxData ? JSON.parse(updatedRow.optomRxData) : undefined
    };

    broadcastEvent('CUSTOMER_UPDATED', updatedCustomer);
    return res.json({ ok: true, customer: updatedCustomer });
  } catch (err: any) {
    console.error('Initiate call error:', err.message);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// End call endpoint
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
  } catch (err: any) {
    console.error('End call error:', err.message);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
