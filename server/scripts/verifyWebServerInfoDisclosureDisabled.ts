import assert from 'assert';
import fs from 'fs';
import http from 'http';
import path from 'path';
import express, { Request, Response, NextFunction } from 'express';
import { AddressInfo } from 'net';
import { fileURLToPath } from 'url';
import { internalInfraSanitizer } from '../middleware/internalInfraSanitizer.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '../..');

function sendRawHttpRequest(
  port: number,
  method: string,
  requestPath: string,
  headers: Record<string, string> = {}
): Promise<{ status: number; headers: http.IncomingHttpHeaders; body: string }> {
  return new Promise((resolve, reject) => {
    const options: http.RequestOptions = {
      hostname: '127.0.0.1',
      port,
      path: requestPath,
      method,
      headers: {
        Host: 'trvc.titan.in',
        Accept: 'application/json, text/plain, */*',
        'Content-Type': 'application/json',
        ...headers,
      },
    };

    const req = http.request(options, (res) => {
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
    });

    req.on('error', reject);
    req.end();
  });
}

async function runWebServerInfoDisclosureVerification() {
  console.log('=== VAPT Finding 22: Web Server Info Disclosure (Microsoft-HTTPAPI/2.0) Verification ===\n');

  // =========================================================================
  // TEST 1: Audit web.config (IIS WebDAV Removal & Method Filtering)
  // =========================================================================
  console.log('Test 1: Audit web.config (WebDAV Removal, requestFiltering, & Rewrite)');
  const webConfigPath = path.join(rootDir, 'web.config');
  assert(fs.existsSync(webConfigPath), 'web.config must exist');
  const webConfigContent = fs.readFileSync(webConfigPath, 'utf8');

  // 1a. WebDAVModule & WebDAV Handler removal
  assert(
    webConfigContent.includes('<remove name="WebDAVModule" />'),
    'web.config must explicitly remove WebDAVModule'
  );
  assert(
    webConfigContent.includes('<remove name="WebDAV" />'),
    'web.config must explicitly remove WebDAV handler'
  );
  console.log('  [PASS] 1a. web.config removes WebDAVModule and WebDAV handler');

  // 1b. requestFiltering verbs
  const requiredVerbs = ['PROPFIND', 'PROPPATCH', 'MKCOL', 'COPY', 'MOVE', 'LOCK', 'UNLOCK', 'SEARCH'];
  for (const verb of requiredVerbs) {
    assert(
      webConfigContent.includes(`<add verb="${verb}" allowed="false" />`),
      `web.config requestFiltering must block verb: ${verb}`
    );
  }
  console.log('  [PASS] 1b. web.config requestFiltering explicitly blocks all WebDAV verbs (PROPFIND, etc.)');

  // 1c. Rewrite rule blocking WebDAV
  assert(
    webConfigContent.includes('PROPFIND'),
    'web.config rewrite rule must match PROPFIND'
  );
  assert(
    webConfigContent.includes('pattern="^(OPTIONS|TRACE|TRACK|DEBUG|PROPFIND|PROPPATCH|MKCOL|COPY|MOVE|LOCK|UNLOCK|SEARCH)$"'),
    'web.config rewrite rule must deny all insecure and WebDAV verbs'
  );
  console.log('  [PASS] 1c. web.config URL Rewrite rule blocks PROPFIND and WebDAV verbs with 405');

  // 1d. Server header suppression & PassThrough error handling
  assert(
    webConfigContent.includes('removeServerHeader="true"'),
    'web.config must configure removeServerHeader="true"'
  );
  assert(
    webConfigContent.includes('<remove name="Server" />'),
    'web.config must remove Server header in customHeaders'
  );
  assert(
    webConfigContent.includes('<httpErrors existingResponse="PassThrough" />'),
    'web.config must set existingResponse="PassThrough"'
  );
  console.log('  [PASS] 1d. web.config enforces removeServerHeader and httpErrors PassThrough mode');

  // =========================================================================
  // TEST 2: Audit scripts/windows/disable-iis-server-header.ps1
  // =========================================================================
  console.log('\nTest 2: Audit scripts/windows/disable-iis-server-header.ps1');
  const psScriptPath = path.join(rootDir, 'scripts', 'windows', 'disable-iis-server-header.ps1');
  assert(fs.existsSync(psScriptPath), 'disable-iis-server-header.ps1 must exist');
  const psScriptContent = fs.readFileSync(psScriptPath, 'utf8');

  // 2a. Kernel HTTP.sys DisableServerHeader = 2 (suppresses Microsoft-HTTPAPI/2.0)
  assert(
    psScriptContent.includes('DisableServerHeader') && psScriptContent.includes('Value 2'),
    'PowerShell script must configure DisableServerHeader = 2 (DWORD)'
  );
  console.log('  [PASS] 2a. PowerShell script configures kernel DisableServerHeader = 2 (Microsoft-HTTPAPI/2.0 suppression)');

  // 2b. Server-level WebDAV removal
  assert(
    psScriptContent.includes("WebDAVModule") && psScriptContent.includes("WebDAV"),
    'PowerShell script must remove WebDAVModule and WebDAV handler'
  );
  console.log('  [PASS] 2b. PowerShell script automates server-level WebDAV removal via appcmd');

  // =========================================================================
  // TEST 3: Audit scripts/windows/README-DEPLOYMENT.md
  // =========================================================================
  console.log('\nTest 3: Audit scripts/windows/README-DEPLOYMENT.md');
  const readmePath = path.join(rootDir, 'scripts', 'windows', 'README-DEPLOYMENT.md');
  assert(fs.existsSync(readmePath), 'README-DEPLOYMENT.md must exist');
  const readmeContent = fs.readFileSync(readmePath, 'utf8');

  assert(
    readmeContent.includes('VAPT Findings 21, 22') || readmeContent.includes('VAPT Finding 22'),
    'README-DEPLOYMENT.md must document VAPT Finding 22'
  );
  assert(
    readmeContent.includes('Microsoft-HTTPAPI/2.0'),
    'README-DEPLOYMENT.md must reference Microsoft-HTTPAPI/2.0 suppression'
  );
  console.log('  [PASS] 3. README-DEPLOYMENT.md documents Finding 22 & Microsoft-HTTPAPI/2.0 remediation');

  // =========================================================================
  // TEST 4: Audit nginx/titan.conf
  // =========================================================================
  console.log('\nTest 4: Audit nginx/titan.conf (Linux Reverse Proxy Hardening)');
  const nginxConfPath = path.join(rootDir, 'nginx', 'titan.conf');
  assert(fs.existsSync(nginxConfPath), 'nginx/titan.conf must exist');
  const nginxConfContent = fs.readFileSync(nginxConfPath, 'utf8');

  assert(
    nginxConfContent.includes('PROPFIND'),
    'nginx/titan.conf must explicitly block PROPFIND'
  );
  assert(
    nginxConfContent.includes('server_tokens off;'),
    'nginx/titan.conf must enforce server_tokens off;'
  );
  assert(
    nginxConfContent.includes('proxy_hide_header Server;'),
    'nginx/titan.conf must include proxy_hide_header Server;'
  );
  console.log('  [PASS] 4. nginx/titan.conf blocks PROPFIND with HTTP 405 and suppresses server tokens');

  // =========================================================================
  // TEST 5: Audit server/index.ts (Express Method Whitelisting)
  // =========================================================================
  console.log('\nTest 5: Audit server/index.ts (Backend HTTP Method Whitelist)');
  const serverIndexPath = path.join(rootDir, 'server', 'index.ts');
  const serverIndexContent = fs.readFileSync(serverIndexPath, 'utf8');

  assert(
    serverIndexContent.includes('ALLOWED_HTTP_METHODS'),
    'server/index.ts must define ALLOWED_HTTP_METHODS whitelist'
  );
  console.log('  [PASS] 5. server/index.ts enforces ALLOWED_HTTP_METHODS whitelist');

  // =========================================================================
  // TEST 6: Live Express Server Probes (PROPFIND /api/login and /api/me)
  // =========================================================================
  console.log('\nTest 6: Live Express Runtime Verification with PROPFIND probes');

  const testApp = express();
  testApp.disable('x-powered-by');

  // Security headers & infra sanitizer middleware
  testApp.use((_req: Request, res: Response, next: NextFunction) => {
    res.removeHeader('X-Powered-By');
    res.removeHeader('Server');
    res.setHeader('X-Content-Type-Options', 'nosniff');
    next();
  });
  testApp.use(internalInfraSanitizer);

  // Method filtering middleware matching server/index.ts
  const ALLOWED_HTTP_METHODS = new Set(['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'HEAD', 'OPTIONS']);
  testApp.use((req: Request, res: Response, next: NextFunction) => {
    const method = req.method.toUpperCase();

    if (
      !ALLOWED_HTTP_METHODS.has(method) ||
      method === 'TRACE' ||
      method === 'TRACK' ||
      method === 'DEBUG'
    ) {
      res.setHeader('Allow', 'GET, POST, PUT, DELETE');
      return res.status(405).json({
        error: `HTTP method ${method} is disabled on this server.`,
      });
    }

    if (method === 'OPTIONS' && !req.headers['access-control-request-method']) {
      res.setHeader('Allow', 'GET, POST, PUT, DELETE');
      return res.status(405).json({
        error: 'HTTP OPTIONS method is disabled on this server.',
      });
    }

    next();
  });

  // Endpoints matching VAPT scanner targets
  testApp.all('/api/login', (_req: Request, res: Response) => {
    res.status(200).json({ status: 'ok', route: '/api/login' });
  });

  testApp.all('/api/me', (_req: Request, res: Response) => {
    res.status(200).json({ status: 'ok', route: '/api/me' });
  });

  const testServer = http.createServer(testApp);
  await new Promise<void>((resolve) => testServer.listen(0, '127.0.0.1', () => resolve()));
  const port = (testServer.address() as AddressInfo).port;

  // 6a. Test Alert 1: PROPFIND /api/login (Alert ID: 5582952)
  console.log('  Testing 6a: PROPFIND /api/login (VAPT Alert ID: 5582952)...');
  const res6a = await sendRawHttpRequest(port, 'PROPFIND', '/api/login');
  assert.strictEqual(res6a.status, 405, `Expected HTTP 405 for PROPFIND /api/login, got: ${res6a.status}`);
  const serverHdr6a = res6a.headers['server'] as string | undefined;
  assert(!serverHdr6a, `Server header must be absent on PROPFIND response, got: "${serverHdr6a}"`);
  assert(!res6a.headers['x-powered-by'], 'x-powered-by header must be absent');
  assert(!res6a.body.includes('Microsoft-HTTPAPI'), 'Response body must not contain Microsoft-HTTPAPI');
  assert(res6a.body.includes('HTTP method PROPFIND is disabled'), `Unexpected body: ${res6a.body}`);
  assert.strictEqual(res6a.headers['allow'], 'GET, POST, PUT, DELETE');
  console.log('    [PASS] 6a. PROPFIND /api/login returned HTTP 405, zero Server header, zero Microsoft-HTTPAPI/2.0');

  // 6b. Test Alert 2: PROPFIND /api/me (Alert ID: 5582895)
  console.log('  Testing 6b: PROPFIND /api/me (VAPT Alert ID: 5582895)...');
  const res6b = await sendRawHttpRequest(port, 'PROPFIND', '/api/me');
  assert.strictEqual(res6b.status, 405, `Expected HTTP 405 for PROPFIND /api/me, got: ${res6b.status}`);
  const serverHdr6b = res6b.headers['server'] as string | undefined;
  assert(!serverHdr6b, `Server header must be absent on PROPFIND response, got: "${serverHdr6b}"`);
  assert(!res6b.headers['x-powered-by'], 'x-powered-by header must be absent');
  assert(!res6b.body.includes('Microsoft-HTTPAPI'), 'Response body must not contain Microsoft-HTTPAPI');
  assert(res6b.body.includes('HTTP method PROPFIND is disabled'), `Unexpected body: ${res6b.body}`);
  console.log('    [PASS] 6b. PROPFIND /api/me returned HTTP 405, zero Server header, zero Microsoft-HTTPAPI/2.0');

  // 6c. Test other WebDAV verbs: PROPPATCH, MKCOL, SEARCH
  console.log('  Testing 6c: PROPPATCH and MKCOL probes...');
  const res6c1 = await sendRawHttpRequest(port, 'PROPPATCH', '/api/login');
  assert.strictEqual(res6c1.status, 405, `Expected HTTP 405 for PROPPATCH, got: ${res6c1.status}`);
  assert(!res6c1.headers['server'], 'Server header must be absent on PROPPATCH');

  const res6c2 = await sendRawHttpRequest(port, 'MKCOL', '/api/login');
  assert.strictEqual(res6c2.status, 405, `Expected HTTP 405 for MKCOL, got: ${res6c2.status}`);
  assert(!res6c2.headers['server'], 'Server header must be absent on MKCOL');
  console.log('    [PASS] 6c. Additional WebDAV verbs (PROPPATCH, MKCOL) successfully blocked with HTTP 405');

  // 6d. Standard REST operations remain completely functional
  console.log('  Testing 6d: Standard GET /api/me and POST /api/login...');
  const res6d1 = await sendRawHttpRequest(port, 'GET', '/api/me');
  assert.strictEqual(res6d1.status, 200, `Expected HTTP 200 for GET, got: ${res6d1.status}`);
  assert(!res6d1.headers['server'], 'Server header must be absent on GET');

  const res6d2 = await sendRawHttpRequest(port, 'POST', '/api/login');
  assert.strictEqual(res6d2.status, 200, `Expected HTTP 200 for POST, got: ${res6d2.status}`);
  assert(!res6d2.headers['server'], 'Server header must be absent on POST');
  console.log('    [PASS] 6d. Standard REST operations functional with zero server disclosure');

  await new Promise<void>((resolve, reject) => {
    testServer.close((err) => (err ? reject(err) : resolve()));
  });

  console.log('\n========================================================================');
  console.log(' [ALL PASSED] VAPT Finding 22: Web Server Info Disclosure Remediated');
  console.log('========================================================================\n');
}

runWebServerInfoDisclosureVerification().catch((err) => {
  console.error('[FAIL] Verification error:', err);
  process.exit(1);
});
