import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import path from 'path';
import fs from 'fs';

// Load environment variables natively in Node 20+
if (fs.existsSync('.env.local')) {
  process.loadEnvFile('.env.local');
} else if (fs.existsSync('.env')) {
  process.loadEnvFile('.env');
}
import { initDb } from './db/database.js';
import { authenticateToken } from './middleware/auth.js';
import { addSseClient, removeSseClient } from './utils/sse.js';

// Import routers
import authRouter from './routes/auth.js';
import customersRouter from './routes/customers.js';
import webhooksRouter from './routes/webhooks.js';
import systemRouter from './routes/system.js';

const app = express();

app.use((req: Request, res: Response, next: NextFunction) => {
  res.setHeader('Access-Control-Allow-Private-Network', 'true');
  next();
});

app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

app.use(express.json());

// Ping endpoint
app.get('/api/ping', (req: Request, res: Response) => {
  res.sendStatus(200);
});

// SSE Events endpoint
app.get('/api/events', (req: Request, res: Response) => {
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive'
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
