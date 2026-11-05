import crypto from 'crypto';
import { NextFunction, Request, Response } from 'express';

import { logError, logMonitoringMetric } from '../utils/logger.js';
import { AuthenticatedRequest } from './auth.js';

declare module 'express-serve-static-core' {
  interface Request {
    requestId: string;
  }
}

const SKIP_PATHS = new Set(['/api/ping']);

export function requestLogger(req: Request, res: Response, next: NextFunction) {
  const requestId = crypto.randomUUID();
  req.requestId = requestId;
  res.setHeader('X-Request-Id', requestId);

  if (SKIP_PATHS.has(req.path)) {
    return next();
  }

  const start = process.hrtime.bigint();

  res.on('finish', () => {
    const durationMs = Number(process.hrtime.bigint() - start) / 1e6;
    const user = (req as AuthenticatedRequest).user;

    const meta = {
      durationMs: Math.round(durationMs * 100) / 100,
      ip: req.ip,
      method: req.method,
      path: req.path,
      requestId,
      status: res.statusCode,
      userAgent: req.headers['user-agent'],
      userEmail: user?.email,
    };

    // 1. Record in logs/monitoring/monitoring-YYYY-MM-DD.log
    logMonitoringMetric(meta);

    // 2. If server error (5xx), also capture in logs/err/error-YYYY-MM-DD.log
    if (res.statusCode >= 500) {
      logError(`HTTP ${res.statusCode} ${req.method} ${req.path}`, undefined, meta);
    }
  });

  next();
}
