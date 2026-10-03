import '../config/env.js';
import cookieParser from 'cookie-parser';
import express from 'express';
import fs from 'fs';
import path from 'path';
import { AddressInfo } from 'net';
import { initializeDatabase, run, get } from '../db/database.js';
import { generateToken, JWT_TTL_MS } from '../config/jwt.js';
import { authenticateToken } from '../middleware/auth.js';
import customersRouter from '../routes/customers.js';
import videosRouter from '../routes/videos.js';
import usersRouter from '../routes/users.js';

interface TestUser {
  email: string;
  name: string;
  role: string;
  storeName?: string;
}

// Minimal valid MP4 header (ftyp isom)
const VALID_MP4_HEADER = Buffer.from([
  0x00, 0x00, 0x00, 0x20, // box size = 32
  0x66, 0x74, 0x79, 0x70, // 'ftyp'
  0x69, 0x73, 0x6f, 0x6d, // major_brand = 'isom'
  0x00, 0x00, 0x02, 0x00, // minor_version = 512
  0x69, 0x73, 0x6f, 0x6d, // compatible_brands
  0x69, 0x73, 0x6f, 0x32,
  0x61, 0x76, 0x63, 0x31,
  0x6d, 0x70, 0x34, 0x31,
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
  await run('UPDATE users SET activeTokenSig = ? WHERE LOWER(email) = LOWER(?)', [sig, user.email]);

  return token;
}

function createVideoMultipartFormData(
  fieldName: string,
  filename: string,
  mimeType: string,
  content: Buffer,
  title: string
) {
  const boundary = `----WebKitFormBoundary${Math.random().toString(36).substring(2)}`;

  const titlePart = Buffer.from(
    `--${boundary}\r\n` +
      `Content-Disposition: form-data; name="title"\r\n\r\n` +
      `${title}\r\n`
  );

  const filePart = Buffer.from(
    `--${boundary}\r\n` +
      `Content-Disposition: form-data; name="${fieldName}"; filename="${filename}"\r\n` +
      `Content-Type: ${mimeType}\r\n\r\n`
  );

  const footer = Buffer.from(`\r\n--${boundary}--\r\n`);
  const body = Buffer.concat([titlePart, filePart, content, footer]);

  return {
    body,
    contentType: `multipart/form-data; boundary=${boundary}`,
  };
}

async function runSpecialCharacterVerification() {
  console.log('=== VAPT Finding 14: User Input With Special Character Verification ===\n');
  await initializeDatabase();

  const app = express();
  app.use(express.json());
  app.use(cookieParser());
  app.use('/api/customers', authenticateToken, customersRouter);
  app.use('/api/videos', authenticateToken, videosRouter);
  app.use('/api/users', authenticateToken, usersRouter);

  const server = await new Promise<import('http').Server>((resolve) => {
    const s = app.listen(0, '127.0.0.1', () => resolve(s));
  });

  const port = (server.address() as AddressInfo).port;
  const BASE_URL = `http://127.0.0.1:${port}/api`;

  const storeUser: TestUser = {
    email: 'store_sanitization_test@titan.in',
    name: 'Store Sanitization Tester',
    role: 'store',
    storeName: 'BLR1',
  };
  const storeToken = await setupTestUser(storeUser);

  const superAdmin: TestUser = {
    email: 'admin_sanitization_test@titan.in',
    name: 'Admin Sanitization Tester',
    role: 'super_admin',
  };
  const adminToken = await setupTestUser(superAdmin);

  const createdCustomerIds: string[] = [];
  const createdVideoIds: number[] = [];

  try {
    // -------------------------------------------------------------------------
    // TEST 1: [VAPT Core POC 1] Rejection of Script & Special Characters in Store Action / Feedback
    // -------------------------------------------------------------------------
    console.log('Test 1: [VAPT Core POC 1] Rejection of script injection in Store Action / Feedback');
    const pocPayload = '<script>alert(document.cookie)</script> !@#$%^&*()_+{}":><?';

    const res1 = await fetch(`${BASE_URL}/customers`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Cookie: `token=${storeToken}`,
      },
      body: JSON.stringify({
        name: 'John Doe',
        age: '30',
        gender: 'Male',
        mobile: '9876543210',
        customerType: 'New',
        storeName: 'BLR1',
        preferredLanguage: 'English',
        storeFeedback: pocPayload, // Exact POC string
        status: 'Initiated',
      }),
    });

    console.assert(res1.status === 400, `Expected 400 Bad Request, got: ${res1.status}`);
    const data1 = (await res1.json()) as { details?: string[]; error?: string };
    const errText1 = (data1.details ? data1.details.join(' ') : data1.error) || '';
    console.assert(
      errText1.includes('prohibited special characters') || errText1.includes('script'),
      `Expected error about script/special characters, got: "${errText1}"`
    );
    console.log(`  [PASS] 1. Store feedback script injection rejected with status 400: "${errText1}"`);

    // -------------------------------------------------------------------------
    // TEST 2: Rejection of script injection in Optometrist Feedback & Cancellation
    // -------------------------------------------------------------------------
    console.log('\nTest 2: Rejection of script injection in Optometrist Feedback & Cancellation Reason');
    const res2 = await fetch(`${BASE_URL}/customers`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Cookie: `token=${storeToken}`,
      },
      body: JSON.stringify({
        name: 'Jane Smith',
        age: '28',
        gender: 'Female',
        mobile: '9876543211',
        customerType: 'Existing',
        storeName: 'BLR1',
        preferredLanguage: 'English',
        optometristFeedback: '<iframe src="javascript:alert(1)"></iframe>',
        status: 'Initiated',
      }),
    });

    console.assert(res2.status === 400, `Expected 400 Bad Request, got: ${res2.status}`);
    const data2 = (await res2.json()) as { details?: string[]; error?: string };
    const errText2 = (data2.details ? data2.details.join(' ') : data2.error) || '';
    console.assert(errText2.includes('Optometrist feedback'), `Expected optometrist feedback error, got: "${errText2}"`);
    console.log(`  [PASS] 2. Optometrist feedback script injection rejected with status 400: "${errText2}"`);

    // -------------------------------------------------------------------------
    // TEST 3: [VAPT Core POC 2] Rejection of script & HTML tags in Video Library Title
    // -------------------------------------------------------------------------
    console.log('\nTest 3: [VAPT Core POC 2] Rejection of script injection in Video Library Title');
    const form3 = createVideoMultipartFormData(
      'video',
      'poc_test.mp4',
      'video/mp4',
      VALID_MP4_HEADER,
      '<script>alert(document.cookie)</script> !@#$%^&*()_+{}":><?'
    );

    const res3 = await fetch(`${BASE_URL}/videos`, {
      method: 'POST',
      headers: {
        'Content-Type': form3.contentType,
        Cookie: `token=${adminToken}`,
      },
      body: form3.body,
    });

    console.assert(res3.status === 400, `Expected 400 Bad Request for video title, got: ${res3.status}`);
    const data3 = (await res3.json()) as { error?: string };
    console.assert(
      data3.error?.includes('script tags') || data3.error?.includes('special characters') || data3.error?.includes('HTML tags'),
      `Expected error about script/special characters, got: "${data3.error}"`
    );
    console.log(`  [PASS] 3. Malicious video title rejected with status 400: "${data3.error}"`);

    // -------------------------------------------------------------------------
    // TEST 4: Customer ID Route Parameter Enforcement
    // -------------------------------------------------------------------------
    console.log('\nTest 4: Customer ID Route Parameter Enforcement (:id)');
    const res4a = await fetch(`${BASE_URL}/customers/%23<script>alert(1)<%2Fscript>/logs`, {
      headers: { Cookie: `token=${storeToken}` },
    });
    console.assert(res4a.status === 400, `Expected 400 Bad Request for script in customer ID, got: ${res4a.status}`);
    const data4a = (await res4a.json()) as { error?: string };
    console.assert(data4a.error?.includes('Invalid customer ID format'), `Expected format error, got: "${data4a.error}"`);
    console.log(`  [PASS] 4a. Injected customer ID rejected with status 400: "${data4a.error}"`);

    const res4b = await fetch(`${BASE_URL}/customers/%23..%2F..%2Fetc/logs`, {
      headers: { Cookie: `token=${storeToken}` },
    });
    console.assert(res4b.status === 400, `Expected 400 Bad Request for path traversal ID, got: ${res4b.status}`);
    console.log('  [PASS] 4b. Path traversal customer ID rejected with status 400');

    // -------------------------------------------------------------------------
    // TEST 5: Slot Parameter Enforcement (:slot)
    // -------------------------------------------------------------------------
    console.log('\nTest 5: Slot Parameter Enforcement (:slot)');
    const res5 = await fetch(`${BASE_URL}/customers/%230001/feedback-image/9`, {
      method: 'POST',
      headers: { Cookie: `token=${storeToken}` },
    });
    console.assert(res5.status === 400, `Expected 400 Bad Request for invalid slot, got: ${res5.status}`);
    const data5 = (await res5.json()) as { error?: string };
    console.assert(data5.error?.includes('Invalid image slot'), `Expected slot error, got: "${data5.error}"`);
    console.log(`  [PASS] 5. Invalid image slot rejected with status 400: "${data5.error}"`);

    // -------------------------------------------------------------------------
    // TEST 6: User Management Input Validation (City & Location)
    // -------------------------------------------------------------------------
    console.log('\nTest 6: User Management Input Validation (City & Location)');
    const res6 = await fetch(`${BASE_URL}/users`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Cookie: `token=${adminToken}`,
      },
      body: JSON.stringify({
        email: 'malicious_city_test@titan.in',
        name: 'Test Optom',
        password: 'Password123!Secure',
        role: 'optometrist',
        city: '<script>alert(1)</script>',
        location: 'Bangalore',
      }),
    });

    console.assert(res6.status === 400, `Expected 400 Bad Request for script in city, got: ${res6.status}`);
    const data6 = (await res6.json()) as { error?: string };
    console.assert(data6.error?.includes('City contains prohibited script tags'), `Expected city error, got: "${data6.error}"`);
    console.log(`  [PASS] 6. Script injection in user city rejected with status 400: "${data6.error}"`);

    // -------------------------------------------------------------------------
    // TEST 7: Acceptance of Legitimate Clinical Notes with Clinical Punctuation
    // -------------------------------------------------------------------------
    console.log('\nTest 7: Acceptance of Legitimate Clinical Notes with Standard Punctuation');
    const validClinicalNotes =
      'Patient reported mild glare in OD (-0.50 Cyl, Axis 90). Advised anti-reflective coating (ARC) & 20-20-20 rule; customer satisfied.';

    const res7 = await fetch(`${BASE_URL}/customers`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Cookie: `token=${storeToken}`,
      },
      body: JSON.stringify({
        name: 'Robert Miller',
        age: '42',
        gender: 'Male',
        mobile: '9876543212',
        customerType: 'Existing',
        storeName: 'BLR1',
        preferredLanguage: 'English',
        storeFeedback: validClinicalNotes,
        status: 'Initiated',
      }),
    });

    console.assert(res7.status === 201, `Expected 201 Created for valid customer, got: ${res7.status}`);
    const data7 = (await res7.json()) as { id?: string; ok?: boolean };
    console.assert(Boolean(data7.id), 'Expected customer id in response');
    if (data7.id) {
      createdCustomerIds.push(data7.id);
      const savedRow = await get<{ storeFeedback: string }>('SELECT storeFeedback FROM customers WHERE id = ?', [data7.id]);
      console.assert(
        savedRow?.storeFeedback === validClinicalNotes,
        `Expected intact clinical notes, got: "${savedRow?.storeFeedback}"`
      );
      console.log(`  [PASS] 7. Legitimate clinical notes accepted and stored accurately in DB: "${savedRow?.storeFeedback}"`);
    }

    // -------------------------------------------------------------------------
    // TEST 8: Acceptance of Legitimate Video Title
    // -------------------------------------------------------------------------
    console.log('\nTest 8: Acceptance of Legitimate Video Title');
    const validTitle = `Titan Eye+ Showcase 2026 (Full HD) - ${Date.now()}`;
    const form8 = createVideoMultipartFormData(
      'video',
      'promo_clean.mp4',
      'video/mp4',
      VALID_MP4_HEADER,
      validTitle
    );

    const res8 = await fetch(`${BASE_URL}/videos`, {
      method: 'POST',
      headers: {
        'Content-Type': form8.contentType,
        Cookie: `token=${adminToken}`,
      },
      body: form8.body,
    });

    console.assert(res8.status === 201, `Expected 201 Created for valid video title, got: ${res8.status}`);
    const data8 = (await res8.json()) as { id?: number; title?: string };
    console.assert(data8.id !== undefined, 'Expected video id');
    console.assert(data8.title === validTitle, `Expected video title: "${validTitle}", got: "${data8.title}"`);
    if (data8.id) {
      createdVideoIds.push(data8.id);
    }
    console.log(`  [PASS] 8. Legitimate video title accepted with status 201: "${data8.title}"`);

    console.log('\n=== ALL VAPT FINDING 14 VERIFICATION TESTS PASSED SUCCESSFULLY! ===\n');
  } finally {
    // Cleanup created customer records
    for (const cid of createdCustomerIds) {
      await run('DELETE FROM customers WHERE id = ?', [cid]);
    }

    // Cleanup created video records and files
    const UPLOADS_DIR = path.resolve(process.env.VIDEO_UPLOADS_DIR || 'uploads/videos');
    for (const vidId of createdVideoIds) {
      const vid = await get<{ storedName: string }>('SELECT storedName FROM videos WHERE id = ?', [vidId]);
      if (vid?.storedName) {
        const fp = path.join(UPLOADS_DIR, vid.storedName);
        if (fs.existsSync(fp)) {
          fs.unlinkSync(fp);
        }
      }
      await run('DELETE FROM videos WHERE id = ?', [vidId]);
    }

    await run('DELETE FROM users WHERE email IN (?, ?)', [storeUser.email, superAdmin.email]);

    await new Promise<void>((resolve) => server.close(() => resolve()));
  }
}

runSpecialCharacterVerification()
  .then(() => {
    process.exit(0);
  })
  .catch((err) => {
    console.error('\nVerification failed:', err);
    process.exit(1);
  });
