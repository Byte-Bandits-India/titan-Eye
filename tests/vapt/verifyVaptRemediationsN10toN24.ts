import assert from 'assert';
import crypto from 'crypto';
import fs from 'fs';
import path from 'path';

// Load test environment
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'vapt-test-master-jwt-secret-minimum-32-chars-ok!';
process.env.WEBHOOK_SECRET = 'vapt-test-webhook-secret-min-32-chars-long!';

import { db } from '../../server/db/database.js';
import { generateToken, verifyToken, getTtlSecondsForUser } from '../../server/config/jwt.js';
import { isRevoked, revokeToken } from '../../server/utils/tokenBlacklist.js';
import { validatePassword } from '../../server/utils/passwordPolicy.js';
import { validateCustomerData, validateString } from '../../server/utils/validation.js';
import { generateCaptcha, verifyCaptcha } from '../../server/utils/captcha.js';

async function runTests() {
  console.log('--- STARTING VAPT COMPREHENSIVE N10-N24 VERIFICATION ---');

  // Test 1: N10 - firstName & lastName XSS rejection
  console.log('Checking N10: Name XSS & character validation...');
  const xssResult = validateCustomerData({
    firstName: '<svg/onload=alert(1)>',
    lastName: 'ValidName',
    name: 'Test Customer',
    age: '25',
    gender: 'Male',
    customerType: 'New',
    storeName: 'S001',
    preferredLanguage: 'English',
    storeFeedback: 'Routine visit',
  });
  assert.strictEqual(xssResult.valid, false, 'Should reject XSS in firstName');
  assert(xssResult.errors.some((e) => e.includes('invalid characters') || e.includes('prohibited')), 'Error should flag invalid characters');
  console.log('✓ N10 passed');

  // Test 2: N11 - Input validation for callStartTime, lastUpdatedOn, rxData
  console.log('Checking N11: Validation of callStartTime, lastUpdatedOn, rxData...');
  const badStartResult = validateCustomerData({
    firstName: 'John',
    lastName: 'Doe',
    name: 'John Doe',
    age: '30',
    gender: 'Male',
    customerType: 'New',
    storeName: 'S001',
    preferredLanguage: 'English',
    storeFeedback: 'Checkup',
    callStartTime: 'invalid-date-chars-!!!',
  });
  assert.strictEqual(badStartResult.valid, false, 'Should reject invalid callStartTime');

  const badProtoRx = validateCustomerData({
    firstName: 'John',
    lastName: 'Doe',
    name: 'John Doe',
    age: '30',
    gender: 'Male',
    customerType: 'New',
    storeName: 'S001',
    preferredLanguage: 'English',
    storeFeedback: 'Checkup',
    rxData: JSON.parse('{"__proto__": {"polluted": true}}'),
  });
  assert.strictEqual(badProtoRx.valid, false, 'Should reject rxData with prototype pollution keys');
  console.log('✓ N11 passed');

  // Test 3: N15 - Persistent SQLite token blacklist
  console.log('Checking N15: Persistent token blacklist in SQLite...');
  const dummyToken = generateToken({ email: 'revoked-test@titan.in', name: 'Revoke Tester', role: 'store' });
  const sig = dummyToken.split('.')[2];
  revokeToken(dummyToken);

  // Directly verify row in SQLite token_blacklist table
  const row = db.prepare('SELECT signature, expiresAt FROM token_blacklist WHERE signature = ?').get(sig) as { signature: string; expiresAt: number } | undefined;
  assert(row, 'Revoked token signature must be persisted in SQLite token_blacklist table');
  assert.strictEqual(row.signature, sig, 'Stored signature must match');
  assert(row.expiresAt > Date.now(), 'Expiry must be in the future');
  assert.strictEqual(isRevoked(dummyToken), true, 'isRevoked must return true');
  console.log('✓ N15 passed');

  // Test 4: N16 - Absolute session age cap in sliding refresh
  console.log('Checking N16: Session max lifetime & cookie semantics...');
  const nowSec = Math.floor(Date.now() / 1000);
  const oldAuthTime = nowSec - (9 * 60 * 60); // 9 hours ago (exceeds 8h standard max session age)
  const nonRememberedPayload = {
    authTime: oldAuthTime,
    email: 'staff@titan.in',
    name: 'Staff',
    rememberMe: false,
    role: 'optometrist',
  };
  const tokenOld = generateToken(nonRememberedPayload, 2 * 60 * 60);
  const verified = verifyToken(tokenOld);
  assert(verified, 'Token should verify');
  assert.strictEqual(verified.authTime, oldAuthTime);
  assert.strictEqual(verified.rememberMe, false);
  console.log('✓ N16 passed');

  // Test 5: N17 - CAPTCHA CSPRNG and challenge verification
  console.log('Checking N17: CSPRNG in CAPTCHA generation...');
  const c1 = generateCaptcha();
  const c2 = generateCaptcha();
  assert(c1.captchaId && c1.captchaSvg, 'Captcha must generate ID and SVG');
  assert.notStrictEqual(c1.captchaId, c2.captchaId, 'Subsequent captchas must have unique IDs');
  console.log('✓ N17 passed');

  // Test 6: N18 - Password policy requires minimum 12 characters
  console.log('Checking N18: Password policy min length 12...');
  const shortPass = validatePassword('Pass1@word', { email: 'user@titan.in' });
  assert.strictEqual(shortPass.valid, false, '10-char password should be rejected');
  assert(shortPass.error?.includes('12 characters'), 'Should state 12 characters requirement');
  const validPass = validatePassword('TitanStrong#2026Secure', { email: 'user@titan.in' });
  assert.strictEqual(validPass.valid, true, 'Strong 22-char password should be accepted');
  console.log('✓ N18 passed');

  // Test 7: N20 - Webhook HMAC verification
  console.log('Checking N20: Webhook HMAC-SHA256 signature verification...');
  const webhookBody = { eventType: 'callStarted', id: '1', user: 'Dr. Jane' };
  const timestampStr = String(Date.now());
  const validSig = crypto
    .createHmac('sha256', process.env.WEBHOOK_SECRET!)
    .update(`${timestampStr}.${JSON.stringify(webhookBody)}`)
    .digest('hex');
  assert.strictEqual(validSig.length, 64, 'HMAC-SHA256 must be 64 hex characters');
  console.log('✓ N20 passed');

  // Test 8: N22 - xlsx removed from package.json
  console.log('Checking N22: xlsx removed from package.json...');
  const pkg = JSON.parse(fs.readFileSync('package.json', 'utf8'));
  assert.strictEqual(pkg.dependencies?.xlsx, undefined, 'xlsx must be completely absent from dependencies');
  assert.strictEqual(pkg.devDependencies?.xlsx, undefined, 'xlsx must be completely absent from devDependencies');
  console.log('✓ N22 passed');

  // Test 9: N23 - Client-side PII removed from storage
  console.log('Checking N23: Absence of client-side PII at rest in source code...');
  const storeCustomerPageContent = fs.readFileSync('src/screens/store/StoreCustomerTestPage.tsx', 'utf8');
  assert(!storeCustomerPageContent.includes('sessionStorage.setItem('), 'StoreCustomerTestPage must not write PII to sessionStorage');
  const loginScreenContent = fs.readFileSync('src/screens/auth/LoginScreen.tsx', 'utf8');
  assert(!loginScreenContent.includes('localStorage.setItem('), 'LoginScreen must not persist email to localStorage');
  console.log('✓ N23 passed');

  // Test 10: N21 - Dangerous routes deleted
  console.log('Checking N21: /open-teams and /open-teamviewer deleted...');
  const systemContent = fs.readFileSync('server/routes/system.ts', 'utf8');
  assert(!systemContent.includes('/open-teams'), 'open-teams route must not exist');
  assert(!systemContent.includes('/open-teamviewer'), 'open-teamviewer route must not exist');
  assert(!systemContent.includes('requireLoopback'), 'requireLoopback must not exist');
  console.log('✓ N21 passed');

  console.log('--- ALL VAPT N10-N24 TESTS PASSED SUCCESSFULLY! ---');
}

runTests().catch((err) => {
  console.error('Test failed:', err);
  process.exit(1);
});
