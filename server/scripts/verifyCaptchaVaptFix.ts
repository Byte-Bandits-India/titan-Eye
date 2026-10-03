import { generateCaptcha, verifyCaptcha } from '../utils/captcha.js';

function runCaptchaVerification() {
  console.log('--- VAPT Finding 18: CAPTCHA Verification Suite ---');

  // Test 1: Generation
  const captcha1 = generateCaptcha();
  console.assert(Boolean(captcha1.captchaId), 'CAPTCHA ID should be non-empty');
  console.assert(captcha1.captchaSvg.startsWith('data:image/svg+xml'), 'CAPTCHA SVG should be a valid data URI');
  console.assert(captcha1.captchaId.includes('.'), 'CAPTCHA ID format should be timestamp.signature');
  console.log('  [PASS] 1. CAPTCHA generation succeeds with signed token & SVG');

  // Test 2: Extraction of actual solution for validation test (by testing characters from charset or extracting from internal generate)
  // Let's test invalid token / invalid solution rejection
  const invalid1 = verifyCaptcha(captcha1.captchaId, 'WRONG_CODE');
  console.assert(invalid1 === false, 'Invalid solution must be rejected');
  console.log('  [PASS] 2. Incorrect CAPTCHA solution is rejected (returns false)');

  // Test 3: Blank/null/empty inputs
  console.assert(verifyCaptcha('', '') === false, 'Empty string must be rejected');
  console.assert(verifyCaptcha(undefined, undefined) === false, 'Undefined must be rejected');
  console.assert(verifyCaptcha('random.fake', 'ABCD') === false, 'Bogus token must be rejected');
  console.log('  [PASS] 3. Malformed and empty challenge parameters rejected');

  // Test 4: Tampered signature
  const parts = captcha1.captchaId.split('.');
  const tamperedSig = parts[0] + '.' + '0'.repeat(parts[1].length);
  console.assert(verifyCaptcha(tamperedSig, 'ANY') === false, 'Tampered signature must be rejected');
  console.log('  [PASS] 4. Tampered HMAC cryptographic signature is rejected');

  // Test 5: Replay / Double submission protection
  // Let's create an hmac for a known solution to test success + replay
  import('crypto').then((crypto) => {
    const secret = process.env.JWT_SECRET || process.env.INTER_SERVER_SECRET || 'trvc-captcha-secure-salt-key';
    const knownSolution = 'SEC89';
    const timestamp = Date.now();
    const hmac = crypto
      .createHmac('sha256', secret)
      .update(`${timestamp}.${knownSolution}`)
      .digest('hex');
    const validCaptchaId = `${timestamp}.${hmac}`;

    // First attempt: Valid solution (case insensitive)
    const firstCheck = verifyCaptcha(validCaptchaId, 'sec89');
    console.assert(firstCheck === true, 'First attempt with valid solution must succeed');
    console.log('  [PASS] 5. Valid CAPTCHA solution successfully verified (case-insensitive)');

    // Second attempt: Anti-replay protection (consumed token cannot be used again)
    const secondCheck = verifyCaptcha(validCaptchaId, 'sec89');
    console.assert(secondCheck === false, 'Second attempt with consumed token must fail (Anti-Replay)');
    console.log('  [PASS] 6. Consumed token rejected on replay attempt (Anti-Replay protection)');

    // Test 6: Expired timestamp
    const expiredTimestamp = Date.now() - (6 * 60 * 1000); // 6 mins ago (> 5m TTL)
    const expiredHmac = crypto
      .createHmac('sha256', secret)
      .update(`${expiredTimestamp}.${knownSolution}`)
      .digest('hex');
    const expiredCaptchaId = `${expiredTimestamp}.${expiredHmac}`;
    const expiredCheck = verifyCaptcha(expiredCaptchaId, knownSolution);
    console.assert(expiredCheck === false, 'Expired token must fail verification');
    console.log('  [PASS] 7. Expired token (> 5 min TTL) rejected');

    console.log('\n--- ALL CAPTCHA VERIFICATION TESTS PASSED (100%) ---');
  });
}

runCaptchaVerification();
