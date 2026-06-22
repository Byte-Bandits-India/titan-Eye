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

// Import routers
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

const app = express();

app.use(helmet({
  contentSecurityPolicy: false,
}));

app.use((req: Request, res: Response, next: NextFunction) => {
  res.setHeader('Access-Control-Allow-Private-Network', 'true');
  next();
});

const allowedOrigins = process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:5173'];

app.use(cors({
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Blocked by CORS policy'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

app.use(express.json());
app.use(cookieParser());

// Ping endpoint
app.get('/api/ping', (req: Request, res: Response) => {
  res.sendStatus(200);
});

// SSE Events endpoint
app.get('/api/events', (req: Request, res: Response) => {
  const token = req.query.token as string;
  if (!token) {
    return res.status(401).json({ error: 'Access token required via query parameter' });
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

// Register routers
app.use('/api/login', authLimiter);
app.use('/api', authRouter);
app.use('/api/customers', authenticateToken as any, customersRouter);
app.use('/api/webhooks', webhooksRouter);
app.use('/api', authenticateToken as any, systemRouter);

// Serve static files from Vite build directory
const distPath = path.resolve('dist');
if (fs.existsSync(distPath)) {
  app.use(express.static(distPath));
  // For any other request, send back index.html (supports client-side routing)
  app.get('/*splat', (req: Request, res: Response, next: NextFunction) => {
    if (req.path.startsWith('/api')) {
      return next();
    }
    res.sendFile(path.join(distPath, 'index.html'), (err) => {
      if (err) {
        console.error('res.sendFile error:', err);
        next(err);
      }
    });
  });
}

// Start database and server
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
