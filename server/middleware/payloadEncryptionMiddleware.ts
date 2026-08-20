import { NextFunction, Request, Response } from 'express';

import { logger } from '../utils/logger.js';
import {
  decryptPayload,
  EncryptedEnvelope,
  encryptPayload,
  isEncryptedEnvelope,
} from '../utils/payloadEncryption.js';

export interface E2EERequest extends Request {
  isE2EE?: boolean;
}

export function payloadEncryptionMiddleware(req: E2EERequest, res: Response, next: NextFunction) {
  if (req.body && typeof req.body === 'object' && isEncryptedEnvelope(req.body)) {
    try {
      const envelope = req.body as EncryptedEnvelope;
      const decrypted = decryptPayload<object>(envelope);
      req.body = decrypted;
      req.isE2EE = true;
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err));
      logger.error('Incoming E2EE payload decryption failed', {
        errorMessage: error.message,
        ip: req.ip,
        path: req.originalUrl,
      });

      return res.status(400).json({ error: 'Invalid or expired encrypted payload.' });
    }
  }

  const originalJson = res.json.bind(res);

  res.json = function (body?: object): Response {
    if (!body || typeof body !== 'object') {
      return originalJson(body);
    }

    const isE2EEClient = req.isE2EE || req.headers['x-e2ee-client'] === 'true';

    if (isE2EEClient && !isEncryptedEnvelope(body)) {
      try {
        const encryptedEnvelope = encryptPayload(body);

        return originalJson(encryptedEnvelope);
      } catch (err) {
        const error = err instanceof Error ? err : new Error(String(err));
        logger.error('Failed to encrypt outgoing response', { errorMessage: error.message });

        return originalJson(body);
      }
    }

    return originalJson(body);
  };

  return next();
}
