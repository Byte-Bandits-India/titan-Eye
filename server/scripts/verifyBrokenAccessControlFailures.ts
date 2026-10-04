/**
 * OWASP A01:2025 - Broken Access Control Verification Suite
 *
 * Verifies live remediations for:
 * 1. Finding 1 (Alert 5589319, CVSS 5.3 Medium, CWE-538 / CWE-285):
 *    Failure To Restrict URL Access (GET /api/videos/1/stream)
 *    - Rejection of unauthenticated streaming requests (HTTP 401)
 *    - Rejection of authenticated streaming without a signed stream ticket (HTTP 403)
 *    - Rejection of forged, malformed, or tampered stream tickets (HTTP 403)
 *    - Cross-video IDOR ticket mismatch protection (ticket for Video 2 cannot stream other videos)
 *    - Role-based authorization on ticket generation (store accounts can only request active TV mode video, optometrists blocked)
 *    - Cryptographic HMAC-SHA256 signature verification and expiration handling
 *    - Anti-download & anti-caching security headers (Content-Disposition: inline, Cache-Control, X-Content-Type-Options)
 *
 * 2. Finding 3 (Alert 5589215, CVSS 3.7 Low, CWE-22):
 *    Directory Traversal (GET /api/customers/..%2fusers)
 *    - Rejection of primary VAPT encoded traversal sequence: ..%2f
 *    - Rejection of uppercase encoded traversal: ..%2F
 *    - Rejection of Windows backslash traversal: ..%5c and ..%5C
 *    - Rejection of fully hex-encoded traversal: %2e%2e%2f
 *    - Rejection of double-encoded traversal: %252e%252e%252f and ..%252f
 *    - Rejection of unencoded traversal attempting root escape: ../../
 *    - Verification that legitimate requests (/api/customers, /api/ping) pass without false positives
 *    - Static verification of multi-layer defenses in Nginx and IIS configs
 */

import fs from 'fs';
import https from 'https';
import path from 'path';
import { fileURLToPath } from 'url';
import {
  generateVideoStreamTicket,
  verifyVideoStreamTicket,
} from '../utils/videoStreamTicket.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, '../..');

const TARGET_HOST = 'titan.xylozentech.com';
const BASE_URL = `https://${TARGET_HOST}`;

interface CaptchaResponse {
  captchaId: string;
  captchaSvg: string;
}

interface VideoTicketResponse {
  expiresIn: number;
  streamUrl: string;
  ticket: string;
  videoId: number;
}

interface VideoListItem {
  id: number;
  mimeType: string;
  originalName: string;
  title: string;
}

function sendRawHttpsRequest(
  requestPath: string,
  method = 'GET',
  headers: Record<string, string> = {}
): Promise<{ body: string; headers: Record<string, string | string[] | undefined>; status: number }> {
  return new Promise((resolve, reject) => {
    const req = https.request(
      {
        headers,
        hostname: TARGET_HOST,
        method,
        path: requestPath,
        port: 443,
        rejectUnauthorized: false,
      },
      (res) => {
        let body = '';
        res.on('data', (chunk) => {
          body += chunk;
        });
        res.on('end', () => {
          resolve({
            body,
            headers: res.headers,
            status: res.statusCode || 0,
          });
        });
      }
    );

    req.on('error', (err) => reject(err));
    req.end();
  });
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

async function runA01Verification() {
  console.log('================================================================');
  console.log(' OWASP A01:2025 - Broken Access Control Verification Suite      ');
  console.log(` Target Host: ${BASE_URL}                                      `);
  console.log('================================================================\n');

  let allPassed = true;

  try {
    // -------------------------------------------------------------
    // PART 1: Finding 1 - Failure To Restrict URL Access (CWE-538 / CWE-285)
    // -------------------------------------------------------------
    console.log('--- TEST 1: Video Streaming Access Control & Ticket Enforcement (Finding 1 - CVSS 5.3) ---');

    // Test 1.1: Direct unauthenticated request to video stream
    console.log('  [1.1] Testing unauthenticated direct request to /api/videos/2/stream...');
    const unauthStreamRes = await fetch(`${BASE_URL}/api/videos/2/stream`);
    console.log(`        Status: ${unauthStreamRes.status} (Expected: 401 Unauthorized)`);
    const unauthBody = await unauthStreamRes.text();
    console.log(`        Response: ${unauthBody.trim()}`);
    if (unauthStreamRes.status === 401) {
      console.log('        ✓ PASS: Unauthenticated video stream access is blocked (HTTP 401).');
    } else {
      console.error(`        ✗ FAIL: Expected 401, got ${unauthStreamRes.status}`);
      allPassed = false;
    }

    // Authenticate as Super Admin
    console.log('\n  [+] Authenticating as Super Admin (admin@thebytebandits.onmicrosoft.com)...');
    const adminSession = await solveCaptchaAndLogin(
      'admin@thebytebandits.onmicrosoft.com',
      'TitanRemote@2026!#'
    );
    console.log('        ✓ Super Admin authenticated successfully.');

    // Query active videos
    const videosListRes = await fetch(`${BASE_URL}/api/videos`, {
      headers: {
        Authorization: `Bearer ${adminSession.rawToken}`,
        Cookie: adminSession.cookie,
      },
    });
    const videosList = (await videosListRes.json()) as VideoListItem[];
    const targetVideoId = videosList.length > 0 ? videosList[0].id : 2;
    console.log(`        Target test video ID in database: ${targetVideoId}`);

    // Test 1.2: Direct authenticated request without stream ticket (VAPT PoC Condition)
    console.log(`\n  [1.2] Testing authenticated request WITHOUT stream ticket to /api/videos/${targetVideoId}/stream...`);
    const authNoTicketRes = await fetch(`${BASE_URL}/api/videos/${targetVideoId}/stream`, {
      headers: {
        Cookie: adminSession.cookie,
      },
    });
    console.log(`        Status: ${authNoTicketRes.status} (Expected: 403 Forbidden)`);
    const noTicketBody = await authNoTicketRes.text();
    console.log(`        Response: ${noTicketBody.trim()}`);
    if (
      authNoTicketRes.status === 403 &&
      noTicketBody.includes('Direct access denied')
    ) {
      console.log('        ✓ PASS: Direct access without signed stream ticket is blocked (HTTP 403).');
    } else {
      console.error(`        ✗ FAIL: Expected 403 with 'Direct access denied', got ${authNoTicketRes.status}`);
      allPassed = false;
    }

    // Test 1.3: Authenticated request with malformed or tampered stream ticket
    console.log(`\n  [1.3] Testing authenticated request with malformed stream ticket...`);
    const malformedTicketRes = await fetch(
      `${BASE_URL}/api/videos/${targetVideoId}/stream?ticket=malformed.fake-signature`,
      {
        headers: {
          Cookie: adminSession.cookie,
        },
      }
    );
    console.log(`        Status: ${malformedTicketRes.status} (Expected: 403 Forbidden)`);
    const malformedBody = await malformedTicketRes.text();
    console.log(`        Response: ${malformedBody.trim()}`);
    if (malformedTicketRes.status === 403) {
      console.log('        ✓ PASS: Malformed stream ticket is rejected (HTTP 403).');
    } else {
      console.error(`        ✗ FAIL: Expected 403, got ${malformedTicketRes.status}`);
      allPassed = false;
    }

    // Test 1.4: Ticket generation for Super Admin
    console.log(`\n  [1.4] Testing ticket generation for Video ${targetVideoId} via GET /api/videos/${targetVideoId}/ticket...`);
    const ticketRes = await fetch(`${BASE_URL}/api/videos/${targetVideoId}/ticket`, {
      headers: {
        Authorization: `Bearer ${adminSession.rawToken}`,
        Cookie: adminSession.cookie,
      },
    });
    console.log(`        Status: ${ticketRes.status} (Expected: 200 OK)`);
    let validTicket = '';
    if (ticketRes.ok) {
      const ticketJson = (await ticketRes.json()) as VideoTicketResponse;
      validTicket = ticketJson.ticket;
      console.log(`        Ticket issued: ${validTicket.substring(0, 30)}... (Expires in: ${ticketJson.expiresIn}s)`);
      console.log(`        Stream URL: ${ticketJson.streamUrl}`);
      console.log('        ✓ PASS: Video stream ticket generated successfully with bound parameters.');
    } else {
      const errText = await ticketRes.text();
      console.error(`        ✗ FAIL: Failed to generate ticket: ${ticketRes.status} - ${errText}`);
      allPassed = false;
    }

    // Test 1.5: Valid ticket stream & download prevention security headers
    if (validTicket) {
      console.log(`\n  [1.5] Streaming video with valid ticket and inspecting anti-download headers...`);
      const streamWithTicketRes = await fetch(
        `${BASE_URL}/api/videos/${targetVideoId}/stream?ticket=${validTicket}`,
        {
          headers: {
            Cookie: adminSession.cookie,
          },
        }
      );
      console.log(`        Stream Status: ${streamWithTicketRes.status} (Expected: 200 or 206)`);
      const contentDisposition = streamWithTicketRes.headers.get('content-disposition');
      const cacheControl = streamWithTicketRes.headers.get('cache-control');
      const xContentType = streamWithTicketRes.headers.get('x-content-type-options');

      console.log(`        Content-Disposition:    ${contentDisposition} (Expected: inline)`);
      console.log(`        Cache-Control:          ${cacheControl} (Expected: private, no-cache, no-store...)`);
      console.log(`        X-Content-Type-Options: ${xContentType} (Expected: nosniff)`);

      if (
        (streamWithTicketRes.status === 200 || streamWithTicketRes.status === 206) &&
        contentDisposition === 'inline' &&
        cacheControl?.includes('no-store') &&
        xContentType === 'nosniff'
      ) {
        console.log('        ✓ PASS: Video streams authorized with protective anti-download/anti-cache headers.');
      } else {
        console.error('        ✗ FAIL: Stream headers or status code do not meet security requirements.');
        allPassed = false;
      }
    }

    // Test 1.6: Cross-video IDOR ticket mismatch test
    if (validTicket) {
      console.log(`\n  [1.6] Testing IDOR protection: Using Video ${targetVideoId} ticket to request Video 999...`);
      const idorRes = await fetch(`${BASE_URL}/api/videos/999/stream?ticket=${validTicket}`, {
        headers: {
          Cookie: adminSession.cookie,
        },
      });
      console.log(`        Status: ${idorRes.status} (Expected: 403 Forbidden)`);
      const idorBody = await idorRes.text();
      console.log(`        Response: ${idorBody.trim()}`);
      if (
        idorRes.status === 403 &&
        idorBody.includes(`Stream ticket is for video ${targetVideoId}, not video 999`)
      ) {
        console.log('        ✓ PASS: Ticket bound strictly to Video ID; cross-video tampering blocked (HTTP 403).');
      } else {
        console.error(`        ✗ FAIL: Expected 403 IDOR rejection, got ${idorRes.status}`);
        allPassed = false;
      }
    }

    // Test 1.7: RBAC enforcement on ticket generation (Store & Optometrist accounts)
    console.log('\n  [1.7] Testing RBAC ticket generation restrictions (Store & Optometrist)...');
    console.log('        Authenticating as Store User (store-a@thebytebandits.onmicrosoft.com)...');
    const storeSession = await solveCaptchaAndLogin(
      'store-a@thebytebandits.onmicrosoft.com',
      'TitanRemote@2026!#'
    );
    const storeTicketRes = await fetch(`${BASE_URL}/api/videos/${targetVideoId}/ticket`, {
      headers: {
        Authorization: `Bearer ${storeSession.rawToken}`,
        Cookie: storeSession.cookie,
      },
    });
    console.log(`        Store ticket request status: ${storeTicketRes.status} (Expected: 403 Forbidden)`);
    const storeTicketBody = await storeTicketRes.text();
    console.log(`        Response: ${storeTicketBody.trim()}`);
    if (
      storeTicketRes.status === 403 &&
      storeTicketBody.includes('Store accounts can only stream the active TV mode video')
    ) {
      console.log('        ✓ PASS: Store accounts restricted to active TV mode video only (HTTP 403).');
    } else {
      console.error(`        ✗ FAIL: Expected 403 for store ticket request, got ${storeTicketRes.status}`);
      allPassed = false;
    }

    console.log('        Authenticating as Optometrist (optom-b@thebytebandits.onmicrosoft.com)...');
    const optomSession = await solveCaptchaAndLogin(
      'optom-b@thebytebandits.onmicrosoft.com',
      'TitanRemote@2026!#'
    );
    const optomTicketRes = await fetch(`${BASE_URL}/api/videos/${targetVideoId}/ticket`, {
      headers: {
        Authorization: `Bearer ${optomSession.rawToken}`,
        Cookie: optomSession.cookie,
      },
    });
    console.log(`        Optometrist ticket request status: ${optomTicketRes.status} (Expected: 403 Forbidden)`);
    const optomTicketBody = await optomTicketRes.text();
    console.log(`        Response: ${optomTicketBody.trim()}`);
    if (
      optomTicketRes.status === 403 &&
      optomTicketBody.includes('Unauthorized to stream video content')
    ) {
      console.log('        ✓ PASS: Non-admin roles strictly forbidden from generating stream tickets (HTTP 403).');
    } else {
      console.error(`        ✗ FAIL: Expected 403 for optometrist ticket request, got ${optomTicketRes.status}`);
      allPassed = false;
    }

    // Test 1.8: Cryptographic verification of expired and tampered tickets
    console.log('\n  [1.8] Testing cryptographic verification of expired & tampered stream tickets...');
    const expiredTicket = generateVideoStreamTicket(targetVideoId, { email: 'admin@titan.in', role: 'super_admin' }, -10);
    const expiredCheck = verifyVideoStreamTicket(expiredTicket, targetVideoId);
    console.log(`        Expired Ticket Check: valid=${expiredCheck.valid}, error="${expiredCheck.error}"`);
    if (!expiredCheck.valid && expiredCheck.error === 'Stream ticket has expired.') {
      console.log('        ✓ PASS: Expired tickets are rejected cryptographically.');
    } else {
      console.error('        ✗ FAIL: Expired ticket check did not reject as expected.');
      allPassed = false;
    }

    // Tampered payload
    const parts = expiredTicket.split('.');
    const tamperedPayloadB64 = Buffer.from(
      JSON.stringify({ videoId: 999, email: 'hacker@evil.com', role: 'super_admin', exp: 9999999999 })
    ).toString('base64url');
    const tamperedTicket = `${tamperedPayloadB64}.${parts[1]}`;
    const tamperedCheck = verifyVideoStreamTicket(tamperedTicket, 999);
    console.log(`        Tampered Ticket Check: valid=${tamperedCheck.valid}, error="${tamperedCheck.error}"`);
    if (!tamperedCheck.valid && tamperedCheck.error === 'Invalid stream ticket signature.') {
      console.log('        ✓ PASS: Tampered ticket signature is rejected via HMAC-SHA256 timing-safe check.');
    } else {
      console.error('        ✗ FAIL: Tampered ticket check did not reject as expected.');
      allPassed = false;
    }

    // -------------------------------------------------------------
    // PART 2: Finding 3 - Directory Traversal (CWE-22)
    // -------------------------------------------------------------
    console.log('\n--- TEST 2: Directory Traversal Protection (Finding 3 - CVSS 3.7) ---');

    // Test 2.1: Primary VAPT Finding Attack: GET /api/customers/..%2fusers
    console.log('  [2.1] Testing primary VAPT finding sequence: /api/customers/..%2fusers...');
    const traversalPocRes = await fetch(`${BASE_URL}/api/customers/..%2fusers`);
    console.log(`        Status: ${traversalPocRes.status} (Expected: 400 Bad Request)`);
    const pocBody = await traversalPocRes.text();
    console.log(`        Response: ${pocBody.trim()}`);
    if (
      traversalPocRes.status === 400 &&
      pocBody.includes('Directory traversal sequence detected. Request rejected.')
    ) {
      console.log('        ✓ PASS: Encoded traversal sequence (..%2f) blocked with HTTP 400.');
    } else {
      console.error(`        ✗ FAIL: Expected 400, got ${traversalPocRes.status}`);
      allPassed = false;
    }

    // Test 2.2: Uppercase encoded traversal: ..%2F
    console.log('\n  [2.2] Testing uppercase encoded traversal: /api/customers/..%2Fusers...');
    const upperRes = await fetch(`${BASE_URL}/api/customers/..%2Fusers`);
    console.log(`        Status: ${upperRes.status} (Expected: 400 Bad Request)`);
    if (upperRes.status === 400) {
      console.log('        ✓ PASS: Uppercase encoded traversal (..%2F) blocked with HTTP 400.');
    } else {
      console.error(`        ✗ FAIL: Expected 400, got ${upperRes.status}`);
      allPassed = false;
    }

    // Test 2.3: Windows backslash encoded traversal: ..%5c and ..%5C
    console.log('\n  [2.3] Testing Windows backslash traversal: /api/customers/..%5cusers...');
    const backslashRes = await fetch(`${BASE_URL}/api/customers/..%5cusers`);
    console.log(`        Status: ${backslashRes.status} (Expected: 400 Bad Request)`);
    const backslashUpperRes = await fetch(`${BASE_URL}/api/customers/..%5Cusers`);
    console.log(`        Uppercase %5C Status: ${backslashUpperRes.status} (Expected: 400 Bad Request)`);
    if (backslashRes.status === 400 && backslashUpperRes.status === 400) {
      console.log('        ✓ PASS: Windows backslash traversal (..%5c / ..%5C) blocked with HTTP 400.');
    } else {
      console.error('        ✗ FAIL: Windows backslash traversal not blocked.');
      allPassed = false;
    }

    // Test 2.4: Fully hex-encoded dot-dot traversal: %2e%2e%2f
    console.log('\n  [2.4] Testing fully hex-encoded dot-dot traversal: /api/customers/%2e%2e%2fusers...');
    const hexRes = await fetch(`${BASE_URL}/api/customers/%2e%2e%2fusers`);
    console.log(`        Status: ${hexRes.status} (Expected: 400 Bad Request)`);
    if (hexRes.status === 400) {
      console.log('        ✓ PASS: Fully hex-encoded dot-dot traversal (%2e%2e%2f) blocked with HTTP 400.');
    } else {
      console.error(`        ✗ FAIL: Expected 400, got ${hexRes.status}`);
      allPassed = false;
    }

    // Test 2.5: Double URL-encoded traversal: %252e%252e%252f and ..%252f
    console.log('\n  [2.5] Testing double URL-encoded traversal: /api/customers/%252e%252e%252fusers...');
    const doubleRes = await fetch(`${BASE_URL}/api/customers/%252e%252e%252fusers`);
    console.log(`        Status: ${doubleRes.status} (Expected: 400 Bad Request)`);
    const doubleSlashRes = await fetch(`${BASE_URL}/api/customers/..%252fusers`);
    console.log(`        Double slash Status: ${doubleSlashRes.status} (Expected: 400 Bad Request)`);
    if (doubleRes.status === 400 && doubleSlashRes.status === 400) {
      console.log('        ✓ PASS: Double-encoded traversal (%252e%252e%252f / ..%252f) blocked with HTTP 400.');
    } else {
      console.error('        ✗ FAIL: Double-encoded traversal not blocked.');
      allPassed = false;
    }

    // Test 2.6: Unencoded path traversal attempting system file escape (Raw HTTPS request)
    console.log('\n  [2.6] Testing unencoded path traversal attempting system file escape (Raw HTTPS)...');
    const rootEscapeRes = await sendRawHttpsRequest('/api/customers/../../etc/passwd');
    console.log(`        Status: ${rootEscapeRes.status} (Expected: 400 Bad Request)`);
    console.log(`        Response: ${rootEscapeRes.body.trim()}`);
    if (
      rootEscapeRes.status === 400 &&
      rootEscapeRes.body.includes('Directory traversal sequence detected. Request rejected.')
    ) {
      console.log('        ✓ PASS: Unencoded system path traversal (../../etc/passwd) blocked with HTTP 400.');
    } else {
      console.error(`        ✗ FAIL: Expected 400, got ${rootEscapeRes.status}`);
      allPassed = false;
    }

    // Test 2.7: Verification of legitimate endpoints without false positives
    console.log('\n  [2.7] Testing legitimate API requests for false positives...');
    const pingRes = await fetch(`${BASE_URL}/api/ping`);
    console.log(`        /api/ping Status: ${pingRes.status} (Expected: 200 OK)`);

    const customersRes = await fetch(`${BASE_URL}/api/customers`, {
      headers: {
        Authorization: `Bearer ${adminSession.rawToken}`,
        Cookie: adminSession.cookie,
      },
    });
    console.log(`        /api/customers Status: ${customersRes.status} (Expected: 200 OK)`);

    if (pingRes.status === 200 && customersRes.status === 200) {
      console.log('        ✓ PASS: Legitimate requests pass cleanly through pathTraversalGuard (Zero False Positives).');
    } else {
      console.error('        ✗ FAIL: Legitimate endpoints returned unexpected status codes.');
      allPassed = false;
    }

    // Test 2.8: Static verification of multi-layer defenses in Nginx and IIS configs
    console.log('\n  [2.8] Auditing multi-layer traversal defense configurations (Nginx & IIS)...');
    const nginxConfPath = path.resolve(ROOT_DIR, 'nginx/titan.conf');
    const webConfigPath = path.resolve(ROOT_DIR, 'web.config');

    let nginxHasGuard = false;
    if (fs.existsSync(nginxConfPath)) {
      const nginxContent = fs.readFileSync(nginxConfPath, 'utf8');
      nginxHasGuard =
        nginxContent.includes('Reject path traversal sequences') &&
        nginxContent.includes('%2[fF]');
    }

    let iisHasGuard = false;
    if (fs.existsSync(webConfigPath)) {
      const webConfigContent = fs.readFileSync(webConfigPath, 'utf8');
      iisHasGuard =
        webConfigContent.includes('Block Path Traversal') &&
        webConfigContent.includes('UNENCODED_URL');
    }

    console.log(`        Nginx Traversal Filter: ${nginxHasGuard ? 'CONFIGURED' : 'NOT FOUND'}`);
    console.log(`        IIS URL Rewrite Rule:   ${iisHasGuard ? 'CONFIGURED' : 'NOT FOUND'}`);

    if (nginxHasGuard && iisHasGuard) {
      console.log('        ✓ PASS: Multi-layer reverse proxy defense rules are active in Nginx and IIS configs.');
    } else {
      console.error('        ✗ FAIL: Reverse proxy configurations missing path traversal rules.');
      allPassed = false;
    }

    // -------------------------------------------------------------
    // SUMMARY
    // -------------------------------------------------------------
    console.log('\n================================================================');
    if (allPassed) {
      console.log('  ALL OWASP A01:2025 BROKEN ACCESS CONTROL TESTS PASSED (100%)  ');
    } else {
      console.log('  SOME OWASP A01:2025 TESTS FAILED. CHECK LOGS ABOVE.           ');
    }
    console.log('================================================================\n');

    process.exit(allPassed ? 0 : 1);
  } catch (err) {
    console.error('\nVerification script encountered an unhandled exception:', err);
    process.exit(1);
  }
}

runA01Verification();
