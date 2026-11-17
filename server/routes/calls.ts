import crypto from 'crypto';
import { Response, Router } from 'express';

import type { AuthenticatedRequest } from '../middleware/auth.js';
import { CustomerRow, get, run } from '../db/database.js';
import { authorizeRoles } from '../middleware/rbac.js';
import {
  createAcsUserAndToken,
  createTeamsOnlineMeeting,
  getAcsEndpoint,
  isAcsConfigured,
} from '../services/acs.js';
import { isGraphConfigured } from '../services/microsoft/auth.js';
import { validateCustomerId } from '../utils/inputSanitizer.js';
import { logger, logSecurityEvent } from '../utils/logger.js';
import { broadcastEvent } from '../utils/sse.js';
import { toApiCustomer } from './customers.js';

export interface CallSessionPayload {
  acsEndpoint: string;
  acsToken: string;
  acsUserId: string;
  customerId: string;
  displayName: string;
  groupId?: string;
  meetingUrl?: string;
  role: 'optometrist' | 'store';
}

const activeSessions = new Map<
  string,
  {
    optometristSession: CallSessionPayload;
    storeSession: CallSessionPayload;
  }
>();

const router = Router();

// Validate :customerId parameter format
router.param('customerId', (req, res, next, id) => {
  if (!validateCustomerId(id)) {
    logSecurityEvent('INVALID_CUSTOMER_ID_PARAMETER', {
      callerEmail: (req as AuthenticatedRequest).user?.email,
      customerId: id,
      ip: req.ip,
      requestId: (req as AuthenticatedRequest).requestId,
    });
    return res.status(400).json({
      error: 'Invalid customer ID format. Only numeric IDs or standard customer identifiers (#0001) are permitted.',
    });
  }
  next();
});

/**
 * Access Control Helper: Ensures the caller is authorized to view or manage calls for the given customer.
 * - Stores can ONLY access calls for customers registered to their own store.
 * - Optometrists can ONLY access active queue calls or calls explicitly assigned to them.
 * - Senior Optometrists and Admins have global access.
 */
async function verifyCallCustomerAccess(
  req: AuthenticatedRequest,
  res: Response,
  customerId: string
): Promise<CustomerRow | null> {
  if (!validateCustomerId(customerId)) {
    logSecurityEvent('INVALID_CUSTOMER_ID_PARAMETER', {
      callerEmail: req.user?.email,
      customerId,
      ip: req.ip,
      requestId: req.requestId,
    });
    res.status(400).json({ error: 'Invalid customer ID format.' });
    return null;
  }

  const customer = await get<CustomerRow>(
    `SELECT id, name, storeName, status, callActive, callTakenBy, offeredToOptometristEmail, optometristCallStartTime
     FROM customers WHERE id = ?`,
    [customerId]
  );

  if (!customer) {
    res.status(404).json({ error: 'Customer not found' });
    return null;
  }

  const role = req.user?.role;

  // 1. Store users: strictly isolated to their own store
  if (role === 'store') {
    const callerStore = req.user?.storeName?.trim().toLowerCase();
    const customerStore = customer.storeName?.trim().toLowerCase();

    if (!callerStore || callerStore !== customerStore) {
      logSecurityEvent('UNAUTHORIZED_STORE_CALL_ACCESS', {
        callerEmail: req.user?.email,
        callerStore: req.user?.storeName,
        customerStore: customer.storeName,
        ip: req.ip,
        requestId: req.requestId,
        targetCustomerId: customerId,
      });

      res.status(403).json({
        error: 'Access Denied: You cannot view or modify call sessions for another store location.',
      });
      return null;
    }
  }

  // 2. Optometrists: only active queue or assigned calls
  if (role === 'optometrist') {
    const isAssigned =
      (customer.callTakenBy && customer.callTakenBy.toLowerCase() === req.user?.name?.toLowerCase()) ||
      (customer.offeredToOptometristEmail &&
        customer.offeredToOptometristEmail.toLowerCase() === req.user?.email?.toLowerCase());

    const isQueueStatus = ['Initiated', 'Queued', 'Accepted', 'Testing'].includes(customer.status);

    if (!isAssigned && !isQueueStatus) {
      logSecurityEvent('UNAUTHORIZED_OPTOMETRIST_CALL_ACCESS', {
        callerEmail: req.user?.email,
        callerName: req.user?.name,
        customerStatus: customer.status,
        customerStore: customer.storeName,
        ip: req.ip,
        requestId: req.requestId,
        targetCustomerId: customerId,
      });

      res.status(403).json({
        error: 'Access Denied: Optometrists can only access active queue calls or assigned consultations.',
      });
      return null;
    }
  }

  return customer;
}

/**
 * POST /api/calls/start
 * Initiates an ACS / Teams consultation call for a queued customer.
 * Restricted to optometrist, senior_optometrist, and admin roles.
 */
router.post(
  '/start',
  authorizeRoles('optometrist', 'senior_optometrist', 'admin'),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { customerId } = req.body as { customerId?: string };

      if (!customerId) {
        return res.status(400).json({ error: 'customerId is required' });
      }

      const customer = await verifyCallCustomerAccess(req, res, customerId);
      if (!customer) {
        return;
      }

      // Business logic: only customers in a call-eligible state can have calls started
      const eligibleStatuses = ['Initiated', 'Queued', 'Accepted', 'Testing'];
      if (!eligibleStatuses.includes(customer.status)) {
        return res.status(409).json({
          error: `Cannot start consultation call for customer in '${customer.status}' status. Only queued or active consultations can be started.`,
        });
      }

      // Prevent hijack if already active with a different optometrist
      const optometristName = req.user?.name || 'Optometrist';
      if (
        customer.callActive === 1 &&
        customer.callTakenBy &&
        customer.callTakenBy.toLowerCase() !== optometristName.toLowerCase() &&
        req.user?.role === 'optometrist'
      ) {
        return res.status(409).json({
          error: `Consultation call is already active with optometrist ${customer.callTakenBy}.`,
        });
      }

      if (!isAcsConfigured()) {
        return res.status(503).json({
          error: 'Azure Communication Services (ACS_CONNECTION_STRING) is not configured on this server.',
        });
      }

      const existingSession = activeSessions.get(customerId);

      if (existingSession) {
        broadcastEvent('CALL_SESSION_READY', existingSession.storeSession, {
          targetStore: customer.storeName,
          targetStoreOnly: true,
        });

        logger.info('[Calls] Reusing existing ACS call session', {
          customerId,
          groupId: existingSession.optometristSession.groupId,
          meetingUrl: existingSession.optometristSession.meetingUrl,
          optometristName,
        });

        return res.json(existingSession.optometristSession);
      }

      let meetingUrl: string | undefined;
      let groupId: string | undefined;

      const useTeamsMeeting = process.env.USE_TEAMS_MEETING === 'true';
      const organizerUpn = req.user?.email || process.env.TEAMS_MEETING_ORGANIZER_UPN;

      if (useTeamsMeeting && isGraphConfigured() && organizerUpn) {
        try {
          const meeting = await createTeamsOnlineMeeting(
            `Optometrist Consultation - Customer ${customerId}`,
            organizerUpn
          );
          meetingUrl = meeting.joinWebUrl;
        } catch (graphErr) {
          logger.warn('[Calls] Graph Teams meeting creation unavailable, falling back to ACS Group Call:', {
            error: graphErr instanceof Error ? graphErr.message : String(graphErr),
          });
        }
      }

      if (!meetingUrl) {
        groupId = crypto.randomUUID();
      }

      const optometristTokenResult = await createAcsUserAndToken();
      const storeTokenResult = await createAcsUserAndToken();
      const acsEndpoint = getAcsEndpoint();

      const optometristSession: CallSessionPayload = {
        acsEndpoint,
        acsToken: optometristTokenResult.acsToken,
        acsUserId: optometristTokenResult.acsUserId,
        customerId,
        displayName: optometristName,
        ...(groupId ? { groupId } : { meetingUrl }),
        role: 'optometrist',
      };

      const storeSession: CallSessionPayload = {
        acsEndpoint,
        acsToken: storeTokenResult.acsToken,
        acsUserId: storeTokenResult.acsUserId,
        customerId,
        displayName: 'Store Room',
        ...(groupId ? { groupId } : { meetingUrl }),
        role: 'store',
      };

      activeSessions.set(customerId, { optometristSession, storeSession });

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
          callActive = 1,
          status = 'Accepted',
          offeredToOptometristEmail = NULL,
          callTakenBy = COALESCE(callTakenBy, ?),
          optometristCallStartTime = COALESCE(optometristCallStartTime, ?),
          lastUpdatedOn = ?
        WHERE id = ?
      `,
        [optometristName, new Date().toISOString(), timestamp, customerId]
      );

      const updatedRow = await get<CustomerRow>('SELECT * FROM customer_summary WHERE id = ?', [customerId]);

      if (updatedRow) {
        broadcastEvent('CUSTOMER_UPDATED', toApiCustomer(updatedRow), {
          targetStore: customer.storeName,
        });
      }

      broadcastEvent('CALL_SESSION_READY', storeSession, {
        targetStore: customer.storeName,
        targetStoreOnly: true,
      });

      logSecurityEvent('CALL_STARTED', {
        callerEmail: req.user?.email,
        callerRole: req.user?.role,
        customerId,
        groupId,
        meetingUrl,
        optometristName,
        storeName: customer.storeName,
      });

      logger.info('[Calls] Started ACS call session', {
        customerId,
        groupId,
        meetingUrl,
        optometristName,
      });

      return res.json(optometristSession);
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err));
      logger.error('[Calls] Failed to start call session', { error: error.message });

      return res.status(500).json({ error: error.message || 'Failed to start video call session' });
    }
  }
);

/**
 * GET /api/calls/session/:customerId
 * Retrieves active call session credentials for an authorized participant.
 * Store users can ONLY retrieve credentials for their own store.
 * Optometrists can ONLY retrieve credentials for their assigned consultation.
 */
router.get(
  '/session/:customerId',
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const customerId = String(req.params.customerId);

      const customer = await verifyCallCustomerAccess(req, res, customerId);
      if (!customer) {
        return;
      }

      const session = activeSessions.get(customerId);

      if (!session) {
        return res.status(404).json({ error: 'No active call session found for this customer' });
      }

      const userRole =
        req.user?.role === 'optometrist' || req.user?.role === 'senior_optometrist' ? 'optometrist' : 'store';
      const payload = userRole === 'optometrist' ? session.optometristSession : session.storeSession;

      return res.json(payload);
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err));
      logger.error('[Calls] Failed to get call session', { error: error.message });
      return res.status(500).json({ error: 'Internal server error' });
    }
  }
);

/**
 * POST /api/calls/end
 * Terminates an active call session.
 * Caller must be authorized for this customer (matching store, assigned optometrist, or admin).
 */
router.post(
  '/end',
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { customerId } = req.body as { customerId?: string };

      if (!customerId) {
        return res.status(400).json({ error: 'customerId is required' });
      }

      const customer = await verifyCallCustomerAccess(req, res, customerId);
      if (!customer) {
        return;
      }

      const wasActive = activeSessions.has(customerId);
      activeSessions.delete(customerId);

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
        `UPDATE customers SET callActive = 0, lastUpdatedOn = ? WHERE id = ?`,
        [timestamp, customerId]
      );

      broadcastEvent(
        'CALL_SESSION_ENDED',
        { customerId, storeName: customer.storeName },
        { targetStore: customer.storeName }
      );

      logSecurityEvent('CALL_ENDED', {
        callerEmail: req.user?.email,
        callerRole: req.user?.role,
        customerId,
        storeName: customer.storeName,
        wasActive,
      });

      logger.info('[Calls] Ended call session', { customerId, storeName: customer.storeName });

      return res.json({ success: true });
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err));
      logger.error('[Calls] Failed to end call session', { error: error.message });
      return res.status(500).json({ error: 'Internal server error' });
    }
  }
);

export { router as callsRouter };
