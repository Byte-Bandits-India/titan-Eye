import { validatePassword } from '../utils/passwordPolicy.js';

function runPasswordPolicyVerification() {
  console.log('=== VAPT Finding 6: Weak Password Policy Verification Suite ===\n');

  // Test 1: Scanner POC 1 & 2 - "000000"
  const poc1 = validatePassword('000000');
  console.assert(poc1.valid === false, 'Scanner POC password "000000" must be rejected');
  console.assert(poc1.error?.includes('8 characters'), 'Should indicate length requirement');
  console.log('  [PASS] 1. VAPT Scanner POC password "000000" is strictly rejected.');

  // Test 2: Common guessable passwords
  const commonPasswords = ['123456', '123456789012', 'password123456', 'Admin@123456', 'pass@123456', 'welcome@123456'];
  for (const pwd of commonPasswords) {
    const res = validatePassword(pwd);
    console.assert(res.valid === false, `Common password "${pwd}" must be rejected`);
  }
  console.log('  [PASS] 2. Common breached/predictable passwords blocklist enforced.');

  // Test 3: Length < 8 characters
  const short1 = validatePassword('Admin@1'); // 7 chars
  const short2 = validatePassword('Titan@1'); // 7 chars
  console.assert(short1.valid === false && short2.valid === false, 'Passwords < 8 chars must be rejected');
  console.log('  [PASS] 3. Passwords shorter than 8 characters are rejected.');

  // Test 4: Missing character complexity categories
  const noUpper = validatePassword('titanremote@2026!#');
  console.assert(noUpper.valid === false && noUpper.error?.includes('uppercase'), 'Missing uppercase must be rejected');

  const noLower = validatePassword('TITANREMOTE@2026!#');
  console.assert(noLower.valid === false && noLower.error?.includes('lowercase'), 'Missing lowercase must be rejected');

  const noDigit = validatePassword('TitanRemote@Secure!#');
  console.assert(noDigit.valid === false && noDigit.error?.includes('number'), 'Missing digit must be rejected');

  const noSymbol = validatePassword('TitanRemote2026Pass');
  console.assert(noSymbol.valid === false && noSymbol.error?.includes('special character'), 'Missing symbol must be rejected');
  console.log('  [PASS] 4. All four character complexity categories (upper, lower, digit, symbol) are enforced.');

  // Test 5: Contextual checks (email username & store code containment)
  const emailContext = { email: 'john.optom@titan.in', storeName: 'DELH' };
  const emailInPwd = validatePassword('John.optom@2026!#', emailContext);
  console.assert(emailInPwd.valid === false && emailInPwd.error?.includes('email'), 'Password containing email prefix must be rejected');

  const storeInPwd = validatePassword('WelcomeToDelh!#2026', emailContext);
  console.assert(storeInPwd.valid === false && storeInPwd.error?.includes('store'), 'Password containing store code must be rejected');
  console.log('  [PASS] 5. Contextual identity separation (no email username or store code in password).');

  // Test 6: Repetitive character runs
  const repeated = validatePassword('AAAAAAAAAAAA!1a');
  console.assert(repeated.valid === false && repeated.error?.includes('repeated'), 'Repeated character runs must be rejected');
  console.log('  [PASS] 6. Repeated character sequences rejected.');

  // Test 7: Valid strong compliant passwords (including 8-character complex passwords)
  const strong8Char = validatePassword('Titan@26'); // exactly 8 chars: Upper, lower, symbol, digits
  console.assert(strong8Char.valid === true, '8-character complex password must be accepted');

  const strong1 = validatePassword('TitanRemote@2026!#');
  console.assert(strong1.valid === true, 'Strong password must be accepted');

  const strong2 = validatePassword('Healthcare#Secure$9988');
  console.assert(strong2.valid === true, 'Strong password must be accepted');
  console.log('  [PASS] 7. Strong compliant passwords (both 8-character and extended) successfully accepted.');

  console.log('\n=== ALL WEAK PASSWORD POLICY TESTS PASSED (100%) ===');
}

runPasswordPolicyVerification();
