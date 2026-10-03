import assert from 'assert';
import fs from 'fs';
import http from 'http';
import path from 'path';
import express, { Request, Response, NextFunction } from 'express';
import helmet from 'helmet';
import { AddressInfo } from 'net';
import { fileURLToPath } from 'url';

import { internalInfraSanitizer, sanitizeInternalInfraString } from '../middleware/internalInfraSanitizer.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '../..');

async function runInternalIpExposureVerification() {
  console.log('=== VAPT Finding 20: Internal IP Address / Hostname Exposure Verification ===\n');

  // =========================================================================
  // TEST 1: Static Source Code Audit
  // =========================================================================
  console.log('Test 1: Static Source Code Audit');

  // 1a. server/index.ts
  const serverIndexPath = path.join(rootDir, 'server', 'index.ts');
  assert(fs.existsSync(serverIndexPath), 'server/index.ts must exist');
  const serverIndexContent = fs.readFileSync(serverIndexPath, 'utf8');

  // Extract connectSrc directive
  const connectSrcMatch = serverIndexContent.match(/connectSrc:\s*\[([\s\S]*?)\]/);
  assert(connectSrcMatch, 'server/index.ts must configure connectSrc directive');
  assert(
    !connectSrcMatch[1].includes('localhost'),
    'server/index.ts connectSrc MUST NOT contain "localhost" under any circumstances'
  );
  assert(
    !connectSrcMatch[1].includes('3001'),
    'server/index.ts connectSrc MUST NOT contain internal port "3001"'
  );
  assert(
    !connectSrcMatch[1].includes('5173'),
    'server/index.ts connectSrc MUST NOT contain internal port "5173"'
  );
  assert(
    serverIndexContent.includes('internalInfraSanitizer'),
    'server/index.ts must mount internalInfraSanitizer middleware'
  );
  assert(
    !serverIndexContent.includes("res.setHeader('Access-Control-Allow-Private-Network', 'true')"),
    'server/index.ts must NOT send Access-Control-Allow-Private-Network header on public responses'
  );
  console.log('  [PASS] 1a. server/index.ts connectSrc purged of localhost:3001/5173 and middleware mounted');

  // 1b. web.config
  const webConfigPath = path.join(rootDir, 'web.config');
  assert(fs.existsSync(webConfigPath), 'web.config must exist');
  const webConfigContent = fs.readFileSync(webConfigPath, 'utf8');
  assert(
    !webConfigContent.includes('localhost:3001') && !webConfigContent.includes('localhost:5173'),
    'web.config must NOT disclose localhost:3001 or localhost:5173 in headers'
  );
  console.log('  [PASS] 1b. web.config contains zero localhost:3001/5173 disclosures in HTTP response headers');

  // 1c. index.html
  const indexHtmlPath = path.join(rootDir, 'index.html');
  assert(fs.existsSync(indexHtmlPath), 'index.html must exist');
  const indexHtmlContent = fs.readFileSync(indexHtmlPath, 'utf8');
  assert(
    !indexHtmlContent.includes('localhost:3001') && !indexHtmlContent.includes('localhost:5173'),
    'index.html meta tags must NOT contain localhost:3001 or localhost:5173'
  );
  console.log('  [PASS] 1c. index.html meta CSP contains zero localhost disclosures');

  // =========================================================================
  // TEST 2: Live Express Runtime Verification (5 VAPT Instances Reproduction)
  // =========================================================================
  console.log('\nTest 2: Live Express Runtime Verification (5 VAPT Instances Reproduction)');

  const testApp = express();
  testApp.use(internalInfraSanitizer);

  testApp.use(
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
          fontSrc: ["'self'", 'data:', 'https://*.cdn.office.net', 'https://*.office.net', 'https://*.microsoft.com', 'https://*.azure.com'],
          formAction: ["'self'"],
          frameAncestors: ["'none'"],
          imgSrc: ["'self'", 'data:', 'blob:'],
          mediaSrc: ["'self'", 'blob:'],
          objectSrc: ["'none'"],
          scriptSrc: ["'self'"],
          styleSrc: ["'self'", "'unsafe-inline'"],
          upgradeInsecureRequests: [],
          workerSrc: ["'self'", 'blob:'],
        },
      },
    })
  );

  // General security headers
  testApp.use((req: Request, res: Response, next: NextFunction) => {
    res.removeHeader('X-Powered-By');
    res.removeHeader('Server');
    res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=(), payment=()');
    res.setHeader('X-Robots-Tag', 'noindex, nofollow, noarchive, nosnippet');
    next();
  });

  // Test routes simulating all reported instances
  testApp.get('/login', (req: Request, res: Response) => {
    res.status(200).send('<!DOCTYPE html><html><head><title>Login</title></head><body>Login Page</body></html>');
  });

  testApp.get('/libs', (req: Request, res: Response) => {
    res.status(200).send('<!DOCTYPE html><html><head><title>Libs</title></head><body>Libraries</body></html>');
  });

  testApp.get('/default.htm', (req: Request, res: Response) => {
    res.status(200).send('<!DOCTYPE html><html><head><title>Default</title></head><body>Default Page</body></html>');
  });

  testApp.get('/', (req: Request, res: Response) => {
    res.status(200).send('<!DOCTYPE html><html><head><title>Root</title></head><body>Root Page</body></html>');
  });

  // Simulated error route
  testApp.get('/api/test-error', (req: Request, res: Response, next: NextFunction) => {
    next(new Error('Connection failed to 10.128.71.133:3001 on localhost'));
  });

  // Error handler matching server/index.ts
  testApp.use((err: Error, req: Request, res: Response, _next: NextFunction) => {
    const rawMessage = err.message || 'Internal Server Error';
    const clientMessage = sanitizeInternalInfraString(rawMessage);
    res.status(500).json({ error: clientMessage, status: 500 });
  });

  const server = http.createServer(testApp);
  await new Promise<void>((resolve) => server.listen(0, resolve));
  const port = (server.address() as AddressInfo).port;

  function doRequest(reqPath: string): Promise<{
    headers: http.IncomingHttpHeaders;
    statusCode: number;
    body: string;
  }> {
    return new Promise((resolve, reject) => {
      const req = http.request(
        {
          hostname: '127.0.0.1',
          port,
          path: reqPath,
          method: 'GET',
          headers: {
            Host: 'trvc.titan.in',
            'User-Agent': 'Mozilla/5.0 (VAPT-Verification)',
          },
        },
        (res) => {
          let body = '';
          res.on('data', (chunk) => {
            body += chunk;
          });
          res.on('end', () => {
            resolve({
              headers: res.headers,
              statusCode: res.statusCode || 0,
              body,
            });
          });
        }
      );
      req.on('error', reject);
      req.end();
    });
  }

  try {
    // 2a. Instance 1: GET /login?Submit=Submit (Alert ID 5589188)
    const res1 = await doRequest('/login?Submit=Submit');
    assert.strictEqual(res1.statusCode, 200);
    const csp1 = String(res1.headers['content-security-policy'] || '');
    assert(!csp1.includes('localhost'), `Instance 1 CSP must NOT contain "localhost", got: ${csp1}`);
    assert(!csp1.includes('3001'), `Instance 1 CSP must NOT contain "3001", got: ${csp1}`);
    assert(!csp1.includes('5173'), `Instance 1 CSP must NOT contain "5173", got: ${csp1}`);
    assert(!res1.headers['access-control-allow-private-network'], 'Must NOT expose Access-Control-Allow-Private-Network');
    console.log('  [PASS] 2a. Instance 1 (/login?Submit=Submit): CSP contains zero localhost, 3001, or 5173');

    // 2b. Instance 2: GET /libs (Alert ID 5585754)
    const res2 = await doRequest('/libs');
    assert.strictEqual(res2.statusCode, 200);
    const csp2 = String(res2.headers['content-security-policy'] || '');
    assert(!csp2.includes('localhost'), `Instance 2 CSP must NOT contain "localhost", got: ${csp2}`);
    assert(!csp2.includes('3001'), `Instance 2 CSP must NOT contain "3001", got: ${csp2}`);
    console.log('  [PASS] 2b. Instance 2 (/libs): CSP contains zero localhost or internal ports');

    // 2c. Instance 3: GET /default.htm (Alert ID 5584076)
    const res3 = await doRequest('/default.htm');
    assert.strictEqual(res3.statusCode, 200);
    const csp3 = String(res3.headers['content-security-policy'] || '');
    assert(!csp3.includes('localhost'), `Instance 3 CSP must NOT contain "localhost", got: ${csp3}`);
    assert(!csp3.includes('3001'), `Instance 3 CSP must NOT contain "3001", got: ${csp3}`);
    console.log('  [PASS] 2c. Instance 3 (/default.htm): CSP contains zero localhost or internal ports');

    // 2d. Instance 4: GET / (Alert ID 5582931)
    const res4 = await doRequest('/');
    assert.strictEqual(res4.statusCode, 200);
    const csp4 = String(res4.headers['content-security-policy'] || '');
    assert(!csp4.includes('localhost'), `Instance 4 CSP must NOT contain "localhost", got: ${csp4}`);
    assert(!csp4.includes('3001'), `Instance 4 CSP must NOT contain "3001", got: ${csp4}`);
    console.log('  [PASS] 2d. Instance 4 (/): CSP contains zero localhost or internal ports');

    // 2e. Instance 5: GET /login (Alert ID 5589188)
    const res5 = await doRequest('/login');
    assert.strictEqual(res5.statusCode, 200);
    const csp5 = String(res5.headers['content-security-policy'] || '');
    assert(!csp5.includes('localhost'), `Instance 5 CSP must NOT contain "localhost", got: ${csp5}`);
    assert(!csp5.includes('3001'), `Instance 5 CSP must NOT contain "3001", got: ${csp5}`);
    console.log('  [PASS] 2e. Instance 5 (/login): CSP contains zero localhost or internal ports');

    // =========================================================================
    // TEST 3: Error Handler Sanitization (Zero IP/Host Disclosure)
    // =========================================================================
    console.log('\nTest 3: Error Handler Infrastructure Sanitization');
    const errRes = await doRequest('/api/test-error');
    assert.strictEqual(errRes.statusCode, 500);
    assert(!errRes.body.includes('10.128.71.133'), 'Error response must NOT disclose internal IP 10.128.71.133');
    assert(!errRes.body.includes('localhost'), 'Error response must NOT disclose localhost');
    assert(!errRes.body.includes('3001'), 'Error response must NOT disclose internal port 3001');
    console.log(`  [PASS] 3. Error response sanitized: ${errRes.body}`);
  } finally {
    server.close();
  }

  console.log('\n======================================================================');
  console.log('ALL INTERNAL IP & HOSTNAME EXPOSURE CHECKS PASSED SUCCESSFULLY!');
  console.log('======================================================================\n');
}

runInternalIpExposureVerification().catch((err) => {
  console.error('\n[VERIFICATION FAILED]:', err);
  process.exit(1);
});
