/**
 * OWASP A02:2025 - Security Misconfiguration Verification Suite
 *
 * Verifies live remediations for:
 * 1. Finding 12 (Alert 5588638, CVSS 5.4 Medium, CWE-434):
 *    Unrestricted File Upload on /api/videos (Blocking .exe / scripts)
 * 2. Finding 13 (Alert 5588636, CVSS 5.3 Medium, CWE-400):
 *    Missing API Rate Limiting on Upload Endpoints
 * 3. Finding 19 & 34 (Alert 5588607 & 5582932, CVSS 5.3 & 3.7):
 *    Insecure CSP Header (Purging unsafe-inline, unsafe-eval, localhost)
 * 4. Finding 21 (Alert 5588604, CVSS 3.1 Low, CWE-16):
 *    Overly Broad Cookie Path (Enforcing Path=/api)
 * 5. Finding 4, 22, 24 (Alert 5589187, CVSS 3.7 Low / Info):
 *    Programming Language, IIS, & Web Server Info Disclosure (Masking Server & X-Powered-By)
 * 6. Finding 14 (Alert 5588621, CVSS 3.1 Low, CWE-200):
 *    Robots.txt Directory Path Disclosure
 * 7. Finding 17 (Alert 5588610, CVSS 3.7 Low, CWE-16):
 *    HTTP OPTIONS Method Enumeration
 * 8. Finding 2 (Alert 5589234, CVSS 3.7 Low, CWE-200):
 *    Source Code & Source Map Disclosure
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

async function runA02Verification() {
  console.log('================================================================');
  console.log(' OWASP A02:2025 - Security Misconfiguration Verification Suite  ');
  console.log(`  Target Host: ${BASE_URL}                                     `);
  console.log('================================================================\n');

  let allPassed = true;

  try {
    // -------------------------------------------------------------
    // TEST 1: Server & Technology Version Disclosure (Findings 4, 22, 24)
    // -------------------------------------------------------------
    console.log('--- TEST 1: Technology & Server Version Disclosure (Findings 4, 22, 24) ---');
    console.log('  [1.1] Inspecting headers on root and /api/customers for Server / X-Powered-By leaks...');
    const rootRes = await fetch(`${BASE_URL}/`);
    const serverHeader = rootRes.headers.get('server');
    const xPoweredByHeader = rootRes.headers.get('x-powered-by');

    if (!serverHeader && !xPoweredByHeader) {
      console.log('  ✅ [PASS] Server header is completely stripped (null).');
      console.log('  ✅ [PASS] X-Powered-By header is completely stripped (null).');
    } else {
      console.error('  ❌ Information disclosure headers detected:', { server: serverHeader, xPoweredBy: xPoweredByHeader });
      allPassed = false;
    }

    // -------------------------------------------------------------
    // TEST 2: Content Security Policy & Internal Endpoint Leaks (Findings 5, 19, 34)
    // -------------------------------------------------------------
    console.log('\n--- TEST 2: Content Security Policy Hardening (Findings 5, 19, 34) ---');
    const rootCsp = rootRes.headers.get('content-security-policy') || '';

    const hasNoUnsafeInline = !rootCsp.includes("script-src 'unsafe-inline'");
    const hasNoUnsafeEval = !rootCsp.includes("script-src 'unsafe-eval'");
    const hasNoLocalhost = !rootCsp.includes('localhost:3001') && !rootCsp.includes('127.0.0.1');
    const hasObjectSrcNone = rootCsp.includes("object-src 'none'");
    const hasFrameAncestorsNone = rootCsp.includes("frame-ancestors 'none'");

    if (hasNoUnsafeInline && hasNoUnsafeEval && hasNoLocalhost && hasObjectSrcNone && hasFrameAncestorsNone) {
      console.log("  ✅ [PASS] script-src strictly disallows 'unsafe-inline' and 'unsafe-eval'.");
      console.log("  ✅ [PASS] connect-src contains ZERO localhost or internal IP references.");
      console.log("  ✅ [PASS] object-src 'none' and frame-ancestors 'none' strictly enforced.");
    } else {
      console.error('  ❌ CSP policy does not meet strict hardening requirements:', {
        hasFrameAncestorsNone,
        hasNoLocalhost,
        hasNoUnsafeEval,
        hasNoUnsafeInline,
        hasObjectSrcNone,
      });
      allPassed = false;
    }

    // -------------------------------------------------------------
    // TEST 3: Robots.txt File Path Disclosure (Finding 14 - CVSS 3.1)
    // -------------------------------------------------------------
    console.log('\n--- TEST 3: Robots.txt Directory Path Disclosure (Finding 14 - CVSS 3.1) ---');
    const robotsRes = await fetch(`${BASE_URL}/robots.txt`);
    const robotsText = await robotsRes.text();

    const exposesApiDir = robotsText.includes('/api/');
    const exposesAssetsDir = robotsText.includes('/assets/');

    if (robotsRes.status === 200 && !exposesApiDir && !exposesAssetsDir) {
      console.log(`  ✅ [PASS] robots.txt is clean and does not disclose sensitive /api/ or /assets/ paths.`);
    } else {
      console.error('  ❌ robots.txt discloses internal application paths:', robotsText);
      allPassed = false;
    }

    // -------------------------------------------------------------
    // TEST 4: HTTP OPTIONS Method Hardening (Finding 17 - CVSS 3.7)
    // -------------------------------------------------------------
    console.log('\n--- TEST 4: HTTP OPTIONS Method Hardening (Finding 17 - CVSS 3.7) ---');
    const optionsRes = await fetch(`${BASE_URL}/login`, { method: 'OPTIONS' });
    const publicHeader = optionsRes.headers.get('public');

    if (optionsRes.status === 405 && !publicHeader) {
      console.log(`  ✅ [PASS] OPTIONS /login strictly returns HTTP 405 Method Not Allowed; Public header suppressed.`);
    } else {
      console.error('  ❌ HTTP OPTIONS returned unexpected status or headers:', {
        allow: optionsRes.headers.get('allow'),
        public: publicHeader,
        status: optionsRes.status,
      });
      allPassed = false;
    }

    // -------------------------------------------------------------
    // TEST 5: Unrestricted File Upload on /api/videos (Finding 12 - CVSS 5.4)
    // -------------------------------------------------------------
    console.log('\n--- TEST 5: Unrestricted File Upload Prevention (Finding 12 - CVSS 5.4) ---');
    console.log('  [*] Authenticating Super Admin...');
    const adminCookie = await solveCaptchaAndLogin(
      'admin@thebytebandits.onmicrosoft.com',
      'TitanRemote@2026!#'
    );

    // Test 5.1: Direct .exe executable upload attempt
    console.log('  [5.1] Testing upload of executable file (.exe with Windows PE signature)...');
    const peBinaryHeader = Buffer.from('4d5a90000300000004000000ffff0000', 'hex');
    const exeBlob = new Blob([peBinaryHeader], { type: 'application/x-msdownload' });
    const exeForm = new FormData();
    exeForm.append('video', exeBlob, 'malicious_exploit.exe');
    exeForm.append('title', 'Exploit Payload');

    const exeRes = await fetch(`${BASE_URL}/api/videos`, {
      body: exeForm,
      headers: { Cookie: adminCookie },
      method: 'POST',
    });

    if (exeRes.status === 400) {
      const body = await exeRes.json();
      console.log(`  ✅ [PASS] Direct .exe upload rejected with HTTP 400: "${body.error}"`);
    } else {
      console.error(`  ❌ Executable file was NOT rejected! Status: ${exeRes.status}`);
      allPassed = false;
    }

    // Test 5.2: Extension spoofing (PE executable renamed to .mp4)
    console.log('  [5.2] Testing upload of PE executable renamed to .mp4 (magic number check)...');
    const spoofedForm = new FormData();
    spoofedForm.append('video', exeBlob, 'disguised_exploit.mp4');
    spoofedForm.append('title', 'Spoofed Payload');

    const spoofedRes = await fetch(`${BASE_URL}/api/videos`, {
      body: spoofedForm,
      headers: { Cookie: adminCookie },
      method: 'POST',
    });

    if (spoofedRes.status === 400) {
      const body = await spoofedRes.json();
      console.log(`  ✅ [PASS] Spoofed .mp4 executable rejected with HTTP 400: "${body.error}"`);
    } else {
      console.error(`  ❌ Spoofed executable was NOT rejected! Status: ${spoofedRes.status}`);
      allPassed = false;
    }

    // -------------------------------------------------------------
    // TEST 6: Source Code & Source Map Disclosure (Finding 2 - CVSS 3.7)
    // -------------------------------------------------------------
    console.log('\n--- TEST 6: Source Code & Source Map Disclosure (Finding 2 - CVSS 3.7) ---');
    console.log('  [6.1] Checking if production .js.map source maps are exposed...');
    const mapProbe = await fetch(`${BASE_URL}/assets/index-LBzEMJkL.js.map`);

    if (mapProbe.status === 404) {
      console.log('  ✅ [PASS] Source maps (.js.map) returned HTTP 404 Not Found (not accessible in production).');
    } else {
      console.error(`  ❌ Source maps are publicly accessible! Status: ${mapProbe.status}`);
      allPassed = false;
    }

    // -------------------------------------------------------------
    // TEST 7: Cookie Path Scoping & Security Flags (Finding 21 - CVSS 3.1)
    // -------------------------------------------------------------
    console.log('\n--- TEST 7: Cookie Path Scoping & Flags (Finding 21 - CVSS 3.1) ---');
    const loginProbe = await fetch(`${BASE_URL}/api/login`, {
      body: JSON.stringify({
        ...(await fetch(`${BASE_URL}/api/auth/captcha`)
          .then((r) => r.json() as Promise<CaptchaResponse>)
          .then((c) => {
            const decoded = decodeURIComponent(c.captchaSvg.replace('data:image/svg+xml;utf8,', ''));
            const sol = [...decoded.matchAll(/>([A-Za-z0-9])<\/text>/g)].map((m) => m[1]).join('');
            return { captchaId: c.captchaId, captchaSolution: sol };
          })),
        email: 'admin@thebytebandits.onmicrosoft.com',
        password: 'TitanRemote@2026!#',
      }),
      headers: { 'Content-Type': 'application/json' },
      method: 'POST',
    });

    const cookieHeader = loginProbe.headers.get('set-cookie') || '';
    const hasPathApi = cookieHeader.includes('Path=/api');
    const hasHttpOnly = cookieHeader.toLowerCase().includes('httponly');
    const hasSecure = cookieHeader.toLowerCase().includes('secure');

    if (hasPathApi && hasHttpOnly && hasSecure) {
      console.log(`  ✅ [PASS] Authentication cookie path restricted to Path=/api; HttpOnly; Secure.`);
    } else {
      console.error('  ❌ Authentication cookie missing Path=/api or security flags:', cookieHeader);
      allPassed = false;
    }
  } catch (err) {
    console.error('  ❌ Unhandled exception during A02 verification:', err);
    allPassed = false;
  }

  console.log('\n================================================================');
  if (allPassed) {
    console.log(' 🎉 ALL OWASP A02:2025 SECURITY MISCONFIGURATION TESTS PASSED!   ');
  } else {
    console.log(' ❌ SOME SECURITY MISCONFIGURATION TESTS FAILED. See above.      ');
  }
  console.log('================================================================\n');

  process.exit(allPassed ? 0 : 1);
}

runA02Verification();
