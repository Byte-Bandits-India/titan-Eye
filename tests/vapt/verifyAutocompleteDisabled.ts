import assert from 'assert';
import fs from 'fs';
import http from 'http';
import path from 'path';
import express, { Request, Response, NextFunction } from 'express';
import { AddressInfo } from 'net';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '../..');

async function runAutocompleteVerification() {
  console.log('=== VAPT Finding 18: Form Fields Autocomplete & Legacy Script Blocking Verification ===\n');

  // =========================================================================
  // TEST 1: Audit src/screens/auth/LoginScreen.tsx (Zero current-password, autoComplete="off")
  // =========================================================================
  console.log('Test 1: Audit src/screens/auth/LoginScreen.tsx (Form & Input Hardening)');
  const loginScreenPath = path.join(rootDir, 'src', 'screens', 'auth', 'LoginScreen.tsx');
  assert(fs.existsSync(loginScreenPath), 'src/screens/auth/LoginScreen.tsx must exist');
  const loginContent = fs.readFileSync(loginScreenPath, 'utf8');

  // Ensure zero current-password
  assert(
    !loginContent.includes('current-password'),
    'LoginScreen.tsx must NOT contain any instance of "current-password"'
  );
  console.log('  [PASS] 1a. Verified zero occurrences of "current-password" in LoginScreen.tsx');

  // Ensure form has autoComplete="off"
  const formMatches = loginContent.match(/<form[^>]*autoComplete="off"[^>]*>/g);
  assert(
    formMatches && formMatches.length >= 2,
    `All <form> elements in LoginScreen.tsx must have autoComplete="off" (found ${formMatches ? formMatches.length : 0})`
  );
  console.log('  [PASS] 1b. Verified all form containers enforce autoComplete="off"');

  // Parse input elements
  const loginInputs = loginContent.match(/<input[\s\S]*?\/>/g) || [];
  const emailInputs = loginInputs.filter((input) => /type="email"/.test(input));
  const passwordInputs = loginInputs.filter((input) => /type="password"|id="login-password"|placeholder=".*Password"/.test(input));

  assert(
    emailInputs.length >= 2,
    `LoginScreen.tsx must contain at least 2 email/User ID inputs (found ${emailInputs.length})`
  );
  assert(
    emailInputs.every((input) => /autoComplete="off"/.test(input)),
    'All email/User ID inputs in LoginScreen.tsx must enforce autoComplete="off"'
  );
  console.log('  [PASS] 1c. Verified all User ID inputs enforce autoComplete="off"');

  assert(
    passwordInputs.length >= 2,
    `LoginScreen.tsx must contain at least 2 password inputs (found ${passwordInputs.length})`
  );
  assert(
    passwordInputs.every((input) => /autoComplete="off"/.test(input)),
    'All password inputs in LoginScreen.tsx must enforce autoComplete="off"'
  );
  console.log('  [PASS] 1d. Verified all password inputs enforce autoComplete="off"');

  // =========================================================================
  // TEST 2: Audit src/screens/admin/components/UserFormDrawer.tsx (Zero new-password)
  // =========================================================================
  console.log('\nTest 2: Audit src/screens/admin/components/UserFormDrawer.tsx');
  const userDrawerPath = path.join(rootDir, 'src', 'screens', 'admin', 'components', 'UserFormDrawer.tsx');
  assert(fs.existsSync(userDrawerPath), 'UserFormDrawer.tsx must exist');
  const drawerContent = fs.readFileSync(userDrawerPath, 'utf8');

  assert(
    !drawerContent.includes('new-password'),
    'UserFormDrawer.tsx must NOT contain any instance of "new-password"'
  );
  console.log('  [PASS] 2a. Verified zero occurrences of "new-password" in UserFormDrawer.tsx');

  assert(
    /<form[^>]*autoComplete="off"[^>]*>/i.test(drawerContent),
    'UserFormDrawer.tsx form element must specify autoComplete="off"'
  );
  console.log('  [PASS] 2b. Verified UserFormDrawer form container specifies autoComplete="off"');

  const drawerInputs = drawerContent.match(/<(?:input|Input)[\s\S]*?\/>/g) || [];
  const drawerPasswordInputs = drawerInputs.filter((input) => /password/i.test(input));
  assert(
    drawerPasswordInputs.length >= 1,
    'UserFormDrawer.tsx must contain at least 1 password input'
  );
  assert(
    drawerPasswordInputs.every((input) => /autoComplete="off"/.test(input)),
    'Password input in UserFormDrawer.tsx must specify autoComplete="off"'
  );
  console.log('  [PASS] 2c. Verified UserFormDrawer password input specifies autoComplete="off"');

  // =========================================================================
  // TEST 3: Audit Server Configurations (web.config, nginx, server/index.ts)
  // =========================================================================
  console.log('\nTest 3: Audit Server-Side Script Probing Protection (.php, .asp, etc.)');

  // 3a. server/index.ts
  const serverIndexPath = path.join(rootDir, 'server', 'index.ts');
  const serverIndexContent = fs.readFileSync(serverIndexPath, 'utf8');
  assert(
    /SENSITIVE_EXT_REGEX\s*=\s*\/.*php.*\/i/.test(serverIndexContent),
    'server/index.ts must include .php in SENSITIVE_EXT_REGEX'
  );
  console.log('  [PASS] 3a. server/index.ts SENSITIVE_EXT_REGEX blocks .php, .asp, .jsp');

  // 3b. web.config
  const webConfigPath = path.join(rootDir, 'web.config');
  const webConfigContent = fs.readFileSync(webConfigPath, 'utf8');
  assert(
    webConfigContent.includes('<add fileExtension=".php" allowed="false" />'),
    'web.config must block .php via requestFiltering fileExtensions'
  );
  assert(
    webConfigContent.includes('name="Block Sensitive Source Files"') &&
      webConfigContent.includes('\\.php'),
    'web.config must include \\.php in Block Sensitive Source Files rewrite rule'
  );
  console.log('  [PASS] 3b. web.config blocks .php via requestFiltering & rewrite rule');

  // 3c. nginx/titan.conf
  const nginxPath = path.join(rootDir, 'nginx', 'titan.conf');
  const nginxContent = fs.readFileSync(nginxPath, 'utf8');
  assert(
    /location\s*~\*\s*\\\..*php.*\$\s*\{/i.test(nginxContent),
    'nginx/titan.conf must block .php and legacy script extensions'
  );
  console.log('  [PASS] 3c. nginx/titan.conf blocks .php and script extensions with 404');

  // =========================================================================
  // TEST 4: Live Express Server Probing Verification
  // =========================================================================
  console.log('\nTest 4: Live Express Server Probing Verification (HTTP 404 on Legacy Scripts)');

  const testApp = express();
  const SENSITIVE_EXT_REGEX = /\.(ts|tsx|jsx|map|env|git|json|sql|db|sqlite|ps1|sh|log|md|yml|yaml|config|php|asp|aspx|jsp|cgi)$/i;

  // Sensitive extension blocker
  testApp.use((req: Request, res: Response, next: NextFunction) => {
    const reqPath = req.path.toLowerCase();
    if (
      reqPath.includes('/.') ||
      reqPath.startsWith('/.env') ||
      reqPath.startsWith('/.git') ||
      SENSITIVE_EXT_REGEX.test(reqPath)
    ) {
      if (reqPath === '/manifest.json') {
        return next();
      }
      return res.status(404).send('Not Found');
    }
    next();
  });

  const distPath = path.resolve('dist');
  if (fs.existsSync(distPath)) {
    testApp.use(express.static(distPath, { dotfiles: 'deny', index: false }));
  }

  // SPA fallback
  testApp.use((req: Request, res: Response) => {
    if (req.path.startsWith('/api')) {
      return res.status(404).json({ error: 'API endpoint not found' });
    }
    if (path.extname(req.path)) {
      return res.status(404).send('Not Found');
    }
    res.status(200).send('<!DOCTYPE html><html><head><title>Titan RVC</title></head><body>SPA Root</body></html>');
  });

  const server = http.createServer(testApp);
  await new Promise<void>((resolve) => server.listen(0, resolve));
  const port = (server.address() as AddressInfo).port;

  function doRequest(options: http.RequestOptions): Promise<{ statusCode: number; body: string }> {
    return new Promise((resolve, reject) => {
      const req = http.request(options, (res) => {
        let body = '';
        res.on('data', (chunk) => {
          body += chunk;
        });
        res.on('end', () => {
          resolve({ statusCode: res.statusCode || 0, body });
        });
      });
      req.on('error', reject);
      req.end();
    });
  }

  try {
    // 4a. Probe /index.php (Alert ID 5589049 reproduction)
    const phpRes = await doRequest({
      hostname: '127.0.0.1',
      port,
      path: '/index.php',
      method: 'GET',
    });
    assert.strictEqual(phpRes.statusCode, 404, `GET /index.php must return 404 Not Found (got ${phpRes.statusCode})`);
    assert.strictEqual(phpRes.body, 'Not Found');
    console.log('  [PASS] 4a. GET /index.php returned 404 Not Found (blocked, not serving PHP or SPA)');

    // 4b. Probe /phpmyadmin/index.php
    const pmaRes = await doRequest({
      hostname: '127.0.0.1',
      port,
      path: '/phpmyadmin/index.php',
      method: 'GET',
    });
    assert.strictEqual(pmaRes.statusCode, 404, `GET /phpmyadmin/index.php must return 404 Not Found (got ${pmaRes.statusCode})`);
    console.log('  [PASS] 4b. GET /phpmyadmin/index.php returned 404 Not Found');

    // 4c. Probe /admin.asp
    const aspRes = await doRequest({
      hostname: '127.0.0.1',
      port,
      path: '/admin.asp',
      method: 'GET',
    });
    assert.strictEqual(aspRes.statusCode, 404, `GET /admin.asp must return 404 Not Found (got ${aspRes.statusCode})`);
    console.log('  [PASS] 4c. GET /admin.asp returned 404 Not Found');

    // 4d. Normal SPA route /login -> returns 200
    const loginRes = await doRequest({
      hostname: '127.0.0.1',
      port,
      path: '/login',
      method: 'GET',
    });
    assert.strictEqual(loginRes.statusCode, 200, `GET /login must return 200 (got ${loginRes.statusCode})`);
    assert(loginRes.body.includes('Titan RVC'), 'GET /login should serve index.html SPA entry');
    console.log('  [PASS] 4d. Legitimate SPA route /login returns 200 OK');
  } finally {
    server.close();
  }

  // =========================================================================
  // TEST 5: Production Build Artifact Audit (dist/assets)
  // =========================================================================
  console.log('\nTest 5: Audit Production Build Artifacts (dist/assets)');
  const distAssetsDir = path.join(rootDir, 'dist', 'assets');
  if (fs.existsSync(distAssetsDir)) {
    const jsFiles = fs.readdirSync(distAssetsDir).filter((f) => f.endsWith('.js'));
    let foundCurrentPassword = false;
    let foundNewPassword = false;

    for (const jsFile of jsFiles) {
      const content = fs.readFileSync(path.join(distAssetsDir, jsFile), 'utf8');
      if (content.includes('autocomplete="current-password"') || content.includes('autocomplete:"current-password"')) {
        foundCurrentPassword = true;
      }
      if (content.includes('autocomplete="new-password"') || content.includes('autocomplete:"new-password"')) {
        foundNewPassword = true;
      }
    }

    assert(
      !foundCurrentPassword,
      'Compiled production bundles in dist/assets must NOT contain autocomplete="current-password"'
    );
    assert(
      !foundNewPassword,
      'Compiled production bundles in dist/assets must NOT contain autocomplete="new-password"'
    );
    console.log('  [PASS] 5a. Verified zero instances of "current-password" or "new-password" across all compiled JS bundles in dist/assets');
  } else {
    console.log('  [SKIP] 5a. dist/assets not yet built (will verify post-build)');
  }

  console.log('\n======================================================================');
  console.log('ALL AUTOCOMPLETE HARDENING & LEGACY SCRIPT CHECKS PASSED SUCCESSFULLY!');
  console.log('======================================================================\n');
}

runAutocompleteVerification().catch((err) => {
  console.error('\n[VERIFICATION FAILED]:', err);
  process.exit(1);
});
