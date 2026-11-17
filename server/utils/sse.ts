import { Response } from 'express';

import { UserPayload } from '../config/jwt.js';
import { logger } from './logger.js';

export interface SseClient {
  id: number;
  res: Response;
  user: UserPayload;
}

export let sseClients: SseClient[] = [];

export function addSseClient(client: SseClient) {
  sseClients.push(client);
}

export function removeSseClient(clientId: number) {
  sseClients = sseClients.filter((c) => c.id !== clientId);
}

export function getSseClientsCountForUser(email: string): number {
  if (!email) return 0;
  const normalized = email.trim().toLowerCase();
  return sseClients.filter((c) => c.user?.email?.trim().toLowerCase() === normalized).length;
}

export interface BroadcastOptions {
  /**
   * Explicit target store name. If set, store clients must match this storeName (case-insensitive).
   */
  targetStore?: string | null;

  /**
   * If true, ONLY store clients matching targetStore receive the event.
   * Prevents other roles (even optometrists or non-admin staff) from seeing store-internal payloads
   * like ACS video tokens.
   */
  targetStoreOnly?: boolean;

  /**
   * Explicit list of allowed user roles.
   */
  allowedRoles?: string[];

  /**
   * Explicit list of recipient email addresses.
   */
  targetEmails?: string[];

  /**
   * Optional custom predicate for fine-grained per-client filtering.
   */
  filter?: (client: SseClient) => boolean;
}

/**
 * Evaluates whether a connected SSE client is authorized to receive a specific event.
 * Enforces strict role-based access control (RBAC) and store-level multi-tenant isolation.
 */
export function isClientAuthorizedForEvent(
  client: SseClient,
  type: string,
  data: any,
  options?: BroadcastOptions
): { authorized: boolean; sanitizedPayload?: any } {
  const clientRole = client.user?.role;
  const clientStore = client.user?.storeName ? client.user.storeName.trim().toLowerCase() : null;
  const clientEmail = client.user?.email ? client.user.email.trim().toLowerCase() : null;

  // 1. Explicit custom filter
  if (options?.filter && !options.filter(client)) {
    return { authorized: false };
  }

  // 2. Explicit target email filter
  if (options?.targetEmails && options.targetEmails.length > 0) {
    const normalizedTargets = options.targetEmails.map((e) => e.trim().toLowerCase());
    if (!clientEmail || !normalizedTargets.includes(clientEmail)) {
      return { authorized: false };
    }
  }

  // 3. Explicit allowed roles check
  if (options?.allowedRoles && options.allowedRoles.length > 0) {
    if (!clientRole || !options.allowedRoles.includes(clientRole)) {
      return { authorized: false };
    }
  }

  // 4. Resolve target store name from options or event payload
  const resolvedTargetStore = (
    options?.targetStore ||
    (typeof data === 'object' && data !== null && 'storeName' in data ? (data as any).storeName : null)
  )
    ? String(
        options?.targetStore ||
          (typeof data === 'object' && data !== null && 'storeName' in data ? (data as any).storeName : '')
      )
        .trim()
        .toLowerCase()
    : null;

  // 5. ACS Call Session Ready event:
  // Must ONLY be delivered to the specific store screen initiating/handling the consult.
  // Never broadcast to any other store or non-store client.
  if (type === 'CALL_SESSION_READY') {
    if (clientRole === 'store') {
      if (resolvedTargetStore && clientStore === resolvedTargetStore) {
        return { authorized: true };
      }
      return { authorized: false };
    }
    // Admins can be allowed if not in targetStoreOnly mode
    if (clientRole === 'admin' && !options?.targetStoreOnly) {
      return { authorized: true };
    }
    return { authorized: false };
  }

  // 6. ACS Call Session Ended event
  if (type === 'CALL_SESSION_ENDED') {
    if (clientRole === 'store') {
      return { authorized: !resolvedTargetStore || clientStore === resolvedTargetStore };
    }
    if (clientRole === 'optometrist' || clientRole === 'senior_optometrist' || clientRole === 'admin') {
      return { authorized: true };
    }
    return { authorized: false };
  }

  // 7. Customer lifecycle events: CUSTOMER_CREATED, CUSTOMER_UPDATED, CUSTOMER_DELETED
  if (type === 'CUSTOMER_CREATED' || type === 'CUSTOMER_UPDATED' || type === 'CUSTOMER_DELETED') {
    // Store role: STRICT store isolation. Only receive events for own store!
    if (clientRole === 'store') {
      if (resolvedTargetStore && clientStore !== resolvedTargetStore) {
        return { authorized: false };
      }
      return { authorized: true };
    }

    // Admins & Senior Optometrists have full oversight
    if (clientRole === 'admin' || clientRole === 'senior_optometrist') {
      return { authorized: true };
    }

    // Optometrists: receive queue and patient updates for active triage / consultations
    if (clientRole === 'optometrist') {
      return { authorized: true };
    }

    return { authorized: false };
  }

  // 8. Optometrist queue notifications: NO_OPTOMETRIST_AVAILABLE, OPTOMETRIST_NO_RESPONSE
  if (type === 'NO_OPTOMETRIST_AVAILABLE' || type === 'OPTOMETRIST_NO_RESPONSE') {
    if (clientRole === 'store') {
      return { authorized: !resolvedTargetStore || clientStore === resolvedTargetStore };
    }
    if (clientRole === 'senior_optometrist' || clientRole === 'admin') {
      return { authorized: true };
    }
    return { authorized: false };
  }

  // 9. Store notifying admin: STORE_NOTIFIED_ADMIN
  if (type === 'STORE_NOTIFIED_ADMIN') {
    if (clientRole === 'store') {
      return { authorized: !resolvedTargetStore || clientStore === resolvedTargetStore };
    }
    if (clientRole === 'admin' || clientRole === 'senior_optometrist') {
      return { authorized: true };
    }
    return { authorized: false };
  }

  // 10. User lifecycle events: USER_CREATED, USER_DELETED, USER_STATUS_CHANGE
  if (type === 'USER_CREATED' || type === 'USER_DELETED' || type === 'USER_STATUS_CHANGE') {
    // Only privileged admins can observe user account creation/deletion/status events
    return { authorized: clientRole === 'admin' };
  }

  // 11. USER_UPDATED event:
  if (type === 'USER_UPDATED') {
    if (clientRole === 'admin') {
      return { authorized: true };
    }
    // Self-update
    const targetEmail =
      typeof data === 'object' && data !== null && 'email' in data
        ? String((data as any).email).trim().toLowerCase()
        : '';
    if (clientEmail && targetEmail && clientEmail === targetEmail) {
      return { authorized: true };
    }
    // If it's a presence ping (isLoggedIn boolean), allow non-admins to receive sanitized presence info
    if (typeof data === 'object' && data !== null && 'isLoggedIn' in data) {
      return {
        authorized: true,
        sanitizedPayload: {
          email: (data as any).email,
          isLoggedIn: (data as any).isLoggedIn,
        },
      };
    }
    return { authorized: false };
  }

  // 12. TV Mode & Marketing Video events: safe for all authenticated clients
  if (type === 'TVMODE_VIDEO_CHANGED' || type === 'VIDEO_UPLOADED' || type === 'VIDEO_DELETED') {
    return { authorized: true };
  }

  // Fallback for unclassified events: only admins
  return { authorized: clientRole === 'admin' };
}

export function broadcastEvent<T extends object | string | number | boolean>(
  type: string,
  data: T,
  options?: BroadcastOptions
) {
  let deliveryCount = 0;

  sseClients.forEach((client) => {
    try {
      const authResult = isClientAuthorizedForEvent(client, type, data, options);

      if (!authResult.authorized) {
        return;
      }

      const payloadToSend = authResult.sanitizedPayload !== undefined ? authResult.sanitizedPayload : data;
      client.res.write(`data: ${JSON.stringify({ data: payloadToSend, type })}\n\n`);
      deliveryCount++;
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err));
      logger.error('Failed to write to SSE client', {
        clientId: client.id,
        clientRole: client.user?.role,
        errorMessage: error.message,
      });
    }
  });

  logger.debug('SSE event dispatched', {
    deliveryCount,
    totalClients: sseClients.length,
    type,
  });
}
