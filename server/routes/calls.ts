import { Response, Router } from 'express';

import crypto from 'crypto';

import type { AuthenticatedRequest } from '../middleware/auth.js';
import {
  createAcsUserAndToken,
  createTeamsOnlineMeeting,
  getAcsEndpoint,
  isAcsConfigured,
} from '../services/acs.js';
import { isGraphConfigured } from '../services/microsoft/auth.js';
import { CustomerRow, get, run } from '../db/database.js';
import { logger } from '../utils/logger.js';
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

router.post('/start', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { customerId } = req.body as { customerId?: string };

    if (!customerId) {
      return res.status(400).json({ error: 'customerId is required' });
    }

    if (!isAcsConfigured()) {
      return res.status(503).json({
        error: 'Azure Communication Services (ACS_CONNECTION_STRING) is not configured on this server.',
      });
    }

    const optometristName = req.user?.name || 'Optometrist';

    const existingSession = activeSessions.get(customerId);

    if (existingSession) {
      broadcastEvent('CALL_SESSION_READY', existingSession.storeSession);

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

    // Use ACS Group Call for direct in-browser Optometrist <-> Store consultations.
    // If USE_TEAMS_MEETING is explicitly set to 'true' in env and Graph is configured,
    // create a Teams Online Meeting link instead.
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
          error: (graphErr as Error).message,
        });
      }
    }

    // Fall back to ACS Group Call if Teams meeting link is not enabled or unavailable
    if (!meetingUrl) {
      groupId = crypto.randomUUID();
    }

    // 3. Issue ACS Tokens for both Optometrist and Store
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

    // 4. Update DB status to Accepted and disarm pending offer timer
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
        lastUpdatedOn = ?
      WHERE id = ?
    `,
      [optometristName, timestamp, customerId]
    );

    const updatedRow = await get<CustomerRow>('SELECT * FROM customer_summary WHERE id = ?', [customerId]);

    if (updatedRow) {
      broadcastEvent('CUSTOMER_UPDATED', toApiCustomer(updatedRow));
    }

    // 5. Broadcast to Store via SSE
    broadcastEvent('CALL_SESSION_READY', storeSession);

    logger.info('[Calls] Started ACS call session', {
      customerId,
      groupId,
      meetingUrl,
      optometristName,
    });

    return res.json(optometristSession);
  } catch (err) {
    const error = err as Error;
    logger.error('[Calls] Failed to start call session', { error: error.message });

    return res.status(500).json({ error: error.message || 'Failed to start video call session' });
  }
});

router.get('/session/:customerId', (req: AuthenticatedRequest, res: Response) => {
  const customerId = String(req.params.customerId);
  const session = activeSessions.get(customerId);

  if (!session) {
    return res.status(404).json({ error: 'No active call session found for this customer' });
  }

  const userRole = req.user?.role === 'optometrist' ? 'optometrist' : 'store';
  const payload = userRole === 'optometrist' ? session.optometristSession : session.storeSession;

  return res.json(payload);
});

router.post('/end', (req: AuthenticatedRequest, res: Response) => {
  const { customerId } = req.body as { customerId?: string };

  if (customerId) {
    activeSessions.delete(customerId);
    broadcastEvent('CALL_SESSION_ENDED', { customerId });
    logger.info('[Calls] Ended call session', { customerId });
  }

  return res.json({ success: true });
});

export { router as callsRouter };
