import './config/env.js';
import cookieParser from 'cookie-parser';
import cors from 'cors';
import express, { NextFunction, Request, Response } from 'express';
import rateLimit from 'express-rate-limit';
import fs from 'fs';
import helmet from 'helmet';
import path from 'path';

import { verifyToken } from './config/jwt.js';
import { initializeDatabase } from './db/database.js';
import { authenticateToken } from './middleware/auth.js';
import { internalInfraSanitizer, sanitizeInternalInfraString } from './middleware/internalInfraSanitizer.js';
import { pathTraversalGuard } from './middleware/pathTraversalGuard.js';
import { requestLogger } from './middleware/requestLogger.js';
import authRouter from './routes/auth.js';
import customersRouter from './routes/customers.js';
import feedbackRouter from './routes/feedback.js';
import ssoAuthRouter from './routes/ssoAuth.js';
import reactScanLogRouter from './routes/reactScanLog.js';
import systemRouter from './routes/system.js';
import usersRouter from './routes/users.js';
import videosRouter from './routes/videos.js';
import { callsRouter } from './routes/calls.js';
import webhooksRouter from './routes/webhooks.js';
import { alertCritical, logger, logSecurityEvent, resolveLogDir } from './utils/logger.js';
import { addSseClient, removeSseClient } from './utils/sse.js';

process.on('uncaughtException', (err) => {
  alertCritical('Uncaught exception — process is exiting', { errorMessage: err.message, stack: err.stack });
  process.exit(1);
});

process.on('unhandledRejection', (reason) => {
  const err = reason instanceof Error ? reason : new Error(String(reason));
  alertCritical('Unhandled promise rejection', { errorMessage: err.message, stack: err.stack });
});

class HttpError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

function rateLimitHandler(req: Request, res: Response, _next: NextFunction, message: string) {
  logSecurityEvent('RATE_LIMIT_EXCEEDED', {
    ip: req.ip,
    method: req.method,
    path: req.path,
    requestId: req.requestId,
  });
  res.status(429).json({ error: message });
}

const authLimiter = rateLimit({
  handler: (req, res, next) =>
    rateLimitHandler(
      req,
      res,
      next,
      'Too many login attempts from this IP, please try again after 15 minutes.'
    ),
  legacyHeaders: false,
  max: 20,
  message: { error: 'Too many login attempts from this IP, please try again after 15 minutes.' },
  standardHeaders: true,
  windowMs: 15 * 60 * 1000,
});

const apiLimiter = rateLimit({
  handler: (req, res, next) =>
    rateLimitHandler(req, res, next, 'Too many requests from this IP, please slow down.'),
  legacyHeaders: false,
  max: 1000,
  message: { error: 'Too many requests from this IP, please slow down.' },
  standardHeaders: true,
  windowMs: 60 * 1000,
});

const customerCreateLimiter = rateLimit({
  handler: (req, res, next) =>
    rateLimitHandler(req, res, next, 'Too many customer creation requests. Please slow down.'),
  legacyHeaders: false,
  max: 10,
  message: { error: 'Too many customer creation requests. Please slow down.' },
  standardHeaders: true,
  windowMs: 60 * 1000,
});

const rawAllowedOrigins = (process.env.ALLOWED_ORIGINS || '')
  .split(',')
  .map((s) => s.trim().replace(/\/$/, ''))
  .filter(Boolean);

const defaultOrigins = [
  'http://titan.thebytebandits.com',
  'https://titan.thebytebandits.com',
  'http://titan-dev.thebytebandits.com',
  'https://titan-dev.thebytebandits.com',
  'http://titan.xylozentech.com',
  'https://titan.xylozentech.com',
  ...(process.env.NODE_ENV === 'production'
    ? []
    : ['http://localhost:5173', 'http://localhost:3000', 'http://localhost:3001']),
];

const allowedOrigins = Array.from(new Set([...defaultOrigins, ...rawAllowedOrigins]));
const hasHttpsOrigin = allowedOrigins.some((origin) => origin.startsWith('https://'));

function isAllowedOrigin(origin: string): boolean {
  const normalized = origin.trim().replace(/\/$/, '');
  if (allowedOrigins.includes(normalized)) {
    return true;
  }
  if (/^https?:\/\/([a-zA-Z0-9-]+\.)*thebytebandits\.com$/.test(normalized)) {
    return true;
  }
  if (/^https?:\/\/([a-zA-Z0-9-]+\.)*xylozentech\.com$/.test(normalized)) {
    return true;
  }
  return false;
}

const app = express();
app.disable('x-powered-by');
app.set('trust proxy', 1);

app.use(requestLogger);
app.use(internalInfraSanitizer);
app.use(pathTraversalGuard);

app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        baseUri: ["'self'"],
        childSrc: ["'self'", 'blob:'],
        connectSrc: [
          "'self'",
          'https://trvcstaging.titan.in',
          'https://trvc.titan.in',
          'https://titan.thebytebandits.com',
          'https://titan-dev.thebytebandits.com',
          'https://titan.xylozentech.com',
          'https://*.communication.azure.com',
          'wss://*.communication.azure.com',
          'https://*.skype.com',
          'https://*.flightproxy.skype.com',
          'wss://*.skype.com',
          'wss://*.flightproxy.skype.com',
          'https://*.communication.microsoft.com',
          'wss://*.communication.microsoft.com',
          'https://*.trouter.communication.microsoft.com',
          'wss://*.trouter.communication.microsoft.com',
          'https://*.teams.microsoft.com',
          'wss://*.teams.microsoft.com',
          'https://*.ecs.office.com',
          'https://*.config.office.net',
          'https://*.turn.azure.com',
          'wss://*.turn.azure.com',
        ],
        defaultSrc: ["'self'"],
        fontSrc: [
          "'self'",
          'data:',
          'https://*.cdn.office.net',
          'https://*.office.net',
          'https://*.microsoft.com',
          'https://*.azure.com',
        ],
        formAction: ["'self'"],
        frameAncestors: ["'none'"],
        frameSrc: ["'self'", 'https://www.youtube.com', 'https://youtube.com'],
        imgSrc: ["'self'", 'data:', 'blob:'],
        mediaSrc: ["'self'", 'blob:'],
        objectSrc: ["'none'"],
        scriptSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        upgradeInsecureRequests: hasHttpsOrigin ? [] : null,
        workerSrc: ["'self'", 'blob:'],
      },
    },
    hsts: {
      includeSubDomains: true,
      maxAge: 31536000, // 1 year
      preload: true,
    },
  })
);

app.use((req: Request, res: Response, next: NextFunction) => {
  res.removeHeader('X-Powered-By');
  res.removeHeader('Server');
  res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=(), payment=()');
  res.setHeader('X-Robots-Tag', 'noindex, nofollow, noarchive, nosnippet');
  next();
});

if (process.env.NODE_ENV === 'production') {
  app.use((req: Request, res: Response, next: NextFunction) => {
    const host = req.headers.host || '';

    if (host.startsWith('127.0.0.1') || host.startsWith('localhost')) {
      return next();
    }

    const proto = req.headers['x-forwarded-proto'] || req.protocol;

    if (proto === 'http') {
      return res.redirect(301, `https://${host}${req.url}`);
    }

    next();
  });
}

if (process.env.NODE_ENV === 'production') {
  app.use((req: Request, res: Response, next: NextFunction) => {
    const host = req.headers.host || '';

    if (host.startsWith('127.0.0.1') || host.startsWith('localhost')) {
      return next();
    }

    if (/^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}(:\d+)?$/.test(host)) {
      logSecurityEvent('DIRECT_IP_ACCESS_BLOCKED', { host, ip: req.ip, requestId: req.requestId });

      return res.status(403).json({ error: 'Direct IP access is not allowed. Use the domain name.' });
    }

    next();
  });
}

app.use((req: Request, res: Response, next: NextFunction) => {
  const origin = req.headers.origin;

  if (origin && !isAllowedOrigin(origin)) {
    logSecurityEvent('CORS_REJECTED', {
      ip: req.ip,
      method: req.method,
      origin,
      path: req.path,
      requestId: req.requestId,
    });
  }

  next();
});

// Finding 13 & 22: Disable insecure HTTP methods (TRACE, TRACK, DEBUG), WebDAV methods (PROPFIND, PROPPATCH, etc.),
// enforce standard REST method whitelist, and block standalone OPTIONS probes
const ALLOWED_HTTP_METHODS = new Set(['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'HEAD', 'OPTIONS']);

app.use((req: Request, res: Response, next: NextFunction) => {
  const method = req.method.toUpperCase();

  if (
    !ALLOWED_HTTP_METHODS.has(method) ||
    method === 'TRACE' ||
    method === 'TRACK' ||
    method === 'DEBUG'
  ) {
    logSecurityEvent('INSECURE_HTTP_METHOD_BLOCKED', {
      ip: req.ip,
      method,
      path: req.originalUrl,
      requestId: req.requestId,
    });

    res.setHeader('Allow', 'GET, POST, PUT, DELETE');
    return res.status(405).json({
      error: `HTTP method ${method} is disabled on this server.`,
    });
  }

  // Standalone OPTIONS method check:
  // A browser CORS preflight request ALWAYS includes the 'Access-Control-Request-Method' header.
  // Direct OPTIONS probes from vulnerability scanners (e.g. OPTIONS /login) lack this header.
  if (method === 'OPTIONS' && !req.headers['access-control-request-method']) {
    logSecurityEvent('OPTIONS_METHOD_BLOCKED', {
      ip: req.ip,
      path: req.originalUrl,
      requestId: req.requestId,
    });

    res.setHeader('Allow', 'GET, POST, PUT, DELETE');
    return res.status(405).json({
      error: 'HTTP OPTIONS method is disabled on this server.',
    });
  }

  next();
});

app.use(
  cors({
    allowedHeaders: ['Content-Type', 'Authorization', 'x-request-id'],
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    origin: (origin, callback) => {
      if (!origin) {
        return callback(null, true);
      }

      if (isAllowedOrigin(origin)) {
        callback(null, true);
      } else {
        callback(new HttpError(`CORS policy does not allow access from ${origin}`, 403));
      }
    },
  })
);

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
    'Cache-Control': 'no-cache, no-transform',
    Connection: 'keep-alive',
    'Content-Type': 'text/event-stream',
    'X-Accel-Buffering': 'no',
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
app.use('/api/react-scan', reactScanLogRouter);
app.use('/api', authRouter);
app.use('/api/auth/microsoft', authLimiter, ssoAuthRouter);
app.post('/api/customers', customerCreateLimiter);
app.use('/api/customers', apiLimiter, authenticateToken, customersRouter);
app.use('/api/webhooks', apiLimiter, webhooksRouter);
app.use('/api/feedback', apiLimiter, feedbackRouter);
app.use('/api/calls', apiLimiter, authenticateToken, callsRouter);
app.use('/api', apiLimiter, authenticateToken, systemRouter);
app.use('/api/users', apiLimiter, authenticateToken, usersRouter);
app.use('/api/videos', apiLimiter, authenticateToken, videosRouter);

app.get(/^\/sitemap.*\.xml$/, (req: Request, res: Response) => {
  res.setHeader('X-Robots-Tag', 'noindex, nofollow, noarchive, nosnippet');
  res.status(404).send('Not Found');
});

const SENSITIVE_EXT_REGEX = /\.(ts|tsx|jsx|map|env|git|json|sql|db|sqlite|ps1|sh|log|md|yml|yaml|config|php|asp|aspx|jsp|cgi)$/i;

app.use((req: Request, res: Response, next: NextFunction) => {
  const reqPath = req.path.toLowerCase();

  // Block direct attempts to access dotfiles or sensitive source files
  if (
    reqPath.includes('/.') ||
    reqPath.startsWith('/.env') ||
    reqPath.startsWith('/.git') ||
    SENSITIVE_EXT_REGEX.test(reqPath)
  ) {
    // Whitelist legitimate PWA manifest
    if (reqPath === '/manifest.json') {
      return next();
    }

    logSecurityEvent('SOURCE_FILE_ACCESS_BLOCKED', {
      ip: req.ip,
      path: req.originalUrl,
      requestId: req.requestId,
    });

    return res.status(404).send('Not Found');
  }

  next();
});

const distPath = path.resolve('dist');

if (fs.existsSync(distPath)) {
  app.use('/assets', (req: Request, res: Response, next: NextFunction) => {
    if (req.path === '/' || req.path === '') {
      return res.status(403).json({ error: 'Forbidden' });
    }

    next();
  });

  app.use(
    express.static(distPath, {
      dotfiles: 'deny',
      index: false,
      setHeaders: (res, filePath) => {
        res.setHeader('X-Robots-Tag', 'noindex, nofollow, noarchive, nosnippet');

        if (filePath.endsWith('.html')) {
          res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
          res.setHeader('Pragma', 'no-cache');
          res.setHeader('Expires', '0');
        }
      },
    })
  );
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
        logger.error('res.sendFile error', { errorMessage: err.message, requestId: req.requestId });
        next(err);
      }
    });
  }

  res.status(404).send('Not Found');
});

app.use((err: Error, req: Request, res: Response, _next: NextFunction) => {
  const status = err instanceof HttpError ? err.status : 500;

  logger.error(`[Error] ${req.method} ${req.url}: ${err.message}`, {
    method: req.method,
    requestId: req.requestId,
    stack: err.stack,
    status,
    url: req.url,
  });

  const rawMessage =
    status >= 500
      ? 'Internal Server Error'
      : err.message || 'Internal Server Error';

  const clientMessage = sanitizeInternalInfraString(rawMessage);

  res.status(status).json({
    error: clientMessage,
    status,
  });
});

const PORT = 3001;
initializeDatabase()
  .then(() => {
    app.listen(PORT, () => {
      logger.info(`API server running on http://localhost:${PORT}`, {
        env: process.env.NODE_ENV || 'development',
        logDir: resolveLogDir(),
        port: PORT,
      });
    });
  })
  .catch((err) => {
    const error = err instanceof Error ? err : new Error(String(err));
    alertCritical('Failed to initialize database — server did not start', {
      errorMessage: error.message,
      stack: error.stack,
    });
    process.exit(1);
  });
