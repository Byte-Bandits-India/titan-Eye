import './config/env.js';
import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import path from 'path';
import fs from 'fs';
import cookieParser from 'cookie-parser';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';

import { initDb } from './db/database.js';
import { authenticateToken } from './middleware/auth.js';
import { addSseClient, removeSseClient } from './utils/sse.js';
import { verifyToken } from './config/jwt.js';

import authRouter from './routes/auth.js';
import customersRouter from './routes/customers.js';
import webhooksRouter from './routes/webhooks.js';
import systemRouter from './routes/system.js';
import usersRouter from './routes/users.js';
import ssoAuthRouter from './routes/ssoAuth.js';

class HttpError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  message: { error: 'Too many login attempts from this IP, please try again after 15 minutes.' },
  standardHeaders: true,
  legacyHeaders: false,
});

const apiLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 100,
  message: { error: 'Too many requests from this IP, please slow down.' },
  standardHeaders: true,
  legacyHeaders: false,
});

// VAPT Fix #15: Stricter rate limiter for customer creation
const customerCreateLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 10,
  message: { error: 'Too many customer creation requests. Please slow down.' },
  standardHeaders: true,
  legacyHeaders: false,
});

const allowedOrigins = process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:5173'];
const hasHttpsOrigin = allowedOrigins.some(origin => origin.startsWith('https://'));

const app = express();

app.use(helmet({
  hsts: {
    maxAge: 31536000, // 1 year
    includeSubDomains: true,
    preload: true,
  },
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'"],
      styleSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "blob:"],
      connectSrc: ["'self'", "http://localhost:3001", "https://trvc.titan.in", "https://titan.thebytebandits.com"],
      fontSrc: ["'self'"],
      objectSrc: ["'none'"],
      frameAncestors: ["'none'"],
      formAction: ["'self'"],
      upgradeInsecureRequests: hasHttpsOrigin ? [] : null,
    },
  },
}));

// VAPT Fix: Permissions-Policy header configuration
app.use((req: Request, res: Response, next: NextFunction) => {
  res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=(), payment=()');
  res.setHeader('Access-Control-Allow-Private-Network', 'true');
  next();
});

// VAPT Fix #5: HTTP→HTTPS redirect in production
if (process.env.NODE_ENV === 'production') {
  app.use((req: Request, res: Response, next: NextFunction) => {
    // Trust proxy header set by reverse proxy / IIS ARR
    const proto = req.headers['x-forwarded-proto'] || req.protocol;
    if (proto === 'http') {
      return res.redirect(301, `https://${req.headers.host}${req.url}`);
    }
    next();
  });
}

// VAPT Fix #6: Block direct IP address access in production
if (process.env.NODE_ENV === 'production') {
  app.use((req: Request, res: Response, next: NextFunction) => {
    const host = req.headers.host || '';
    // Reject if host header is an IP address (IPv4 pattern)
    if (/^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}(:\d+)?$/.test(host)) {
      return res.status(403).json({ error: 'Direct IP access is not allowed. Use the domain name.' });
    }
    next();
  });
}

// VAPT Fix #3: Remove wildcard CORS bypass — only allow explicitly listed origins
app.use(cors({
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new HttpError('Not allowed by CORS', 403));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

app.use(express.json());
app.use(cookieParser());

app.get('/api/ping', (req: Request, res: Response) => {
  res.sendStatus(200);
});

app.get('/api/events', (req: Request, res: Response) => {
  const token = req.cookies?.token;
  if (!token) {
    return res.status(401).json({ error: 'Access token required' });
  }

  const user = verifyToken(token);
  if (!user) {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }

  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache, no-transform',
    'Connection': 'keep-alive',
    'X-Accel-Buffering': 'no'
  });
  res.write('\n');

  const clientId = Date.now();
  const newClient = { id: clientId, res };
  addSseClient(newClient);

  req.on('close', () => {
    removeSseClient(clientId);
  });
});

app.use('/api', (req: Request, res: Response, next: NextFunction) => {
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, private');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');
  next();
});

app.use('/api/login', authLimiter);
app.use('/api', authRouter);
app.use('/api/auth/microsoft', authLimiter, ssoAuthRouter);
// VAPT Fix #15: Stricter rate limit on customer creation
app.post('/api/customers', customerCreateLimiter);
app.use('/api/customers', apiLimiter, authenticateToken, customersRouter);
app.use('/api/webhooks', apiLimiter, webhooksRouter);
app.use('/api', apiLimiter, authenticateToken, systemRouter);
app.use('/api/users', apiLimiter, authenticateToken, usersRouter);

const distPath = path.resolve('dist');
if (fs.existsSync(distPath)) {
  app.use('/assets', (req: Request, res: Response, next: NextFunction) => {
    if (req.path === '/' || req.path === '') {
      return res.status(403).json({ error: 'Forbidden' });
    }
    next();
  });

  app.use(express.static(distPath, {
    index: false,
    setHeaders: (res, filePath) => {
      if (filePath.endsWith('.html')) {
        res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
        res.setHeader('Pragma', 'no-cache');
        res.setHeader('Expires', '0');
      }
    }
  }));
}

app.use((req: Request, res: Response, next: NextFunction) => {
  if (req.path.startsWith('/api')) {
    return res.status(404).json({ error: 'API endpoint not found' });
  }

  if (path.extname(req.path)) {
    return res.status(404).send('Not Found');
  }

  if (fs.existsSync(distPath)) {
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
    return res.sendFile(path.join(distPath, 'index.html'), (err) => {
      if (err) {
        console.error('res.sendFile error:', err);
        next(err);
      }
    });
  }

  res.status(404).send('Not Found');
});

app.use((err: Error, req: Request, res: Response, _next: NextFunction) => {
  const status = err instanceof HttpError ? err.status : 500;

  // VAPT: Log only the error message, not the full error object (which may contain request body/PII)
  console.error(`[Error] ${req.method} ${req.url}: ${err.message}`);

  // VAPT: Don't leak internal error details to the client in production
  const clientMessage = process.env.NODE_ENV === 'production' && status === 500
    ? 'Internal Server Error'
    : err.message || 'Internal Server Error';

  res.status(status).json({
    error: clientMessage,
    status
  });
});

const PORT = 3001;
initDb()
  .then(() => {
    app.listen(PORT, () => {
      console.log(`API server running on http://localhost:${PORT}`);
    });
  })
  .catch((err) => {
    console.error('Failed to initialize database:', err);
  });
