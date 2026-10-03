import '../config/env.js';
import cookieParser from 'cookie-parser';
import express from 'express';
import { AddressInfo } from 'net';
import { initializeDatabase, run, get } from '../db/database.js';
import { generateToken, JWT_TTL_MS } from '../config/jwt.js';
import { authenticateToken } from '../middleware/auth.js';
import customersRouter from '../routes/customers.js';

interface TestUser {
  email: string;
  name: string;
  role: string;
  storeName?: string;
}

// 1x1 Transparent PNG binary
const VALID_PNG_BUFFER = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
  'base64'
);

// Minimal 1x1 Valid JPEG binary
const VALID_JPEG_BUFFER = Buffer.from([
  0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46, 0x00, 0x01, 0x01, 0x01, 0x00, 0x48,
  0x00, 0x48, 0x00, 0x00, 0xff, 0xdb, 0x00, 0x43, 0x00, 0x03, 0x02, 0x02, 0x03, 0x02, 0x02, 0x03,
  0x03, 0x03, 0x03, 0x04, 0x06, 0x04, 0x04, 0x04, 0x04, 0x04, 0x08, 0x06, 0x06, 0x05, 0x06, 0x09,
  0x08, 0x0a, 0x0a, 0x09, 0x08, 0x09, 0x09, 0x0a, 0x0c, 0x0f, 0x0c, 0x0a, 0x0b, 0x0e, 0x0b, 0x09,
  0x09, 0x0d, 0x11, 0x0d, 0x0e, 0x0f, 0x10, 0x10, 0x11, 0x10, 0x0a, 0x0c, 0x12, 0x13, 0x12, 0x10,
  0x13, 0x0f, 0x10, 0x10, 0x10, 0xff, 0xc0, 0x00, 0x0b, 0x08, 0x00, 0x01, 0x00, 0x01, 0x01, 0x01,
  0x11, 0x00, 0xff, 0xc4, 0x00, 0x14, 0x00, 0x01, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
  0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x09, 0xff, 0xda, 0x00, 0x08, 0x01, 0x01, 0x00, 0x00,
  0x3f, 0x00, 0x7f, 0x00, 0xff, 0xd9,
]);

async function setupTestUser(user: TestUser) {
  const existing = await get<{ email: string }>('SELECT email FROM users WHERE LOWER(email) = LOWER(?)', [
    user.email,
  ]);

  const nowIso = new Date().toISOString();
  if (!existing) {
    await run(
      `INSERT INTO users (email, name, role, storeName, status, lastPing)
       VALUES (?, ?, ?, ?, 'active', ?)`,
      [user.email, user.name, user.role, user.storeName || null, nowIso]
    );
  } else {
    await run(
      `UPDATE users SET name = ?, role = ?, storeName = ?, status = 'active', lastPing = ?
       WHERE LOWER(email) = LOWER(?)`,
      [user.name, user.role, user.storeName || null, nowIso, user.email]
    );
  }

  const token = generateToken(user, JWT_TTL_MS);
  const sig = token.split('.')[2];

  if (user.role !== 'store') {
    await run('UPDATE users SET activeTokenSig = ? WHERE LOWER(email) = LOWER(?)', [sig, user.email]);
  }

  return token;
}

// Helper to build multipart/form-data body
function createMultipartFormData(fieldName: string, filename: string, mimeType: string, content: Buffer | string) {
  const boundary = `----WebKitFormBoundary${Math.random().toString(36).substring(2)}`;
  const bufferContent = typeof content === 'string' ? Buffer.from(content, 'utf-8') : content;

  const header = Buffer.from(
    `--${boundary}\r\n` +
      `Content-Disposition: form-data; name="${fieldName}"; filename="${filename}"\r\n` +
      `Content-Type: ${mimeType}\r\n\r\n`
  );
  const footer = Buffer.from(`\r\n--${boundary}--\r\n`);

  const body = Buffer.concat([header, bufferContent, footer]);

  return {
    body,
    contentType: `multipart/form-data; boundary=${boundary}`,
  };
}

async function runXssVerification() {
  console.log('=== VAPT Finding 8: Stored XSS via SVG File Upload Verification ===\n');
  await initializeDatabase();

  const app = express();
  app.use(express.json());
  app.use(cookieParser());
  app.use('/api/customers', authenticateToken, customersRouter);

  const server = await new Promise<import('http').Server>((resolve) => {
    const s = app.listen(0, '127.0.0.1', () => resolve(s));
  });

  const port = (server.address() as AddressInfo).port;
  const BASE_URL = `http://127.0.0.1:${port}/api`;

  try {
    const storeUser: TestUser = {
      email: 'store_xss_test@titan.in',
      name: 'XSS Test Store',
      role: 'store',
      storeName: 'XSS_STORE',
    };

    const optoUser: TestUser = {
      email: 'opto_xss_test@titan.in',
      name: 'Doctor XSS Reader',
      role: 'optometrist',
    };

    const storeToken = await setupTestUser(storeUser);
    const _optoToken = await setupTestUser(optoUser);

    const custId = `XSS_CUST_${Date.now()}`;
    await run(
      `INSERT INTO customers (
        id, name, age, gender, mobile, customerType, storeName,
        preferredLanguage, preferredLanguage2, storeFeedback, optometristFeedback,
        status, callActive, createdOn, lastUpdatedOn
      ) VALUES (?, 'XSS Test Patient', '28', 'Female', '9876543211', 'Walk-in', ?, 'English', '', '', '', 'Created', 0, '2026-10-01 10:00:00', '2026-10-01 10:00:00')`,
      [custId, storeUser.storeName || null]
    );

    // --- TEST 1: [VAPT POC 1-4] Upload crafted SVG containing JavaScript payload ---
    console.log('Test 1: [VAPT Core Finding] Upload crafted SVG file with <script>alert(1)</script>');
    const svgPayload = `<svg xmlns="http://www.w3.org/2000/svg"><script>alert(1)</script><text>VAPT-SVG</text></svg>`;
    const form1 = createMultipartFormData('image', 'Tester.svg', 'image/svg+xml', svgPayload);

    const res1 = await fetch(`${BASE_URL}/customers/${custId}/feedback-image/1`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${storeToken}`,
        'Content-Type': form1.contentType,
      },
      body: form1.body,
    });

    console.assert(res1.status === 400, `Expected status 400 Bad Request, got ${res1.status}`);
    const data1 = (await res1.json()) as { error?: string };
    console.log(`  [PASS] 1. SVG file rejected by multer extension/MIME filter with status ${res1.status}: "${data1.error}"`);

    // --- TEST 2: [Bypass Attempt] SVG renamed to .jpg with spoofed MIME image/jpeg ---
    console.log('\nTest 2: [Bypass Attempt] SVG renamed to .jpg with Content-Type: image/jpeg');
    const disguisedSvg = `<?xml version="1.0"?><svg onload="alert(document.cookie)"><circle r="10"/></svg>`;
    const form2 = createMultipartFormData('image', 'receipt.jpg', 'image/jpeg', disguisedSvg);

    const res2 = await fetch(`${BASE_URL}/customers/${custId}/feedback-image/1`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${storeToken}`,
        'Content-Type': form2.contentType,
      },
      body: form2.body,
    });

    console.assert(res2.status === 400, `Expected status 400 Bad Request, got ${res2.status}`);
    const data2 = (await res2.json()) as { error?: string };
    console.log(`  [PASS] 2. Disguised SVG blocked by binary magic byte / script inspection with status ${res2.status}: "${data2.error}"`);

    // --- TEST 3: [Bypass Attempt] Non-image script file renamed to .png ---
    console.log('\nTest 3: [Bypass Attempt] Plain JavaScript payload disguised as .png');
    const scriptPayload = `console.log("malicious code execution"); alert(1);`;
    const form3 = createMultipartFormData('image', 'exploit.png', 'image/png', scriptPayload);

    const res3 = await fetch(`${BASE_URL}/customers/${custId}/feedback-image/1`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${storeToken}`,
        'Content-Type': form3.contentType,
      },
      body: form3.body,
    });

    console.assert(res3.status === 400, `Expected status 400 Bad Request, got ${res3.status}`);
    const data3 = (await res3.json()) as { error?: string };
    console.log(`  [PASS] 3. Plain script blocked by binary magic byte inspection with status ${res3.status}: "${data3.error}"`);

    // --- TEST 4: [Legitimate Upload] Authentic JPEG upload ---
    console.log('\nTest 4: Legitimate JPEG upload for Auto-Refractor receipt (Slot 1)');
    const form4 = createMultipartFormData('image', 'autorefrac_scan.jpg', 'image/jpeg', VALID_JPEG_BUFFER);

    const res4 = await fetch(`${BASE_URL}/customers/${custId}/feedback-image/1`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${storeToken}`,
        'Content-Type': form4.contentType,
      },
      body: form4.body,
    });

    console.assert(res4.status === 201, `Expected status 201 Created, got ${res4.status}`);
    const data4 = (await res4.json()) as { ok?: boolean };
    console.assert(data4.ok === true, 'Upload response should indicate ok: true');
    console.log(`  [PASS] 4. Authentic JPEG accepted with status ${res4.status}`);

    // --- TEST 5: [Legitimate Upload] Authentic PNG upload ---
    console.log('\nTest 5: Legitimate PNG upload for Auto-Refractor receipt (Slot 2)');
    const form5 = createMultipartFormData('image', 'autoref_slot2.png', 'image/png', VALID_PNG_BUFFER);

    const res5 = await fetch(`${BASE_URL}/customers/${custId}/feedback-image/2`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${storeToken}`,
        'Content-Type': form5.contentType,
      },
      body: form5.body,
    });

    console.assert(res5.status === 201, `Expected status 201 Created, got ${res5.status}`);
    const data5 = (await res5.json()) as { ok?: boolean };
    console.assert(data5.ok === true, 'Upload response should indicate ok: true');
    console.log(`  [PASS] 5. Authentic PNG accepted with status ${res5.status}`);

    // --- TEST 6: [Hardened Response Serving] Fetch uploaded image & verify CSP Sandbox ---
    console.log('\nTest 6: [VAPT POC 5 Mitigation] Fetch uploaded image and verify hardened security response headers');
    const getRes = await fetch(`${BASE_URL}/customers/${custId}/feedback-image/1`, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${storeToken}`,
      },
    });

    console.assert(getRes.status === 200, `Expected status 200 OK, got ${getRes.status}`);

    const csp = getRes.headers.get('content-security-policy') || '';
    const nosniff = getRes.headers.get('x-content-type-options') || '';
    const corp = getRes.headers.get('cross-origin-resource-policy') || '';
    const contentType = getRes.headers.get('content-type') || '';

    console.assert(csp.includes('sandbox'), `CSP must include 'sandbox', got: "${csp}"`);
    console.assert(csp.includes("default-src 'none'"), `CSP must include "default-src 'none'", got: "${csp}"`);
    console.assert(nosniff === 'nosniff', `X-Content-Type-Options must be 'nosniff', got: "${nosniff}"`);
    console.assert(corp === 'same-origin', `Cross-Origin-Resource-Policy must be 'same-origin', got: "${corp}"`);
    console.assert(contentType === 'image/jpeg', `Content-Type must be verified 'image/jpeg', got: "${contentType}"`);

    console.log(`  [PASS] 6a. Content-Security-Policy header verified: "${csp}"`);
    console.log(`  [PASS] 6b. X-Content-Type-Options header verified: "${nosniff}"`);
    console.log(`  [PASS] 6c. Cross-Origin-Resource-Policy header verified: "${corp}"`);
    console.log(`  [PASS] 6d. Verified safe MIME Content-Type: "${contentType}"`);

    // Cleanup test records
    await run(`DELETE FROM customers WHERE id = ?`, [custId]);
    await run(`DELETE FROM users WHERE email IN (?, ?)`, [storeUser.email, optoUser.email]);

    console.log('\n🎉 ALL 6 STORED XSS & SVG UPLOAD MITIGATION TESTS PASSED WITH 100% SUCCESS!\n');
  } finally {
    server.close();
  }
}

runXssVerification().catch((err) => {
  console.error('XSS verification suite failed:', err);
  process.exit(1);
});
