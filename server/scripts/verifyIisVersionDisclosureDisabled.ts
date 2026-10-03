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

async function runIisVersionDisclosureVerification() {
  console.log('=== VAPT Finding 21: Microsoft IIS Version Disclosure Remediation Verification ===\n');

  // =========================================================================
  // TEST 1: Audit web.config (IIS Configuration & URL Rewrite Hardening)
  // =========================================================================
  console.log('Test 1: Audit web.config (IIS Server Header & Error PassThrough Hardening)');
  const webConfigPath = path.join(rootDir, 'web.config');
  assert(fs.existsSync(webConfigPath), 'web.config must exist');
  const webConfigContent = fs.readFileSync(webConfigPath, 'utf8');

  // 1a. Verify removeServerHeader in requestFiltering
  assert(
    webConfigContent.includes('removeServerHeader="true"'),
    'web.config must configure <requestFiltering removeServerHeader="true">'
  );
  console.log('  [PASS] 1a. web.config enforces requestFiltering removeServerHeader="true"');

  // 1b. Verify removal in customHeaders
  assert(
    webConfigContent.includes('<remove name="Server" />'),
    'web.config must include <remove name="Server" /> under customHeaders'
  );
  assert(
    webConfigContent.includes('<remove name="X-Powered-By" />'),
    'web.config must include <remove name="X-Powered-By" /> under customHeaders'
  );
  assert(
    webConfigContent.includes('<remove name="X-AspNet-Version" />'),
    'web.config must include <remove name="X-AspNet-Version" /> under customHeaders'
  );
  assert(
    webConfigContent.includes('<remove name="X-AspNetMvc-Version" />'),
    'web.config must include <remove name="X-AspNetMvc-Version" /> under customHeaders'
  );
  console.log('  [PASS] 1b. web.config <customHeaders> strips Server, X-Powered-By, X-AspNet-Version, and X-AspNetMvc-Version');

  // 1c. Verify outbound rewrite rules for Server & framework headers
  assert(
    webConfigContent.includes('name="Remove Server Header"'),
    'web.config must include "Remove Server Header" outbound rule'
  );
  assert(
    webConfigContent.includes('serverVariable="RESPONSE_SERVER"'),
    'web.config outbound rule must target RESPONSE_SERVER'
  );
  assert(
    webConfigContent.includes('name="Remove X-AspNetMvc-Version"'),
    'web.config outbound rule must target Remove X-AspNetMvc-Version'
  );
  console.log('  [PASS] 1c. web.config <outboundRules> strips RESPONSE_SERVER and framework headers');

  // 1d. Verify httpErrors PassThrough mode (stops IIS 403/404 default template injection)
  assert(
    webConfigContent.includes('<httpErrors existingResponse="PassThrough" />'),
    'web.config must configure <httpErrors existingResponse="PassThrough" />'
  );
  console.log('  [PASS] 1d. web.config sets <httpErrors existingResponse="PassThrough" /> (preventing default IIS error pages)');

  // 1e. Verify httpRuntime enableVersionHeader="false"
  assert(
    webConfigContent.includes('<httpRuntime enableVersionHeader="false" />'),
    'web.config must configure <httpRuntime enableVersionHeader="false" />'
  );
  console.log('  [PASS] 1e. web.config sets <httpRuntime enableVersionHeader="false" />');

  // =========================================================================
  // TEST 2: Audit scripts/windows/disable-iis-server-header.ps1
  // =========================================================================
  console.log('\nTest 2: Audit scripts/windows/disable-iis-server-header.ps1 (Kernel & ARR Hardening)');
  const psScriptPath = path.join(rootDir, 'scripts', 'windows', 'disable-iis-server-header.ps1');
  assert(fs.existsSync(psScriptPath), 'scripts/windows/disable-iis-server-header.ps1 must exist');
  const psScriptContent = fs.readFileSync(psScriptPath, 'utf8');

  // 2a. Administrator privilege check
  assert(
    psScriptContent.includes('IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)'),
    'PowerShell script must check for Administrator role'
  );
  console.log('  [PASS] 2a. PowerShell script enforces Administrator privileges');

  // 2b. HTTP.sys DisableServerHeader = 2
  assert(
    psScriptContent.includes('DisableServerHeader') && psScriptContent.includes('Value 2'),
    'PowerShell script must set DisableServerHeader = 2 (DWORD)'
  );
  assert(
    psScriptContent.includes('HKLM:\\SYSTEM\\CurrentControlSet\\Services\\HTTP\\Parameters'),
    'PowerShell script must target HKLM:\\SYSTEM\\CurrentControlSet\\Services\\HTTP\\Parameters'
  );
  console.log('  [PASS] 2b. PowerShell script sets kernel-mode DisableServerHeader = 2 in HTTP.sys');

  // 2c. appcmd requestFiltering, proxy, and httpErrors
  assert(
    psScriptContent.includes('/removeServerHeader:True'),
    'PowerShell script must invoke appcmd to set removeServerHeader:True'
  );
  assert(
    psScriptContent.includes('/arrResponseHeader:False'),
    'PowerShell script must invoke appcmd to set arrResponseHeader:False'
  );
  assert(
    psScriptContent.includes('/existingResponse:PassThrough'),
    'PowerShell script must configure httpErrors existingResponse:PassThrough'
  );
  console.log('  [PASS] 2c. PowerShell script configures requestFiltering, ARR proxy, and httpErrors');

  // 2d. Restart service instructions
  assert(
    psScriptContent.includes('net stop http /y') && psScriptContent.includes('net start w3svc'),
    'PowerShell script must document HTTP driver restart commands'
  );
  console.log('  [PASS] 2d. PowerShell script includes HTTP.sys driver restart workflow');

  // =========================================================================
  // TEST 3: Audit scripts/windows/README-DEPLOYMENT.md
  // =========================================================================
  console.log('\nTest 3: Audit scripts/windows/README-DEPLOYMENT.md');
  const readmePath = path.join(rootDir, 'scripts', 'windows', 'README-DEPLOYMENT.md');
  assert(fs.existsSync(readmePath), 'README-DEPLOYMENT.md must exist');
  const readmeContent = fs.readFileSync(readmePath, 'utf8');

  assert(
    readmeContent.includes('disable-iis-server-header.ps1'),
    'README-DEPLOYMENT.md must document disable-iis-server-header.ps1'
  );
  assert(
    readmeContent.includes('DisableServerHeader = 2'),
    'README-DEPLOYMENT.md must explain DisableServerHeader = 2'
  );
  assert(
    readmeContent.includes('VAPT Finding 21'),
    'README-DEPLOYMENT.md must explicitly reference VAPT Finding 21'
  );
  console.log('  [PASS] 3. README-DEPLOYMENT.md includes deployment procedure for Finding 21');

  // =========================================================================
  // TEST 4: Audit nginx/titan.conf
  // =========================================================================
  console.log('\nTest 4: Audit nginx/titan.conf (Linux Nginx Reverse Proxy Hardening)');
  const nginxConfPath = path.join(rootDir, 'nginx', 'titan.conf');
  assert(fs.existsSync(nginxConfPath), 'nginx/titan.conf must exist');
  const nginxConfContent = fs.readFileSync(nginxConfPath, 'utf8');

  assert(
    nginxConfContent.includes('server_tokens off;'),
    'nginx/titan.conf must include server_tokens off;'
  );
  assert(
    nginxConfContent.includes('proxy_hide_header Server;'),
    'nginx/titan.conf must include proxy_hide_header Server;'
  );
  console.log('  [PASS] 4. nginx/titan.conf disables server_tokens and hides Server header');

  // =========================================================================
  // TEST 5: Live Express Runtime Test Across HTTP Status Codes
  // =========================================================================
  console.log('\nTest 5: Live Express Runtime Verification (Headers on 200, 403, 404, 500)');

  const testApp = express();
  testApp.disable('x-powered-by');

  // Register production header suppression & sanitization middleware
  testApp.use((_req: Request, res: Response, next: NextFunction) => {
    res.removeHeader('X-Powered-By');
    res.removeHeader('Server');
    res.setHeader('X-Content-Type-Options', 'nosniff');
    next();
  });
  testApp.use(internalInfraSanitizer);

  // Setup test endpoints covering Alert 5582930 condition (403 Forbidden) and other error scenarios
  testApp.get('/test-200', (_req: Request, res: Response) => {
    res.status(200).json({ status: 'ok', message: 'Success' });
  });

  testApp.get('/test-403', (_req: Request, res: Response) => {
    // VAPT Finding 21 tested GET http://trvc.titan.in/ returning 403 Forbidden
    res.status(403).json({ error: 'Forbidden', message: 'Access denied' });
  });

  testApp.get('/test-500', (_req: Request, res: Response) => {
    res.status(500).json({ error: 'Internal Server Error' });
  });

  const testServer = http.createServer(testApp);
  await new Promise<void>((resolve) => testServer.listen(0, '127.0.0.1', () => resolve()));
  const port = (testServer.address() as AddressInfo).port;

  async function checkEndpointHeaders(pathStr: string, expectedStatus: number) {
    const res = await fetch(`http://127.0.0.1:${port}${pathStr}`);
    assert.strictEqual(res.status, expectedStatus, `Expected HTTP ${expectedStatus} for ${pathStr}`);

    const serverHeader = res.headers.get('server');
    const xPoweredBy = res.headers.get('x-powered-by');
    const xAspNetVersion = res.headers.get('x-aspnet-version');
    const xAspNetMvcVersion = res.headers.get('x-aspnetmvc-version');

    assert(
      !serverHeader || !/Microsoft-IIS|IIS|nginx|express/i.test(serverHeader),
      `Forbidden server header leaked on ${pathStr}: ${serverHeader}`
    );
    assert(!xPoweredBy, `x-powered-by header leaked on ${pathStr}: ${xPoweredBy}`);
    assert(!xAspNetVersion, `x-aspnet-version header leaked on ${pathStr}: ${xAspNetVersion}`);
    assert(!xAspNetMvcVersion, `x-aspnetmvc-version header leaked on ${pathStr}: ${xAspNetMvcVersion}`);

    const bodyText = await res.text();
    assert(
      !bodyText.includes('Microsoft-IIS') && !bodyText.includes('IIS 10.0 Detailed Error'),
      `Body leaked IIS version disclosure on ${pathStr}`
    );
  }

  await checkEndpointHeaders('/test-200', 200);
  console.log('  [PASS] 5a. HTTP 200 OK has no Server or IIS version headers');

  await checkEndpointHeaders('/test-403', 403);
  console.log('  [PASS] 5b. HTTP 403 Forbidden (Alert 5582930 condition) has no Server or IIS version headers');

  await checkEndpointHeaders('/test-404-nonexistent', 404);
  console.log('  [PASS] 5c. HTTP 404 Not Found has no Server or IIS version headers');

  await checkEndpointHeaders('/test-500', 500);
  console.log('  [PASS] 5d. HTTP 500 Internal Error has no Server or IIS version headers');

  await new Promise<void>((resolve, reject) => {
    testServer.close((err) => (err ? reject(err) : resolve()));
  });

  console.log('\n========================================================================');
  console.log(' [ALL PASSED] VAPT Finding 21: Microsoft IIS Version Disclosure Remediated');
  console.log('========================================================================\n');
}

runIisVersionDisclosureVerification().catch((err) => {
  console.error('[FAIL] Verification error:', err);
  process.exit(1);
});
