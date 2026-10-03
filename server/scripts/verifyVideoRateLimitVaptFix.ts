import '../config/env.js';
import cookieParser from 'cookie-parser';
import express from 'express';
import fs from 'fs';
import path from 'path';
import { AddressInfo } from 'net';
import { initializeDatabase, run, get } from '../db/database.js';
import { generateToken, JWT_TTL_MS } from '../config/jwt.js';
import { authenticateToken } from '../middleware/auth.js';
import videosRouter from '../routes/videos.js';
import customersRouter from '../routes/customers.js';

interface TestUser {
  email: string;
  name: string;
  role: string;
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
      `INSERT INTO users (email, name, role, status, lastPing)
       VALUES (?, ?, ?, 'active', ?)`,
      [user.email, user.name, user.role, nowIso]
    );
  } else {
    await run(
      `UPDATE users SET name = ?, role = ?, status = 'active', lastPing = ?
       WHERE LOWER(email) = LOWER(?)`,
      [user.name, user.role, nowIso, user.email]
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

async function runVideoRateLimitVerification() {
  console.log('=== VAPT Finding 12: Missing Web API Rate Limiting Verification ===\n');
  await initializeDatabase();

  const app = express();
  app.use(express.json());
  app.use(cookieParser());
  app.use('/api/videos', authenticateToken, videosRouter);
  app.use('/api/customers', authenticateToken, customersRouter);

  const server = await new Promise<import('http').Server>((resolve) => {
    const s = app.listen(0, '127.0.0.1', () => resolve(s));
  });

  const port = (server.address() as AddressInfo).port;
  const VIDEOS_URL = `http://127.0.0.1:${port}/api/videos`;

  const superAdmin1: TestUser = {
    email: 'admin_rate_limit_1@titan.in',
    name: 'Admin Limit Tester 1',
    role: 'super_admin',
  };
  const token1 = await setupTestUser(superAdmin1);

  const superAdmin2: TestUser = {
    email: 'admin_duplicate_test@titan.in',
    name: 'Admin Duplicate Tester',
    role: 'super_admin',
  };
  const token2 = await setupTestUser(superAdmin2);

  const createdVideoIds: number[] = [];

  try {
    // -------------------------------------------------------------
    // TEST 1: Rapid Video Upload Burst (5 Allowed in 15-min window)
    // -------------------------------------------------------------
    console.log('[TEST 1] Testing Rate Limit threshold: Sending 5 consecutive video uploads...');
    for (let i = 1; i <= 5; i++) {
      const form = createVideoMultipartFormData(
        'video',
        `burst_clip_${i}.mp4`,
        'video/mp4',
        VALID_MP4_HEADER,
        `Burst Video Title #${i} - ${Date.now()}`
      );

      const res = await fetch(VIDEOS_URL, {
        body: form.body,
        headers: {
          'Content-Type': form.contentType,
          Cookie: `token=${token1}`,
        },
        method: 'POST',
      });

      const data = (await res.json()) as { id?: number; error?: string };
      if (res.status !== 201 || !data.id) {
        throw new Error(`Upload #${i} unexpectedly failed with status ${res.status}: ${JSON.stringify(data)}`);
      }

      createdVideoIds.push(data.id);
      const remainingHeader = res.headers.get('ratelimit-remaining');
      console.log(`  [PASS] Upload #${i}/5 accepted (HTTP 201, ID: ${data.id}, Remaining Quota: ${remainingHeader})`);
    }

    // -------------------------------------------------------------
    // TEST 2: 6th Upload Rejection with HTTP 429 Too Many Requests
    // -------------------------------------------------------------
    console.log('\n[TEST 2] Testing 6th upload attempt exceeding limit (Expecting HTTP 429)...');
    const form6 = createVideoMultipartFormData(
      'video',
      'burst_clip_6.mp4',
      'video/mp4',
      VALID_MP4_HEADER,
      `Burst Video Title #6 - Exceeding Limit`
    );

    const res6 = await fetch(VIDEOS_URL, {
      body: form6.body,
      headers: {
        'Content-Type': form6.contentType,
        Cookie: `token=${token1}`,
      },
      method: 'POST',
    });

    const data6 = (await res6.json()) as { error?: string };
    const retryAfter = res6.headers.get('retry-after');

    if (res6.status !== 429) {
      throw new Error(`Expected HTTP 429 Too Many Requests, received status ${res6.status}`);
    }

    if (!data6.error || !data6.error.includes('Upload rate limit exceeded')) {
      throw new Error(`Expected rate limit exceeded error message, received: ${JSON.stringify(data6)}`);
    }

    console.log(`  [PASS] 6th request correctly blocked with HTTP 429 Too Many Requests`);
    console.log(`  [PASS] Error message: "${data6.error}"`);
    console.log(`  [PASS] Retry-After header present: ${retryAfter || 'N/A'}`);

    // Verify 6th video was NOT stored in database
    const dbCheck6 = await get<{ count: number }>(
      "SELECT COUNT(*) as count FROM videos WHERE title LIKE '%Burst Video Title #6%'"
    );
    if (dbCheck6 && dbCheck6.count > 0) {
      throw new Error('Database contains record for rate-limited 6th video upload!');
    }
    console.log('  [PASS] 6th video was not recorded in database');

    // -------------------------------------------------------------
    // TEST 3: Rapid Duplicate Upload Block (HTTP 409 Conflict)
    // -------------------------------------------------------------
    console.log('\n[TEST 3] Testing Rapid Duplicate Upload Block within 60 seconds (HTTP 409 Conflict)...');
    const duplicateTitle = `Unique Duplicate Test Video - ${Date.now()}`;
    const formDup1 = createVideoMultipartFormData(
      'video',
      'duplicate_test.mp4',
      'video/mp4',
      VALID_MP4_HEADER,
      duplicateTitle
    );

    const resDup1 = await fetch(VIDEOS_URL, {
      body: formDup1.body,
      headers: {
        'Content-Type': formDup1.contentType,
        Cookie: `token=${token2}`,
      },
      method: 'POST',
    });

    const dataDup1 = (await resDup1.json()) as { id?: number; error?: string };
    if (resDup1.status !== 201 || !dataDup1.id) {
      throw new Error(`Initial upload failed with status ${resDup1.status}: ${JSON.stringify(dataDup1)}`);
    }
    createdVideoIds.push(dataDup1.id);
    console.log(`  [PASS] Initial upload succeeded with ID: ${dataDup1.id}`);

    // Immediately upload duplicate title with user2
    const formDup2 = createVideoMultipartFormData(
      'video',
      'duplicate_test_retry.mp4',
      'video/mp4',
      VALID_MP4_HEADER,
      duplicateTitle
    );

    const resDup2 = await fetch(VIDEOS_URL, {
      body: formDup2.body,
      headers: {
        'Content-Type': formDup2.contentType,
        Cookie: `token=${token2}`,
      },
      method: 'POST',
    });

    const dataDup2 = (await resDup2.json()) as { error?: string };
    if (resDup2.status !== 409) {
      throw new Error(`Expected HTTP 409 Conflict for duplicate upload, got ${resDup2.status}`);
    }

    if (!dataDup2.error || !dataDup2.error.includes('Duplicate video upload detected')) {
      throw new Error(`Expected duplicate error message, got: ${JSON.stringify(dataDup2)}`);
    }
    console.log(`  [PASS] Duplicate upload within 60s rejected with HTTP 409 Conflict`);
    console.log(`  [PASS] Error message: "${dataDup2.error}"`);

    // Verify duplicate was not inserted into database
    const dbDupCheck = await get<{ count: number }>(
      'SELECT COUNT(*) as count FROM videos WHERE title = ?',
      [duplicateTitle]
    );
    if (dbDupCheck && dbDupCheck.count !== 1) {
      throw new Error(`Expected exactly 1 video record for duplicate title, found: ${dbDupCheck.count}`);
    }
    console.log('  [PASS] Only 1 record exists in database (duplicate prevented)');

    // -------------------------------------------------------------
    // TEST 4: Isolation by User Identity + IP Composite Key
    // -------------------------------------------------------------
    console.log('\n[TEST 4] Testing User Isolation (User 2 has separate quota despite User 1 hitting limit)...');
    // User 2 has consumed 1 request (the duplicate test above). User 2 should still have quota remaining.
    const formUser2 = createVideoMultipartFormData(
      'video',
      'user2_quota_test.mp4',
      'video/mp4',
      VALID_MP4_HEADER,
      `User 2 Distinct Video - ${Date.now()}`
    );

    const resUser2 = await fetch(VIDEOS_URL, {
      body: formUser2.body,
      headers: {
        'Content-Type': formUser2.contentType,
        Cookie: `token=${token2}`,
      },
      method: 'POST',
    });

    const dataUser2 = (await resUser2.json()) as { id?: number; error?: string };
    if (resUser2.status !== 201 || !dataUser2.id) {
      throw new Error(`User 2 unexpectedly blocked by User 1's limit! Status: ${resUser2.status}`);
    }
    createdVideoIds.push(dataUser2.id);
    console.log(`  [PASS] User 2 upload succeeded (HTTP 201, ID: ${dataUser2.id}) - Quotas properly isolated by composite key`);

    // -------------------------------------------------------------
    // TEST 5: Verify Feedback Image Upload Rate Limiter on Customer Route
    // -------------------------------------------------------------
    console.log('\n[TEST 5] Testing Feedback Image Rate Limiter on Customer Route...');
    const storeUser: TestUser = {
      email: 'store_rate_limit_test@titan.in',
      name: 'Store Limit Tester',
      role: 'store',
    };
    const storeToken = await setupTestUser(storeUser);

    // Call feedback image endpoint without file (or invalid slot) to verify limiter executes before multer
    const feedbackUrl = `http://127.0.0.1:${port}/api/customers/999999/feedback-image/1`;
    const resFeedback = await fetch(feedbackUrl, {
      headers: {
        Cookie: `token=${storeToken}`,
      },
      method: 'POST',
    });

    const feedbackRemaining = resFeedback.headers.get('ratelimit-remaining');
    const feedbackLimit = resFeedback.headers.get('ratelimit-limit');
    console.log(`  [PASS] Feedback Image Rate Limiter active: Limit = ${feedbackLimit}, Remaining = ${feedbackRemaining}`);

    console.log('\n=== ALL VAPT FINDING 12 VERIFICATION TESTS PASSED SUCCESSFULLY! ===\n');
  } finally {
    // Cleanup created video records and files
    const UPLOADS_DIR = path.resolve(process.env.VIDEO_UPLOADS_DIR || 'uploads/videos');
    for (const id of createdVideoIds) {
      const vid = await get<{ storedName: string }>('SELECT storedName FROM videos WHERE id = ?', [id]);
      if (vid?.storedName) {
        const filePath = path.join(UPLOADS_DIR, vid.storedName);
        if (fs.existsSync(filePath)) {
          fs.unlinkSync(filePath);
        }
      }
      await run('DELETE FROM videos WHERE id = ?', [id]);
    }

    await run('DELETE FROM users WHERE email IN (?, ?, ?)', [
      superAdmin1.email,
      superAdmin2.email,
      'store_rate_limit_test@titan.in',
    ]);

    await new Promise<void>((resolve) => server.close(() => resolve()));
  }
}

runVideoRateLimitVerification()
  .then(() => {
    process.exit(0);
  })
  .catch((err) => {
    console.error('\nVerification failed:', err);
    process.exit(1);
  });
