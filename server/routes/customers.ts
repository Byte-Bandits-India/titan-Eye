import { Router, Response } from 'express';
import { AuthenticatedRequest } from '../middleware/auth.js';
import { all, run, get, CustomerRow, UserRow, CustomerLogRow, SqlParam } from '../db/database.js';
import { broadcastEvent } from '../utils/sse.js';
import { validateCustomerData } from '../utils/validation.js';
import type { CustomerInput } from '../types.js';

const router = Router();

function toApiCustomer(row: CustomerRow) {
  return {
    ...row,
    activeProfile: row.activeProfile === 1,
    callActive: row.callActive === 1,
    rxData: row.rxData ? JSON.parse(row.rxData) : undefined,
    optumRxData: row.optumRxData ? JSON.parse(row.optumRxData) : undefined,
  };
}

// Helper to prevent IDOR (VAPT Finding #19)
async function verifyCustomerAccess(req: AuthenticatedRequest, res: Response, customerId: string): Promise<CustomerRow | null> {
  const customer = await get<CustomerRow>(
    `SELECT id, name, age, gender, mobile, customerType, storeName,
            preferredLanguage, preferredLanguage2, storeFeedback, optumFeedback,
            status, activeProfile, lastUpdatedOn, rxData, optumRxData,
            callStartTime, callActive, callTakenBy, callDuration
     FROM customers WHERE id = ?`,
    [customerId]
  );
  if (!customer) {
    res.status(404).json({ error: 'Customer not found' });
    return null;
  }

  // Enforce store scoping (store role users can only access their own store's customers)
  if (req.user && req.user.role === 'store') {
    if (customer.storeName !== req.user.storeName) {
      res.status(403).json({ error: 'Access Denied: You cannot access records belonging to another store location.' });
      return null;
    }
  }

  return customer;
}

router.get('/audit-logs', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const customerLogs = await all<CustomerLogRow & { customerName?: string; storeName?: string }>(`
      SELECT cl.*, c.name as customerName, c.storeName
      FROM customer_logs cl
      LEFT JOIN customers c ON cl.customerId = c.id
      ORDER BY cl.id DESC
    `);

    const adminLogs = await all<{
      id: number;
      adminEmail: string;
      adminName: string;
      action: string;
      target: string;
      details: string;
      timestamp: string;
    }>('SELECT * FROM admin_logs ORDER BY id DESC');

    const formattedCustomerLogs = customerLogs.map(l => ({
      id: `CST-${l.id}`,
      customerId: l.customerId,
      customerName: l.customerName || 'N/A',
      storeName: l.storeName || 'Store / Clinic',
      lastUpdatedOn: l.lastUpdatedOn,
      status: l.status,
      callDuration: l.callDuration,
      callTakenBy: l.callTakenBy || 'System / Store'
    }));

    const formattedAdminLogs = adminLogs.map(a => ({
      id: `ADM-${a.id}`,
      customerId: a.target,
      customerName: a.details || 'Admin Management',
      storeName: 'Admin System',
      lastUpdatedOn: a.timestamp,
      status: a.action,
      callDuration: 0,
      callTakenBy: a.adminName ? `${a.adminName} (${a.adminEmail})` : a.adminEmail
    }));

    const combinedLogs = [...formattedCustomerLogs, ...formattedAdminLogs].sort((a, b) => {
      const timeA = a.lastUpdatedOn ? new Date(a.lastUpdatedOn).getTime() : 0;
      const timeB = b.lastUpdatedOn ? new Date(b.lastUpdatedOn).getTime() : 0;
      if (isNaN(timeA) || isNaN(timeB)) return 0;
      return timeB - timeA;
    });

    return res.json(combinedLogs);
  } catch (err) {
    const error = err as Error;
    console.error('Fetch all audit logs error:', error.message);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/', async (req: AuthenticatedRequest, res: Response) => {
  try {
    let query = 'SELECT * FROM customer_summary';
    const params: SqlParam[] = [];

    if (req.user && req.user.role === 'store') {
      query += ' WHERE storeName = ?';
      params.push(req.user.storeName ?? null);
    }

    query += ' ORDER BY lastUpdatedOn DESC';
    const rows = await all<CustomerRow>(query, params);
    const customers = rows.map(toApiCustomer);
    return res.json(customers);
  } catch (err) {
    const error = err as Error;
    console.error('Fetch customers error:', error.message);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const c: CustomerInput = req.body;
    if (req.user && req.user.role === 'store') {
      c.storeName = req.user.storeName ?? undefined;
    }

    const validation = validateCustomerData(c);
    if (!validation.valid) {
      return res.status(400).json({ error: 'Validation failed', details: validation.errors });
    }
    const sanitized = validation.sanitized;

    let finalId = c.id;
    const exists = finalId ? await get<{ id: string }>('SELECT id FROM customers WHERE id = ?', [finalId]) : undefined;
    if (exists || !finalId) {
      const lastRow = await get<{ id: string }>("SELECT id FROM customers ORDER BY CAST(REPLACE(id, '#', '') AS INTEGER) DESC LIMIT 1");
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
        status, activeProfile, lastUpdatedOn, rxData, optumRxData,
        callStartTime, callActive, callTakenBy, callDuration
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      finalId, sanitized.name!, sanitized.age!, sanitized.gender!, sanitized.mobile!, sanitized.customerType!, sanitized.storeName!,
      sanitized.preferredLanguage!, sanitized.preferredLanguage2 ?? '', sanitized.storeFeedback ?? '', sanitized.optumFeedback ?? '',
      sanitized.status!, sanitized.activeProfile ? 1 : 0, sanitized.lastUpdatedOn ?? '',
      sanitized.rxData ? JSON.stringify(sanitized.rxData) : null,
      sanitized.optumRxData ? JSON.stringify(sanitized.optumRxData) : null,
      sanitized.callStartTime ?? null,
      sanitized.callActive ? 1 : 0,
      sanitized.callTakenBy ?? null,
      sanitized.callDuration ?? 0
    ]);

    const row = await get<CustomerRow>('SELECT * FROM customer_summary WHERE id = ?', [finalId]);
    if (!row) {
      return res.status(500).json({ error: 'Internal server error' });
    }
    const createdCustomer = toApiCustomer(row);
    broadcastEvent('CUSTOMER_CREATED', createdCustomer);

    return res.status(201).json({ ok: true, id: finalId });
  } catch (err) {
    const error = err as Error;
    console.error('Create customer error:', error.message);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

router.put('/:id', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const id = String(req.params.id);
    const c: CustomerInput = req.body;

    const existing = await get<CustomerRow>(
      `SELECT id, name, age, gender, mobile, customerType, storeName,
              preferredLanguage, preferredLanguage2, storeFeedback, optumFeedback,
              status, activeProfile, lastUpdatedOn, rxData, optumRxData,
              callStartTime, callActive, callTakenBy, callDuration
       FROM customers WHERE id = ?`,
      [id]
    );
    if (!existing) {
      return res.status(404).json({ error: 'Customer not found' });
    }

    // Role-based scoping (VAPT Finding #16 & #18)
    if (req.user && req.user.role === 'store') {
      if (existing.storeName !== req.user.storeName) {
        return res.status(403).json({ error: 'Access Denied: Store location mismatch' });
      }
      // Store users cannot edit clinical Optum data
      c.optumRxData = existing.optumRxData ? JSON.parse(existing.optumRxData) : null;
      c.optumFeedback = existing.optumFeedback;
      c.storeName = req.user.storeName ?? undefined;
    }

    if (req.user && req.user.role === 'optum') {
      // Optum users cannot edit store demographics, language, or store feedback
      c.name = existing.name;
      c.age = existing.age;
      c.gender = existing.gender;
      c.mobile = existing.mobile;
      c.customerType = existing.customerType;
      c.storeName = existing.storeName;
      c.preferredLanguage = existing.preferredLanguage;
      c.preferredLanguage2 = existing.preferredLanguage2;
      c.storeFeedback = existing.storeFeedback;
    }

    if (c.rxData === undefined) {
      c.rxData = existing.rxData ? JSON.parse(existing.rxData) : null;
    }
    if (c.optumRxData === undefined) {
      c.optumRxData = existing.optumRxData ? JSON.parse(existing.optumRxData) : null;
    }
    if (c.optumFeedback === undefined) c.optumFeedback = existing.optumFeedback;
    if (c.storeFeedback === undefined) c.storeFeedback = existing.storeFeedback;
    if (c.callStartTime === undefined) c.callStartTime = existing.callStartTime;
    if (c.callActive === undefined) c.callActive = existing.callActive === 1;
    if (c.callTakenBy === undefined) c.callTakenBy = existing.callTakenBy;
    if (c.callDuration === undefined) c.callDuration = existing.callDuration || 0;

    const validation = validateCustomerData(c, true);
    if (!validation.valid) {
      return res.status(400).json({ error: 'Validation failed', details: validation.errors });
    }
    const sanitized = validation.sanitized;

    await run(`
      UPDATE customers SET
        name = ?, age = ?, gender = ?, mobile = ?, customerType = ?, storeName = ?,
        preferredLanguage = ?, preferredLanguage2 = ?, storeFeedback = ?, optumFeedback = ?,
        status = ?, activeProfile = ?, lastUpdatedOn = ?, rxData = ?, optumRxData = ?,
        callStartTime = ?, callActive = ?, callTakenBy = ?, callDuration = ?
      WHERE id = ?
    `, [
      sanitized.name!, sanitized.age!, sanitized.gender!, sanitized.mobile!, sanitized.customerType!, sanitized.storeName!,
      sanitized.preferredLanguage!, sanitized.preferredLanguage2 ?? '', sanitized.storeFeedback ?? '', sanitized.optumFeedback ?? '',
      sanitized.status!, sanitized.activeProfile ? 1 : 0, sanitized.lastUpdatedOn ?? '',
      sanitized.rxData ? JSON.stringify(sanitized.rxData) : null,
      sanitized.optumRxData ? JSON.stringify(sanitized.optumRxData) : null,
      sanitized.callStartTime ?? null,
      sanitized.callActive ? 1 : 0,
      sanitized.callTakenBy ?? null,
      sanitized.callDuration ?? 0,
      id
    ]);

    const row = await get<CustomerRow>('SELECT * FROM customer_summary WHERE id = ?', [id]);
    if (!row) {
      return res.status(500).json({ error: 'Internal server error' });
    }
    const updatedCustomer = toApiCustomer(row);
    broadcastEvent('CUSTOMER_UPDATED', updatedCustomer);

    return res.json({ ok: true, customer: updatedCustomer });
  } catch (err) {
    const error = err as Error;
    console.error('Update customer error:', error.message);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/:id/initiate-call', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const id = String(req.params.id);
    const customer = await verifyCustomerAccess(req, res, id);
    if (!customer) return;
    if (customer.callActive === 1) {
      const currentHolder = await get<UserRow>('SELECT role FROM users WHERE name = ?', [customer.callTakenBy]);
      const requesterRole = req.user!.role;

      let isStoreHolder = !!currentHolder && currentHolder.role === 'store';
      if (!currentHolder && customer.callTakenBy) {
        const lowerName = customer.callTakenBy.toLowerCase();
        if (lowerName.includes('store')) {
          isStoreHolder = true;
        }
      }
      const isOptumRequester = requesterRole === 'optum';

      if (!(isStoreHolder && isOptumRequester)) {
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
    const callerName = req.user!.name;

    await run(`
      UPDATE customers SET
        callActive = 1,
        callStartTime = ?,
        callTakenBy = ?,
        status = 'Initiated',
        lastUpdatedOn = ?
      WHERE id = ?
    `, [nowMs, callerName, timestamp, id]);

    const updatedRow = await get<CustomerRow>('SELECT * FROM customer_summary WHERE id = ?', [id]);
    if (!updatedRow) {
      return res.status(500).json({ error: 'Internal server error' });
    }
    const updatedCustomer = toApiCustomer(updatedRow);

    broadcastEvent('CUSTOMER_UPDATED', updatedCustomer);
    return res.json({ ok: true, customer: updatedCustomer });
  } catch (err) {
    const error = err as Error;
    console.error('Initiate call error:', error.message);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/:id/end-call', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const id = String(req.params.id);
    const customer = await verifyCustomerAccess(req, res, id);
    if (!customer) return;

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

    const updatedRow = await get<CustomerRow>('SELECT * FROM customer_summary WHERE id = ?', [id]);
    if (!updatedRow) {
      return res.status(500).json({ error: 'Internal server error' });
    }
    const updatedCustomer = {
      ...toApiCustomer(updatedRow),
      callActive: false,
    };

    broadcastEvent('CUSTOMER_UPDATED', updatedCustomer);
    return res.json({ ok: true, customer: updatedCustomer });
  } catch (err) {
    const error = err as Error;
    console.error('End call error:', error.message);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/:id/logs', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const id = String(req.params.id);
    const customer = await verifyCustomerAccess(req, res, id);
    if (!customer) return;
    const rows = await all<CustomerLogRow>('SELECT * FROM customer_logs WHERE customerId = ? ORDER BY id DESC', [id]);
    const logs = rows.map(l => ({
      id: l.id,
      customerId: l.customerId,
      lastUpdatedOn: l.lastUpdatedOn,
      status: l.status,
      callDuration: l.callDuration,
      callTakenBy: l.callTakenBy
    }));
    return res.json(logs);
  } catch (err) {
    const error = err as Error;
    console.error('Fetch customer logs error:', error.message);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
