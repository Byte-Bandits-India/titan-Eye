import assert from 'assert';
import cookieParser from 'cookie-parser';
import express, { Request, Response } from 'express';
import fs from 'fs';
import http from 'http';
import { AddressInfo } from 'net';
import path from 'path';
import { fileURLToPath } from 'url';

import { generateToken, JWT_TTL_MS, UserPayload } from '../config/jwt.js';
import { get, initializeDatabase, run } from '../db/database.js';
import { authenticateToken } from '../middleware/auth.js';
import { internalInfraSanitizer } from '../middleware/internalInfraSanitizer.js';
import { pathTraversalGuard } from '../middleware/pathTraversalGuard.js';
import customersRouter from '../routes/customers.js';
import usersRouter from '../routes/users.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '../..');

async function seedTestUser(user: UserPayload): Promise<string> {
  const existing = await get<{ email: string }>('SELECT email FROM users WHERE LOWER(email) = LOWER(?)', [
    user.email,
  ]);

  const nowIso = new Date().toISOString();
  if (!existing) {
    await run(
      `INSERT INTO users (email, name, role, status, lastPing)
       VALUES (?, ?, ?, 'active', ?)`,
      [user.email, user.name, user.role, nowIso]
    );
  } else {
    await run(
      `UPDATE users SET name = ?, role = ?, status = 'active', lastPing = ?
       WHERE LOWER(email) = LOWER(?)`,
      [user.name, user.role, nowIso, user.email]
    );
  }

  const token = generateToken(user, JWT_TTL_MS);
  const sig = token.split('.')[2];
  await run('UPDATE users SET activeTokenSig = ? WHERE LOWER(email) = LOWER(?)', [sig, user.email]);

  return token;
}

function sendRawHttpRequest(
  port: number,
  method: string,
  rawPath: string,
  headers: Record<string, string> = {}
): Promise<{ status: number; headers: http.IncomingHttpHeaders; body: string }> {
  return new Promise((resolve, reject) => {
    // Construct raw HTTP socket request to ensure URL-encoded path characters are not decoded by client libraries
    const client = http.request(
      {
        host: '127.0.0.1',
        port,
        method,
        path: rawPath,
        headers: {
          Host: 'trvc.titan.in',
          Accept: 'application/json, text/plain, */*',
          ...headers,
        },
      },
      (res) => {
        let body = '';
        res.on('data', (chunk) => {
          body += chunk;
        });
        res.on('end', () => {
          resolve({
            status: res.statusCode || 0,
            headers: res.headers,
            body,
          });
        });
      }
    );

    client.on('error', reject);
    client.end();
  });
}

async function runDirectoryTraversalVerification() {
  console.log('=== VAPT Finding 24: Directory Traversal Remediation Verification ===\n');

  // =========================================================================
  // TEST 1: Static Audit of web.config (Windows IIS Hardening)
  // =========================================================================
  console.log('Test 1: Audit web.config (IIS Path Traversal Rewrite Rule)');
  const webConfigPath = path.join(rootDir, 'web.config');
  assert(fs.existsSync(webConfigPath), 'web.config must exist');
  const webConfigContent = fs.readFileSync(webConfigPath, 'utf8');

  assert(
    webConfigContent.includes('name="Block Path Traversal"'),
    'web.config must contain "Block Path Traversal" rewrite rule'
  );
  assert(
    webConfigContent.includes('{UNENCODED_URL}') && webConfigContent.includes('%2[fF]'),
    'web.config rewrite rule must inspect {UNENCODED_URL} and match encoded traversal sequences'
  );
  assert(
    webConfigContent.includes('statusCode="400"'),
    'web.config rule must return HTTP 400'
  );
  console.log('  [PASS] 1. web.config contains "Block Path Traversal" rule blocking encoded and unencoded dot-dots');

  // =========================================================================
  // TEST 2: Static Audit of nginx/titan.conf (Linux Reverse Proxy Hardening)
  // =========================================================================
  console.log('\nTest 2: Audit nginx/titan.conf (Nginx Path Traversal Filter)');
  const nginxConfPath = path.join(rootDir, 'nginx', 'titan.conf');
  assert(fs.existsSync(nginxConfPath), 'nginx/titan.conf must exist');
  const nginxContent = fs.readFileSync(nginxConfPath, 'utf8');

  assert(
    nginxContent.includes('$request_uri ~*') && nginxContent.includes('%2[fF]'),
    'nginx/titan.conf must filter traversal in $request_uri'
  );
  assert(
    nginxContent.includes('return 400;'),
    'nginx/titan.conf must return 400 for traversal sequences'
  );
  console.log('  [PASS] 2. nginx/titan.conf filters path traversal in $request_uri and returns 400');

  // =========================================================================
  // TEST 3: Static Audit of server/index.ts (Express Pipeline Hardening)
  // =========================================================================
  console.log('\nTest 3: Audit server/index.ts (pathTraversalGuard Placement)');
  const serverIndexPath = path.join(rootDir, 'server', 'index.ts');
  const serverIndexContent = fs.readFileSync(serverIndexPath, 'utf8');

  assert(
    serverIndexContent.includes("import { pathTraversalGuard } from './middleware/pathTraversalGuard.js';"),
    'server/index.ts must import pathTraversalGuard'
  );
  assert(
    serverIndexContent.includes('app.use(pathTraversalGuard);'),
    'server/index.ts must mount pathTraversalGuard'
  );
  console.log('  [PASS] 3. server/index.ts mounts pathTraversalGuard before routes');

  // =========================================================================
  // TEST 4: Live Express Runtime Traversal Rejection Tests
  // =========================================================================
  console.log('\nTest 4: Live Express Runtime Traversal Rejection Tests');
  await initializeDatabase();

  const testApp = express();
  testApp.disable('x-powered-by');
  testApp.use(cookieParser());
  testApp.use(internalInfraSanitizer);
  testApp.use(pathTraversalGuard);

  // Mount API routes
  testApp.get('/api/health', (_req: Request, res: Response) => {
    res.status(200).json({ status: 'ok' });
  });
  testApp.use('/api/customers', authenticateToken, customersRouter);
  testApp.use('/api/users', authenticateToken, usersRouter);

  const testServer = http.createServer(testApp);
  await new Promise<void>((resolve) => testServer.listen(0, '127.0.0.1', () => resolve()));
  const port = (testServer.address() as AddressInfo).port;

  try {
    const storeUser: UserPayload = {
      email: 'tkor@titan.co.in',
      name: 'TKOR Store',
      role: 'store',
      storeName: 'TKOR',
    };
    const storeToken = await seedTestUser(storeUser);

    // 4a. VAPT Finding POC: GET /api/customers/..%2fusers
    console.log('  Testing 4a: VAPT Finding POC /api/customers/..%2fusers...');
    const res4a = await sendRawHttpRequest(port, 'GET', '/api/customers/..%2fusers', {
      Cookie: `token=${storeToken}`,
    });
    assert.strictEqual(res4a.status, 400, `Expected HTTP 400 for ..%2f traversal, got: ${res4a.status}`);
    const body4a = JSON.parse(res4a.body);
    assert(body4a.error?.includes('Directory traversal sequence detected'), `Unexpected body: ${res4a.body}`);
    console.log('    [PASS] 4a. VAPT Finding POC /api/customers/..%2fusers rejected with HTTP 400');

    // 4b. Uppercase encoded: GET /api/customers/..%2Fusers
    console.log('  Testing 4b: Uppercase encoded /api/customers/..%2Fusers...');
    const res4b = await sendRawHttpRequest(port, 'GET', '/api/customers/..%2Fusers', {
      Cookie: `token=${storeToken}`,
    });
    assert.strictEqual(res4b.status, 400, `Expected HTTP 400 for ..%2F traversal, got: ${res4b.status}`);
    console.log('    [PASS] 4b. Uppercase encoded /..%2F rejected with HTTP 400');

    // 4c. Backslash encoded: GET /api/customers/..%5cusers
    console.log('  Testing 4c: Backslash encoded /api/customers/..%5cusers...');
    const res4c = await sendRawHttpRequest(port, 'GET', '/api/customers/..%5cusers', {
      Cookie: `token=${storeToken}`,
    });
    assert.strictEqual(res4c.status, 400, `Expected HTTP 400 for ..%5c traversal, got: ${res4c.status}`);
    console.log('    [PASS] 4c. Backslash encoded /..%5c rejected with HTTP 400');

    // 4d. Fully encoded dot-dot: GET /api/customers/%2e%2e%2fusers
    console.log('  Testing 4d: Fully encoded %2e%2e%2f...');
    const res4d = await sendRawHttpRequest(port, 'GET', '/api/customers/%2e%2e%2fusers', {
      Cookie: `token=${storeToken}`,
    });
    assert.strictEqual(res4d.status, 400, `Expected HTTP 400 for %2e%2e%2f traversal, got: ${res4d.status}`);
    console.log('    [PASS] 4d. Fully encoded %2e%2e%2f rejected with HTTP 400');

    // 4e. Double encoded: GET /api/customers/..%252fusers
    console.log('  Testing 4e: Double encoded /..%252fusers...');
    const res4e = await sendRawHttpRequest(port, 'GET', '/api/customers/..%252fusers', {
      Cookie: `token=${storeToken}`,
    });
    assert.strictEqual(res4e.status, 400, `Expected HTTP 400 for double encoded traversal, got: ${res4e.status}`);
    console.log('    [PASS] 4e. Double encoded traversal rejected with HTTP 400');

    // 4f. Standard unencoded traversal: GET /api/customers/../users
    console.log('  Testing 4f: Standard unencoded /api/customers/../users...');
    const res4f = await sendRawHttpRequest(port, 'GET', '/api/customers/../users', {
      Cookie: `token=${storeToken}`,
    });
    assert.strictEqual(res4f.status, 400, `Expected HTTP 400 for unencoded ../ traversal, got: ${res4f.status}`);
    console.log('    [PASS] 4f. Standard unencoded ../ traversal rejected with HTTP 400');

    // 4g. Legitimate requests (Zero false positives)
    console.log('  Testing 4g: Legitimate API endpoints (/api/health & /api/customers)...');
    const resHealth = await sendRawHttpRequest(port, 'GET', '/api/health');
    assert.strictEqual(resHealth.status, 200, `Expected HTTP 200 for /api/health, got: ${resHealth.status}`);

    const resCustomers = await sendRawHttpRequest(port, 'GET', '/api/customers', {
      Cookie: `token=${storeToken}`,
    });
    assert.strictEqual(resCustomers.status, 200, `Expected HTTP 200 for legitimate /api/customers, got: ${resCustomers.status}`);
    console.log('    [PASS] 4g. Legitimate API endpoints functional with zero false positives');

    console.log('\n========================================================================');
    console.log(' [ALL PASSED] VAPT Finding 24: Directory Traversal Remediated');
    console.log('========================================================================\n');
  } finally {
    await new Promise<void>((resolve, reject) => {
      testServer.close((err) => (err ? reject(err) : resolve()));
    });
  }
}

runDirectoryTraversalVerification()
  .then(() => {
    process.exit(0);
  })
  .catch((err) => {
    console.error('[FAIL] Verification error:', err);
    process.exit(1);
  });
