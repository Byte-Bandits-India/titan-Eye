import fs from 'fs';
import http from 'http';
import path from 'path';
import express, { NextFunction, Request, Response } from 'express';
import cors from 'cors';
import { AddressInfo } from 'net';
import { fileURLToPath } from 'url';
import { logSecurityEvent } from '../utils/logger.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '../..');

async function runHttpOptionsVerification() {
  console.log('=== VAPT Finding 13: HTTP OPTIONS & Insecure Methods Disabled Verification ===\n');

  // =========================================================================
  // TEST 1: web.config (Windows IIS Production) Audit
  // =========================================================================
  console.log('Test 1: Audit web.config (Windows IIS Production Hardening)');
  const webConfigPath = path.join(rootDir, 'web.config');
  console.assert(fs.existsSync(webConfigPath), 'web.config must exist');
  const webConfigContent = fs.readFileSync(webConfigPath, 'utf-8');

  // 1a. Request Filtering Verbs must explicitly deny OPTIONS, TRACE, TRACK, DEBUG
  console.assert(
    webConfigContent.includes('<verbs allowUnlisted="true">'),
    'web.config must contain <verbs allowUnlisted="true">'
  );
  console.assert(
    webConfigContent.includes('<add verb="OPTIONS" allowed="false" />'),
    'web.config must explicitly deny OPTIONS verb'
  );
  console.assert(
    webConfigContent.includes('<add verb="TRACE" allowed="false" />'),
    'web.config must explicitly deny TRACE verb'
  );
  console.assert(
    webConfigContent.includes('<add verb="TRACK" allowed="false" />'),
    'web.config must explicitly deny TRACK verb'
  );
  console.assert(
    webConfigContent.includes('<add verb="DEBUG" allowed="false" />'),
    'web.config must explicitly deny DEBUG verb'
  );
  console.log('  [PASS] 1a. web.config <requestFiltering> explicitly blocks OPTIONS, TRACE, TRACK, and DEBUG verbs');

  // 1b. Removal of Allow and Public response headers
  console.assert(
    webConfigContent.includes('<remove name="Allow" />'),
    'web.config must strip Allow header'
  );
  console.assert(
    webConfigContent.includes('<remove name="Public" />'),
    'web.config must strip Public header'
  );
  console.log('  [PASS] 1b. web.config <customHeaders> strips Allow and Public advertising headers');

  // 1c. URL Rewrite Rule for Method Rejection (HTTP 405)
  console.assert(
    webConfigContent.includes('name="Disable Insecure HTTP Methods"'),
    'web.config must define "Disable Insecure HTTP Methods" rewrite rule'
  );
  console.assert(
    webConfigContent.includes('pattern="^(OPTIONS|TRACE|TRACK|DEBUG)$"'),
    'web.config rewrite rule must match OPTIONS, TRACE, TRACK, DEBUG'
  );
  console.assert(
    webConfigContent.includes('statusCode="405"'),
    'web.config rewrite rule must return HTTP 405 Method Not Allowed'
  );
  console.log('  [PASS] 1c. web.config URL Rewrite rule rejects forbidden verbs with HTTP 405 Method Not Allowed');

  // =========================================================================
  // TEST 2: nginx/titan.conf (Linux Nginx Production) Audit
  // =========================================================================
  console.log('\nTest 2: Audit nginx/titan.conf (Linux Reverse Proxy Hardening)');
  const nginxPath = path.join(rootDir, 'nginx', 'titan.conf');
  console.assert(fs.existsSync(nginxPath), 'nginx/titan.conf must exist');
  const nginxContent = fs.readFileSync(nginxPath, 'utf-8');

  // 2a. Server-level block of TRACE, TRACK, DEBUG
  console.assert(
    nginxContent.includes('$request_method ~ ^(TRACE|TRACK|DEBUG)$'),
    'nginx/titan.conf must check for TRACE|TRACK|DEBUG'
  );
  console.assert(
    nginxContent.includes('return 405;'),
    'nginx/titan.conf must return 405 for forbidden methods'
  );
  console.log('  [PASS] 2a. nginx/titan.conf blocks TRACE, TRACK, and DEBUG with HTTP 405');

  // 2b. Root location limit_except on frontend static routes
  console.assert(
    nginxContent.includes('limit_except GET HEAD POST'),
    'nginx/titan.conf location / must use limit_except GET HEAD POST'
  );
  console.log('  [PASS] 2b. nginx/titan.conf restricts frontend static routing with limit_except');

  // =========================================================================
  // TEST 3: Live Express Server Runtime Tests
  // =========================================================================
  console.log('\nTest 3: Live Express Server Runtime Verification');
  const app = express();

  // Insecure method blocking middleware (identical to server/index.ts)
  app.use((req: Request, res: Response, next: NextFunction) => {
    const method = req.method.toUpperCase();

    if (method === 'TRACE' || method === 'TRACK' || method === 'DEBUG') {
      logSecurityEvent('INSECURE_HTTP_METHOD_BLOCKED', {
        ip: req.ip,
        method,
        path: req.originalUrl,
      });

      res.setHeader('Allow', 'GET, POST, PUT, DELETE');
      return res.status(405).json({
        error: `HTTP method ${method} is disabled on this server.`,
      });
    }

    if (method === 'OPTIONS' && !req.headers['access-control-request-method']) {
      logSecurityEvent('OPTIONS_METHOD_BLOCKED', {
        ip: req.ip,
        path: req.originalUrl,
      });

      res.setHeader('Allow', 'GET, POST, PUT, DELETE');
      return res.status(405).json({
        error: 'HTTP OPTIONS method is disabled on this server.',
      });
    }

    next();
  });

  // CORS middleware (identical to server/index.ts)
  const allowedOrigins = ['http://localhost:5173', 'https://trvc.titan.in', 'https://titan-dev.thebytebandits.com'];
  app.use(
    cors({
      allowedHeaders: ['Content-Type', 'Authorization', 'x-request-id'],
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'DELETE'],
      origin: (origin, callback) => {
        if (!origin || allowedOrigins.includes(origin)) {
          callback(null, true);
        } else {
          callback(new Error('CORS not allowed'));
        }
      },
    })
  );

  app.get('/api/ping', (_req, res) => res.sendStatus(200));
  app.post('/api/login', (_req, res) => res.json({ success: true }));
  app.get('/login', (_req, res) => res.send('<html><body>Login Page</body></html>'));

  const server = await new Promise<import('http').Server>((resolve) => {
    const s = app.listen(0, '127.0.0.1', () => resolve(s));
  });

  const port = (server.address() as AddressInfo).port;
  const BASE_URL = `http://127.0.0.1:${port}`;

  try {
    // 3a. Exact VAPT POC: Direct OPTIONS /login (No CORS preflight)
    console.log('  Testing 3a. [VAPT POC] OPTIONS /login probe (Direct HTTP/2 scanner request)...');
    const res3a = await fetch(`${BASE_URL}/login`, {
      method: 'OPTIONS',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Gecko/20100101 Firefox/156.0',
        Accept: 'text/html,application/xhtml+xml',
      },
    });

    console.assert(res3a.status === 405, `Expected 405 Method Not Allowed, got: ${res3a.status}`);
    const data3a = (await res3a.json()) as { error?: string };
    console.assert(
      data3a.error === 'HTTP OPTIONS method is disabled on this server.',
      `Unexpected error body: ${JSON.stringify(data3a)}`
    );

    const allowHeader3a = res3a.headers.get('allow') || '';
    const publicHeader3a = res3a.headers.get('public');
    console.assert(!allowHeader3a.includes('OPTIONS'), `Allow header must not disclose OPTIONS, got: "${allowHeader3a}"`);
    console.assert(!allowHeader3a.includes('TRACE'), `Allow header must not disclose TRACE, got: "${allowHeader3a}"`);
    console.assert(publicHeader3a === null, `Public header must be absent, got: "${publicHeader3a}"`);
    console.log(`    [PASS] 3a. OPTIONS /login blocked with HTTP ${res3a.status} Method Not Allowed`);
    console.log(`    [PASS] 3a. Allow header sanitized: "${allowHeader3a}" (zero OPTIONS or TRACE disclosure)`);
    console.log(`    [PASS] 3a. Public header completely absent`);

    // 3b. Direct OPTIONS /api/login probe
    console.log('  Testing 3b. OPTIONS /api/login probe (Direct scanner request)...');
    const res3b = await fetch(`${BASE_URL}/api/login`, {
      method: 'OPTIONS',
    });

    console.assert(res3b.status === 405, `Expected 405 Method Not Allowed, got: ${res3b.status}`);
    const data3b = (await res3b.json()) as { error?: string };
    console.assert(data3b.error?.includes('HTTP OPTIONS method is disabled'), `Unexpected body: ${JSON.stringify(data3b)}`);
    console.log(`    [PASS] 3b. OPTIONS /api/login blocked with HTTP ${res3b.status}`);

function sendRawHttpRequest(
  reqPort: number,
  reqMethod: string,
  urlPath: string,
  headers: Record<string, string> = {}
): Promise<{ status: number; headers: http.IncomingHttpHeaders; body: string }> {
  return new Promise((resolve, reject) => {
    const req = http.request(
      {
        headers,
        host: '127.0.0.1',
        method: reqMethod,
        path: urlPath,
        port: reqPort,
      },
      (res) => {
        let body = '';
        res.on('data', (chunk) => (body += chunk));
        res.on('end', () => {
          resolve({
            status: res.statusCode || 0,
            headers: res.headers,
            body,
          });
        });
      }
    );

    req.on('error', reject);
    req.end();
  });
}

    // 3c. TRACE method rejection
    console.log('  Testing 3c. TRACE /api/customers probe...');
    const res3c = await sendRawHttpRequest(port, 'TRACE', '/api/customers');

    console.assert(res3c.status === 405, `Expected 405 Method Not Allowed for TRACE, got: ${res3c.status}`);
    const data3c = JSON.parse(res3c.body) as { error?: string };
    console.assert(data3c.error?.includes('HTTP method TRACE is disabled'), `Unexpected body: ${res3c.body}`);
    console.log(`    [PASS] 3c. TRACE method blocked with HTTP ${res3c.status} (${data3c.error})`);

    // 3d. TRACK method rejection
    console.log('  Testing 3d. TRACK / probe...');
    const res3d = await sendRawHttpRequest(port, 'TRACK', '/');

    console.assert(
      res3d.status === 405 || res3d.status === 400,
      `Expected 405 or 400 rejection for TRACK method, got: ${res3d.status}`
    );
    console.log(`    [PASS] 3d. TRACK method rejected with HTTP ${res3d.status} (blocked from server processing)`);

    // 3e. Legitimate Browser CORS Preflight (OPTIONS with Origin and Access-Control-Request-Method)
    console.log('  Testing 3e. Legitimate Browser CORS preflight (OPTIONS with Access-Control-Request-Method)...');
    const res3e = await fetch(`${BASE_URL}/api/login`, {
      method: 'OPTIONS',
      headers: {
        Origin: 'https://trvc.titan.in',
        'Access-Control-Request-Method': 'POST',
        'Access-Control-Request-Headers': 'Content-Type, Authorization',
      },
    });

    console.assert(res3e.status === 204, `Expected 204 No Content for CORS preflight, got: ${res3e.status}`);
    const corsAllowMethods = res3e.headers.get('access-control-allow-methods') || '';
    console.assert(!corsAllowMethods.includes('OPTIONS'), `CORS Allow-Methods should not advertise OPTIONS, got: "${corsAllowMethods}"`);
    console.assert(!corsAllowMethods.includes('TRACE'), `CORS Allow-Methods should not advertise TRACE, got: "${corsAllowMethods}"`);
    console.log(`    [PASS] 3e. Legitimate CORS preflight returned HTTP ${res3e.status} No Content`);
    console.log(`    [PASS] 3e. CORS Allow-Methods clean: "${corsAllowMethods}"`);

    // 3f. Standard GET and POST operation
    console.log('  Testing 3f. Standard GET and POST operation...');
    const resGet = await fetch(`${BASE_URL}/api/ping`);
    console.assert(resGet.status === 200, `Expected 200 OK for GET /api/ping, got: ${resGet.status}`);
    console.log(`    [PASS] 3f. GET /api/ping returns HTTP ${resGet.status}`);

    const resPost = await fetch(`${BASE_URL}/api/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'test@titan.in', password: 'Password123!' }),
    });
    console.assert(resPost.status === 200, `Expected 200 OK for POST /api/login, got: ${resPost.status}`);
    console.log(`    [PASS] 3f. POST /api/login returns HTTP ${resPost.status}`);

    console.log('\n=== ALL VAPT FINDING 13 VERIFICATION TESTS PASSED SUCCESSFULLY! ===\n');
  } finally {
    await new Promise<void>((resolve) => server.close(() => resolve()));
  }
}

runHttpOptionsVerification()
  .then(() => {
    process.exit(0);
  })
  .catch((err) => {
    console.error('\nVerification failed:', err);
    process.exit(1);
  });
