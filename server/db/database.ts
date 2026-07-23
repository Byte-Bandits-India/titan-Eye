import Database from 'better-sqlite3';
import fs from 'fs';
import path from 'path';
import { hashPassword } from '../utils/hash.js';

export type SqlParam = string | number | bigint | Buffer | null;

export interface UserRow {
  email: string;
  name: string;
  role: string;
  storeName: string | null;
  mobile: string | null;
  lastLogin: string | null;
  status: string;
  azureObjectId: string | null;
  microsoftUpn: string | null;
  password: string;
  // VAPT: account lockout & session security
  failedLoginAttempts: number;
  lockedUntil: string | null;
  activeTokenSig: string | null;
}

export interface CustomerRow {
  id: string;
  name: string;
  age: string;
  gender: string;
  mobile: string;
  customerType: string;
  storeName: string;
  preferredLanguage: string;
  preferredLanguage2: string;
  storeFeedback: string;
  optumFeedback: string;
  status: string;
  activeProfile: number;
  lastUpdatedOn: string | null;
  rxData: string | null;
  optumRxData: string | null;
  callStartTime: string | null;
  callActive: number;
  callTakenBy: string | null;
  callDuration: number;
}

export interface CustomerLogRow {
  id: number;
  customerId: string;
  lastUpdatedOn: string | null;
  status: string;
  callDuration: number | null;
  callTakenBy: string | null;
}

const DB_PATH = process.env.DATABASE_PATH || 'database.db';

const dbDir = path.dirname(DB_PATH);
if (dbDir && dbDir !== '.') {
  fs.mkdirSync(dbDir, { recursive: true });
}

export const db = new Database(DB_PATH);

try {
  fs.chmodSync(DB_PATH, 0o600);
} catch (e) {
}

db.pragma('journal_mode = WAL');
db.pragma('synchronous = FULL');

export const run = async (sql: string, params: SqlParam[] = []): Promise<Database.RunResult> => {
  const stmt = db.prepare(sql);
  return stmt.run(...params);
};

export const all = async <T>(sql: string, params: SqlParam[] = []): Promise<T[]> => {
  const stmt = db.prepare(sql);
  return stmt.all(...params) as T[];
};

export const get = async <T>(sql: string, params: SqlParam[] = []): Promise<T | undefined> => {
  const stmt = db.prepare(sql);
  return stmt.get(...params) as T | undefined;
};

export async function initDb(): Promise<void> {
  await run(`
    CREATE TABLE IF NOT EXISTS users (
      email TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      role TEXT NOT NULL,
      storeName TEXT,
      mobile TEXT,
      lastLogin TEXT,
      status TEXT NOT NULL DEFAULT 'active',
      azureObjectId TEXT,
      microsoftUpn TEXT,
      password TEXT NOT NULL
    )
  `);

  try {
    await run(`ALTER TABLE users ADD COLUMN storeName TEXT`);
  } catch (e) { }

  try {
    await run(`ALTER TABLE users ADD COLUMN mobile TEXT`);
  } catch (e) { }
  try {
    await run(`ALTER TABLE users ADD COLUMN lastLogin TEXT`);
  } catch (e) { }
  try {
    await run(`ALTER TABLE users ADD COLUMN status TEXT NOT NULL DEFAULT 'active'`);
  } catch (e) { }
  try {
    await run(`ALTER TABLE users ADD COLUMN azureObjectId TEXT`);
  } catch (e) { }
  try {
    await run(`ALTER TABLE users ADD COLUMN microsoftUpn TEXT`);
  } catch (e) { }
  // VAPT: account lockout columns
  try {
    await run(`ALTER TABLE users ADD COLUMN failedLoginAttempts INTEGER NOT NULL DEFAULT 0`);
  } catch (e) { }
  try {
    await run(`ALTER TABLE users ADD COLUMN lockedUntil TEXT`);
  } catch (e) { }
  // VAPT: single-session enforcement — stores signature of the current valid token
  try {
    await run(`ALTER TABLE users ADD COLUMN activeTokenSig TEXT`);
  } catch (e) { }

  try {
    const columns = db.prepare("PRAGMA table_info(customers)").all() as { name: string }[];
    if (columns.some(col => col.name === 'optemFeedback')) {
      db.prepare("DROP TABLE IF EXISTS customers").run();
      db.prepare("DROP TABLE IF EXISTS customer_logs").run();
      console.log("Dropped outdated customers tables to recreate with correct schema.");
    }
  } catch (e) {}

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
      optumRxData TEXT,
      callStartTime TEXT,
      callActive INTEGER DEFAULT 0,
      callTakenBy TEXT,
      callDuration INTEGER DEFAULT 0
    )
  `);

  try {
    await run(`ALTER TABLE customers ADD COLUMN optumFeedback TEXT`);
  } catch (e) { }
  try {
    await run(`UPDATE customers SET optumFeedback = optumFeedback WHERE optumFeedback IS NULL`);
  } catch (e) { }

  try {
    await run(`ALTER TABLE customers ADD COLUMN optumRxData TEXT`);
  } catch (e) { }
  try {
    await run(`UPDATE customers SET optumRxData = optomRxData WHERE optumRxData IS NULL`);
  } catch (e) { }

  try {
    await run(`ALTER TABLE customers ADD COLUMN callStartTime TEXT`);
  } catch (e) { }
  try {
    await run(`ALTER TABLE customers ADD COLUMN callActive INTEGER DEFAULT 0`);
  } catch (e) { }
  try {
    await run(`ALTER TABLE customers ADD COLUMN callTakenBy TEXT`);
  } catch (e) { }
  try {
    await run(`ALTER TABLE customers ADD COLUMN callDuration INTEGER DEFAULT 0`);
  } catch (e) { }

  try {
    const columns = db.prepare("PRAGMA table_info(customer_logs)").all() as { name: string }[];
    if (columns.some(col => col.name === 'name')) {
      db.prepare("DROP TABLE customer_logs").run();
      db.prepare("DROP TRIGGER IF EXISTS customer_after_insert").run();
      db.prepare("DROP TRIGGER IF EXISTS customer_after_update").run();
    }
  } catch (e) {}

  await run(`
    CREATE TABLE IF NOT EXISTS customer_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      customerId TEXT NOT NULL,
      lastUpdatedOn TEXT,
      status TEXT NOT NULL,
      callDuration INTEGER,
      callTakenBy TEXT
    )
  `);

  await run(`
    CREATE TRIGGER IF NOT EXISTS customer_after_insert
    AFTER INSERT ON customers
    BEGIN
      INSERT INTO customer_logs (
        customerId, lastUpdatedOn, status, callDuration, callTakenBy
      ) VALUES (
        NEW.id, NEW.lastUpdatedOn, NEW.status, NEW.callDuration, NEW.callTakenBy
      );
    END;
  `);

  await run(`
    CREATE TRIGGER IF NOT EXISTS customer_after_update
    AFTER UPDATE ON customers
    BEGIN
      INSERT INTO customer_logs (
        customerId, lastUpdatedOn, status, callDuration, callTakenBy
      ) VALUES (
        NEW.id, NEW.lastUpdatedOn, NEW.status, NEW.callDuration, NEW.callTakenBy
      );
    END;
  `);

  await run(`
    CREATE TABLE IF NOT EXISTS admin_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      adminEmail TEXT NOT NULL,
      adminName TEXT NOT NULL,
      action TEXT NOT NULL,
      target TEXT NOT NULL,
      details TEXT,
      timestamp TEXT NOT NULL
    )
  `);

  const logsCount = await get<{ count: number }>('SELECT COUNT(*) as count FROM customer_logs');
  if (logsCount && logsCount.count === 0) {
    await run(`
      INSERT INTO customer_logs (
        customerId, lastUpdatedOn, status, callDuration, callTakenBy
      ) SELECT 
        id, lastUpdatedOn, status, callDuration, callTakenBy
      FROM customers
    `);
  }

  await run(`DROP VIEW IF EXISTS customer_summary`);

  await run(`
    CREATE VIEW IF NOT EXISTS customer_summary AS
    SELECT id, name, age, gender, mobile, customerType, storeName, preferredLanguage, preferredLanguage2, storeFeedback, optumFeedback, status, activeProfile, lastUpdatedOn, rxData, optumRxData, callStartTime, callActive, callTakenBy, callDuration
    FROM customers
  `);

  const VALID_ROLES = ['store', 'optum', 'admin'];
  await run(
    `DELETE FROM users WHERE role NOT IN (${VALID_ROLES.map(() => '?').join(',')})`,
    VALID_ROLES
  );
  const adminEmail = process.env.ADMIN_EMAIL || 'admin@gmail.com';
  const adminPassword = process.env.ADMIN_PASSWORD || 'pass@123';

  const existingAdmin = await get<UserRow>('SELECT * FROM users WHERE LOWER(email) = LOWER(?)', [adminEmail]);
  if (!existingAdmin) {
    await run('INSERT INTO users (email, name, role, storeName, mobile, status, password) VALUES (?, ?, ?, ?, ?, ?, ?)', [
      adminEmail, 'Admin', 'admin', null, null, 'active', hashPassword(adminPassword)
    ]);
  } else if (!existingAdmin.password.includes(':')) {
    await run('UPDATE users SET password = ? WHERE email = ?', [hashPassword(adminPassword), existingAdmin.email]);
  }
  console.log('Seeded admin account and cleaned up retired default users.');
}
