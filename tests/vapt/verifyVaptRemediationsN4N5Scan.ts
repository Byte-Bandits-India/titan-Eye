import assert from 'assert';
import express from 'express';
import cookieParser from 'cookie-parser';

import reactScanLogRouter from '../../dist-server/routes/reactScanLog.js';
import customersRouter from '../../dist-server/routes/customers.js';
import { initializeDatabase, run, get } from '../../dist-server/db/database.js';

console.log('================================================================');
console.log('   VAPT VERIFICATION: React-Scan, Senior Optom Scope, & Mass Assignment');
console.log('================================================================\n');

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

  // Clean test database records
  await run('DELETE FROM customers WHERE id IN (?, ?, ?)', ['9991', '9992', '9993']);

  // Customer 9991: Store S001, Queued
  await run(
    `INSERT INTO customers (id, name, age, gender, customerType, storeName, preferredLanguage, preferredLanguage2, storeFeedback, optometristFeedback, status, callActive, callTakenBy)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    ['9991', 'Alice Store', '25', 'Female', 'New', 'S001', 'English', '', 'Store Note', '', 'Queued', 0, null]
  );

  // Customer 9992: Store S002, Accepted & Taken by Dr. Assigned
  await run(
    `INSERT INTO customers (id, name, age, gender, customerType, storeName, preferredLanguage, preferredLanguage2, storeFeedback, optometristFeedback, status, callActive, callTakenBy)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    ['9992', 'Bob Store', '35', 'Male', 'Existing', 'S002', 'English', '', 'Store Note', 'Dr. Assigned Exam', 'Accepted', 1, 'Dr. Assigned']
  );

  // Customer 9993: Store S002, Completed
  await run(
    `INSERT INTO customers (id, name, age, gender, customerType, storeName, preferredLanguage, preferredLanguage2, storeFeedback, optometristFeedback, status, callActive, callTakenBy)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    ['9993', 'Charlie Completed', '45', 'Male', 'VIP', 'S002', 'English', '', 'Store Note', 'Completed Exam', 'Completed', 0, 'Dr. Other']
  );

  // =========================================================================
  // TEST 1: React Scan Hardening & Prototype Pollution Prevention
  // =========================================================================
  console.log('Test 1: Verify React-Scan Hardening & Prototype Pollution Prevention');

  const scanApp = express();
  scanApp.use(express.json());
  scanApp.use('/api/react-scan', reactScanLogRouter);

  // 1a. Test prototype pollution attempt with __proto__
  const res1a = await invokeApp(
    scanApp,
    'POST',
    '/api/react-scan/log',
    {},
    { component: '__proto__', count: 10, time: 20 }
  );

  assert.strictEqual(res1a.status, 200);
  assert.strictEqual(({} as any).totalRenders, undefined, 'CRITICAL: Object.prototype must NOT be polluted with totalRenders!');
  assert.strictEqual(Object.prototype.hasOwnProperty('totalRenders'), false, 'CRITICAL: Object.prototype must not have totalRenders property!');
  console.log('  ✓ 1a. Prototype pollution (__proto__) strictly neutralized without polluting Object.prototype');

  // 1b. Test production gating: in production, router returns 404
  const origEnv = process.env.NODE_ENV;
  process.env.NODE_ENV = 'production';
  try {
    const res1b = await invokeApp(scanApp, 'POST', '/api/react-scan/log', {}, { component: 'Header' });
    assert.strictEqual(res1b.status, 404, `React scan must return 404 in production (got ${res1b.status})`);
    console.log('  ✓ 1b. React-scan endpoints return 404 in production environment');
  } finally {
    process.env.NODE_ENV = origEnv;
  }

  // =========================================================================
  // Setup App with customersRouter
  // =========================================================================
  const customerApp = express();
  customerApp.use(express.json());
  customerApp.use(cookieParser());

  customerApp.use((req, _res, next) => {
    const role = (req.headers['x-test-role'] as string) || 'store';
    const storeName = (req.headers['x-test-store'] as string) || 'S001';
    const email = (req.headers['x-test-email'] as string) || 'user@titan.in';
    const name = (req.headers['x-test-name'] as string) || 'Test User';

    (req as any).user = { email, name, role, storeName };
    (req as any).requestId = 'test-req-id';
    next();
  });

  customerApp.use('/api/customers', customersRouter);

  // =========================================================================
  // TEST 2: Senior Optometrist Scoping on GET /api/customers (N4)
  // =========================================================================
  console.log('\nTest 2: Verify Senior Optometrist Scoping on GET /api/customers (N4)');

  const res2 = await invokeApp(customerApp, 'GET', '/api/customers', {
    'x-test-email': 'senior@titan.in',
    'x-test-name': 'Dr. Senior',
    'x-test-role': 'senior_optometrist',
  });

  assert.strictEqual(res2.status, 200);
  const returnedCustomers = res2.body as any[];
  const returnedIds = returnedCustomers.map((c) => c.id);

  // Must include active queue customers: 9991 (Queued) and 9992 (Accepted)
  assert(returnedIds.includes('9991'), 'Active queue customer 9991 must be visible');
  assert(returnedIds.includes('9992'), 'Active queue customer 9992 must be visible');

  // MUST NOT include completed customer 9993 belonging to another optometrist in another store!
  assert(!returnedIds.includes('9993'), 'CRITICAL N4: Completed customer 9993 from S002 must NOT be returned to Senior Optometrist!');
  console.log('  ✓ 2. Senior Optometrist is strictly scoped to active queue & assigned records (completed cross-store records excluded)');

  // =========================================================================
  // TEST 3: Senior Optometrist Blocked from Deleting Feedback Images (N4)
  // =========================================================================
  console.log('\nTest 3: Verify Senior Optometrist Blocked from Deleting Store Feedback Images (N4)');

  const res3 = await invokeApp(customerApp, 'DELETE', '/api/customers/9991/feedback-image/1', {
    'x-test-email': 'senior@titan.in',
    'x-test-role': 'senior_optometrist',
  });

  assert.strictEqual(res3.status, 403, `Senior Optometrist deleting store feedback image must return 403 (got ${res3.status})`);
  console.log('  ✓ 3. Senior Optometrist blocked with 403 from deleting store feedback images');

  // =========================================================================
  // TEST 4: Mass Assignment & Workflow State Bypass in PUT /customers/:id (N5)
  // =========================================================================
  console.log('\nTest 4: Verify Mass Assignment & Workflow Bypass Prevention in PUT /customers/:id (N5)');

  // 4a. Store attempting to change status, callTakenBy, callActive, conversionStatus
  const res4a = await invokeApp(
    customerApp,
    'PUT',
    '/api/customers/9991',
    {
      'x-test-role': 'store',
      'x-test-store': 'S001',
    },
    {
      callActive: true,
      callDuration: 999,
      callTakenBy: 'FakeOptom',
      conversionStatus: 'Converted',
      name: 'Alice Updated',
      status: 'Accepted', // Store attempting workflow bypass!
    }
  );

  assert.strictEqual(res4a.status, 200, `res4a failed with ${res4a.status}: ${JSON.stringify(res4a.body)}`);

  const dbCust9991 = await get<any>('SELECT * FROM customers WHERE id = ?', ['9991']);
  assert.strictEqual(dbCust9991.name, 'Alice Updated', 'Store should be able to update customer name');
  assert.strictEqual(dbCust9991.status, 'Queued', 'CRITICAL N5: Store MUST NOT bypass workflow to set status to Accepted!');
  assert.strictEqual(dbCust9991.callTakenBy, null, 'CRITICAL N5: Store MUST NOT set callTakenBy!');
  assert.strictEqual(dbCust9991.callActive, 0, 'CRITICAL N5: Store MUST NOT set callActive!');
  assert.strictEqual(dbCust9991.conversionStatus, null, 'CRITICAL N5: Store MUST NOT bypass conversion endpoint to set Converted!');
  console.log('  ✓ 4a. Store user mass assignment & workflow state bypass strictly blocked');

  // 4b. Unassigned Optometrist attempting to edit customer 9992 (Accepted by Dr. Assigned)
  const res4b = await invokeApp(
    customerApp,
    'PUT',
    '/api/customers/9992',
    {
      'x-test-name': 'Dr. Intruder',
      'x-test-role': 'optometrist',
    },
    {
      optometristFeedback: 'Hacked feedback by unassigned doctor',
    }
  );

  assert.strictEqual(res4b.status, 403, `Unassigned optometrist must get 403 on PUT (got ${res4b.status})`);
  console.log('  ✓ 4b. Unassigned optometrist blocked with 403 from editing another optometrist\'s accepted consultation');

  // 4c. Assigned Optometrist attempting to overwrite demographics and store data
  const res4c = await invokeApp(
    customerApp,
    'PUT',
    '/api/customers/9992',
    {
      'x-test-name': 'Dr. Assigned',
      'x-test-role': 'optometrist',
    },
    {
      name: 'Hacked Patient Name', // Optometrist attempting demographic tampering!
      optometristFeedback: 'Authorized Clinical Rx Notes',
      storeName: 'S999', // Optometrist attempting store tampering!
    }
  );

  assert.strictEqual(res4c.status, 200, `res4c failed with ${res4c.status}: ${JSON.stringify(res4c.body)}`);
  const dbCust9992 = await get<any>('SELECT * FROM customers WHERE id = ?', ['9992']);
  assert.strictEqual(dbCust9992.name, 'Bob Store', 'CRITICAL N5: Optometrist MUST NOT overwrite patient demographic name!');
  assert.strictEqual(dbCust9992.storeName, 'S002', 'CRITICAL N5: Optometrist MUST NOT overwrite storeName!');
  assert.strictEqual(dbCust9992.optometristFeedback, 'Authorized Clinical Rx Notes', 'Assigned optometrist can update clinical feedback');
  console.log('  ✓ 4c. Assigned optometrist demographic tampering strictly blocked; clinical updates permitted');

  // Cleanup test records
  await run('DELETE FROM customers WHERE id IN (?, ?, ?)', ['9991', '9992', '9993']);

  console.log('\n================================================================');
  console.log('   🎉 ALL REACT-SCAN, N4 SENIOR OPTOM, & N5 MASS ASSIGNMENT TESTS PASSED!');
  console.log('================================================================\n');
}

runTests()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('Test failed:', err);
    process.exit(1);
  });
