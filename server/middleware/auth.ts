import { Request, Response, NextFunction } from 'express';
import { verifyToken, UserPayload } from '../config/jwt.js';
import { isRevoked } from '../utils/tokenBlacklist.js';

export interface AuthenticatedRequest extends Request {
  user?: UserPayload;
}

export function authenticateToken(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  let token = req.cookies?.token;
  
  if (!token) {
    const authHeader = req.headers['authorization'];
    token = authHeader && authHeader.split(' ')[1];
  }
  
  if (!token) {
    return res.status(401).json({ error: 'Access token required' });
  }

  if (isRevoked(token)) {
    return res.status(401).json({ error: 'Token has been revoked' });
  }
  
  const user = verifyToken(token);
  if (!user) {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
  
  req.user = user;
  next();
}

