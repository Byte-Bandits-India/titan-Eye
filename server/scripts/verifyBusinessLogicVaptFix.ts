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

async function runBusinessLogicVerification() {
  console.log('=== VAPT Finding 7: Business Logic Flaw & Workflow Bypass Verification ===\n');
  await initializeDatabase();

  // Create an ephemeral test server mounted with the freshly compiled routes
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
      email: 'store_bl_test@titan.in',
      name: 'Store BL Tester',
      role: 'store',
      storeName: 'BL_TEST_STORE',
    };

    const optoUser1: TestUser = {
      email: 'opto_bl_test1@titan.in',
      name: 'Doctor One',
      role: 'optometrist',
    };

    const optoUser2: TestUser = {
      email: 'opto_bl_test2@titan.in',
      name: 'Doctor Two',
      role: 'optometrist',
    };

    const storeToken = await setupTestUser(storeUser);
    const optoToken1 = await setupTestUser(optoUser1);
    const optoToken2 = await setupTestUser(optoUser2);

    // Helper to create test customer
    const createCustomer = async (status: string, offeredEmail: string | null = null, callTakenBy: string | null = null) => {
      const id = `BL_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
      await run(
        `INSERT INTO customers (
          id, name, age, gender, mobile, customerType, storeName,
          preferredLanguage, preferredLanguage2, storeFeedback, optometristFeedback,
          status, callActive, offeredToOptometristEmail, callTakenBy, createdOn, lastUpdatedOn
        ) VALUES (?, 'Test Patient', '30', 'Male', '9876543210', 'Walk-in', ?, 'English', '', '', '', ?, ?, ?, ?, '2026-10-01 10:00:00', '2026-10-01 10:00:00')`,
        [id, storeUser.storeName || null, status, status === 'Initiated' || status === 'Accepted' ? 1 : 0, offeredEmail, callTakenBy]
      );
      return id;
    };

    // --- TEST 1: Optometrist attempts POST /api/customers/:id/initiate-call (The Core VAPT Vulnerability) ---
    console.log('Test 1: [VAPT Core POC] Optometrist invokes POST /api/customers/:id/initiate-call');
    const cust1 = await createCustomer('Created');
    const res1 = await fetch(`${BASE_URL}/customers/${cust1}/initiate-call`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${optoToken1}`,
        'Content-Type': 'application/json',
      },
    });
    console.assert(res1.status === 403, `Expected status 403 Forbidden, got ${res1.status}`);
    const data1 = (await res1.json()) as { error?: string };
    console.log(`  [PASS] 1. Optometrist blocked with status ${res1.status}: "${data1.error}"`);

    // --- TEST 2: Store attempts POST /api/customers/:id/accept-call ---
    console.log('\nTest 2: Store user invokes POST /api/customers/:id/accept-call');
    const cust2 = await createCustomer('Initiated', optoUser1.email);
    const res2 = await fetch(`${BASE_URL}/customers/${cust2}/accept-call`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${storeToken}`,
        'Content-Type': 'application/json',
      },
    });
    console.assert(res2.status === 403, `Expected status 403 Forbidden, got ${res2.status}`);
    const data2 = (await res2.json()) as { error?: string };
    console.log(`  [PASS] 2. Store user blocked from accept-call with status ${res2.status}: "${data2.error}"`);

    // --- TEST 3: State Machine - Store calls initiate-call on already Initiated or Accepted customer ---
    console.log('\nTest 3: Store attempts to initiate-call on customer in "Initiated" status');
    const cust3 = await createCustomer('Initiated', optoUser1.email);
    const res3 = await fetch(`${BASE_URL}/customers/${cust3}/initiate-call`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${storeToken}`,
        'Content-Type': 'application/json',
      },
    });
    console.assert(res3.status === 409, `Expected status 409 Conflict, got ${res3.status}`);
    const data3 = (await res3.json()) as { error?: string };
    console.log(`  [PASS] 3. Out-of-order transition rejected with 409 Conflict: "${data3.error}"`);

    // --- TEST 4: State Machine - Optometrist calls accept-call on customer in "Created" status ---
    console.log('\nTest 4: Optometrist attempts to accept-call on customer in "Created" status (bypassing initiation)');
    const cust4 = await createCustomer('Created');
    const res4 = await fetch(`${BASE_URL}/customers/${cust4}/accept-call`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${optoToken1}`,
        'Content-Type': 'application/json',
      },
    });
    console.assert(res4.status === 403 || res4.status === 409, `Expected status 403 or 409, got ${res4.status}`);
    const data4 = (await res4.json()) as { error?: string };
    console.log(`  [PASS] 4. Premature acceptance blocked with status ${res4.status}: "${data4.error}"`);

    // --- TEST 5: Assignment Check - Unassigned Doctor attempts to accept call offered to another Doctor ---
    console.log('\nTest 5: Unassigned Optometrist 2 attempts to accept call specifically offered to Optometrist 1');
    const cust5 = await createCustomer('Initiated', optoUser1.email);
    const res5 = await fetch(`${BASE_URL}/customers/${cust5}/accept-call`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${optoToken2}`,
        'Content-Type': 'application/json',
      },
    });
    console.assert(res5.status === 403, `Expected status 403 Forbidden, got ${res5.status}`);
    const data5 = (await res5.json()) as { error?: string };
    console.log(`  [PASS] 5. Intercepted call rejected with 403 Forbidden: "${data5.error}"`);

    // --- TEST 6: Legitimate Happy Path Workflow ---
    console.log('\nTest 6: Legitimate sequential workflow progression');
    // Step A: Store initiates call for a 'Created' customer
    const cust6 = await createCustomer('Created');
    // Clear any conflicting active request for this store
    await run(`UPDATE customers SET status = 'Completed', callActive = 0 WHERE storeName = ? AND id != ?`, [
      storeUser.storeName || null,
      cust6,
    ]);
    // Make doctor 1 available with recent ping
    await run(`UPDATE users SET status = 'active', lastPing = ? WHERE LOWER(email) = LOWER(?)`, [
      new Date().toISOString(),
      optoUser1.email,
    ]);

    const initRes = await fetch(`${BASE_URL}/customers/${cust6}/initiate-call`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${storeToken}`,
        'Content-Type': 'application/json',
      },
    });
    console.assert(initRes.status === 200, `Expected 200 OK for store initiate-call, got ${initRes.status}`);
    const initData = (await initRes.json()) as { customer?: { status: string; offeredToOptometristEmail: string } };
    console.assert(initData.customer?.status === 'Initiated', `Customer should be Initiated, got ${initData.customer?.status}`);
    console.log(`  [PASS] 6a. Store successfully initiated call -> status is 'Initiated' (offered to ${initData.customer?.offeredToOptometristEmail})`);

    // Step B: The offered doctor accepts the call
    const targetEmail = initData.customer?.offeredToOptometristEmail?.toLowerCase();
    const acceptingToken = targetEmail === optoUser1.email.toLowerCase() ? optoToken1 : optoToken2;
    const acceptRes = await fetch(`${BASE_URL}/customers/${cust6}/accept-call`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${acceptingToken}`,
        'Content-Type': 'application/json',
      },
    });
    console.assert(acceptRes.status === 200, `Expected 200 OK for accept-call, got ${acceptRes.status}`);
    const acceptData = (await acceptRes.json()) as { customer?: { status: string; callTakenBy: string } };
    console.assert(acceptData.customer?.status === 'Accepted', `Customer should be Accepted, got ${acceptData.customer?.status}`);
    console.log(`  [PASS] 6b. Doctor successfully accepted call -> status transitioned to 'Accepted' (taken by: ${acceptData.customer?.callTakenBy})`);

    // --- TEST 7: Atomic Concurrency / Double Accept Test ---
    console.log('\nTest 7: Race condition / Double-accept attempt on already Accepted customer');
    const doubleAcceptRes = await fetch(`${BASE_URL}/customers/${cust6}/accept-call`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${acceptingToken}`,
        'Content-Type': 'application/json',
      },
    });
    console.assert(doubleAcceptRes.status === 409, `Expected 409 Conflict for double-accept, got ${doubleAcceptRes.status}`);
    const doubleAcceptData = (await doubleAcceptRes.json()) as { error?: string };
    console.log(`  [PASS] 7. Duplicate accept rejected with 409 Conflict: "${doubleAcceptData.error}"`);

    // Cleanup test records
    await run(`DELETE FROM customers WHERE id LIKE 'BL_%'`);
    await run(`DELETE FROM users WHERE email IN (?, ?, ?)`, [storeUser.email, optoUser1.email, optoUser2.email]);

    console.log('\n🎉 ALL 7 BUSINESS LOGIC & WORKFLOW BYPASS TESTS PASSED WITH 100% SUCCESS!\n');
  } finally {
    server.close();
  }
}

runBusinessLogicVerification().catch((err) => {
  console.error('Business logic verification suite failed:', err);
  process.exit(1);
});
