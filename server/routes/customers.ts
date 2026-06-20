import { Router, Response } from 'express';
import { AuthenticatedRequest } from '../middleware/auth.js';
import { all, run, get } from '../db/database.js';
import { broadcastEvent } from '../utils/sse.js';

const router = Router();

// Fetch all customers
router.get('/', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const rows = await all('SELECT * FROM customer_summary ORDER BY lastUpdatedOn DESC');
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

// Create a new customer
router.post('/', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const c = req.body;
    await run(`
      INSERT INTO customers (
        id, name, age, gender, mobile, customerType, storeName,
        preferredLanguage, preferredLanguage2, storeFeedback, optumFeedback,
        status, activeProfile, lastUpdatedOn, rxData, optomRxData,
        callStartTime, callActive, callTakenBy
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      c.id, c.name, c.age, c.gender, c.mobile, c.customerType, c.storeName,
      c.preferredLanguage, c.preferredLanguage2, c.storeFeedback, c.optumFeedback || '',
      c.status, c.activeProfile ? 1 : 0, c.lastUpdatedOn || '',
      c.rxData ? JSON.stringify(c.rxData) : null,
      c.optomRxData ? JSON.stringify(c.optomRxData) : null,
      c.callStartTime || null,
      c.callActive ? 1 : 0,
      c.callTakenBy || null
    ]);
    
    const row = await get('SELECT * FROM customer_summary WHERE id = ?', [c.id]);
    const createdCustomer = {
      ...row,
      activeProfile: row.activeProfile === 1,
      callActive: row.callActive === 1,
      rxData: row.rxData ? JSON.parse(row.rxData) : undefined,
      optomRxData: row.optomRxData ? JSON.parse(row.optomRxData) : undefined
    };
    broadcastEvent('CUSTOMER_CREATED', createdCustomer);

    return res.status(201).json({ ok: true });
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
    
    // Auto-transition status to Completed if update is done by an Optom role
    let finalStatus = c.status;
    if (req.user && req.user.role === 'optem') {
      finalStatus = 'Completed';
    }

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
      return res.status(409).json({ error: `Call is already taken by ${customer.callTakenBy || 'another agent'}` });
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
      callActive: true,
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
