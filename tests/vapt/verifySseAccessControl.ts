import assert from 'assert';
import type { Response } from 'express';

import { isClientAuthorizedForEvent } from '../../dist-server/utils/sse.js';
type SseClient = any;

console.log('========================================================');
console.log('   VAPT VERIFICATION: SSE Access Control & PII Isolation');
console.log('========================================================\n');

// Mock Express Response objects
function createMockResponse(): Response {
  return {
    write: () => true,
  } as unknown as Response;
}

// Mock Clients
const storeAClient: SseClient = {
  id: 1,
  res: createMockResponse(),
  user: {
    email: 'store-a@titan.in',
    name: 'Store A Staff',
    role: 'store',
    storeName: 'STRA',
  },
};

const storeBClient: SseClient = {
  id: 2,
  res: createMockResponse(),
  user: {
    email: 'store-b@titan.in',
    name: 'Store B Staff',
    role: 'store',
    storeName: 'STRB',
  },
};

const optometristClient: SseClient = {
  id: 3,
  res: createMockResponse(),
  user: {
    email: 'optom@titan.in',
    name: 'Dr. Sharma',
    role: 'optometrist',
  },
};

const seniorOptomClient: SseClient = {
  id: 4,
  res: createMockResponse(),
  user: {
    email: 'senior.optom@titan.in',
    name: 'Dr. Lead',
    role: 'senior_optometrist',
  },
};

const adminClient: SseClient = {
  id: 5,
  res: createMockResponse(),
  user: {
    email: 'admin@titan.in',
    name: 'Platform Admin',
    role: 'admin',
  },
};

// =========================================================================
// TEST 1: CALL_SESSION_READY (ACS Call Token Protection)
// =========================================================================
console.log('Test 1: Verify ACS Call Session Ready Isolation (No Token Leak)');

const callSessionData = {
  customerId: 'CUST-1001',
  groupId: 'group-uuid-1234',
  meetingUrl: 'https://teams.microsoft.com/meeting-secret',
  role: 'store',
  storeName: 'STRA',
  token: 'sensitive-acs-jwt-token-string',
};

// Store A should receive Store A's call token
const storeACheck = isClientAuthorizedForEvent(storeAClient, 'CALL_SESSION_READY', callSessionData, {
  targetStore: 'STRA',
  targetStoreOnly: true,
});
assert.strictEqual(storeACheck.authorized, true, 'Store A must receive its own CALL_SESSION_READY event');
console.log('  ✓ 1a. Store A receives its own call token');

// Store B MUST NOT receive Store A's call token
const storeBCheck = isClientAuthorizedForEvent(storeBClient, 'CALL_SESSION_READY', callSessionData, {
  targetStore: 'STRA',
  targetStoreOnly: true,
});
assert.strictEqual(storeBCheck.authorized, false, 'CRITICAL: Store B must NOT receive Store A call session!');
console.log('  ✓ 1b. Store B is strictly blocked from receiving Store A call session');

// Optometrist must NOT receive storeSession via SSE broadcast (optometrist receives their own session via HTTP response)
const optomCheck = isClientAuthorizedForEvent(optometristClient, 'CALL_SESSION_READY', callSessionData, {
  targetStore: 'STRA',
  targetStoreOnly: true,
});
assert.strictEqual(optomCheck.authorized, false, 'Optometrist must not receive storeSession broadcast');
console.log('  ✓ 1c. Optometrist client does not receive storeSession broadcast');

// =========================================================================
// TEST 2: CUSTOMER_CREATED & CUSTOMER_UPDATED (Cross-Store PII Protection)
// =========================================================================
console.log('\nTest 2: Verify Cross-Store Customer PII Isolation');

const customerData = {
  age: 45,
  customerId: 'CUST-0099',
  id: 'CUST-0099',
  mobile: '9876543210',
  name: 'John Doe',
  optometristFeedback: 'Sensitive clinical evaluation',
  rxData: { sphere: -2.5, cylinder: -0.75, axis: 90 },
  storeName: 'STRA',
};

// Store A should receive its customer update
const custStoreA = isClientAuthorizedForEvent(storeAClient, 'CUSTOMER_UPDATED', customerData);
assert.strictEqual(custStoreA.authorized, true, 'Store A must receive updates for its own customer');
console.log('  ✓ 2a. Store A authorized for Store A customer');

// Store B MUST NOT receive Store A's customer update (IDOR / PII Leak Prevention)
const custStoreB = isClientAuthorizedForEvent(storeBClient, 'CUSTOMER_UPDATED', customerData);
assert.strictEqual(custStoreB.authorized, false, 'CRITICAL: Store B must NEVER receive Store A customer PII!');
console.log('  ✓ 2b. Store B blocked from receiving Store A customer PII');

// Optometrist and Admin should receive clinical updates
const custOptom = isClientAuthorizedForEvent(optometristClient, 'CUSTOMER_UPDATED', customerData);
assert.strictEqual(custOptom.authorized, true, 'Optometrist receives customer update for consultation');
const custAdmin = isClientAuthorizedForEvent(adminClient, 'CUSTOMER_UPDATED', customerData);
assert.strictEqual(custAdmin.authorized, true, 'Admin receives customer update');
console.log('  ✓ 2c. Clinical staff and Admin receive queue updates');

// =========================================================================
// TEST 3: CUSTOMER_DELETED Isolation
// =========================================================================
console.log('\nTest 3: Verify Customer Deletion Scoping');

const deleteData = { id: 'CUST-0099', storeName: 'STRA' };
const delStoreA = isClientAuthorizedForEvent(storeAClient, 'CUSTOMER_DELETED', deleteData);
assert.strictEqual(delStoreA.authorized, true, 'Store A receives delete for its own customer');
const delStoreB = isClientAuthorizedForEvent(storeBClient, 'CUSTOMER_DELETED', deleteData);
assert.strictEqual(delStoreB.authorized, false, 'Store B must NOT receive delete for Store A customer');
console.log('  ✓ 3. Customer delete events are isolated per store');

// =========================================================================
// TEST 4: USER_* Lifecycle Events Isolation
// =========================================================================
console.log('\nTest 4: Verify User Lifecycle Events Isolation (Admin Only)');

const userCreatedData = {
  email: 'newuser@titan.in',
  name: 'New Staff',
  role: 'store',
  storeName: 'STRC',
};

const userStoreA = isClientAuthorizedForEvent(storeAClient, 'USER_CREATED', userCreatedData);
assert.strictEqual(userStoreA.authorized, false, 'Store clients must NOT receive USER_CREATED events');
const userOptom = isClientAuthorizedForEvent(optometristClient, 'USER_CREATED', userCreatedData);
assert.strictEqual(userOptom.authorized, false, 'Optometrist clients must NOT receive USER_CREATED events');
const userAdmin = isClientAuthorizedForEvent(adminClient, 'USER_CREATED', userCreatedData);
assert.strictEqual(userAdmin.authorized, true, 'Admin MUST receive USER_CREATED events');
console.log('  ✓ 4. USER_CREATED events restricted to Admin only');

// =========================================================================
// TEST 5: USER_UPDATED Presence Sanitization
// =========================================================================
console.log('\nTest 5: Verify USER_UPDATED Presence Sanitization');

const presenceData = {
  email: 'optom@titan.in',
  isLoggedIn: true,
  lastLogin: '2026-11-17T08:00:00Z',
  mobile: '9999999999',
  role: 'optometrist',
};

// Admin gets full data
const adminPres = isClientAuthorizedForEvent(adminClient, 'USER_UPDATED', presenceData);
assert.strictEqual(adminPres.authorized, true);
assert.strictEqual(adminPres.sanitizedPayload, undefined, 'Admin should receive unsanitized payload');

// Store client gets sanitized data (email and isLoggedIn only, no mobile/role/timestamps)
const storePres = isClientAuthorizedForEvent(storeAClient, 'USER_UPDATED', presenceData);
assert.strictEqual(storePres.authorized, true);
assert.deepStrictEqual(storePres.sanitizedPayload, {
  email: 'optom@titan.in',
  isLoggedIn: true,
}, 'Non-admin must receive sanitized presence data without PII');
console.log('  ✓ 5. Non-admin presence update is strictly sanitized (no PII leak)');

console.log('\n========================================================');
console.log('   🎉 ALL SSE ACCESS CONTROL & PII TESTS PASSED!');
console.log('========================================================\n');
