/**
 * OWASP A07:2025 - Identification and Authentication Failures Verification Suite
 *
 * Verifies live remediations for:
 * 1. Finding 18 (Alert 5588608, CVSS 5.3 Medium, CWE-307):
 *    No CAPTCHA on Login Page / Anti-Brute-Force Controls
 * 2. Finding 15 (Alert 5588617, CVSS 3.7 Low, CWE-347):
 *    JWT Token Misconfiguration (Excessive Expiry, RFC 7519 NumericDate, Token Revocation)
 * 3. Finding 6 (Alert 5589185, CVSS 3.7 Low, CWE-521):
 *    Weak Password Policy Enforcement
 * 4. Finding 7 (Alert 5589179, CVSS 8.1 High, CWE-269):
 *    Privilege Escalation on Customer & User Management
 * 5. Finding 16 (Alert 5588613, CVSS 5.4 Medium, CWE-312):
 *    Sensitive Data in Local Storage Eradication & Cookie Hardening
 */

const TARGET_HOST = 'titan.xylozentech.com';
const BASE_URL = `https://${TARGET_HOST}`;

interface CaptchaResponse {
  captchaId: string;
  captchaSvg: string;
}

interface DecodedJwt {
  email: string;
  exp: number;
  iat: number;
  jti: string;
  name: string;
  nbf?: number;
  role: string;
  storeName?: string | null;
}

async function fetchCaptcha(): Promise<{ id: string; solution: string }> {
  const captchaRes = await fetch(`${BASE_URL}/api/auth/captcha`);
  if (!captchaRes.ok) {
    throw new Error(`Failed to fetch CAPTCHA: ${captchaRes.status}`);
  }

  const { captchaId, captchaSvg } = (await captchaRes.json()) as CaptchaResponse;
  const decodedSvg = decodeURIComponent(captchaSvg.replace('data:image/svg+xml;utf8,', ''));
  const solution = [...decodedSvg.matchAll(/>([A-Za-z0-9])<\/text>/g)]
    .map((m) => m[1])
    .join('');

  return { id: captchaId, solution };
}

async function solveCaptchaAndLogin(
  email: string,
  pass: string
): Promise<{ cookie: string; rawToken: string }> {
  const { id, solution } = await fetchCaptcha();

  const loginRes = await fetch(`${BASE_URL}/api/login`, {
    body: JSON.stringify({
      captchaId: id,
      captchaSolution: solution,
      email,
      password: pass,
    }),
    headers: { 'Content-Type': 'application/json' },
    method: 'POST',
  });

  if (!loginRes.ok) {
    const errBody = await loginRes.text();
    throw new Error(`Login failed for ${email} (${loginRes.status}): ${errBody}`);
  }

  const setCookie = loginRes.headers.get('set-cookie');
  if (!setCookie) {
    throw new Error('No Set-Cookie header returned upon login');
  }

  const cookie = setCookie.split(';')[0];
  const rawToken = setCookie.split('token=')[1].split(';')[0];

  return { cookie, rawToken };
}

function parseJwt(token: string): DecodedJwt {
  const parts = token.split('.');
  if (parts.length !== 3) {
    throw new Error('Invalid JWT format');
  }
  const payloadStr = Buffer.from(parts[1], 'base64url').toString('utf-8');
  return JSON.parse(payloadStr) as DecodedJwt;
}

async function runA07Verification() {
  console.log('================================================================');
  console.log(' OWASP A07:2025 - Authentication Failures Verification Suite    ');
  console.log(`  Target Host: ${BASE_URL}                                     `);
  console.log('================================================================\n');

  let allPassed = true;

  try {
    // -------------------------------------------------------------
    // PART 1: Finding 18 - Missing CAPTCHA & Anti-Automation Controls (CWE-307)
    // -------------------------------------------------------------
    console.log('--- TEST 1: CAPTCHA Challenge-Response & Anti-Automation (Finding 18 - CVSS 5.3) ---');

    // Test 1.1: Login without CAPTCHA
    console.log('  [1.1] Testing login attempt with missing CAPTCHA parameters...');
    const noCaptchaRes = await fetch(`${BASE_URL}/api/login`, {
      body: JSON.stringify({
        email: 'admin@thebytebandits.onmicrosoft.com',
        password: 'TitanRemote@2026!#',
      }),
      headers: { 'Content-Type': 'application/json' },
      method: 'POST',
    });

    if (noCaptchaRes.status === 400) {
      const body = await noCaptchaRes.json();
      console.log(`  ✅ [PASS] Login without CAPTCHA rejected with HTTP 400: "${body.error}"`);
    } else {
      console.error(`  ❌ Login without CAPTCHA was NOT rejected! Status: ${noCaptchaRes.status}`);
      allPassed = false;
    }

    // Test 1.2: Login with forged/invalid CAPTCHA solution
    console.log('  [1.2] Testing login attempt with invalid CAPTCHA solution...');
    const { id: validId } = await fetchCaptcha();
    const badCaptchaRes = await fetch(`${BASE_URL}/api/login`, {
      body: JSON.stringify({
        captchaId: validId,
        captchaSolution: 'WRONG',
        email: 'admin@thebytebandits.onmicrosoft.com',
        password: 'TitanRemote@2026!#',
      }),
      headers: { 'Content-Type': 'application/json' },
      method: 'POST',
    });

    if (badCaptchaRes.status === 400) {
      console.log('  ✅ [PASS] Login with invalid CAPTCHA solution strictly rejected with HTTP 400.');
    } else {
      console.error(`  ❌ Invalid CAPTCHA was NOT rejected! Status: ${badCaptchaRes.status}`);
      allPassed = false;
    }

    // Test 1.3: Replay attack (reusing a consumed CAPTCHA token)
    console.log('  [1.3] Testing CAPTCHA single-use anti-replay protection...');
    const { id: replayId, solution: replaySolution } = await fetchCaptcha();

    // First use: Valid
    const firstLogin = await fetch(`${BASE_URL}/api/login`, {
      body: JSON.stringify({
        captchaId: replayId,
        captchaSolution: replaySolution,
        email: 'admin@thebytebandits.onmicrosoft.com',
        password: 'TitanRemote@2026!#',
      }),
      headers: { 'Content-Type': 'application/json' },
      method: 'POST',
    });

    if (firstLogin.status === 200) {
      console.log('  ✅ [PASS] Initial login with valid CAPTCHA succeeded (HTTP 200).');
    } else {
      console.error(`  ❌ Initial valid login failed! Status: ${firstLogin.status}`);
      allPassed = false;
    }

    // Second use: Replay attempt with same captchaId & solution
    const replayLogin = await fetch(`${BASE_URL}/api/login`, {
      body: JSON.stringify({
        captchaId: replayId,
        captchaSolution: replaySolution,
        email: 'admin@thebytebandits.onmicrosoft.com',
        password: 'TitanRemote@2026!#',
      }),
      headers: { 'Content-Type': 'application/json' },
      method: 'POST',
    });

    if (replayLogin.status === 400) {
      console.log('  ✅ [PASS] Replay attack prevented: Consumed CAPTCHA token rejected with HTTP 400.');
    } else {
      console.error(`  ❌ CAPTCHA token was successfully reused! Status: ${replayLogin.status}`);
      allPassed = false;
    }

    // -------------------------------------------------------------
    // PART 2: Finding 15 - JWT Token Misconfiguration & Lifecycle (CWE-347)
    // -------------------------------------------------------------
    console.log('\n--- TEST 2: JWT Expiration, RFC 7519 Compliance & Revocation (Finding 15 - CVSS 3.7) ---');

    console.log('  [2.1] Authenticating Super Admin and inspecting JWT claims...');
    const { rawToken: adminToken, cookie: adminCookie } = await solveCaptchaAndLogin(
      'admin@thebytebandits.onmicrosoft.com',
      'TitanRemote@2026!#'
    );

    const adminJwt = parseJwt(adminToken);
    const ttlSeconds = adminJwt.exp - adminJwt.iat;

    // Check RFC 7519 NumericDate: Must be seconds (< 10000000000), NOT milliseconds (> 1000000000000)
    if (adminJwt.exp < 10000000000 && adminJwt.iat < 10000000000) {
      console.log(`  ✅ [PASS] RFC 7519 NumericDate format verified: exp=${adminJwt.exp}, iat=${adminJwt.iat}`);
    } else {
      console.error(`  ❌ JWT exp/iat format is NOT seconds-based! exp=${adminJwt.exp}`);
      allPassed = false;
    }

    // Check Short-Lived TTL (2 hours for Super Admin = 7200 seconds)
    if (ttlSeconds <= 7200) {
      console.log(`  ✅ [PASS] Privileged token lifetime strictly enforced: ${ttlSeconds}s (2 hours, no 30-day token).`);
    } else {
      console.error(`  ❌ Token lifetime is excessively long! TTL: ${ttlSeconds} seconds`);
      allPassed = false;
    }

    // Check jti and nbf
    if (adminJwt.jti && adminJwt.nbf) {
      console.log(`  ✅ [PASS] Unique token identifier (jti=${adminJwt.jti}) and nbf claim present.`);
    } else {
      console.error('  ❌ Missing jti or nbf claim in token payload!');
      allPassed = false;
    }

    // Test 2.2: Token Revocation on Logout
    console.log('  [2.2] Testing immediate token revocation on logout...');
    const meBefore = await fetch(`${BASE_URL}/api/me`, {
      headers: { Cookie: `token=${adminToken}` },
    });

    if (meBefore.status === 200) {
      console.log('  ✅ [PASS] Authenticated request before logout succeeded (HTTP 200).');
    }

    const logoutRes = await fetch(`${BASE_URL}/api/logout`, {
      headers: { Cookie: `token=${adminToken}` },
      method: 'POST',
    });

    if (logoutRes.status === 200) {
      console.log('  ✅ [PASS] POST /api/logout returned HTTP 200.');
    }

    // Verify token is blacklisted and rejected
    const meAfter = await fetch(`${BASE_URL}/api/me`, {
      headers: { Cookie: `token=${adminToken}` },
    });

    if (meAfter.status === 401) {
      const body = await meAfter.json();
      console.log(`  ✅ [PASS] Blacklisted token rejected with HTTP 401: "${body.error}"`);
    } else {
      console.error(`  ❌ Revoked token was still accepted! Status: ${meAfter.status}`);
      allPassed = false;
    }

    // -------------------------------------------------------------
    // PART 3: Finding 6 - Weak Password Policy Enforcement (CWE-521)
    // -------------------------------------------------------------
    console.log('\n--- TEST 3: Enterprise Password Policy Validation (Finding 6 - CVSS 3.7) ---');
    const { cookie: freshAdminCookie } = await solveCaptchaAndLogin(
      'admin@thebytebandits.onmicrosoft.com',
      'TitanRemote@2026!#'
    );

    // Test 3.1: Reject short / audit POC password '000000'
    console.log('  [3.1] Testing rejection of audit POC password "000000"...');
    const weakRes1 = await fetch(`${BASE_URL}/api/users`, {
      body: JSON.stringify({
        email: 'test_weak1@titan.in',
        name: 'Weak Test User',
        password: '000000',
        role: 'store',
        storeName: 'STRA',
      }),
      headers: {
        'Content-Type': 'application/json',
        Cookie: freshAdminCookie,
      },
      method: 'POST',
    });

    if (weakRes1.status === 400) {
      const body = await weakRes1.json();
      console.log(`  ✅ [PASS] Weak password "000000" rejected with HTTP 400: "${body.error}"`);
    } else {
      console.error(`  ❌ Weak password was NOT rejected! Status: ${weakRes1.status}`);
      allPassed = false;
    }

    // Test 3.2: Reject password without character diversity (missing symbols)
    console.log('  [3.2] Testing password missing special characters (e.g. "Password123456")...');
    const weakRes2 = await fetch(`${BASE_URL}/api/users`, {
      body: JSON.stringify({
        email: 'test_weak2@titan.in',
        name: 'Weak Test User 2',
        password: 'Password123456',
        role: 'store',
        storeName: 'STRA',
      }),
      headers: {
        'Content-Type': 'application/json',
        Cookie: freshAdminCookie,
      },
      method: 'POST',
    });

    if (weakRes2.status === 400) {
      const body = await weakRes2.json();
      console.log(`  ✅ [PASS] Missing symbol password rejected with HTTP 400: "${body.error}"`);
    } else {
      console.error(`  ❌ Missing symbol password was NOT rejected! Status: ${weakRes2.status}`);
      allPassed = false;
    }

    // Test 3.3: Reject password containing email prefix (context check)
    console.log('  [3.3] Testing contextual password containing email username...');
    const weakRes3 = await fetch(`${BASE_URL}/api/users`, {
      body: JSON.stringify({
        email: 'johndoe@titan.in',
        name: 'John Doe',
        password: 'Johndoe@2026!#',
        role: 'store',
        storeName: 'STRA',
      }),
      headers: {
        'Content-Type': 'application/json',
        Cookie: freshAdminCookie,
      },
      method: 'POST',
    });

    if (weakRes3.status === 400) {
      const body = await weakRes3.json();
      console.log(`  ✅ [PASS] Contextual password rejected with HTTP 400: "${body.error}"`);
    } else {
      console.error(`  ❌ Contextual password was NOT rejected! Status: ${weakRes3.status}`);
      allPassed = false;
    }

    // -------------------------------------------------------------
    // PART 4: Finding 7 - Privilege Escalation Prevention (CWE-269)
    // -------------------------------------------------------------
    console.log('\n--- TEST 4: RBAC & Privilege Escalation Prevention (Finding 7 - CVSS 8.1 High) ---');

    console.log('  [4.1] Authenticating Optometrist user...');
    const { cookie: optomCookie } = await solveCaptchaAndLogin(
      'optom-b@thebytebandits.onmicrosoft.com',
      'TitanRemote@2026!#'
    );

    // Test 4.1: Optometrist customer creation attempt
    console.log('  [4.2] Testing Optometrist attempting unauthorized customer creation (POST /api/customers)...');
    const optomCreateRes = await fetch(`${BASE_URL}/api/customers`, {
      body: JSON.stringify({
        age: 30,
        customerType: 'New',
        gender: 'Female',
        mobile: '9876543210',
        name: 'Unauthorized Patient',
        preferredLanguage: 'English',
        status: 'Created',
        storeName: 'STRA',
      }),
      headers: {
        'Content-Type': 'application/json',
        Cookie: optomCookie,
      },
      method: 'POST',
    });

    if (optomCreateRes.status === 403) {
      const body = await optomCreateRes.json();
      console.log(`  ✅ [PASS] Optometrist customer creation blocked with HTTP 403: "${body.error}"`);
    } else {
      console.error(`  ❌ Optometrist was NOT blocked from creating customers! Status: ${optomCreateRes.status}`);
      allPassed = false;
    }

    // Test 4.2: Optometrist customer deletion attempt
    console.log('  [4.3] Testing Optometrist attempting unauthorized customer deletion (DELETE /api/customers/:id)...');
    const optomDeleteRes = await fetch(`${BASE_URL}/api/customers/%230001`, {
      headers: { Cookie: optomCookie },
      method: 'DELETE',
    });

    if (optomDeleteRes.status === 403) {
      const body = await optomDeleteRes.json();
      console.log(`  ✅ [PASS] Optometrist customer deletion blocked with HTTP 403: "${body.error}"`);
    } else {
      console.error(`  ❌ Optometrist was NOT blocked from deleting customers! Status: ${optomDeleteRes.status}`);
      allPassed = false;
    }

    // Test 4.3: User directory PII sanitization for non-admin callers
    console.log('  [4.4] Verifying user directory PII protection on GET /api/users for Optometrist caller...');
    const optomUsersRes = await fetch(`${BASE_URL}/api/users`, {
      headers: { Cookie: optomCookie },
    });

    if (optomUsersRes.status === 200) {
      const users = (await optomUsersRes.json()) as Array<{
        email: string;
        mobile?: string | null;
        role: string;
      }>;
      const hasOtherRoles = users.some((u) => u.role === 'store' || u.role === 'super_admin');
      const hasExposedPii = users.some((u) => u.mobile !== null && u.mobile !== undefined);

      if (!hasOtherRoles && !hasExposedPii) {
        console.log(`  ✅ [PASS] PII protected: Only peer optometrists returned (${users.length}); admin/store accounts omitted, mobile/PII sanitized to null.`);
      } else {
        console.error('  ❌ PII or cross-role users leaked to optometrist caller!', { hasExposedPii, hasOtherRoles });
        allPassed = false;
      }
    } else {
      console.error(`  ❌ Failed to fetch /api/users: ${optomUsersRes.status}`);
      allPassed = false;
    }

    // -------------------------------------------------------------
    // PART 5: Finding 16 - Sensitive Data in Local Storage & Cookie Flags (CWE-312)
    // -------------------------------------------------------------
    console.log('\n--- TEST 5: Client Storage & Session Cookie Hardening (Finding 16 - CVSS 5.4) ---');

    console.log('  [5.1] Inspecting live Set-Cookie security flags on authentication response...');
    const loginProbe = await fetch(`${BASE_URL}/api/login`, {
      body: JSON.stringify({
        ...(await fetchCaptcha().then((c) => ({ captchaId: c.id, captchaSolution: c.solution }))),
        email: 'admin@thebytebandits.onmicrosoft.com',
        password: 'TitanRemote@2026!#',
      }),
      headers: { 'Content-Type': 'application/json' },
      method: 'POST',
    });

    const setCookieHeader = loginProbe.headers.get('set-cookie') || '';
    const hasHttpOnly = setCookieHeader.toLowerCase().includes('httponly');
    const hasSecure = setCookieHeader.toLowerCase().includes('secure');
    const hasSameSiteStrict = setCookieHeader.toLowerCase().includes('samesite=strict');
    const hasScopedPath = setCookieHeader.includes('Path=/api');

    if (hasHttpOnly && hasSecure && hasSameSiteStrict && hasScopedPath) {
      console.log(`  ✅ [PASS] Set-Cookie flags verified: HttpOnly, Secure, SameSite=Strict, Path=/api.`);
      console.log('  ✅ [PASS] Session token is completely inaccessible to browser JavaScript (immune to XSS exfiltration).');
    } else {
      console.error('  ❌ Cookie missing required security flags:', setCookieHeader);
      allPassed = false;
    }
  } catch (err) {
    console.error('  ❌ Unhandled exception during A07 verification:', err);
    allPassed = false;
  }

  console.log('\n================================================================');
  if (allPassed) {
    console.log('  🎉 ALL OWASP A07:2025 AUTHENTICATION TESTS PASSED SUCCESSFULLY! ');
  } else {
    console.log('  ❌ SOME AUTHENTICATION TESTS FAILED. Review output above.     ');
  }
  console.log('================================================================\n');

  process.exit(allPassed ? 0 : 1);
}

runA07Verification();
