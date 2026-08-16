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

async function findNextAvailableOptometrist(
  excludeEmails: string[]
): Promise<null | { email: string; name: string }> {
  // activeTokenSig is only cleared on explicit logout, not on token expiry, so also
  // require lastLogin to be within the token's lifetime to exclude stale sessions.
  const sessionCutoff = new Date(Date.now() - SESSION_IDLE_MS).toISOString();
  const optometristUsers = await all<{ email: string; name: string }>(
    `SELECT email, name FROM users WHERE role = 'optometrist' AND status = 'active' AND activeTokenSig IS NOT NULL AND lastLogin >= ? ORDER BY name ASC`,
    [sessionCutoff]
  );
  const excludeLower = excludeEmails.map((e) => e.toLowerCase());
  const busyRows = await all<{ callTakenBy: null | string }>(
    `SELECT callTakenBy FROM customers WHERE status IN ('Initiated', 'Accepted') AND callTakenBy IS NOT NULL`
  );
  const busyLower = new Set(busyRows.map((r) => (r.callTakenBy || '').toLowerCase()));

  // Route to whoever has completed the fewest calls so far, so load balances
  // across optometrists instead of always favoring the alphabetically-first one.
  const callCountRows = await all<{ callCount: number; callTakenBy: null | string }>(
    `SELECT callTakenBy, COUNT(*) as callCount FROM customers WHERE status = 'Completed' AND callTakenBy IS NOT NULL GROUP BY callTakenBy`
  );
  const callCountByName = new Map<string, number>();
  for (const row of callCountRows) {
    callCountByName.set((row.callTakenBy || '').toLowerCase(), row.callCount);
  }

  const sortedOptometrists = [...optometristUsers].sort((a, b) => {
    const aCount = callCountByName.get(a.name.toLowerCase()) ?? 0;
    const bCount = callCountByName.get(b.name.toLowerCase()) ?? 0;

    if (aCount !== bCount) {
      return aCount - bCount;
    }

    return a.name.localeCompare(b.name);
  });

  for (const optometrist of sortedOptometrists) {
    if (excludeLower.includes(optometrist.email.toLowerCase())) {
      continue;
    }

    if (busyLower.has(optometrist.email.toLowerCase()) || busyLower.has(optometrist.name.toLowerCase())) {
      continue;
    }

    return optometrist;
  }

  logger.info('findNextAvailableOptometrist found nobody', {
    busyNames: Array.from(busyLower),
    candidateEmails: optometristUsers.map((o) => o.email),
    excludeEmails: excludeLower,
  });

  return null;
}

/**
 * Advances a pending offer to the next available Optometrist (excluding everyone
 * already offered/declined so far), or releases the customer back to the
 * general queue when nobody is left to try. Shared by the manual "Ignore"
 * route and the automatic per-Optometrist response timeout below, so both paths
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

  const declinedList = (customer.declinedByOptometristEmails || '')
    .split(',')
    .map((e) => e.trim())
    .filter(Boolean);

  if (customer.offeredToOptometristEmail && !declinedList.includes(customer.offeredToOptometristEmail)) {
    declinedList.push(customer.offeredToOptometristEmail);
  }

  const nextOptometrist = await findNextAvailableOptometrist(declinedList);

  if (nextOptometrist) {
    await run(
      `
      UPDATE customers SET
        offeredToOptometristEmail = ?,
        declinedByOptometristEmails = ?,
        lastUpdatedOn = ?
      WHERE id = ?
    `,
      [nextOptometrist.email, declinedList.join(','), timestamp, id]
    );
  } else {
    await run(
      `
      UPDATE customers SET
        status = 'Created',
        callActive = 0,
        callTakenBy = NULL,
        offeredToOptometristEmail = NULL,
        declinedByOptometristEmails = NULL,
        lastUpdatedOn = ?
      WHERE id = ?
    `,
      [timestamp, id]
    );

    broadcastEvent('OPTOMETRIST_NO_RESPONSE', {
      customerId: id,
      customerName: customer.name,
      storeName: customer.storeName,
    });
  }

  return (await get<CustomerRow>('SELECT * FROM customer_summary WHERE id = ?', [id])) ?? null;
}

export function toApiCustomer(row: CustomerRow) {
  return {
    ...row,
    activeProfile: row.activeProfile === 1,
    callActive: row.callActive === 1,
    isPriority: row.isPriority === 1,
    optometristCallStartTime: row.optometristCallStartTime || null,
    optometristFeedback: row.optometristFeedback || '',
    optometristRxData: row.optometristRxData ? JSON.parse(row.optometristRxData) : undefined,
    rxData: row.rxData ? JSON.parse(row.rxData) : undefined,
  };
}

function parseTimestampValue(val: null | string | undefined): number {
  if (!val) {
    return 0;
  }

  const num = parseInt(val, 10);

  if (!isNaN(num) && String(num).length >= 10) {
    return num;
  }

  const dateMs = new Date(val).getTime();

  return isNaN(dateMs) ? 0 : dateMs;
}

/**
 * Ranks every customer, system-wide, that has actually had an Optometrist request
 * raised for it — either still 'Initiated', or fallen back to the open 'Created'
 * queue after every Optometrist declined. A brand-new 'Created' customer that the
 * store hasn't requested yet (no callStartTime) has no queue position at all.
 * Customers dropped mid-testing (isPriority) rank first, ordered by drop time;
 * everyone else follows in the order they were originally requested.
 */
async function computeQueuePositions(): Promise<Map<string, number>> {
  const rows = await all<Pick<CustomerRow, 'callStartTime' | 'createdOn' | 'id' | 'isPriority' | 'lastUpdatedOn'>>(
    `SELECT id, createdOn, callStartTime, lastUpdatedOn, isPriority FROM customers
     WHERE status = 'Initiated' OR (status = 'Created' AND callStartTime IS NOT NULL AND callStartTime != '')`
  );

  const priorityRows = rows
    .filter((r) => r.isPriority === 1)
    .sort((a, b) => parseTimestampValue(a.lastUpdatedOn) - parseTimestampValue(b.lastUpdatedOn));

  const normalRows = rows
    .filter((r) => r.isPriority !== 1)
    .sort(
      (a, b) =>
        parseTimestampValue(a.callStartTime || a.createdOn || a.lastUpdatedOn) -
        parseTimestampValue(b.callStartTime || b.createdOn || b.lastUpdatedOn)
    );

  const positions = new Map<string, number>();

  [...priorityRows, ...normalRows].forEach((r, idx) => positions.set(r.id, idx + 1));

  return positions;
}

async function verifyCustomerAccess(
  req: AuthenticatedRequest,
  res: Response,
  customerId: string
): Promise<CustomerRow | null> {
  const customer = await get<CustomerRow>(
    `SELECT id, name, age, gender, mobile, customerType, storeName,
            preferredLanguage, preferredLanguage2, storeFeedback, optometristFeedback,
            status, activeProfile, createdOn, lastUpdatedOn, rxData, optometristRxData,
            callStartTime, callActive, callTakenBy, storeContactEmail, callDuration, optometristCallStartTime,
            offeredToOptometristEmail, declinedByOptometristEmails, patientFeedback, isPriority
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

    const optometristUsersList = await all<{ email: string; name: string }>(
      'SELECT email, name FROM users WHERE role = ?',
      ['optometrist']
    );
    const adminUsersList = await all<{ email: string; name: string }>(
      'SELECT email, name FROM users WHERE role = ?',
      ['admin']
    );

    const isOptometristActor = (takenBy?: null | string) => {
      if (!takenBy) {
        return false;
      }

      const lower = takenBy.toLowerCase();

      if (lower.startsWith('dr.') || lower.includes('optometrist')) {
        return true;
      }

      return optometristUsersList.some((u) => u.name.toLowerCase() === lower || u.email.toLowerCase() === lower);
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

    let optometristIdx = 0;
    let storeIdx = 0;
    let adminIdx = 0;

    const formattedCustomerLogs = customerLogs.map((l) => {
      const isOptometrist =
        isOptometristActor(l.callTakenBy) ||
        Boolean(l.optometristCallStartTime) ||
        l.status === 'Accepted' ||
        l.status === 'Completed';

      const isAdmin = !isOptometrist && isAdminActor(l.callTakenBy);

      let role: 'admin' | 'optometrist' | 'store' = 'store';
      let prefix = 'STR';
      let numStr = '';

      if (isAdmin) {
        adminIdx += 1;
        role = 'admin';
        prefix = 'ADM';
        numStr = String(adminIdx).padStart(3, '0');
      } else if (isOptometrist) {
        optometristIdx += 1;
        role = 'optometrist';
        prefix = 'OPT';
        numStr = String(optometristIdx).padStart(3, '0');
      } else {
        storeIdx += 1;
        role = 'store';
        prefix = 'STR';
        numStr = String(storeIdx).padStart(3, '0');
      }

      return {
        callDuration: l.callDuration,
        callStartTime: l.callStartTime,
        callTakenBy: l.callTakenBy || (isOptometrist ? 'Optometrist Doctor' : 'Store Staff'),
        customerId: l.customerId,
        customerName: l.customerName || 'N/A',
        id: `${prefix}-${numStr}`,
        lastUpdatedOn: l.lastUpdatedOn,
        optometristCallStartTime: l.optometristCallStartTime,
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
    const queuePositions = await computeQueuePositions();
    const customers = rows.map((row) => ({
      ...toApiCustomer(row),
      queuePosition: queuePositions.get(row.id) ?? null,
    }));

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

    const optometristFeedbackVal = sanitized.optometristFeedback ?? '';
    const optometristRxVal = sanitized.optometristRxData ?? null;

    await run(
      `
      INSERT INTO customers (
        id, name, age, gender, mobile, customerType, storeName,
        preferredLanguage, preferredLanguage2, storeFeedback, optometristFeedback,
        status, activeProfile, createdOn, lastUpdatedOn, rxData, optometristRxData,
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
        optometristFeedbackVal,
        sanitized.status!,
        sanitized.activeProfile ? 1 : 0,
        new Date().toISOString(),
        sanitized.lastUpdatedOn ?? '',
        sanitized.rxData ? JSON.stringify(sanitized.rxData) : null,
        optometristRxVal ? JSON.stringify(optometristRxVal) : null,
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
              preferredLanguage, preferredLanguage2, storeFeedback, optometristFeedback,
              status, activeProfile, createdOn, lastUpdatedOn, rxData, optometristRxData,
              callStartTime, callActive, callTakenBy, callDuration, optometristCallStartTime
       FROM customers WHERE id = ?`,
      [id]
    );

    if (!existing) {
      return res.status(404).json({ error: 'Customer not found' });
    }

    const existingOptometristRx = existing.optometristRxData;
    const existingOptometristFeedback = existing.optometristFeedback || '';

    if (req.user && req.user.role === 'store') {
      if (existing.storeName !== req.user.storeName) {
        return res.status(403).json({ error: 'Access Denied: Store location mismatch' });
      }

      c.optometristRxData = existingOptometristRx ? JSON.parse(existingOptometristRx) : null;
      c.optometristFeedback = existingOptometristFeedback;
      c.storeName = req.user.storeName ?? undefined;
    }

    if (req.user?.role === 'optometrist') {
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

    if (c.optometristRxData === undefined) {
      c.optometristRxData = existingOptometristRx ? JSON.parse(existingOptometristRx) : null;
    }

    if (c.optometristFeedback === undefined) {
      c.optometristFeedback = existingOptometristFeedback;
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

    if (c.optometristCallStartTime === undefined) {
      c.optometristCallStartTime = existing.optometristCallStartTime;
    }

    const validation = validateCustomerData(c, true);

    if (!validation.valid) {
      return res.status(400).json({ details: validation.errors, error: 'Validation failed' });
    }

    const sanitized = validation.sanitized;

    const optometristFeedbackVal = sanitized.optometristFeedback ?? '';
    const optometristRxVal = sanitized.optometristRxData ?? null;
    const optometristCallStartVal = c.optometristCallStartTime ?? null;

    await run(
      `
      UPDATE customers SET
        name = ?, age = ?, gender = ?, mobile = ?, customerType = ?, storeName = ?,
        preferredLanguage = ?, preferredLanguage2 = ?, storeFeedback = ?, optometristFeedback = ?,
        status = ?, activeProfile = ?, lastUpdatedOn = ?, rxData = ?, optometristRxData = ?,
        callStartTime = ?, callActive = ?, callTakenBy = ?, callDuration = ?, optometristCallStartTime = ?
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
        optometristFeedbackVal,
        sanitized.status!,
        sanitized.activeProfile ? 1 : 0,
        sanitized.lastUpdatedOn ?? '',
        sanitized.rxData ? JSON.stringify(sanitized.rxData) : null,
        optometristRxVal ? JSON.stringify(optometristRxVal) : null,
        sanitized.callStartTime ?? null,
        sanitized.callActive ? 1 : 0,
        sanitized.callTakenBy ?? null,
        sanitized.callDuration ?? 0,
        optometristCallStartVal,
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
            'Your store already has a pending Optometrist request for another customer. Please wait for it to be resolved before requesting another.',
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

      const isOptometristRequester = requesterRole === 'optometrist';

      // The store cannot manually retry while a request is still in rotation -
      // the background timeout below cycles through Optometrists automatically and
      // only releases the customer back to 'Created' once everyone has been tried.
      if (!(isStoreHolder && isOptometristRequester)) {
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

      const targetOptometrist = await findNextAvailableOptometrist([]);

      if (!targetOptometrist) {
        broadcastEvent('NO_OPTOMETRIST_AVAILABLE', {
          customerId: id,
          customerName: customer.name,
          storeName: customer.storeName,
        });

        return res.status(409).json({ error: 'No Optometrist doctors are currently available to take this call.' });
      }

      await run(
        `
        UPDATE customers SET
          callActive = 1,
          callStartTime = ?,
          optometristCallStartTime = NULL,
          callDuration = 0,
          callTakenBy = ?,
          storeContactEmail = ?,
          status = 'Initiated',
          offeredToOptometristEmail = ?,
          declinedByOptometristEmails = NULL,
          lastUpdatedOn = ?
        WHERE id = ?
      `,
        [nowMs, callerName, storeContactEmail, targetOptometrist.email, timestamp, id]
      );
    } else {
      await run(
        `
        UPDATE customers SET
          callActive = 1,
          optometristCallStartTime = ?,
          callTakenBy = ?,
          status = 'Accepted',
          offeredToOptometristEmail = NULL,
          declinedByOptometristEmails = NULL,
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
    if (req.user!.role !== 'optometrist') {
      return res.status(403).json({ error: 'Only Optometrist users can reject a call offer.' });
    }

    const id = String(req.params.id);
    const customer = await verifyCustomerAccess(req, res, id);

    if (!customer) {
      return;
    }

    if (
      customer.status !== 'Initiated' ||
      (customer.offeredToOptometristEmail || '').toLowerCase() !== req.user!.email.toLowerCase()
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

router.post('/:id/drop-call', async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (req.user!.role !== 'optometrist') {
      return res.status(403).json({ error: 'Only Optometrist users can drop a call.' });
    }

    const id = String(req.params.id);
    const customer = await verifyCustomerAccess(req, res, id);

    if (!customer) {
      return;
    }

    const takenByLower = (customer.callTakenBy || '').toLowerCase();
    const isCurrentHolder =
      takenByLower === req.user!.name.toLowerCase() || takenByLower === req.user!.email.toLowerCase();

    if (customer.status !== 'Accepted' || !isCurrentHolder) {
      return res.status(409).json({ error: 'This call is not currently active with you.' });
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

    const declinedList = (customer.declinedByOptometristEmails || '')
      .split(',')
      .map((e) => e.trim())
      .filter(Boolean);

    // Add current optometrist to declined list
    const currentEmail = req.user!.email;
    if (!declinedList.some((e) => e.toLowerCase() === currentEmail.toLowerCase())) {
      declinedList.push(currentEmail);
    }
    if (
      customer.offeredToOptometristEmail &&
      !declinedList.some((e) => e.toLowerCase() === customer.offeredToOptometristEmail?.toLowerCase())
    ) {
      declinedList.push(customer.offeredToOptometristEmail);
    }

    const nextOptometrist = await findNextAvailableOptometrist(declinedList);

    if (nextOptometrist) {
      await run(
        `
        UPDATE customers SET
          status = 'Initiated',
          callActive = 0,
          callTakenBy = NULL,
          optometristCallStartTime = NULL,
          offeredToOptometristEmail = ?,
          declinedByOptometristEmails = ?,
          lastUpdatedOn = ?,
          isPriority = 1
        WHERE id = ?
      `,
        [nextOptometrist.email, declinedList.join(','), timestamp, id]
      );
    } else {
      await run(
        `
        UPDATE customers SET
          status = 'Created',
          callActive = 0,
          callTakenBy = NULL,
          optometristCallStartTime = NULL,
          offeredToOptometristEmail = NULL,
          declinedByOptometristEmails = NULL,
          lastUpdatedOn = ?,
          isPriority = 1
        WHERE id = ?
      `,
        [timestamp, id]
      );

      broadcastEvent('OPTOMETRIST_NO_RESPONSE', {
        customerId: id,
        customerName: customer.name,
        storeName: customer.storeName,
      });
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
    logger.error('Drop call error', { errorMessage: error.message, requestId: req.requestId });

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
        status = 'Closed',
        callActive = 0,
        callTakenBy = NULL,
        offeredToOptometristEmail = NULL,
        declinedByOptometristEmails = NULL,
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
    const startMsSource = customer.optometristCallStartTime || customer.callStartTime;

    if (startMsSource) {
      const startMs = parseInt(startMsSource, 10);

      if (!isNaN(startMs)) {
        durationSec = Math.floor((Date.now() - startMs) / 1000);
      }
    }

    // Ending the call no longer marks the customer Completed - only the store
    // can do that (via POST /:id/complete), after they've confirmed the visit
    // is actually done. Status is left as-is (still 'Accepted'), and so is
    // callTakenBy - hanging up doesn't release the optometrist's ownership of
    // this consultation, otherwise a later Complete/Drop click 409s with
    // "not currently active with you" since the assignment was cleared out
    // from under a still-Accepted record.
    await run(
      `
      UPDATE customers SET
        callActive = 0,
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

const OPTOMETRIST_RESPONSE_TIMEOUT_MS = 60000;

// If the Optometrist currently offered a call doesn't respond in time, automatically
// rotate the offer to the next available Optometrist (or release it back to the
// queue once everyone has been tried) instead of leaving the store stuck
// waiting on a single unresponsive Optometrist.
setInterval(async () => {
  try {
    const nowMs = Date.now();
    const pendingOffers = await all<CustomerRow>(
      "SELECT * FROM customer_summary WHERE status = 'Initiated' AND callActive = 1 AND offeredToOptometristEmail IS NOT NULL"
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

      if (isNaN(referenceMs) || elapsedMs < OPTOMETRIST_RESPONSE_TIMEOUT_MS) {
        continue;
      }

      logger.info('Optometrist response timeout - rotating offer', {
        customerId: customer.id,
        elapsedMs,
        offeredToOptometristEmail: customer.offeredToOptometristEmail,
        referenceTimeStr,
      });

      const updatedRow = await reassignOrReleaseCall(customer.id, customer);

      if (updatedRow) {
        logger.info('Optometrist offer rotation result', {
          customerId: customer.id,
          newOfferedToOptometristEmail: updatedRow.offeredToOptometristEmail,
          newStatus: updatedRow.status,
        });
        broadcastEvent('CUSTOMER_UPDATED', toApiCustomer(updatedRow));
      }
    }
  } catch (err) {
    logger.error('Optometrist auto-rotation error', { errorMessage: (err as Error).message });
  }
}, 3000);

export default router;
