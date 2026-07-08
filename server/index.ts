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

const allowedOrigins = process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:5173'];
const hasHttpsOrigin = allowedOrigins.some(origin => origin.startsWith('https://'));

const app = express();

app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'"],
      styleSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "blob:"],
      connectSrc: ["'self'"],
      fontSrc: ["'self'"],
      objectSrc: ["'none'"],
      frameAncestors: ["'none'"],
      formAction: ["'self'"],
      upgradeInsecureRequests: hasHttpsOrigin ? [] : null,
    },
  },
}));

app.use((req: Request, res: Response, next: NextFunction) => {
  res.setHeader('Access-Control-Allow-Private-Network', 'true');
  next();
});

app.use(cors({
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      const corsError = new Error('Not allowed by CORS') as any;
      corsError.status = 403;
      callback(corsError);
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'OPTIONS'],
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
app.use('/api/customers', apiLimiter, authenticateToken as any, customersRouter);
app.use('/api/webhooks', apiLimiter, webhooksRouter);
app.use('/api', apiLimiter, authenticateToken as any, systemRouter);

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

app.use((err: any, req: Request, res: Response, next: NextFunction) => {
  const status = err.status || err.statusCode || 500;
  const message = err.message || 'Internal Server Error';

  console.error(`[Error] ${req.method} ${req.url}:`, err);

  res.status(status).json({
    error: message,
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
