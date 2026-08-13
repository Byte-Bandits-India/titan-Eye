import crypto from 'crypto';
import { Response, Router } from 'express';

import type { CustomerInput } from '../types.js';

import { SESSION_IDLE_MS } from '../config/jwt.js';
import { all, CustomerLogRow, CustomerRow, get, run, SqlParam, UserRow } from '../db/database.js';
import { AuthenticatedRequest } from '../middleware/auth.js';
import { logger, logSecurityEvent } from '../utils/logger.js';
import { broadcastEvent } from '../utils/sse.js';
import { validateCustomerData } from '../utils/validation.js';

const router = Router();

async function findNextAvailableOptom(
  excludeEmails: string[]
): Promise<null | { email: string; name: string }> {
  // activeTokenSig is only cleared on explicit logout, not on token expiry, so also
  // require lastLogin to be within the token's lifetime to exclude stale sessions.
  const sessionCutoff = new Date(Date.now() - SESSION_IDLE_MS).toISOString();
  const optomUsers = await all<{ email: string; name: string }>(
    `SELECT email, name FROM users WHERE role = 'optom' AND status = 'active' AND activeTokenSig IS NOT NULL AND lastLogin >= ? ORDER BY name ASC`,
    [sessionCutoff]
  );
  const excludeLower = excludeEmails.map((e) => e.toLowerCase());
  const busyRows = await all<{ callTakenBy: null | string }>(
    `SELECT callTakenBy FROM customers WHERE status IN ('Initiated', 'Accepted') AND callTakenBy IS NOT NULL`
  );
  const busyLower = new Set(busyRows.map((r) => (r.callTakenBy || '').toLowerCase()));

  for (const optom of optomUsers) {
    if (excludeLower.includes(optom.email.toLowerCase())) {
      continue;
    }

    if (busyLower.has(optom.email.toLowerCase()) || busyLower.has(optom.name.toLowerCase())) {
      continue;
    }

    return optom;
  }

  logger.info('findNextAvailableOptom found nobody', {
    busyNames: Array.from(busyLower),
    candidateEmails: optomUsers.map((o) => o.email),
    excludeEmails: excludeLower,
  });

  return null;
}

/**
 * Advances a pending offer to the next available Optom (excluding everyone
 * already offered/declined so far), or releases the customer back to the
 * general queue when nobody is left to try. Shared by the manual "Ignore"
 * route and the automatic per-Optom response timeout below, so both paths
 * exhaust the same rotation instead of drifting apart.
 */
async function reassignOrReleaseCall(id: string, customer: CustomerRow): Promise<CustomerRow | null> {
  const timestamp = new Date().toLocaleString('en-US', {
    day: 'numeric',
    hour: 'numeric',
    hour12: true,
    minute: '2-digit',
    month: 'short',
    second: '2-digit',
    year: 'numeric',
  });

  const declinedList = (customer.declinedByOptomEmails || '')
    .split(',')
    .map((e) => e.trim())
    .filter(Boolean);

  if (customer.offeredToOptomEmail && !declinedList.includes(customer.offeredToOptomEmail)) {
    declinedList.push(customer.offeredToOptomEmail);
  }

  const nextOptom = await findNextAvailableOptom(declinedList);

  if (nextOptom) {
    await run(
      `
      UPDATE customers SET
        offeredToOptomEmail = ?,
        declinedByOptomEmails = ?,
        lastUpdatedOn = ?
      WHERE id = ?
    `,
      [nextOptom.email, declinedList.join(','), timestamp, id]
    );
  } else {
    await run(
      `
      UPDATE customers SET
        status = 'Created',
        callActive = 0,
        callTakenBy = NULL,
        offeredToOptomEmail = NULL,
        declinedByOptomEmails = NULL,
        lastUpdatedOn = ?
      WHERE id = ?
    `,
      [timestamp, id]
    );

    broadcastEvent('OPTOM_NO_RESPONSE', {
      customerId: id,
      customerName: customer.name,
      storeName: customer.storeName,
    });
  }

  return (await get<CustomerRow>('SELECT * FROM customer_summary WHERE id = ?', [id])) ?? null;
}

function toApiCustomer(row: CustomerRow) {
  return {
    ...row,
    activeProfile: row.activeProfile === 1,
    callActive: row.callActive === 1,
    optomCallStartTime: row.optomCallStartTime || null,
    optomFeedback: row.optomFeedback || '',
    optomRxData: row.optomRxData ? JSON.parse(row.optomRxData) : undefined,
    rxData: row.rxData ? JSON.parse(row.rxData) : undefined,
  };
}

async function verifyCustomerAccess(
  req: AuthenticatedRequest,
  res: Response,
  customerId: string
): Promise<CustomerRow | null> {
  const customer = await get<CustomerRow>(
    `SELECT id, name, age, gender, mobile, customerType, storeName,
            preferredLanguage, preferredLanguage2, storeFeedback, optomFeedback,
            status, activeProfile, createdOn, lastUpdatedOn, rxData, optomRxData,
            callStartTime, callActive, callTakenBy, storeContactEmail, callDuration, optomCallStartTime,
            offeredToOptomEmail, declinedByOptomEmails
     FROM customers WHERE id = ?`,
    [customerId]
  );

  if (!customer) {
    res.status(404).json({ error: 'Customer not found' });

    return null;
  }

  if (req.user && req.user.role === 'store') {
    if (customer.storeName !== req.user.storeName) {
      res
        .status(403)
        .json({ error: 'Access Denied: You cannot access records belonging to another store location.' });

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
      ORDER BY cl.id ASC
    `);

    const adminLogs = await all<{
      action: string;
      adminEmail: string;
      adminName: string;
      details: string;
      id: number;
      target: string;
      timestamp: string;
    }>('SELECT * FROM admin_logs ORDER BY id ASC');

    const optomUsersList = await all<{ email: string; name: string }>(
      'SELECT email, name FROM users WHERE role = ?',
      ['optom']
    );
    const adminUsersList = await all<{ email: string; name: string }>(
      'SELECT email, name FROM users WHERE role = ?',
      ['admin']
    );

    const isOptomActor = (takenBy?: null | string) => {
      if (!takenBy) {
        return false;
      }

      const lower = takenBy.toLowerCase();

      if (lower.startsWith('dr.') || lower.includes('optom')) {
        return true;
      }

      return optomUsersList.some((u) => u.name.toLowerCase() === lower || u.email.toLowerCase() === lower);
    };

    const isAdminActor = (takenBy?: null | string) => {
      if (!takenBy) {
        return false;
      }

      const lower = takenBy.toLowerCase();

      if (lower.includes('admin')) {
        return true;
      }

      return adminUsersList.some((u) => u.name.toLowerCase() === lower || u.email.toLowerCase() === lower);
    };

    let optomIdx = 0;
    let storeIdx = 0;
    let adminIdx = 0;

    const formattedCustomerLogs = customerLogs.map((l) => {
      const isOptom =
        isOptomActor(l.callTakenBy) ||
        Boolean(l.optomCallStartTime) ||
        l.status === 'Accepted' ||
        l.status === 'Completed';

      const isAdmin = !isOptom && isAdminActor(l.callTakenBy);

      let role: 'admin' | 'optom' | 'store' = 'store';
      let prefix = 'STR';
      let numStr = '';

      if (isAdmin) {
        adminIdx += 1;
        role = 'admin';
        prefix = 'ADM';
        numStr = String(adminIdx).padStart(3, '0');
      } else if (isOptom) {
        optomIdx += 1;
        role = 'optom';
        prefix = 'OPT';
        numStr = String(optomIdx).padStart(3, '0');
      } else {
        storeIdx += 1;
        role = 'store';
        prefix = 'STR';
        numStr = String(storeIdx).padStart(3, '0');
      }

      return {
        callDuration: l.callDuration,
        callStartTime: l.callStartTime,
        callTakenBy: l.callTakenBy || (isOptom ? 'Optom Doctor' : 'Store Staff'),
        customerId: l.customerId,
        customerName: l.customerName || 'N/A',
        id: `${prefix}-${numStr}`,
        lastUpdatedOn: l.lastUpdatedOn,
        optomCallStartTime: l.optomCallStartTime,
        role,
        status: l.status,
        storeName: l.storeName || 'Store / Clinic',
      };
    });

    const formattedAdminLogs = adminLogs.map((a) => {
      adminIdx += 1;
      const numStr = String(adminIdx).padStart(3, '0');

      return {
        callDuration: 0,
        callTakenBy: a.adminName ? `${a.adminName}` : a.adminEmail,
        customerId: a.target,
        customerName: a.details || 'Admin Management',
        id: `ADM-${numStr}`,
        lastUpdatedOn: a.timestamp,
        role: 'admin' as const,
        status: a.action,
        storeName: 'Admin System',
      };
    });

    const combinedLogs = [...formattedCustomerLogs, ...formattedAdminLogs].sort((a, b) => {
      const timeA = a.lastUpdatedOn ? new Date(a.lastUpdatedOn).getTime() : 0;
      const timeB = b.lastUpdatedOn ? new Date(b.lastUpdatedOn).getTime() : 0;

      if (isNaN(timeA) || isNaN(timeB)) {
        return 0;
      }

      return timeB - timeA;
    });

    return res.json(combinedLogs);
  } catch (err) {
    const error = err as Error;
    logger.error('Fetch all audit logs error', { errorMessage: error.message, requestId: req.requestId });

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

    logSecurityEvent('CUSTOMER_LIST_VIEWED', {
      requestId: req.requestId,
      resultCount: customers.length,
      storeScope: req.user?.role === 'store' ? req.user.storeName : undefined,
      viewerEmail: req.user?.email,
      viewerRole: req.user?.role,
    });

    return res.json(customers);
  } catch (err) {
    const error = err as Error;
    logger.error('Fetch customers error', { errorMessage: error.message, requestId: req.requestId });

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
      return res.status(400).json({ details: validation.errors, error: 'Validation failed' });
    }

    const sanitized = validation.sanitized;

    let finalId = c.id;
    const exists = finalId
      ? await get<{ id: string }>('SELECT id FROM customers WHERE id = ?', [finalId])
      : undefined;

    if (exists || !finalId) {
      const lastRow = await get<{ id: string }>(
        "SELECT id FROM customers ORDER BY CAST(REPLACE(id, '#', '') AS INTEGER) DESC LIMIT 1"
      );
      let nextNum = 1;

      if (lastRow && lastRow.id) {
        const numPart = lastRow.id.replace('#', '');
        nextNum = (parseInt(numPart, 10) || 0) + 1;
      }

      finalId = `#${String(nextNum).padStart(4, '0')}`;
    }

    const optomFeedbackVal = sanitized.optomFeedback ?? '';
    const optomRxVal = sanitized.optomRxData ?? null;

    await run(
      `
      INSERT INTO customers (
        id, name, age, gender, mobile, customerType, storeName,
        preferredLanguage, preferredLanguage2, storeFeedback, optomFeedback,
        status, activeProfile, createdOn, lastUpdatedOn, rxData, optomRxData,
        callStartTime, callActive, callTakenBy, callDuration
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `,
      [
        finalId,
        sanitized.name!,
        sanitized.age!,
        sanitized.gender!,
        sanitized.mobile!,
        sanitized.customerType!,
        sanitized.storeName!,
        sanitized.preferredLanguage!,
        sanitized.preferredLanguage2 ?? '',
        sanitized.storeFeedback ?? '',
        optomFeedbackVal,
        sanitized.status!,
        sanitized.activeProfile ? 1 : 0,
        new Date().toISOString(),
        sanitized.lastUpdatedOn ?? '',
        sanitized.rxData ? JSON.stringify(sanitized.rxData) : null,
        optomRxVal ? JSON.stringify(optomRxVal) : null,
        sanitized.callStartTime ?? null,
        sanitized.callActive ? 1 : 0,
        sanitized.callTakenBy ?? null,
        sanitized.callDuration ?? 0,
      ]
    );

    const row = await get<CustomerRow>('SELECT * FROM customer_summary WHERE id = ?', [finalId]);

    if (!row) {
      return res.status(500).json({ error: 'Internal server error' });
    }

    const createdCustomer = toApiCustomer(row);
    broadcastEvent('CUSTOMER_CREATED', createdCustomer);

    return res.status(201).json({ id: finalId, ok: true });
  } catch (err) {
    const error = err as Error;
    logger.error('Create customer error', { errorMessage: error.message, requestId: req.requestId });

    return res.status(500).json({ error: 'Internal server error' });
  }
});

router.put('/:id', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const id = String(req.params.id);
    const c: CustomerInput = req.body;

    const existing = await get<CustomerRow>(
      `SELECT id, name, age, gender, mobile, customerType, storeName,
              preferredLanguage, preferredLanguage2, storeFeedback, optomFeedback,
              status, activeProfile, createdOn, lastUpdatedOn, rxData, optomRxData,
              callStartTime, callActive, callTakenBy, callDuration, optomCallStartTime
       FROM customers WHERE id = ?`,
      [id]
    );

    if (!existing) {
      return res.status(404).json({ error: 'Customer not found' });
    }

    const existingOptomRx = existing.optomRxData;
    const existingOptomFeedback = existing.optomFeedback || '';

    if (req.user && req.user.role === 'store') {
      if (existing.storeName !== req.user.storeName) {
        return res.status(403).json({ error: 'Access Denied: Store location mismatch' });
      }

      c.optomRxData = existingOptomRx ? JSON.parse(existingOptomRx) : null;
      c.optomFeedback = existingOptomFeedback;
      c.storeName = req.user.storeName ?? undefined;
    }

    if (req.user && req.user.role === 'optom') {
      c.name = existing.name;
      c.age = existing.age;
      c.gender = existing.gender;
      c.mobile = existing.mobile;
      c.customerType = existing.customerType;
      c.storeName = existing.storeName;
      c.preferredLanguage = existing.preferredLanguage;
      c.preferredLanguage2 = existing.preferredLanguage2;
      c.storeFeedback = existing.storeFeedback;

      // Only the store can close out a visit (POST /:id/complete, which also
      // issues the patient feedback QR token) - block Optoms from setting
      // this status through the generic update route.
      if (c.status === 'Completed') {
        c.status = existing.status;
      }
    }

    if (c.rxData === undefined) {
      c.rxData = existing.rxData ? JSON.parse(existing.rxData) : null;
    }

    if (c.optomRxData === undefined) {
      c.optomRxData = existingOptomRx ? JSON.parse(existingOptomRx) : null;
    }

    if (c.optomFeedback === undefined) {
      c.optomFeedback = existingOptomFeedback;
    }

    if (c.storeFeedback === undefined) {
      c.storeFeedback = existing.storeFeedback;
    }

    if (c.callStartTime === undefined) {
      c.callStartTime = existing.callStartTime;
    }

    if (c.callActive === undefined) {
      c.callActive = existing.callActive === 1;
    }

    if (c.callTakenBy === undefined) {
      c.callTakenBy = existing.callTakenBy;
    }

    if (c.optomCallStartTime === undefined) {
      c.optomCallStartTime = existing.optomCallStartTime;
    }

    const validation = validateCustomerData(c, true);

    if (!validation.valid) {
      return res.status(400).json({ details: validation.errors, error: 'Validation failed' });
    }

    const sanitized = validation.sanitized;

    const optomFeedbackVal = sanitized.optomFeedback ?? '';
    const optomRxVal = sanitized.optomRxData ?? null;
    const optomCallStartVal = c.optomCallStartTime ?? null;

    await run(
      `
      UPDATE customers SET
        name = ?, age = ?, gender = ?, mobile = ?, customerType = ?, storeName = ?,
        preferredLanguage = ?, preferredLanguage2 = ?, storeFeedback = ?, optomFeedback = ?,
        status = ?, activeProfile = ?, lastUpdatedOn = ?, rxData = ?, optomRxData = ?,
        callStartTime = ?, callActive = ?, callTakenBy = ?, callDuration = ?, optomCallStartTime = ?
      WHERE id = ?
    `,
      [
        sanitized.name!,
        sanitized.age!,
        sanitized.gender!,
        sanitized.mobile!,
        sanitized.customerType!,
        sanitized.storeName!,
        sanitized.preferredLanguage!,
        sanitized.preferredLanguage2 ?? '',
        sanitized.storeFeedback ?? '',
        optomFeedbackVal,
        sanitized.status!,
        sanitized.activeProfile ? 1 : 0,
        sanitized.lastUpdatedOn ?? '',
        sanitized.rxData ? JSON.stringify(sanitized.rxData) : null,
        optomRxVal ? JSON.stringify(optomRxVal) : null,
        sanitized.callStartTime ?? null,
        sanitized.callActive ? 1 : 0,
        sanitized.callTakenBy ?? null,
        sanitized.callDuration ?? 0,
        optomCallStartVal,
        id,
      ]
    );

    const row = await get<CustomerRow>('SELECT * FROM customer_summary WHERE id = ?', [id]);

    if (!row) {
      return res.status(500).json({ error: 'Internal server error' });
    }

    const updatedCustomer = toApiCustomer(row);
    broadcastEvent('CUSTOMER_UPDATED', updatedCustomer);

    return res.json({ customer: updatedCustomer, ok: true });
  } catch (err) {
    const error = err as Error;
    logger.error('Update customer error', { errorMessage: error.message, requestId: req.requestId });

    return res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/:id/initiate-call', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const id = String(req.params.id);
    const customer = await verifyCustomerAccess(req, res, id);

    if (!customer) {
      return;
    }

    if (req.user!.role === 'store') {
      const otherActiveCustomer = await get<{ id: string }>(
        `SELECT id FROM customers WHERE storeName = ? AND id != ? AND status IN ('Initiated', 'Accepted') LIMIT 1`,
        [customer.storeName, id]
      );

      if (otherActiveCustomer) {
        return res.status(409).json({
          error:
            'Your store already has a pending Optom request for another customer. Please wait for it to be resolved before requesting another.',
        });
      }
    }

    if (customer.status === 'Initiated' || customer.status === 'Accepted') {
      const currentHolder = await get<UserRow>('SELECT role FROM users WHERE name = ?', [
        customer.callTakenBy,
      ]);
      const requesterRole = req.user!.role;

      let isStoreHolder = !!currentHolder && currentHolder.role === 'store';

      if (!currentHolder && customer.callTakenBy) {
        const lowerName = customer.callTakenBy.toLowerCase();

        if (lowerName.includes('store')) {
          isStoreHolder = true;
        }
      }

      const isOptomRequester = requesterRole === 'optom';

      // The store cannot manually retry while a request is still in rotation -
      // the background timeout below cycles through Optoms automatically and
      // only releases the customer back to 'Created' once everyone has been tried.
      if (!(isStoreHolder && isOptomRequester)) {
        return res
          .status(409)
          .json({ error: `Call is already taken by ${customer.callTakenBy || 'another agent'}` });
      }
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
    const nowMs = String(Date.now());
    const callerName = req.user!.name;

    let storeContactEmail = customer.storeContactEmail;

    if (req.user!.role === 'store') {
      const callerAccount = await get<UserRow>(
        'SELECT email, microsoftUpn FROM users WHERE LOWER(email) = LOWER(?)',
        [req.user!.email]
      );
      storeContactEmail = callerAccount?.microsoftUpn || callerAccount?.email || req.user!.email;

      const targetOptom = await findNextAvailableOptom([]);

      if (!targetOptom) {
        broadcastEvent('NO_OPTOM_AVAILABLE', {
          customerId: id,
          customerName: customer.name,
          storeName: customer.storeName,
        });

        return res.status(409).json({ error: 'No Optom doctors are currently available to take this call.' });
      }

      await run(
        `
        UPDATE customers SET
          callActive = 1,
          callStartTime = ?,
          optomCallStartTime = NULL,
          callDuration = 0,
          callTakenBy = ?,
          storeContactEmail = ?,
          status = 'Initiated',
          offeredToOptomEmail = ?,
          declinedByOptomEmails = NULL,
          lastUpdatedOn = ?
        WHERE id = ?
      `,
        [nowMs, callerName, storeContactEmail, targetOptom.email, timestamp, id]
      );
    } else {
      await run(
        `
        UPDATE customers SET
          callActive = 1,
          optomCallStartTime = ?,
          callTakenBy = ?,
          status = 'Accepted',
          offeredToOptomEmail = NULL,
          declinedByOptomEmails = NULL,
          lastUpdatedOn = ?
        WHERE id = ?
      `,
        [nowMs, callerName, timestamp, id]
      );
    }

    const updatedRow = await get<CustomerRow>('SELECT * FROM customer_summary WHERE id = ?', [id]);

    if (!updatedRow) {
      return res.status(500).json({ error: 'Internal server error' });
    }

    const updatedCustomer = toApiCustomer(updatedRow);

    broadcastEvent('CUSTOMER_UPDATED', updatedCustomer);

    return res.json({ customer: updatedCustomer, ok: true });
  } catch (err) {
    const error = err as Error;
    logger.error('Initiate call error', { errorMessage: error.message, requestId: req.requestId });

    return res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/:id/reject-call', async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (req.user!.role !== 'optom') {
      return res.status(403).json({ error: 'Only Optom users can reject a call offer.' });
    }

    const id = String(req.params.id);
    const customer = await verifyCustomerAccess(req, res, id);

    if (!customer) {
      return;
    }

    if (
      customer.status !== 'Initiated' ||
      (customer.offeredToOptomEmail || '').toLowerCase() !== req.user!.email.toLowerCase()
    ) {
      return res.status(409).json({ error: 'This call is not currently offered to you.' });
    }

    const updatedRow = await reassignOrReleaseCall(id, customer);

    if (!updatedRow) {
      return res.status(500).json({ error: 'Internal server error' });
    }

    const updatedCustomer = toApiCustomer(updatedRow);

    broadcastEvent('CUSTOMER_UPDATED', updatedCustomer);

    return res.json({ customer: updatedCustomer, ok: true });
  } catch (err) {
    const error = err as Error;
    logger.error('Reject call error', { errorMessage: error.message, requestId: req.requestId });

    return res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/:id/cancel-call', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const id = String(req.params.id);
    const customer = await verifyCustomerAccess(req, res, id);

    if (!customer) {
      return;
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

    await run(
      `
      UPDATE customers SET
        status = 'Created',
        callActive = 0,
        callTakenBy = NULL,
        offeredToOptomEmail = NULL,
        declinedByOptomEmails = NULL,
        lastUpdatedOn = ?
      WHERE id = ?
    `,
      [timestamp, id]
    );

    const updatedRow = await get<CustomerRow>('SELECT * FROM customer_summary WHERE id = ?', [id]);

    if (!updatedRow) {
      return res.status(500).json({ error: 'Internal server error' });
    }

    const updatedCustomer = toApiCustomer(updatedRow);
    broadcastEvent('CUSTOMER_UPDATED', updatedCustomer);

    return res.json({ customer: updatedCustomer, ok: true });
  } catch (err) {
    const error = err as Error;
    logger.error('Cancel call error', { errorMessage: error.message, requestId: req.requestId });

    return res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/:id/end-call', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const id = String(req.params.id);
    const customer = await verifyCustomerAccess(req, res, id);

    if (!customer) {
      return;
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

    let durationSec = customer.callDuration || 0;
    const startMsSource = customer.optomCallStartTime || customer.callStartTime;

    if (startMsSource) {
      const startMs = parseInt(startMsSource, 10);

      if (!isNaN(startMs)) {
        durationSec = Math.floor((Date.now() - startMs) / 1000);
      }
    }

    // Ending the call no longer marks the customer Completed - only the store
    // can do that (via POST /:id/complete), after they've confirmed the visit
    // is actually done. Status is left as-is (still 'Accepted').
    await run(
      `
      UPDATE customers SET
        callActive = 0,
        callTakenBy = NULL,
        lastUpdatedOn = ?,
        callDuration = ?
      WHERE id = ?
    `,
      [timestamp, durationSec, id]
    );

    const updatedRow = await get<CustomerRow>('SELECT * FROM customer_summary WHERE id = ?', [id]);

    if (!updatedRow) {
      return res.status(500).json({ error: 'Internal server error' });
    }

    const updatedCustomer = {
      ...toApiCustomer(updatedRow),
      callActive: false,
    };

    broadcastEvent('CUSTOMER_UPDATED', updatedCustomer);

    return res.json({ customer: updatedCustomer, ok: true });
  } catch (err) {
    const error = err as Error;
    logger.error('End call error', { errorMessage: error.message, requestId: req.requestId });

    return res.status(500).json({ error: 'Internal server error' });
  }
});

const FEEDBACK_TOKEN_EXPIRY_MS = 24 * 60 * 60 * 1000;

router.post('/:id/complete', async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (req.user!.role !== 'store') {
      return res.status(403).json({ error: 'Only Store users can mark a call as completed.' });
    }

    const id = String(req.params.id);
    const customer = await verifyCustomerAccess(req, res, id);

    if (!customer) {
      return;
    }

    if (customer.status !== 'Accepted' || customer.callActive) {
      return res.status(409).json({ error: 'This customer has no completed consultation to close out yet.' });
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

    await run(
      `
      UPDATE customers SET
        status = 'Completed',
        lastUpdatedOn = ?
      WHERE id = ?
    `,
      [timestamp, id]
    );

    const token = crypto.randomBytes(24).toString('hex');
    const createdAt = new Date().toISOString();
    const expiresAt = new Date(Date.now() + FEEDBACK_TOKEN_EXPIRY_MS).toISOString();

    await run(
      `
      INSERT INTO feedback_tokens (token, customerId, createdAt, expiresAt, usedAt)
      VALUES (?, ?, ?, ?, NULL)
    `,
      [token, id, createdAt, expiresAt]
    );

    const updatedRow = await get<CustomerRow>('SELECT * FROM customer_summary WHERE id = ?', [id]);

    if (!updatedRow) {
      return res.status(500).json({ error: 'Internal server error' });
    }

    const updatedCustomer = toApiCustomer(updatedRow);

    broadcastEvent('CUSTOMER_UPDATED', updatedCustomer);

    return res.json({ customer: updatedCustomer, ok: true, token });
  } catch (err) {
    const error = err as Error;
    logger.error('Complete call error', { errorMessage: error.message, requestId: req.requestId });

    return res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/:id/logs', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const id = String(req.params.id);
    const customer = await verifyCustomerAccess(req, res, id);

    if (!customer) {
      return;
    }

    const rows = await all<CustomerLogRow>(
      'SELECT * FROM customer_logs WHERE customerId = ? ORDER BY id DESC',
      [id]
    );
    const logs = rows.map((l) => ({
      callDuration: l.callDuration,
      callTakenBy: l.callTakenBy,
      customerId: l.customerId,
      id: l.id,
      lastUpdatedOn: l.lastUpdatedOn,
      status: l.status,
    }));

    logSecurityEvent('CUSTOMER_RECORD_VIEWED', {
      customerId: id,
      requestId: req.requestId,
      viewerEmail: req.user?.email,
      viewerRole: req.user?.role,
    });

    return res.json(logs);
  } catch (err) {
    const error = err as Error;
    logger.error('Fetch customer logs error', { errorMessage: error.message, requestId: req.requestId });

    return res.status(500).json({ error: 'Internal server error' });
  }
});

setInterval(async () => {
  try {
    const nowMs = Date.now();
    const initiatedCalls = await all<CustomerRow>(
      "SELECT id, callStartTime, lastUpdatedOn FROM customers WHERE status = 'Initiated' AND callActive = 1"
    );

    for (const call of initiatedCalls) {
      const startTimeStr = call.callStartTime || call.lastUpdatedOn;

      if (startTimeStr) {
        let startMs = parseInt(startTimeStr, 10);

        if (isNaN(startMs) || String(startMs).length < 10) {
          startMs = new Date(startTimeStr).getTime();
        }

        if (!isNaN(startMs) && nowMs - startMs >= 3540000) {
          const timestamp = new Date().toLocaleString('en-US', {
            day: 'numeric',
            hour: 'numeric',
            hour12: true,
            minute: '2-digit',
            month: 'short',
            second: '2-digit',
            year: 'numeric',
          });
          await run(
            `
            UPDATE customers SET
              status = 'Closed',
              callActive = 0,
              callTakenBy = NULL,
              lastUpdatedOn = ?
            WHERE id = ?
          `,
            [timestamp, call.id]
          );

          const updatedRow = await get<CustomerRow>('SELECT * FROM customer_summary WHERE id = ?', [call.id]);

          if (updatedRow) {
            broadcastEvent('CUSTOMER_UPDATED', toApiCustomer(updatedRow));
          }
        }
      }
    }
  } catch (err) {
    logger.error('Server auto-close timeout error', { errorMessage: (err as Error).message });
  }
}, 5000);

const OPTOM_RESPONSE_TIMEOUT_MS = 10000;

// If the Optom currently offered a call doesn't respond in time, automatically
// rotate the offer to the next available Optom (or release it back to the
// queue once everyone has been tried) instead of leaving the store stuck
// waiting on a single unresponsive Optom.
setInterval(async () => {
  try {
    const nowMs = Date.now();
    const pendingOffers = await all<CustomerRow>(
      "SELECT * FROM customer_summary WHERE status = 'Initiated' AND callActive = 1 AND offeredToOptomEmail IS NOT NULL"
    );

    for (const customer of pendingOffers) {
      const referenceTimeStr = customer.lastUpdatedOn || customer.callStartTime;

      if (!referenceTimeStr) {
        continue;
      }

      let referenceMs = parseInt(referenceTimeStr, 10);

      if (isNaN(referenceMs) || String(referenceMs).length < 10) {
        referenceMs = new Date(referenceTimeStr).getTime();
      }

      const elapsedMs = nowMs - referenceMs;

      if (isNaN(referenceMs) || elapsedMs < OPTOM_RESPONSE_TIMEOUT_MS) {
        continue;
      }

      logger.info('Optom response timeout - rotating offer', {
        customerId: customer.id,
        elapsedMs,
        offeredToOptomEmail: customer.offeredToOptomEmail,
        referenceTimeStr,
      });

      const updatedRow = await reassignOrReleaseCall(customer.id, customer);

      if (updatedRow) {
        logger.info('Optom offer rotation result', {
          customerId: customer.id,
          newOfferedToOptomEmail: updatedRow.offeredToOptomEmail,
          newStatus: updatedRow.status,
        });
        broadcastEvent('CUSTOMER_UPDATED', toApiCustomer(updatedRow));
      }
    }
  } catch (err) {
    logger.error('Optom auto-rotation error', { errorMessage: (err as Error).message });
  }
}, 3000);

export default router;
