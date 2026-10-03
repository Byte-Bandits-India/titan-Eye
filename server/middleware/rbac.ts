import { NextFunction, Response } from 'express';

import { AuthenticatedRequest } from './auth.js';
import { logSecurityEvent } from '../utils/logger.js';

export function authorizeRoles(...allowedRoles: string[]) {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    const userRole = req.user?.role;

    if (!userRole || !allowedRoles.includes(userRole)) {
      logSecurityEvent('UNAUTHORIZED_ROLE_ACCESS', {
        callerEmail: req.user?.email,
        callerRole: userRole ?? 'anonymous',
        ip: req.ip,
        path: req.originalUrl,
        requestId: req.requestId,
        requiredRoles: allowedRoles.join(','),
      });

      return res.status(403).json({
        error: 'Access Denied: You do not have permission to perform this action.',
      });
    }

    return next();
  };
}
