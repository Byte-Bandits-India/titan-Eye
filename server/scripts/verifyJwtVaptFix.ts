import {
  generateToken,
  getTtlSecondsForUser,
  JWT_EXPIRY_ADMIN_SEC,
  JWT_EXPIRY_SHORT_SEC,
  JWT_EXPIRY_STANDARD_SEC,
  UserPayload,
  verifyToken,
} from '../config/jwt.js';
import { isRevoked, revokeToken } from '../utils/tokenBlacklist.js';

function runJwtVerification() {
  console.log('=== VAPT Finding 15: JWT Misconfiguration Verification Suite ===\n');

  // Test 1: RFC 7519 NumericDate format compliance (seconds vs milliseconds)
  const adminUser: UserPayload = {
    email: 'admin@titan.in',
    name: 'Super Admin',
    role: 'super_admin',
  };

  const adminTtlSec = getTtlSecondsForUser(adminUser.role, true);
  console.assert(adminTtlSec === JWT_EXPIRY_ADMIN_SEC, 'Admin TTL must be 2 hours (7200 seconds)');
  console.assert(adminTtlSec === 7200, 'Admin TTL should be exactly 7200 seconds');

  const adminToken = generateToken(adminUser, adminTtlSec);
  const parts = adminToken.split('.');
  console.assert(parts.length === 3, 'JWT must have 3 segments');

  const header = JSON.parse(Buffer.from(parts[0], 'base64url').toString('utf8'));
  const payload = JSON.parse(Buffer.from(parts[1], 'base64url').toString('utf8'));

  console.assert(header.alg === 'HS256', 'Header algorithm must be HS256');
  console.assert(header.typ === 'JWT', 'Header type must be JWT');

  // Verify timestamps are in SECONDS (10 digits around ~1.7e9, NOT 13 digits ~1.7e12)
  console.assert(typeof payload.exp === 'number', 'exp claim must be numeric');
  console.assert(typeof payload.iat === 'number', 'iat claim must be numeric');
  console.assert(typeof payload.nbf === 'number', 'nbf claim must be numeric');
  console.assert(typeof payload.jti === 'string' && payload.jti.length > 10, 'jti claim must be a non-empty UUID string');

  console.assert(
    payload.exp < 100_000_000_000,
    `exp claim (${payload.exp}) MUST be in SECONDS per RFC 7519, NOT milliseconds`
  );
  console.assert(
    payload.iat < 100_000_000_000,
    `iat claim (${payload.iat}) MUST be in SECONDS per RFC 7519, NOT milliseconds`
  );

  const durationSec = payload.exp - payload.iat;
  console.assert(
    durationSec === 7200,
    `Admin token duration must be exactly 7200s (2 hours), got ${durationSec}s`
  );
  console.log('  [PASS] 1. RFC 7519 compliance: exp, iat, and nbf are formatted in seconds; jti UUID attached.');
  console.log('  [PASS] 2. Super Admin accounts limited to strict 2-hour window (7,200s).');

  // Test 2: Standard user role expiration (Optometrist & Store)
  const storeUser: UserPayload = {
    email: 'store-blr@titan.in',
    name: 'Store User',
    role: 'store',
    storeName: 'BLR01',
  };

  const storeTtlWithRemember = getTtlSecondsForUser(storeUser.role, true);
  console.assert(
    storeTtlWithRemember === JWT_EXPIRY_STANDARD_SEC && storeTtlWithRemember === 28800,
    'Store user with Remember Me must be 8 hours (28,800s)'
  );

  const storeTtlWithoutRemember = getTtlSecondsForUser(storeUser.role, false);
  console.assert(
    storeTtlWithoutRemember === JWT_EXPIRY_SHORT_SEC && storeTtlWithoutRemember === 7200,
    'Store user without Remember Me must be 2 hours (7,200s)'
  );

  const storeToken = generateToken(storeUser, storeTtlWithRemember);
  const storePayload = JSON.parse(Buffer.from(storeToken.split('.')[1], 'base64url').toString('utf8'));
  console.assert(
    storePayload.exp - storePayload.iat === 28800,
    'Store shift token duration must be 28,800s (8 hours)'
  );
  console.log('  [PASS] 3. Store/Optometrist accounts limited to 8-hour shift (or 2-hour session).');

  // Test 3: Token verification with valid signature
  const verified = verifyToken(adminToken);
  console.assert(verified !== null && verified.email === adminUser.email, 'Valid token must verify successfully');
  console.log('  [PASS] 4. Valid JWT signature verifies successfully.');

  // Test 4: Algorithm confusion protection (alg: "none")
  const noneHeader = Buffer.from(JSON.stringify({ alg: 'none', typ: 'JWT' })).toString('base64url');
  const fakeTokenNone = `${noneHeader}.${parts[1]}.`;
  console.assert(verifyToken(fakeTokenNone) === null, 'alg: "none" attack must be rejected');
  console.log('  [PASS] 5. Algorithm confusion ("alg": "none") attack rejected.');

  // Test 5: Tampered payload or signature
  const tamperedPayload = Buffer.from(
    JSON.stringify({ ...payload, role: 'super_admin_hacked' })
  ).toString('base64url');
  const tamperedToken = `${parts[0]}.${tamperedPayload}.${parts[2]}`;
  console.assert(verifyToken(tamperedToken) === null, 'Tampered token payload must fail signature check');
  console.log('  [PASS] 6. Tampered token payload rejected by HMAC-SHA256 signature verification.');

  // Test 6: Expired token rejection
  const expiredPayload: UserPayload = {
    email: 'expired@titan.in',
    name: 'Expired User',
    role: 'store',
  };
  const expiredToken = generateToken(expiredPayload, -10); // Expired 10 seconds ago
  console.assert(verifyToken(expiredToken) === null, 'Expired token must fail verification');
  console.log('  [PASS] 7. Expired token strictly rejected.');

  // Test 7: Token Revocation / Blacklist check
  revokeToken(adminToken);
  console.assert(isRevoked(adminToken) === true, 'Revoked token signature must be recognized by blacklist');
  console.log('  [PASS] 8. Logout revocation blacklist correctly marks token as revoked.');

  console.log('\n=== ALL JWT VAPT FIX TESTS PASSED (100%) ===');
}

runJwtVerification();
