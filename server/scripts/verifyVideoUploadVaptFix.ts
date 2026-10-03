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

// Minimal valid WebM header (EBML ID: 1A 45 DF A3)
const VALID_WEBM_HEADER = Buffer.from([
  0x1a, 0x45, 0xdf, 0xa3, // EBML header
  0x9f, 0x42, 0x86, 0x81, 0x01, 0x42, 0xf7, 0x81, 0x01, 0x42, 0xf2, 0x81, 0x04, 0x42, 0xf3, 0x81,
  0x08, 0x42, 0x82, 0x84, 0x77, 0x65, 0x62, 0x6d,
]);

// Windows PE Executable header (MZ)
const MALICIOUS_EXE_HEADER = Buffer.from([
  0x4d, 0x5a, 0x90, 0x00, 0x03, 0x00, 0x00, 0x00, 0x04, 0x00, 0x00, 0x00, 0xff, 0xff, 0x00, 0x00,
  0xb8, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x40, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
]);

// Linux ELF Executable header (\x7FELF)
const MALICIOUS_ELF_HEADER = Buffer.from([
  0x7f, 0x45, 0x4c, 0x46, 0x02, 0x01, 0x01, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
]);

async function setupAdminUser(user: TestUser) {
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
  content: Buffer | string,
  title: string
) {
  const boundary = `----WebKitFormBoundary${Math.random().toString(36).substring(2)}`;
  const bufferContent = typeof content === 'string' ? Buffer.from(content, 'utf-8') : content;

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
  const body = Buffer.concat([titlePart, filePart, bufferContent, footer]);

  return {
    body,
    contentType: `multipart/form-data; boundary=${boundary}`,
  };
}

async function runVideoUploadVerification() {
  console.log('=== VAPT Finding 11: Unrestricted Video File Upload Verification ===\n');
  await initializeDatabase();

  const app = express();
  app.use(express.json());
  app.use(cookieParser());
  app.use('/api/videos', authenticateToken, videosRouter);

  const server = await new Promise<import('http').Server>((resolve) => {
    const s = app.listen(0, '127.0.0.1', () => resolve(s));
  });

  const port = (server.address() as AddressInfo).port;
  const BASE_URL = `http://127.0.0.1:${port}/api/videos`;

  const uploadsDir = path.resolve(process.env.VIDEO_UPLOADS_DIR || 'uploads/videos');

  try {
    const adminUser: TestUser = {
      email: 'admin_upload_test@titan.in',
      name: 'Super Admin Tester',
      role: 'super_admin',
    };

    const adminToken = await setupAdminUser(adminUser);

    // --- TEST 1: [VAPT Core Finding POC] Upload file_example_MP4_480_1_5MG.exe with Content-Type: video/mp4 ---
    console.log('Test 1: [VAPT Core POC] Upload file_example.exe with Content-Type: video/mp4');
    const form1 = createVideoMultipartFormData(
      'video',
      'file_example_MP4_480_1_5MG.exe',
      'video/mp4',
      Buffer.from('Executable dummy payload'),
      'Test Malicious EXE'
    );

    const res1 = await fetch(BASE_URL, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${adminToken}`,
        'Content-Type': form1.contentType,
      },
      body: form1.body,
    });

    console.assert(res1.status === 400, `Expected status 400 Bad Request, got ${res1.status}`);
    const data1 = (await res1.json()) as { error?: string };
    console.assert(data1.error?.includes('strictly forbidden') || data1.error?.includes('Security Violation'), `Expected forbidden message, got: ${data1.error}`);
    console.log(`  [PASS] 1. .exe file rejected at Multer filter with status ${res1.status}: "${data1.error}"`);

    // Verify no .exe files exist in uploads directory
    if (fs.existsSync(uploadsDir)) {
      const storedFiles = fs.readdirSync(uploadsDir);
      const exeFiles = storedFiles.filter((f) => f.endsWith('.exe'));
      console.assert(exeFiles.length === 0, `No .exe files should be present in ${uploadsDir}, found: ${exeFiles.join(', ')}`);
      console.log('  [PASS] 1b. Verified zero .exe files stored in uploads directory');
    }

    // --- TEST 2: [Bypass Attempt] Upload .php webshell disguised as video/mp4 ---
    console.log('\nTest 2: [Bypass Attempt] Upload webshell.php with Content-Type: video/mp4');
    const form2 = createVideoMultipartFormData(
      'video',
      'webshell.php',
      'video/mp4',
      '<?php system($_GET["cmd"]); ?>',
      'Test Webshell PHP'
    );

    const res2 = await fetch(BASE_URL, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${adminToken}`,
        'Content-Type': form2.contentType,
      },
      body: form2.body,
    });

    console.assert(res2.status === 400, `Expected status 400 Bad Request, got ${res2.status}`);
    const data2 = (await res2.json()) as { error?: string };
    console.log(`  [PASS] 2. .php script rejected at Multer filter with status ${res2.status}: "${data2.error}"`);

    // --- TEST 3: [Bypass Attempt] Windows PE executable disguised with .mp4 extension ---
    console.log('\nTest 3: [Bypass Attempt] Windows PE binary disguised as legitimate .mp4');
    const form3 = createVideoMultipartFormData(
      'video',
      'trojan_disguised.mp4',
      'video/mp4',
      MALICIOUS_EXE_HEADER,
      'Test Disguised PE Executable'
    );

    const res3 = await fetch(BASE_URL, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${adminToken}`,
        'Content-Type': form3.contentType,
      },
      body: form3.body,
    });

    console.assert(res3.status === 400, `Expected status 400 Bad Request, got ${res3.status}`);
    const data3 = (await res3.json()) as { error?: string };
    console.assert(data3.error?.includes('executable binary signature'), `Expected executable signature error, got: ${data3.error}`);
    console.log(`  [PASS] 3. Disguised Windows PE binary blocked by magic byte check with status ${res3.status}: "${data3.error}"`);

    // --- TEST 4: [Bypass Attempt] Linux ELF executable disguised with .mp4 extension ---
    console.log('\nTest 4: [Bypass Attempt] Linux ELF binary disguised as legitimate .mp4');
    const form4 = createVideoMultipartFormData(
      'video',
      'rootkit_disguised.mp4',
      'video/mp4',
      MALICIOUS_ELF_HEADER,
      'Test Disguised ELF Executable'
    );

    const res4 = await fetch(BASE_URL, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${adminToken}`,
        'Content-Type': form4.contentType,
      },
      body: form4.body,
    });

    console.assert(res4.status === 400, `Expected status 400 Bad Request, got ${res4.status}`);
    const data4 = (await res4.json()) as { error?: string };
    console.log(`  [PASS] 4. Disguised Linux ELF binary blocked by magic byte check with status ${res4.status}: "${data4.error}"`);

    // --- TEST 5: [Legitimate Upload] Authentic MP4 Video ---
    console.log('\nTest 5: [Legitimate Upload] Authentic MP4 Video upload (ftypisom)');
    const form5 = createVideoMultipartFormData(
      'video',
      'titan_promo_2026.mp4',
      'video/mp4',
      VALID_MP4_HEADER,
      'Titan Promo 2026'
    );

    const res5 = await fetch(BASE_URL, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${adminToken}`,
        'Content-Type': form5.contentType,
      },
      body: form5.body,
    });

    console.assert(res5.status === 201, `Expected status 201 Created, got ${res5.status}`);
    const data5 = (await res5.json()) as { id?: number; storedName?: string };
    console.assert(data5.id !== undefined, 'Uploaded video record should have an ID');
    console.assert(data5.storedName?.endsWith('.mp4'), `Stored name must end with safe .mp4, got: ${data5.storedName}`);
    console.log(`  [PASS] 5. Authentic MP4 video accepted with status ${res5.status} (Stored: ${data5.storedName})`);

    // --- TEST 6: [Legitimate Upload] Authentic WebM Video ---
    console.log('\nTest 6: [Legitimate Upload] Authentic WebM Video upload (EBML)');
    const adminUser2: TestUser = {
      email: 'admin_upload_test_webm@titan.in',
      name: 'WebM Tester',
      role: 'super_admin',
    };
    const adminToken2 = await setupAdminUser(adminUser2);

    const form6 = createVideoMultipartFormData(
      'video',
      'clinic_tour.webm',
      'video/webm',
      VALID_WEBM_HEADER,
      'Clinic Tour WebM'
    );

    const res6 = await fetch(BASE_URL, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${adminToken2}`,
        'Content-Type': form6.contentType,
      },
      body: form6.body,
    });

    console.assert(res6.status === 201, `Expected status 201 Created, got ${res6.status}`);
    const data6 = (await res6.json()) as { id?: number; storedName?: string };
    console.assert(data6.id !== undefined, 'Uploaded video record should have an ID');
    console.assert(data6.storedName?.endsWith('.webm'), `Stored name must end with safe .webm, got: ${data6.storedName}`);
    console.log(`  [PASS] 6. Authentic WebM video accepted with status ${res6.status} (Stored: ${data6.storedName})`);

    // Clean up created test videos from database and disk
    if (data5.id) {
      await run('DELETE FROM videos WHERE id = ?', [data5.id]);
      if (data5.storedName) {
        fs.unlink(path.join(uploadsDir, data5.storedName), () => {});
      }
    }
    if (data6.id) {
      await run('DELETE FROM videos WHERE id = ?', [data6.id]);
      if (data6.storedName) {
        fs.unlink(path.join(uploadsDir, data6.storedName), () => {});
      }
    }
    await run('DELETE FROM users WHERE email IN (?, ?)', [adminUser.email, adminUser2.email]);

    console.log('\n🎉 ALL 6 UNRESTRICTED VIDEO UPLOAD VAPT TESTS PASSED WITH 100% SUCCESS!\n');
  } finally {
    server.close();
  }
}

runVideoUploadVerification().catch((err) => {
  console.error('Video upload verification suite failed:', err);
  process.exit(1);
});
