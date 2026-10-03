import assert from 'assert';
import cookieParser from 'cookie-parser';
import express from 'express';
import fs from 'fs';
import http from 'http';
import { AddressInfo } from 'net';
import path from 'path';

import { generateToken, JWT_TTL_MS, UserPayload } from '../config/jwt.js';
import { get, initializeDatabase, run } from '../db/database.js';
import { authenticateToken } from '../middleware/auth.js';
import videosRouter from '../routes/videos.js';
import { generateVideoStreamTicket } from '../utils/videoStreamTicket.js';

async function seedTestUser(user: UserPayload): Promise<string> {
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

function sendRawHttpRequest(
  port: number,
  method: string,
  requestPath: string,
  headers: Record<string, string> = {}
): Promise<{ status: number; headers: http.IncomingHttpHeaders; body: string }> {
  return new Promise((resolve, reject) => {
    const options: http.RequestOptions = {
      hostname: '127.0.0.1',
      port,
      path: requestPath,
      method,
      headers: {
        Host: 'trvc.titan.in',
        Accept: '*/*',
        ...headers,
      },
    };

    const req = http.request(options, (res) => {
      let body = '';
      res.on('data', (chunk) => {
        body += chunk;
      });
      res.on('end', () => {
        resolve({
          status: res.statusCode || 0,
          headers: res.headers,
          body,
        });
      });
    });

    req.on('error', reject);
    req.end();
  });
}

async function runVideoAccessRestrictionVerification() {
  console.log('=== VAPT Finding 23: Failure To Restrict URL Access Verification ===\n');
  await initializeDatabase();

  const app = express();
  app.use(express.json());
  app.use(cookieParser());
  app.use('/api/videos', authenticateToken, videosRouter);

  const server = await new Promise<http.Server>((resolve) => {
    const s = app.listen(0, '127.0.0.1', () => resolve(s));
  });

  const port = (server.address() as AddressInfo).port;

  try {
    // 1. Setup seed users
    const superAdminUser: UserPayload = {
      email: 'admin_vapt23@titan.in',
      name: 'VAPT 23 Super Admin',
      role: 'super_admin',
    };
    const storeUser: UserPayload = {
      email: 'store_vapt23@titan.in',
      name: 'VAPT 23 Store Account',
      role: 'store',
    };
    const optometristUser: UserPayload = {
      email: 'optom_vapt23@titan.in',
      name: 'VAPT 23 Optometrist',
      role: 'optometrist',
    };

    const adminToken = await seedTestUser(superAdminUser);
    const storeToken = await seedTestUser(storeUser);
    const optomToken = await seedTestUser(optometristUser);

    // 2. Setup mock video files in uploads/videos
    const uploadsDir = path.resolve('uploads/videos');
    fs.mkdirSync(uploadsDir, { recursive: true });

    const mockFile1 = 'test_video_1.mp4';
    const mockFile2 = 'test_video_2.mp4';
    const mockContent = Buffer.from('FAKE_MP4_VIDEO_STREAM_DATA_0123456789ABCDEF');
    fs.writeFileSync(path.join(uploadsDir, mockFile1), mockContent);
    fs.writeFileSync(path.join(uploadsDir, mockFile2), mockContent);

    // Clean and insert test videos
    await run("DELETE FROM videos WHERE title LIKE 'VAPT 23%'");
    const v1Result = await run(
      "INSERT INTO videos (title, sourceType, storedName, originalName, mimeType, size, uploadedBy, uploadedAt) VALUES (?, 'upload', ?, ?, 'video/mp4', ?, ?, ?)",
      ['VAPT 23 TV Mode Active Video', mockFile1, 'active.mp4', mockContent.length, 'admin_vapt23@titan.in', new Date().toISOString()]
    );
    const v2Result = await run(
      "INSERT INTO videos (title, sourceType, storedName, originalName, mimeType, size, uploadedBy, uploadedAt) VALUES (?, 'upload', ?, ?, 'video/mp4', ?, ?, ?)",
      ['VAPT 23 Non-Active Admin Video', mockFile2, 'private.mp4', mockContent.length, 'admin_vapt23@titan.in', new Date().toISOString()]
    );

    const video1Id = Number(v1Result.lastInsertRowid);
    const video2Id = Number(v2Result.lastInsertRowid);

    // Set Video 1 as active TV mode video
    await run('INSERT OR REPLACE INTO tvmode_settings (id, activeVideoId) VALUES (1, ?)', [video1Id]);

    // =========================================================================
    // TEST 1: Direct unauthenticated request to /api/videos/:id/stream
    // =========================================================================
    console.log('Test 1: Direct unauthenticated request to /api/videos/:id/stream');
    const res1 = await sendRawHttpRequest(port, 'GET', `/api/videos/${video1Id}/stream`);
    assert.strictEqual(res1.status, 401, `Expected HTTP 401 for unauthenticated stream request, got: ${res1.status}`);
    console.log('  [PASS] 1. Direct unauthenticated request rejected with HTTP 401 (Access token required)');

    // =========================================================================
    // TEST 2: Direct authenticated request without stream ticket (VAPT POC 1 condition)
    // =========================================================================
    console.log('\nTest 2: Direct authenticated request without ticket (VAPT POC 1 condition)');
    const res2 = await sendRawHttpRequest(port, 'GET', `/api/videos/${video1Id}/stream`, {
      Cookie: `token=${adminToken}`,
    });
    assert.strictEqual(res2.status, 403, `Expected HTTP 403 for stream request without ticket, got: ${res2.status}`);
    const body2 = JSON.parse(res2.body);
    assert(
      body2.error?.includes('Direct access denied') || body2.error?.includes('ticket is required'),
      `Unexpected error message: ${res2.body}`
    );
    console.log('  [PASS] 2. Direct authenticated access without ticket blocked with HTTP 403 (Direct access denied)');

    // =========================================================================
    // TEST 3: IDOR / Video ID Tampering Protection
    // =========================================================================
    console.log('\nTest 3: IDOR Protection: Using Video 1 ticket to stream Video 2');
    const ticketForV1 = generateVideoStreamTicket(video1Id, superAdminUser, 900);
    const res3 = await sendRawHttpRequest(port, 'GET', `/api/videos/${video2Id}/stream?ticket=${ticketForV1}`, {
      Cookie: `token=${adminToken}`,
    });
    assert.strictEqual(res3.status, 403, `Expected HTTP 403 for mismatched video ID, got: ${res3.status}`);
    const body3 = JSON.parse(res3.body);
    assert(body3.error?.includes('Stream ticket is for video'), `Unexpected body: ${res3.body}`);
    console.log('  [PASS] 3. Video ID tampering blocked (Ticket for Video 1 cannot stream Video 2)');

    // =========================================================================
    // TEST 4: Expired Ticket Rejection
    // =========================================================================
    console.log('\nTest 4: Expired stream ticket rejection');
    const expiredTicket = generateVideoStreamTicket(video1Id, superAdminUser, -10);
    const res4 = await sendRawHttpRequest(port, 'GET', `/api/videos/${video1Id}/stream?ticket=${expiredTicket}`, {
      Cookie: `token=${adminToken}`,
    });
    assert.strictEqual(res4.status, 403, `Expected HTTP 403 for expired ticket, got: ${res4.status}`);
    const body4 = JSON.parse(res4.body);
    assert(body4.error?.includes('expired'), `Unexpected body: ${res4.body}`);
    console.log('  [PASS] 4. Expired stream ticket rejected with HTTP 403');

    // =========================================================================
    // TEST 5: Tampered Signature Rejection
    // =========================================================================
    console.log('\nTest 5: Tampered stream ticket signature rejection');
    const tamperedTicket = ticketForV1.slice(0, -6) + 'XXXXXX';
    const res5 = await sendRawHttpRequest(port, 'GET', `/api/videos/${video1Id}/stream?ticket=${tamperedTicket}`, {
      Cookie: `token=${adminToken}`,
    });
    assert.strictEqual(res5.status, 403, `Expected HTTP 403 for tampered ticket, got: ${res5.status}`);
    const body5 = JSON.parse(res5.body);
    assert(body5.error?.includes('Invalid stream ticket'), `Unexpected body: ${res5.body}`);
    console.log('  [PASS] 5. Tampered stream ticket rejected with HTTP 403 (Invalid signature)');

    // =========================================================================
    // TEST 6: Role Access Restriction (Store User & Optometrist User)
    // =========================================================================
    console.log('\nTest 6: Role Access Restriction (Store user requesting non-active video)');
    // 6a: Store user tries to get ticket for Video 2 (non-active video)
    const res6a = await sendRawHttpRequest(port, 'GET', `/api/videos/${video2Id}/ticket`, {
      Cookie: `token=${storeToken}`,
    });
    assert.strictEqual(res6a.status, 403, `Expected HTTP 403 for store accessing non-active video ticket, got: ${res6a.status}`);
    console.log('  [PASS] 6a. Store user denied ticket for non-active video (HTTP 403)');

    // 6b: Optometrist user tries to get ticket for Video 1
    const res6b = await sendRawHttpRequest(port, 'GET', `/api/videos/${video1Id}/ticket`, {
      Cookie: `token=${optomToken}`,
    });
    assert.strictEqual(res6b.status, 403, `Expected HTTP 403 for optometrist role, got: ${res6b.status}`);
    console.log('  [PASS] 6b. Optometrist role denied video ticket (HTTP 403)');

    // =========================================================================
    // TEST 7: Store User Authorized Streaming (Active TV Mode Video)
    // =========================================================================
    console.log('\nTest 7: Store user streaming active TV mode video');
    const res7Ticket = await sendRawHttpRequest(port, 'GET', `/api/videos/${video1Id}/ticket`, {
      Cookie: `token=${storeToken}`,
    });
    assert.strictEqual(res7Ticket.status, 200, `Expected HTTP 200 for store ticket request, got: ${res7Ticket.status}`);
    const ticketData7 = JSON.parse(res7Ticket.body);
    assert(ticketData7.ticket, 'Ticket must be returned');

    const res7Stream = await sendRawHttpRequest(port, 'GET', `/api/videos/${video1Id}/stream?ticket=${ticketData7.ticket}`, {
      Cookie: `token=${storeToken}`,
    });
    assert.strictEqual(res7Stream.status, 200, `Expected HTTP 200 for authorized store stream, got: ${res7Stream.status}`);
    assert.strictEqual(res7Stream.headers['content-disposition'], 'inline');
    assert(res7Stream.headers['cache-control']?.includes('no-store'));
    assert.strictEqual(res7Stream.headers['x-content-type-options'], 'nosniff');
    console.log('  [PASS] 7. Store user successfully streams active TV mode video with inline headers');

    // =========================================================================
    // TEST 8: Super Admin Authorized Streaming (Full and HTTP 206 Range)
    // =========================================================================
    console.log('\nTest 8: Super admin authorized streaming (Full and Range requests)');
    const res8Ticket = await sendRawHttpRequest(port, 'GET', `/api/videos/${video2Id}/ticket`, {
      Cookie: `token=${adminToken}`,
    });
    assert.strictEqual(res8Ticket.status, 200, `Expected HTTP 200 for admin ticket request, got: ${res8Ticket.status}`);
    const ticketData8 = JSON.parse(res8Ticket.body);

    // 8a. Full stream
    const res8Full = await sendRawHttpRequest(port, 'GET', `/api/videos/${video2Id}/stream?ticket=${ticketData8.ticket}`, {
      Cookie: `token=${adminToken}`,
    });
    assert.strictEqual(res8Full.status, 200, `Expected HTTP 200 for full stream, got: ${res8Full.status}`);
    assert.strictEqual(res8Full.headers['content-type'], 'video/mp4');

    // 8b. Range request (bytes=0-15)
    const res8Range = await sendRawHttpRequest(port, 'GET', `/api/videos/${video2Id}/stream?ticket=${ticketData8.ticket}`, {
      Cookie: `token=${adminToken}`,
      Range: 'bytes=0-15',
    });
    assert.strictEqual(res8Range.status, 206, `Expected HTTP 206 Partial Content, got: ${res8Range.status}`);
    assert(res8Range.headers['content-range']?.startsWith('bytes 0-15/'));
    assert.strictEqual(res8Range.headers['content-disposition'], 'inline');
    console.log('  [PASS] 8. Super admin successfully streams video via HTTP 200 and HTTP 206 Range');

    // Clean up temporary files
    try {
      fs.unlinkSync(path.join(uploadsDir, mockFile1));
      fs.unlinkSync(path.join(uploadsDir, mockFile2));
      await run("DELETE FROM videos WHERE title LIKE 'VAPT 23%'");
    } catch {
      // Ignore cleanup error
    }

    console.log('\n========================================================================');
    console.log(' [ALL PASSED] VAPT Finding 23: Failure To Restrict URL Access Remediated');
    console.log('========================================================================\n');
  } finally {
    await new Promise<void>((resolve, reject) => {
      server.close((err) => (err ? reject(err) : resolve()));
    });
  }
}

runVideoAccessRestrictionVerification().catch((err) => {
  console.error('[FAIL] Verification error:', err);
  process.exit(1);
});
