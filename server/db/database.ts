import sqlite3 from 'sqlite3';

export const db = new sqlite3.Database('database.db');

export const run = (sql: string, params: any[] = []): Promise<any> =>
  new Promise((resolve, reject) => {
    db.run(sql, params, function (err) {
      if (err) reject(err);
      else resolve(this);
    });
  });

export const all = (sql: string, params: any[] = []): Promise<any[]> =>
  new Promise((resolve, reject) => {
    db.all(sql, params, (err, rows) => {
      if (err) reject(err);
      else resolve(rows);
    });
  });

export const get = (sql: string, params: any[] = []): Promise<any> =>
  new Promise((resolve, reject) => {
    db.get(sql, params, (err, row) => {
      if (err) reject(err);
      else resolve(row);
    });
  });

export async function initDb(): Promise<void> {
  // Create Users Table
  await run(`
    CREATE TABLE IF NOT EXISTS users (
      email TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      role TEXT NOT NULL,
      password TEXT NOT NULL
    )
  `);

  // Create Customers Table
  await run(`
    CREATE TABLE IF NOT EXISTS customers (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      age TEXT NOT NULL,
      gender TEXT NOT NULL,
      mobile TEXT NOT NULL,
      customerType TEXT NOT NULL,
      storeName TEXT NOT NULL,
      preferredLanguage TEXT NOT NULL,
      preferredLanguage2 TEXT NOT NULL,
      storeFeedback TEXT NOT NULL,
      optumFeedback TEXT NOT NULL,
      status TEXT NOT NULL,
      activeProfile INTEGER NOT NULL DEFAULT 0,
      lastUpdatedOn TEXT,
      rxData TEXT,
      optomRxData TEXT,
      callStartTime TEXT,
      callActive INTEGER DEFAULT 0,
      callTakenBy TEXT
    )
  `);

  // Proactively add call-related columns if they do not exist
  try {
    await run(`ALTER TABLE customers ADD COLUMN callStartTime TEXT`);
  } catch (e) {}
  try {
    await run(`ALTER TABLE customers ADD COLUMN callActive INTEGER DEFAULT 0`);
  } catch (e) {}
  try {
    await run(`ALTER TABLE customers ADD COLUMN callTakenBy TEXT`);
  } catch (e) {}

  // Drop old view to ensure it is updated with all columns
  await run(`DROP VIEW IF EXISTS customer_summary`);

  // Create Customer Summary View
  await run(`
    CREATE VIEW IF NOT EXISTS customer_summary AS
    SELECT id, name, age, gender, mobile, customerType, storeName, preferredLanguage, preferredLanguage2, storeFeedback, optumFeedback, status, activeProfile, lastUpdatedOn, rxData, optomRxData, callStartTime, callActive, callTakenBy
    FROM customers
  `);

  // Seed default users if empty
  const userCount = await get('SELECT COUNT(*) as count FROM users');
  if (userCount.count === 0) {
    await run('INSERT INTO users (email, name, role, password) VALUES (?, ?, ?, ?)', [
      'store@gmail.com', 'Meena', 'store', 'pass@123'
    ]);
    await run('INSERT INTO users (email, name, role, password) VALUES (?, ?, ?, ?)', [
      'optem@gmail.com', 'Dr. Priya', 'optem', 'pass@123'
    ]);
    console.log('Seeded default users.');
  }
}
