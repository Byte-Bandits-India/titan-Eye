import assert from 'assert';
import express from 'express';
import cookieParser from 'cookie-parser';

import { callsRouter } from '../../dist-server/routes/calls.js';
import { initializeDatabase, run } from '../../dist-server/db/database.js';

console.log('========================================================');
console.log('   VAPT VERIFICATION: /api/calls Authorization & IDOR');
console.log('========================================================\n');

interface MockResponse {
  body: any;
  status: number;
}

function invokeApp(
  app: express.Express,
  method: string,
  path: string,
  headers: Record<string, string>,
  body?: any
): Promise<MockResponse> {
  return new Promise((resolve) => {
    let statusCode = 200;
    let responseBody: any = null;

    const req: any = {
      body: body || {},
      cookies: {},
      headers: { ...headers },
      ip: '127.0.0.1',
      method,
      originalUrl: path,
      params: {},
      query: {},
      url: path,
    };

    const res: any = {
      json(data: any) {
        responseBody = data;
        resolve({ body: responseBody, status: statusCode });
      },
      send(data: any) {
        responseBody = data;
        resolve({ body: responseBody, status: statusCode });
      },
      sendStatus(code: number) {
        statusCode = code;
        resolve({ body: null, status: statusCode });
      },
      setHeader() {
        return this;
      },
      status(code: number) {
        statusCode = code;
        return this;
      },
    };

    app(req, res);
  });
}

async function runTests() {
  await initializeDatabase();

  // Create clean test customers in database
  await run('DELETE FROM customers WHERE id IN (?, ?, ?)', ['9991', '9992', '9993']);

  // Customer A in Store A (Queued)
  await run(
    `INSERT INTO customers (id, name, age, gender, customerType, storeName, preferredLanguage, preferredLanguage2, storeFeedback, optometristFeedback, status, callActive, callTakenBy)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    ['9991', 'Customer A', '30', 'Male', 'Regular', 'StoreA', 'English', 'Hindi', '', '', 'Queued', 0, null]
  );

  // Customer B in Store B (Queued)
  await run(
    `INSERT INTO customers (id, name, age, gender, customerType, storeName, preferredLanguage, preferredLanguage2, storeFeedback, optometristFeedback, status, callActive, callTakenBy)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    ['9992', 'Customer B', '40', 'Female', 'Regular', 'StoreB', 'English', 'Hindi', '', '', 'Queued', 0, null]
  );

  // Completed Customer in Store A
  await run(
    `INSERT INTO customers (id, name, age, gender, customerType, storeName, preferredLanguage, preferredLanguage2, storeFeedback, optometristFeedback, status, callActive, callTakenBy)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    ['9993', 'Completed Customer', '50', 'Male', 'Regular', 'StoreA', 'English', 'Hindi', '', '', 'Completed', 0, null]
  );

  // Setup test Express app with callsRouter
  const app = express();
  app.use(express.json());
  app.use(cookieParser());

  // Middleware to inject req.user from test headers
  app.use((req, _res, next) => {
    const role = (req.headers['x-test-role'] as string) || 'store';
    const storeName = (req.headers['x-test-store'] as string) || 'StoreA';
    const email = (req.headers['x-test-email'] as string) || 'user@titan.in';
    const name = (req.headers['x-test-name'] as string) || 'Test User';

    (req as any).user = { email, name, role, storeName };
    (req as any).requestId = 'test-req-id';
    next();
  });

  app.use('/api/calls', callsRouter);

  try {
    // =========================================================================
    // TEST 1: POST /api/calls/start RBAC & Status Validation
    // =========================================================================
    console.log('Test 1: Verify POST /api/calls/start Role & State Validation');

    // 1a. Store staff cannot start calls (must be optometrist or admin)
    const res1a = await invokeApp(
      app,
      'POST',
      '/api/calls/start',
      {
        'x-test-role': 'store',
        'x-test-store': 'StoreA',
      },
      { customerId: '9991' }
    );

    assert.strictEqual(res1a.status, 403, `Store role must get 403 on /calls/start (got ${res1a.status})`);
    console.log('  ✓ 1a. Store role blocked with 403 Forbidden on /calls/start');

    // 1b. Unassigned optometrist cannot access Completed customer -> 403
    const res1b1 = await invokeApp(
      app,
      'POST',
      '/api/calls/start',
      {
        'x-test-name': 'Dr. Stranger',
        'x-test-role': 'optometrist',
      },
      { customerId: '9993' }
    );
    assert.strictEqual(res1b1.status, 403, `Unassigned optometrist must get 403 (got ${res1b1.status})`);
    console.log('  ✓ 1b. Unassigned optometrist blocked with 403 Forbidden from accessing completed customer');

    // 1c. Admin or assigned optometrist starting call for Completed customer -> 409 Conflict
    const res1b2 = await invokeApp(
      app,
      'POST',
      '/api/calls/start',
      {
        'x-test-name': 'Platform Admin',
        'x-test-role': 'admin',
      },
      { customerId: '9993' }
    );
    assert.strictEqual(res1b2.status, 409, `Completed customer must return 409 Conflict (got ${res1b2.status})`);
    assert(res1b2.body.error.includes('Completed'), 'Error message must explain customer state');
    console.log('  ✓ 1c. Completed customer rejected with 409 Conflict');

    // 1c. Invalid customerId rejected with 400
    const res1c = await invokeApp(
      app,
      'POST',
      '/api/calls/start',
      {
        'x-test-role': 'optometrist',
      },
      { customerId: '../../../etc/passwd' }
    );

    assert.strictEqual(res1c.status, 400, `Path traversal / invalid ID must return 400 (got ${res1c.status})`);
    console.log('  ✓ 1c. Invalid / malicious customer ID rejected with 400 Bad Request');

    // =========================================================================
    // TEST 2: GET /api/calls/session/:customerId IDOR Prevention
    // =========================================================================
    console.log('\nTest 2: Verify GET /api/calls/session/:customerId IDOR & Token Protection');

    // 2a. Store B trying to access Store A customer's call session
    const res2a = await invokeApp(app, 'GET', '/api/calls/session/9991', {
      'x-test-role': 'store',
      'x-test-store': 'StoreB', // Store B caller
    });

    assert.strictEqual(res2a.status, 403, `Cross-store call session query must be blocked with 403 (got ${res2a.status})`);
    assert(res2a.body.error.includes('Access Denied'), 'Response must deny cross-store access');
    console.log('  ✓ 2a. Store B strictly blocked with 403 from eavesdropping Store A call session');

    // 2b. Store A accessing Store A customer (when no active session exists -> 404)
    const res2b = await invokeApp(app, 'GET', '/api/calls/session/9991', {
      'x-test-role': 'store',
      'x-test-store': 'StoreA', // Store A caller
    });

    assert.strictEqual(res2b.status, 404, `Authorized store gets 404 when no session is active (got ${res2b.status})`);
    console.log('  ✓ 2b. Store A allowed past access control (returns 404 when no call is active)');

    // =========================================================================
    // TEST 3: POST /api/calls/end IDOR Prevention
    // =========================================================================
    console.log('\nTest 3: Verify POST /api/calls/end Cross-Store Termination Protection');

    // 3a. Store B trying to terminate Store A customer's call
    const res3a = await invokeApp(
      app,
      'POST',
      '/api/calls/end',
      {
        'x-test-role': 'store',
        'x-test-store': 'StoreB', // Store B caller
      },
      { customerId: '9991' }
    );

    assert.strictEqual(res3a.status, 403, `Store B terminating Store A call must be 403 (got ${res3a.status})`);
    console.log('  ✓ 3a. Store B blocked with 403 from terminating Store A call session');

    // 3b. Store A terminating Store A call
    const res3b = await invokeApp(
      app,
      'POST',
      '/api/calls/end',
      {
        'x-test-role': 'store',
        'x-test-store': 'StoreA', // Store A caller
      },
      { customerId: '9991' }
    );

    assert.strictEqual(res3b.status, 200, `Store A terminating its own call must succeed with 200 (got ${res3b.status})`);
    assert.strictEqual(res3b.body.success, true);
    console.log('  ✓ 3b. Store A successfully terminates its own call');

    console.log('\n========================================================');
    console.log('   🎉 ALL /api/calls AUTHORIZATION & IDOR TESTS PASSED!');
    console.log('========================================================\n');
  } finally {
    // Cleanup test records
    await run('DELETE FROM customers WHERE id IN (?, ?, ?)', ['9991', '9992', '9993']);
  }
}

runTests()
  .then(() => {
    process.exit(0);
  })
  .catch((err) => {
    console.error('Test failed:', err);
    process.exit(1);
  });
