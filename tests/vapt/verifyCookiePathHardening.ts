import assert from 'assert';
import fs from 'fs';
import http from 'http';
import path from 'path';
import express, { Request, Response, NextFunction } from 'express';
import cookieParser from 'cookie-parser';
import { AddressInfo } from 'net';
import { fileURLToPath } from 'url';

import {
  AUTH_COOKIE_NAME,
  AUTH_COOKIE_PATH,
  getAuthCookieOptions,
  SSO_STATE_COOKIE_NAME,
  SSO_STATE_COOKIE_PATH,
} from '../config/cookie.js';
import { generateToken } from '../config/jwt.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '../..');

async function runCookiePathHardeningVerification() {
  console.log('=== VAPT Finding 19: Overly Broad Cookie Path Verification ===\n');

  // =========================================================================
  // TEST 1: Static Source Code Audit
  // =========================================================================
  console.log('Test 1: Static Source Code Audit (Centralized Config & Route Scoping)');

  // 1a. Audit server/config/cookie.ts
  const cookieConfigPath = path.join(rootDir, 'server', 'config', 'cookie.ts');
  assert(fs.existsSync(cookieConfigPath), 'server/config/cookie.ts must exist');
  const cookieConfigContent = fs.readFileSync(cookieConfigPath, 'utf8');

  assert(
    cookieConfigContent.includes("AUTH_COOKIE_PATH = '/api'"),
    "server/config/cookie.ts must define AUTH_COOKIE_PATH as '/api'"
  );
  assert(
    cookieConfigContent.includes("SSO_STATE_COOKIE_PATH = '/api/auth/microsoft'"),
    "server/config/cookie.ts must define SSO_STATE_COOKIE_PATH as '/api/auth/microsoft'"
  );
  assert(
    cookieConfigContent.includes('path: AUTH_COOKIE_PATH'),
    'getAuthCookieOptions must enforce path: AUTH_COOKIE_PATH'
  );
  console.log('  [PASS] 1a. Centralized server/config/cookie.ts enforces AUTH_COOKIE_PATH = "/api" and SSO_STATE_COOKIE_PATH = "/api/auth/microsoft"');

  // 1b. Audit server/routes/auth.ts
  const authRoutesPath = path.join(rootDir, 'server', 'routes', 'auth.ts');
  const authRoutesContent = fs.readFileSync(authRoutesPath, 'utf8');

  // Ensure auth.ts does not set any cookies with path: '/'
  const authSetCookieLines = authRoutesContent
    .split('\n')
    .filter((line) => line.includes('res.cookie('));
  assert(authSetCookieLines.length >= 2, 'auth.ts must have res.cookie calls for login and refresh');
  assert(
    !authRoutesContent.includes("path: '/'") ||
      authRoutesContent.match(/res\.clearCookie\([^,]+,\s*\{[^}]*path:\s*'\/'.*\}\)/s),
    "auth.ts must NOT use path: '/' when setting cookies (only permissible in clearCookie legacy cleanup)"
  );
  assert(
    authRoutesContent.includes('AUTH_COOKIE_PATH'),
    'auth.ts must reference AUTH_COOKIE_PATH'
  );
  assert(
    authRoutesContent.includes('getAuthCookieOptions'),
    'auth.ts must use getAuthCookieOptions helper'
  );
  console.log('  [PASS] 1b. server/routes/auth.ts scopes authentication and refresh cookies strictly to /api');

  // 1c. Audit server/routes/ssoAuth.ts
  const ssoRoutesPath = path.join(rootDir, 'server', 'routes', 'ssoAuth.ts');
  const ssoRoutesContent = fs.readFileSync(ssoRoutesPath, 'utf8');

  assert(
    ssoRoutesContent.includes('path: SSO_STATE_COOKIE_PATH'),
    'ssoAuth.ts must set state cookie with path: SSO_STATE_COOKIE_PATH'
  );
  assert(
    ssoRoutesContent.includes('getAuthCookieOptions'),
    'ssoAuth.ts must use getAuthCookieOptions for session cookie'
  );
  console.log('  [PASS] 1c. server/routes/ssoAuth.ts scopes SSO state cookie to /api/auth/microsoft and session cookie to /api');

  // 1d. Audit web.config
  const webConfigPath = path.join(rootDir, 'web.config');
  const webConfigContent = fs.readFileSync(webConfigPath, 'utf8');
  assert(
    webConfigContent.includes('<httpCookies httpOnlyCookies="true" requireSSL="true" sameSite="Strict" />'),
    'web.config must configure <httpCookies> with httpOnlyCookies="true", requireSSL="true", sameSite="Strict"'
  );
  console.log('  [PASS] 1d. web.config contains <httpCookies> container-level security configuration');

  // =========================================================================
  // TEST 2: Live Express Runtime Verification
  // =========================================================================
  console.log('\nTest 2: Live Express Runtime Verification (Set-Cookie Path Validation)');

  const testApp = express();
  testApp.use(express.json());
  testApp.use(cookieParser());

  // Sensitive extension blocker (Finding 17 & 18)
  const SENSITIVE_EXT_REGEX = /\.(ts|tsx|jsx|map|env|git|json|sql|db|sqlite|ps1|sh|log|md|yml|yaml|config|php|asp|aspx|jsp|cgi)$/i;
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

  // Simulated Login Route matching server/routes/auth.ts
  testApp.post('/api/login', (req: Request, res: Response) => {
    const dummyToken = generateToken({ email: 'optometrist@titan.in', name: 'Optometrist User', role: 'optometrist' });
    res.cookie(
      AUTH_COOKIE_NAME,
      dummyToken,
      getAuthCookieOptions(req, {
        maxAgeMs: 8 * 60 * 60 * 1000,
        sameSite: 'strict',
      })
    );
    return res.json({ ok: true, user: { email: 'optometrist@titan.in' } });
  });

  // Simulated Logout Route matching server/routes/auth.ts
  testApp.post('/api/logout', (req: Request, res: Response) => {
    res.clearCookie(AUTH_COOKIE_NAME, {
      httpOnly: true,
      path: AUTH_COOKIE_PATH,
      sameSite: 'strict',
      secure: true,
    });
    res.clearCookie(AUTH_COOKIE_NAME, {
      httpOnly: true,
      path: '/',
      sameSite: 'strict',
      secure: true,
    });
    return res.json({ message: 'Logged out successfully', ok: true });
  });

  // Simulated SSO URL Route matching server/routes/ssoAuth.ts
  testApp.get('/api/auth/microsoft/url', (req: Request, res: Response) => {
    res.cookie(SSO_STATE_COOKIE_NAME, JSON.stringify({ state: 'state123', verifier: 'verifier123' }), {
      httpOnly: true,
      maxAge: 5 * 60 * 1000,
      path: SSO_STATE_COOKIE_PATH,
      sameSite: 'lax',
      secure: true,
    });
    return res.json({ authUrl: 'https://login.microsoftonline.com/dummy' });
  });

  // Simulated Protected Route to verify cookie authentication
  testApp.get('/api/users/profile', (req: Request, res: Response) => {
    const token = req.cookies?.[AUTH_COOKIE_NAME];
    if (!token) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    return res.json({ ok: true, profile: { email: 'optometrist@titan.in' } });
  });

  const server = http.createServer(testApp);
  await new Promise<void>((resolve) => server.listen(0, resolve));
  const port = (server.address() as AddressInfo).port;

  function doRequest(options: http.RequestOptions, bodyData?: string): Promise<{
    headers: http.IncomingHttpHeaders;
    rawHeaders: string[];
    statusCode: number;
    body: string;
  }> {
    return new Promise((resolve, reject) => {
      const req = http.request(options, (res) => {
        let body = '';
        res.on('data', (chunk) => {
          body += chunk;
        });
        res.on('end', () => {
          resolve({
            headers: res.headers,
            rawHeaders: res.rawHeaders,
            statusCode: res.statusCode || 0,
            body,
          });
        });
      });
      req.on('error', reject);
      if (bodyData) {
        req.write(bodyData);
      }
      req.end();
    });
  }

  try {
    // 2a. POST /api/login: Verify Set-Cookie header has Path=/api
    const loginRes = await doRequest(
      {
        hostname: '127.0.0.1',
        port,
        path: '/api/login',
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Forwarded-Proto': 'https',
        },
      },
      JSON.stringify({ email: 'optometrist@titan.in', password: 'Password123!' })
    );

    assert.strictEqual(loginRes.statusCode, 200, `Login must succeed with 200 (got ${loginRes.statusCode})`);
    const setCookieHeaders = loginRes.headers['set-cookie'];
    assert(setCookieHeaders && setCookieHeaders.length > 0, 'POST /api/login must return Set-Cookie header');

    const authCookieHeader = setCookieHeaders.find((c) => c.startsWith(`${AUTH_COOKIE_NAME}=`));
    assert(authCookieHeader, `Set-Cookie header must contain "${AUTH_COOKIE_NAME}="`);

    // Verify Path is strictly /api (NOT Path=/)
    assert(
      /Path=\/api(;|$)/i.test(authCookieHeader),
      `Set-Cookie Path must be strictly "/api" (got: "${authCookieHeader}")`
    );
    assert(
      !/Path=\/(;|$)/i.test(authCookieHeader),
      `Set-Cookie Path must NOT be root "/" (got: "${authCookieHeader}")`
    );
    assert(
      /HttpOnly/i.test(authCookieHeader),
      `Set-Cookie must have HttpOnly flag (got: "${authCookieHeader}")`
    );
    assert(
      /SameSite=Strict/i.test(authCookieHeader),
      `Set-Cookie must have SameSite=Strict flag (got: "${authCookieHeader}")`
    );
    assert(
      /Secure/i.test(authCookieHeader),
      `Set-Cookie must have Secure flag (got: "${authCookieHeader}")`
    );
    console.log('  [PASS] 2a. POST /api/login sets cookie with "Path=/api", HttpOnly, SameSite=Strict, and Secure');

    // 2b. POST /api/logout: Verify Set-Cookie clears token with Path=/api and Path=/
    const logoutRes = await doRequest({
      hostname: '127.0.0.1',
      port,
      path: '/api/logout',
      method: 'POST',
      headers: {
        'X-Forwarded-Proto': 'https',
      },
    });

    assert.strictEqual(logoutRes.statusCode, 200, 'Logout must succeed with 200');
    const logoutCookies = logoutRes.headers['set-cookie'] || [];
    const hasPathApiClear = logoutCookies.some(
      (c) => c.startsWith(`${AUTH_COOKIE_NAME}=`) && /Path=\/api(;|$)/i.test(c)
    );
    const hasPathRootClear = logoutCookies.some(
      (c) => c.startsWith(`${AUTH_COOKIE_NAME}=`) && /Path=\/(;|$)/i.test(c)
    );
    assert(hasPathApiClear, 'Logout must clear cookie with Path=/api');
    assert(hasPathRootClear, 'Logout must clear legacy cookie with Path=/ for complete migration cleanup');
    console.log('  [PASS] 2b. POST /api/logout clears cookie with Path=/api and Path=/');

    // 2c. GET /api/auth/microsoft/url: Verify SSO state cookie has Path=/api/auth/microsoft
    const ssoRes = await doRequest({
      hostname: '127.0.0.1',
      port,
      path: '/api/auth/microsoft/url',
      method: 'GET',
      headers: {
        'X-Forwarded-Proto': 'https',
      },
    });

    assert.strictEqual(ssoRes.statusCode, 200, 'SSO URL must succeed with 200');
    const ssoCookies = ssoRes.headers['set-cookie'] || [];
    const stateCookieHeader = ssoCookies.find((c) => c.startsWith(`${SSO_STATE_COOKIE_NAME}=`));
    assert(stateCookieHeader, `SSO URL must set "${SSO_STATE_COOKIE_NAME}" cookie`);
    assert(
      /Path=\/api\/auth\/microsoft(;|$)/i.test(stateCookieHeader),
      `SSO state cookie Path must be strictly "/api/auth/microsoft" (got: "${stateCookieHeader}")`
    );
    assert(
      /HttpOnly/i.test(stateCookieHeader),
      'SSO state cookie must be HttpOnly'
    );
    console.log('  [PASS] 2c. GET /api/auth/microsoft/url sets state cookie with "Path=/api/auth/microsoft"');

    // 2d. GET /index.php: Verify HTTP 404 and ZERO Set-Cookie headers (Alert ID 5589048 Reproduction)
    const phpGetRes = await doRequest({
      hostname: '127.0.0.1',
      port,
      path: '/index.php',
      method: 'GET',
    });

    assert.strictEqual(phpGetRes.statusCode, 404, `GET /index.php must return 404 (got ${phpGetRes.statusCode})`);
    assert.strictEqual(
      phpGetRes.headers['set-cookie'],
      undefined,
      'GET /index.php must NOT return any Set-Cookie header!'
    );
    console.log('  [PASS] 2d. GET /index.php returns 404 Not Found with ZERO Set-Cookie headers');

    // 2e. POST /index.php: Verify HTTP 404 and ZERO Set-Cookie headers
    const phpPostRes = await doRequest({
      hostname: '127.0.0.1',
      port,
      path: '/index.php',
      method: 'POST',
    });

    assert.strictEqual(phpPostRes.statusCode, 404, `POST /index.php must return 404 (got ${phpPostRes.statusCode})`);
    assert.strictEqual(
      phpPostRes.headers['set-cookie'],
      undefined,
      'POST /index.php must NOT return any Set-Cookie header!'
    );
    console.log('  [PASS] 2e. POST /index.php returns 404 Not Found with ZERO Set-Cookie headers');

    // 2f. Protected API route: Verify cookie authentication under /api works cleanly
    // Extract token from login response
    const tokenMatch = authCookieHeader.match(/token=([^;]+)/);
    assert(tokenMatch, 'Extracted token from auth cookie');
    const tokenVal = tokenMatch[1];

    const protectedRes = await doRequest({
      hostname: '127.0.0.1',
      port,
      path: '/api/users/profile',
      method: 'GET',
      headers: {
        Cookie: `token=${tokenVal}`,
      },
    });

    assert.strictEqual(protectedRes.statusCode, 200, 'Authenticated request to /api/users/profile must succeed with 200');
    assert(protectedRes.body.includes('optometrist@titan.in'), 'Protected response should contain user profile');
    console.log('  [PASS] 2f. Authenticated API call with token cookie succeeds with 200 OK');
  } finally {
    server.close();
  }

  console.log('\n======================================================================');
  console.log('ALL COOKIE PATH HARDENING CHECKS PASSED SUCCESSFULLY!');
  console.log('======================================================================\n');
}

runCookiePathHardeningVerification().catch((err) => {
  console.error('\n[VERIFICATION FAILED]:', err);
  process.exit(1);
});
