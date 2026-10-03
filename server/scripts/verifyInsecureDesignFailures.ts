/**
 * OWASP A06:2025 - Insecure Design Verification Suite
 *
 * Verifies live remediations for:
 * 1. Finding 9 (Alert 5589173, CVSS 8.1 High, CWE-840 / Insecure Design):
 *    Business Logic Flaw on /api/customers/{id}/initiate-call
 * 2. Role-Based Workflow Separation (Store vs. Optometrist)
 * 3. Workflow State Machine Integrity (Enforcing strict sequential transitions)
 * 4. Multi-Tenant Store Location Isolation (Preventing cross-store operations)
 */

const TARGET_HOST = 'titan.xylozentech.com';
const BASE_URL = `https://${TARGET_HOST}`;

interface CaptchaResponse {
  captchaId: string;
  captchaSvg: string;
}

async function solveCaptchaAndLogin(email: string, pass: string): Promise<string> {
  const captchaRes = await fetch(`${BASE_URL}/api/auth/captcha`);
  if (!captchaRes.ok) {
    throw new Error(`Failed to fetch CAPTCHA: ${captchaRes.status}`);
  }

  const { captchaId, captchaSvg } = (await captchaRes.json()) as CaptchaResponse;
  const decodedSvg = decodeURIComponent(captchaSvg.replace('data:image/svg+xml;utf8,', ''));
  const captchaSolution = [...decodedSvg.matchAll(/>([A-Za-z0-9])<\/text>/g)]
    .map((m) => m[1])
    .join('');

  const loginRes = await fetch(`${BASE_URL}/api/login`, {
    body: JSON.stringify({
      captchaId,
      captchaSolution,
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

  return setCookie.split(';')[0];
}

async function ensureCustomerWithStatus(cookie: string, id: string, status: string): Promise<void> {
  const updateRes = await fetch(`${BASE_URL}/api/customers/${encodeURIComponent(id)}`, {
    body: JSON.stringify({
      age: 28,
      customerType: 'New',
      gender: 'Male',
      mobile: '9876543210',
      name: 'Test Patient',
      preferredLanguage: 'English',
      status,
    }),
    headers: {
      'Content-Type': 'application/json',
      Cookie: cookie,
    },
    method: 'PUT',
  });

  if (!updateRes.ok) {
    // If not found, create it
    await fetch(`${BASE_URL}/api/customers`, {
      body: JSON.stringify({
        age: 28,
        customerType: 'New',
        gender: 'Male',
        mobile: '9876543210',
        name: 'Test Patient',
        preferredLanguage: 'English',
        status,
        storeName: 'STRA',
      }),
      headers: {
        'Content-Type': 'application/json',
        Cookie: cookie,
      },
      method: 'POST',
    });
  }
}

async function runA06Verification() {
  console.log('================================================================');
  console.log('    OWASP A06:2025 - Insecure Design Verification Suite         ');
  console.log(`  Target Host: ${BASE_URL}                                     `);
  console.log('================================================================\n');

  let allPassed = true;

  try {
    // Authenticate test actors
    console.log('[*] Authenticating actors for workflow tests...');
    const storeACookie = await solveCaptchaAndLogin(
      'store-a@thebytebandits.onmicrosoft.com',
      'TitanRemote@2026!#'
    );
    console.log('  ✅ [PASS] Store A user authenticated (Role: store, Location: STRA)');

    const storeBCookie = await solveCaptchaAndLogin(
      'store-b@thebytebandits.onmicrosoft.com',
      'TitanRemote@2026!#'
    );
    console.log('  ✅ [PASS] Store B user authenticated (Role: store, Location: STRB)');

    const optomCookie = await solveCaptchaAndLogin(
      'optom-b@thebytebandits.onmicrosoft.com',
      'TitanRemote@2026!#'
    );
    console.log('  ✅ [PASS] Optometrist user authenticated (Role: optometrist)');

    const seniorOptomCookie = await solveCaptchaAndLogin(
      'optom-a@thebytebandits.onmicrosoft.com',
      'TitanRemote@2026!#'
    );
    console.log('  ✅ [PASS] Senior Optometrist user authenticated (Role: senior_optometrist)\n');

    const customerId = '#0001';
    const encodedCustId = encodeURIComponent(customerId);

    // Reset customer to 'Created' state under Store A
    await ensureCustomerWithStatus(storeACookie, customerId, 'Created');

    // -------------------------------------------------------------
    // TEST 1: Role Bypass Prevention on Call Initiation (Finding 9)
    // -------------------------------------------------------------
    console.log('--- TEST 1: Optometrist Role Call Initiation Block (Finding 9 - CVSS 8.1 High) ---');

    // Test 1.1: Standard Optometrist attempts to initiate call
    console.log('  [1.1] Testing Optometrist attempting to invoke POST /api/customers/:id/initiate-call...');
    const optomInitRes = await fetch(`${BASE_URL}/api/customers/${encodedCustId}/initiate-call`, {
      headers: { Cookie: optomCookie },
      method: 'POST',
    });

    if (optomInitRes.status === 403) {
      const body = await optomInitRes.json();
      console.log(`  ✅ [PASS] Optometrist initiate-call strictly rejected with HTTP 403: "${body.error}"`);
    } else {
      console.error(`  ❌ Optometrist was NOT blocked from initiate-call! Status: ${optomInitRes.status}`);
      allPassed = false;
    }

    // Test 1.2: Senior Optometrist attempts to initiate call
    console.log('  [1.2] Testing Senior Optometrist attempting to invoke POST /api/customers/:id/initiate-call...');
    const seniorOptomInitRes = await fetch(`${BASE_URL}/api/customers/${encodedCustId}/initiate-call`, {
      headers: { Cookie: seniorOptomCookie },
      method: 'POST',
    });

    if (seniorOptomInitRes.status === 403) {
      const body = await seniorOptomInitRes.json();
      console.log(`  ✅ [PASS] Senior Optometrist initiate-call strictly rejected with HTTP 403: "${body.error}"`);
    } else {
      console.error(`  ❌ Senior Optometrist was NOT blocked from initiate-call! Status: ${seniorOptomInitRes.status}`);
      allPassed = false;
    }

    // -------------------------------------------------------------
    // TEST 2: Multi-Tenant Store Isolation (Business Logic Boundary)
    // -------------------------------------------------------------
    console.log('\n--- TEST 2: Multi-Tenant Store Workflow Isolation ---');
    console.log('  [2.1] Testing Store B attempting to initiate call for Store A customer...');
    const crossStoreRes = await fetch(`${BASE_URL}/api/customers/${encodedCustId}/initiate-call`, {
      headers: { Cookie: storeBCookie },
      method: 'POST',
    });

    if (crossStoreRes.status === 403) {
      const body = await crossStoreRes.json();
      console.log(`  ✅ [PASS] Cross-store call initiation rejected with HTTP 403: "${body.error}"`);
    } else {
      console.error(`  ❌ Cross-store call initiation was NOT rejected! Status: ${crossStoreRes.status}`);
      allPassed = false;
    }

    // -------------------------------------------------------------
    // TEST 3: Workflow State Machine Enforcement
    // -------------------------------------------------------------
    console.log('\n--- TEST 3: Sequential State Machine Validation ---');

    // Test 3.1: Transition to 'Completed' then attempt call initiation
    console.log('  [3.1] Updating customer status to "Completed"...');
    await ensureCustomerWithStatus(storeACookie, customerId, 'Completed');

    console.log('  [3.2] Testing call initiation on customer in "Completed" state...');
    const completedInitRes = await fetch(`${BASE_URL}/api/customers/${encodedCustId}/initiate-call`, {
      headers: { Cookie: storeACookie },
      method: 'POST',
    });

    if (completedInitRes.status === 409) {
      const body = await completedInitRes.json();
      console.log(`  ✅ [PASS] Ineligible state transition rejected with HTTP 409 Conflict: "${body.error}"`);
    } else {
      console.error(`  ❌ Call initiation on Completed customer was NOT rejected with 409! Status: ${completedInitRes.status}`);
      allPassed = false;
    }

    // Test 3.3: Transition to 'Cancelled' then attempt call initiation
    console.log('  [3.3] Updating customer status to "Cancelled"...');
    await ensureCustomerWithStatus(storeACookie, customerId, 'Cancelled');

    console.log('  [3.4] Testing call initiation on customer in "Cancelled" state...');
    const cancelledInitRes = await fetch(`${BASE_URL}/api/customers/${encodedCustId}/initiate-call`, {
      headers: { Cookie: storeACookie },
      method: 'POST',
    });

    if (cancelledInitRes.status === 409) {
      const body = await cancelledInitRes.json();
      console.log(`  ✅ [PASS] Call initiation on Cancelled customer rejected with HTTP 409 Conflict: "${body.error}"`);
    } else {
      console.error(`  ❌ Call initiation on Cancelled customer was NOT rejected with 409! Status: ${cancelledInitRes.status}`);
      allPassed = false;
    }

    // Reset customer back to 'Created'
    await ensureCustomerWithStatus(storeACookie, customerId, 'Created');

    // -------------------------------------------------------------
    // TEST 4: Role Separation on Call Acceptance (Store vs. Optometrist)
    // -------------------------------------------------------------
    console.log('\n--- TEST 4: Workflow Role Separation on Call Acceptance ---');

    // Test 4.1: Store user attempts to accept a call
    console.log('  [4.1] Testing Store user attempting to invoke POST /api/customers/:id/accept-call...');
    const storeAcceptRes = await fetch(`${BASE_URL}/api/customers/${encodedCustId}/accept-call`, {
      headers: { Cookie: storeACookie },
      method: 'POST',
    });

    if (storeAcceptRes.status === 403) {
      const body = await storeAcceptRes.json();
      console.log(`  ✅ [PASS] Store user accept-call rejected with HTTP 403: "${body.error}"`);
    } else {
      console.error(`  ❌ Store user was NOT blocked from accept-call! Status: ${storeAcceptRes.status}`);
      allPassed = false;
    }

    // Test 4.2: Optometrist premature accept on un-queued customer
    console.log('  [4.2] Testing Optometrist attempting to accept call before initiation (Created state)...');
    const prematureAcceptRes = await fetch(`${BASE_URL}/api/customers/${encodedCustId}/accept-call`, {
      headers: { Cookie: optomCookie },
      method: 'POST',
    });

    if (prematureAcceptRes.status === 403 || prematureAcceptRes.status === 409) {
      const body = await prematureAcceptRes.json();
      console.log(`  ✅ [PASS] Premature call acceptance safely blocked (${prematureAcceptRes.status}): "${body.error}"`);
    } else {
      console.error(`  ❌ Premature call acceptance was NOT rejected! Status: ${prematureAcceptRes.status}`);
      allPassed = false;
    }

    // -------------------------------------------------------------
    // TEST 5: Unauthenticated Workflow Rejection
    // -------------------------------------------------------------
    console.log('\n--- TEST 5: Unauthenticated Business Workflow Access ---');
    console.log('  [5.1] Testing anonymous call initiation request without authentication...');
    const anonRes = await fetch(`${BASE_URL}/api/customers/${encodedCustId}/initiate-call`, {
      method: 'POST',
    });

    if (anonRes.status === 401) {
      console.log('  ✅ [PASS] Anonymous request rejected with HTTP 401 Unauthorized.');
    } else {
      console.error(`  ❌ Anonymous request was NOT rejected with 401! Status: ${anonRes.status}`);
      allPassed = false;
    }
  } catch (err) {
    console.error('  ❌ Unhandled exception during A06 verification:', err);
    allPassed = false;
  }

  console.log('\n================================================================');
  if (allPassed) {
    console.log('   🎉 ALL OWASP A06:2025 INSECURE DESIGN TESTS PASSED!          ');
  } else {
    console.log('   ❌ SOME INSECURE DESIGN TESTS FAILED. Review output above.   ');
  }
  console.log('================================================================\n');

  process.exit(allPassed ? 0 : 1);
}

runA06Verification();
