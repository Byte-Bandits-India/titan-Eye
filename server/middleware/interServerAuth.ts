import { NextFunction, Request, Response } from 'express';

import { logger } from '../utils/logger.js';
import {
  decryptPayload,
  EncryptedEnvelope,
  verifyServerPayloadSignature,
} from '../utils/payloadEncryption.js';

export interface InterServerRequest extends Request {
  decryptedBody?: object;
}

/**
 * Middleware that verifies HMAC signature and decrypts incoming AES-256-GCM payload.
 */
export function requireInterServerEncryption(req: InterServerRequest, res: Response, next: NextFunction) {
  const signature = req.headers['x-server-signature'];
  const timestamp = req.headers['x-server-timestamp'];

  if (typeof signature !== 'string' || typeof timestamp !== 'string') {
    logger.warn('Inter-server request rejected: Missing security headers', {
      ip: req.ip,
      path: req.originalUrl,
    });

    return res.status(401).json({ error: 'Unauthorized: Missing inter-server signature headers.' });
  }

  try {
    const rawBody = typeof req.body === 'string' ? req.body : JSON.stringify(req.body);

    const isSigValid = verifyServerPayloadSignature(rawBody, signature, timestamp);
    if (!isSigValid) {
      logger.warn('Inter-server request rejected: Invalid signature or expired timestamp', {
        ip: req.ip,
        path: req.originalUrl,
      });

      return res.status(401).json({ error: 'Unauthorized: Invalid inter-server signature.' });
    }

    if (
      req.body &&
      typeof req.body === 'object' &&
      'ciphertext' in req.body &&
      'iv' in req.body &&
      'tag' in req.body
    ) {
      const envelope = req.body as EncryptedEnvelope;
      const decrypted = decryptPayload<object>(envelope);
      req.decryptedBody = decrypted;
      req.body = decrypted;
    }

    return next();
  } catch (err) {
    const error = err instanceof Error ? err : new Error(String(err));
    logger.error('Inter-server payload decryption failed', {
      errorMessage: error.message,
      ip: req.ip,
      path: req.originalUrl,
    });

    return res.status(400).json({ error: 'Failed to authenticate and decrypt inter-server payload.' });
  }
}
