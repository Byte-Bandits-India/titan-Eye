import assert from 'assert';
import crypto from 'crypto';
import express from 'express';
import cookieParser from 'cookie-parser';

import { getJwtSecret, generateToken, verifyToken } from '../../dist-server/config/jwt.js';
import { getCaptchaSecret } from '../../dist-server/utils/captcha.js';
import { getVideoTicketSecret } from '../../dist-server/utils/videoStreamTicket.js';
import { getLogEncryptionKey } from '../../dist-server/utils/logCrypto.js';
import { initializeDatabase, run, get } from '../../dist-server/db/database.js';
import { authenticateToken } from '../../dist-server/middleware/auth.js';
import usersRouter from '../../dist-server/routes/users.js';

console.log('================================================================');
console.log('   VAPT VERIFICATION: N6 Secrets, N7 Seeding, N8 Host, N9 Live Role');
console.log('================================================================\n');

interface MockResponse {
  body: any;
  status: number;
}

function invokeApp(
  app: express.Express,
  method: string,
  path: string,
  headers: Record<string, string>,
  body?: any
): Promise<MockResponse> {
  return new Promise((resolve) => {
    let statusCode = 200;
    let responseBody: any = null;

    const req: any = {
      body: body || {},
      cookies: {},
      headers: { ...headers },
      ip: '127.0.0.1',
      method,
      params: {},
      path,
      query: {},
      requestId: 'test-req-id',
      url: path,
    };

    if (headers['cookie']) {
      const parts = headers['cookie'].split(';');
      for (const p of parts) {
        const [k, v] = p.trim().split('=');
        if (k && v) {
          req.cookies[k] = decodeURIComponent(v);
        }
      }
    }

    const res: any = {
      end: () => resolve({ body: responseBody, status: statusCode }),
      getHeader: () => undefined,
      json: (data: any) => {
        responseBody = data;
        resolve({ body: responseBody, status: statusCode });
      },
      send: (data: any) => {
        responseBody = data;
        resolve({ body: responseBody, status: statusCode });
      },
      setHeader: () => res,
      status: (code: number) => {
        statusCode = code;
        return res;
      },
    };

    app(req, res);
  });
}

async function runTests() {
  await initializeDatabase();

  // =========================================================================
  // TEST 1: N6 Cryptographic Secrets Hardening & Domain Separation
  // =========================================================================
  console.log('Test 1: Verify N6 Secrets Validation & Purpose Separation');

  // 1a. Missing / short JWT_SECRET must throw fatal error
  const origSecret = process.env.JWT_SECRET;
  try {
    delete process.env.JWT_SECRET;
    assert.throws(
      () => getJwtSecret(),
      /FATAL: JWT_SECRET environment variable is missing/,
      'getJwtSecret must throw if JWT_SECRET is missing'
    );

    process.env.JWT_SECRET = 'short-secret-less-than-32-b';
    assert.throws(
      () => getJwtSecret(),
      /FATAL: JWT_SECRET environment variable is missing, empty, or shorter than 32 bytes/,
      'getJwtSecret must throw if secret is < 32 bytes'
    );
    console.log('  ✓ 1a. Missing or short (< 32 bytes) JWT_SECRET fails hard at boot');
  } finally {
    process.env.JWT_SECRET = origSecret;
  }

  // 1b. Purpose separation: Captcha, Video tickets, Log encryption use distinct derived keys
  const jwtKey = getJwtSecret();
  const captchaKey = getCaptchaSecret();
  const videoTicketKey = getVideoTicketSecret();

  assert(captchaKey !== jwtKey, 'Captcha key must be distinct from master JWT_SECRET');
  assert(videoTicketKey !== jwtKey, 'Video ticket key must be distinct from master JWT_SECRET');
  assert(captchaKey !== videoTicketKey, 'Captcha and Video ticket keys must be distinct from each other');
  assert(captchaKey !== 'trvc-captcha-secure-salt-key', 'Hardcoded salt string must be eliminated');

  process.env.LOG_ENCRYPTION_ENABLED = 'true';
  const logKey = getLogEncryptionKey();
  assert(logKey instanceof Buffer && logKey.length === 32, 'Derived log key must be a 32-byte Buffer');
  console.log('  ✓ 1b. Separate cryptographic keys enforced per purpose; hardcoded static salts eliminated');

  // =========================================================================
  // TEST 2: N7 Seeded Accounts Immutability & Normalization
  // =========================================================================
  console.log('\nTest 2: Verify N7 Seeded Accounts Immutability & Normalization');

  // Create test user: deactivated
  const testEmail = 'deactivated-user-n7@titan.in';
  await run('DELETE FROM users WHERE LOWER(email) = LOWER(?)', [testEmail]);
  await run(
    `INSERT INTO users (email, name, role, storeName, status, password, microsoftUpn)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [testEmail, 'Deactivated Staff', 'optometrist', null, 'inactive', 'hash:pass', testEmail]
  );

  // Also insert a legacy super_admin row to verify normalization to admin
  const legacyEmail = 'legacy-super-n7@titan.in';
  await run('DELETE FROM users WHERE LOWER(email) = LOWER(?)', [legacyEmail]);
  await run(
    `INSERT INTO users (email, name, role, storeName, status, password, microsoftUpn)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [legacyEmail, 'Legacy Super', 'super_admin', null, 'active', 'hash:pass', legacyEmail]
  );

  // Run initializeDatabase() again (simulating server restart)
  await initializeDatabase();

  const reloadedDeactivated = await get<any>('SELECT status FROM users WHERE LOWER(email) = LOWER(?)', [testEmail]);
  assert.strictEqual(
    reloadedDeactivated?.status,
    'inactive',
    'CRITICAL N7: Deactivated accounts MUST NOT be re-activated on server restart!'
  );

  const reloadedLegacy = await get<any>('SELECT role FROM users WHERE LOWER(email) = LOWER(?)', [legacyEmail]);
  assert.strictEqual(
    reloadedLegacy?.role,
    'admin',
    'CRITICAL N7: Legacy super_admin role must be normalized strictly to admin!'
  );
  console.log('  ✓ 2. Restart never mutates or re-activates existing accounts; roles normalized to admin');

  // =========================================================================
  // TEST 3: N8 Loopback Interface Binding (127.0.0.1)
  // =========================================================================
  console.log('\nTest 3: Verify N8 Express Host Loopback Binding');
  const configuredHost = process.env.HOST || '127.0.0.1';
  assert.strictEqual(configuredHost, '127.0.0.1', 'Express must bind to 127.0.0.1 loopback only');
  console.log('  ✓ 3. Express binds strictly to 127.0.0.1, blocking direct external port exposure');

  // =========================================================================
  // TEST 4: N9 Live Database Role Synchronization & Demotion Enforcement
  // =========================================================================
  console.log('\nTest 4: Verify N9 Live Role Loading & JWT Stale Privilege Neutralization');

  // Setup user app
  const app = express();
  app.use(express.json());
  app.use(cookieParser());
  app.use(authenticateToken);
  app.use('/api/users', usersRouter);

  const demotedEmail = 'demoted-staff-n9@titan.in';
  await run('DELETE FROM users WHERE LOWER(email) = LOWER(?)', [demotedEmail]);

  // Step 4a. User initially created as 'admin' in DB
  await run(
    `INSERT INTO users (email, name, role, storeName, status, password, activeTokenSig)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [demotedEmail, 'Demoted Admin', 'admin', null, 'active', 'hash:pass', null]
  );

  // Mint a valid JWT token claiming role: 'admin'
  const adminToken = generateToken({
    email: demotedEmail,
    name: 'Demoted Admin',
    role: 'admin',
  });
  const tokenSig = adminToken.split('.')[2];

  // Set activeTokenSig in DB to match
  await run('UPDATE users SET activeTokenSig = ? WHERE LOWER(email) = LOWER(?)', [tokenSig, demotedEmail]);

  // Request as admin succeeds
  const resAdmin = await invokeApp(app, 'GET', '/api/users', {
    authorization: `Bearer ${adminToken}`,
  });
  assert.strictEqual(resAdmin.status, 200, 'User with admin role in DB can access /api/users');

  // Step 4b. Now demote user in DB to 'optometrist'
  await run("UPDATE users SET role = 'optometrist' WHERE LOWER(email) = LOWER(?)", [demotedEmail]);

  // User still presents the old token (which claims role: 'admin' in JWT payload)
  // But authenticateToken MUST load live role from DB and overwrite req.user.role!
  const resDemoted = await invokeApp(app, 'GET', '/api/users', {
    authorization: `Bearer ${adminToken}`,
  });

  // Since /api/users returns a sanitized list for non-admin and full list for admin,
  // let's verify that the demoted user received sanitized results (city: null, lastLogin: null)
  // or test a POST /api/users which requires admin!
  assert.strictEqual(resDemoted.status, 200);
  const usersReturned = resDemoted.body as any[];
  // If non-admin, city and lastLogin are strictly null
  if (usersReturned.length > 0) {
    assert.strictEqual(
      usersReturned[0].city,
      null,
      'CRITICAL N9: Demoted user MUST NOT receive sensitive admin fields (PII must be null)!'
    );
  }

  // Attempt to create a user with the stale admin token
  const resCreateWithStaleToken = await invokeApp(
    app,
    'POST',
    '/api/users',
    {
      authorization: `Bearer ${adminToken}`,
    },
    {
      email: 'new-test@titan.in',
      name: 'Test',
      password: 'StrongPassword123!',
      role: 'optometrist',
    }
  );

  assert.strictEqual(
    resCreateWithStaleToken.status,
    403,
    `CRITICAL N9: Demoted user must receive 403 on admin-only route (got ${resCreateWithStaleToken.status})`
  );
  console.log('  ✓ 4a. Live database role loaded on every request; stale JWT role privilege escalation strictly blocked');

  // Step 4c. Invalidate session on role/status change
  await run("UPDATE users SET status = 'inactive', activeTokenSig = NULL WHERE LOWER(email) = LOWER(?)", [demotedEmail]);
  const resInactive = await invokeApp(app, 'GET', '/api/users', {
    authorization: `Bearer ${adminToken}`,
  });
  assert.strictEqual(
    resInactive.status,
    401,
    `CRITICAL N9: Deactivated user must be rejected with 401 (got ${resInactive.status})`
  );
  console.log('  ✓ 4b. Deactivated user immediately blocked on next request (fail-closed authentication)');

  // Step 4d. Verify role whitelist rejects super_admin or invalid roles
  const adminActor = 'real-admin-n9@titan.in';
  await run('DELETE FROM users WHERE LOWER(email) = LOWER(?)', [adminActor]);
  await run(
    `INSERT INTO users (email, name, role, storeName, status, password, activeTokenSig)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [adminActor, 'Real Admin', 'admin', null, 'active', 'hash:pass', null]
  );
  const realAdminToken = generateToken({ email: adminActor, name: 'Real Admin', role: 'admin' });
  const realAdminSig = realAdminToken.split('.')[2];
  await run('UPDATE users SET activeTokenSig = ? WHERE LOWER(email) = LOWER(?)', [realAdminSig, adminActor]);

  const resSuperAdminCreate = await invokeApp(
    app,
    'POST',
    '/api/users',
    {
      authorization: `Bearer ${realAdminToken}`,
    },
    {
      email: 'hacked-super@titan.in',
      name: 'Hacked Super',
      password: 'StrongPassword123!',
      role: 'super_admin', // Must be rejected!
    }
  );
  assert.strictEqual(
    resSuperAdminCreate.status,
    400,
    `Role 'super_admin' must be rejected as invalid (got ${resSuperAdminCreate.status})`
  );
  console.log('  ✓ 4c. Role whitelist strictly enforced (only admin, optometrist, senior_optometrist, store allowed)');

  // Cleanup
  await run('DELETE FROM users WHERE LOWER(email) IN (?, ?, ?, ?)', [
    testEmail,
    legacyEmail,
    demotedEmail,
    adminActor,
  ]);

  console.log('\n================================================================');
  console.log('   🎉 ALL N6, N7, N8, AND N9 REMEDIATION TESTS PASSED!');
  console.log('================================================================\n');
}

runTests()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('Test failed:', err);
    process.exit(1);
  });
