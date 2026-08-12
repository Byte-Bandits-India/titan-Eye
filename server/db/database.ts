import Database from 'better-sqlite3';
import fs from 'fs';
import path from 'path';
import { hashPassword } from '../utils/hash.js';
import { logger } from '../utils/logger.js';

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
  optomFeedback: string;
  status: string;
  activeProfile: number;
  createdOn: string | null;
  lastUpdatedOn: string | null;
  rxData: string | null;
  optomRxData: string | null;
  callStartTime: string | null;
  callActive: number;
  callTakenBy: string | null;
  storeContactEmail: string | null;
  callDuration: number;
  optomCallStartTime: string | null;
  offeredToOptomEmail: string | null;
  declinedByOptomEmails: string | null;
}

export interface CustomerLogRow {
  id: number;
  customerId: string;
  lastUpdatedOn: string | null;
  status: string;
  callDuration: number | null;
  callTakenBy: string | null;
  callStartTime: string | null;
  optomCallStartTime: string | null;
}

const DB_PATH = process.env.DATABASE_PATH || 'database.db';

const dbDir = path.dirname(DB_PATH);
if (dbDir && dbDir !== '.') {
  fs.mkdirSync(dbDir, { recursive: true });
}

export const db = new Database(DB_PATH);

try {
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');
} catch (e) {
  logger.warn('DB pragmas warning', { errorMessage: (e as Error).message });
}

export function query<T>(sql: string, params: SqlParam[] = []): T[] {
  const stmt = db.prepare(sql);
  return stmt.all(...params) as T[];
}

export function queryOne<T>(sql: string, params: SqlParam[] = []): T | undefined {
  const stmt = db.prepare(sql);
  return stmt.get(...params) as T | undefined;
}

export function execute(sql: string, params: SqlParam[] = []): Database.RunResult {
  const stmt = db.prepare(sql);
  return stmt.run(...params);
}

export async function all<T>(sql: string, params: SqlParam[] = []): Promise<T[]> {
  return query<T>(sql, params);
}

export async function get<T>(sql: string, params: SqlParam[] = []): Promise<T | undefined> {
  return queryOne<T>(sql, params);
}

export async function run(sql: string, params: SqlParam[] = []): Promise<Database.RunResult> {
  return execute(sql, params);
}

export async function initializeDatabase(): Promise<void> {
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
      password TEXT NOT NULL DEFAULT '',
      failedLoginAttempts INTEGER DEFAULT 0,
      lockedUntil TEXT,
      activeTokenSig TEXT
    )
  `);

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
      optomFeedback TEXT NOT NULL,
      status TEXT NOT NULL,
      activeProfile INTEGER NOT NULL DEFAULT 0,
      createdOn TEXT,
      lastUpdatedOn TEXT,
      rxData TEXT,
      optomRxData TEXT,
      callStartTime TEXT,
      callActive INTEGER DEFAULT 0,
      callTakenBy TEXT,
      storeContactEmail TEXT,
      callDuration INTEGER DEFAULT 0
    )
  `);

  try { await run(`ALTER TABLE customers ADD COLUMN optomFeedback TEXT`); } catch (e) { }
  try { await run(`ALTER TABLE customers ADD COLUMN optomRxData TEXT`); } catch (e) { }
  try { await run(`ALTER TABLE customers ADD COLUMN callStartTime TEXT`); } catch (e) { }
  try { await run(`ALTER TABLE customers ADD COLUMN callActive INTEGER DEFAULT 0`); } catch (e) { }
  try { await run(`ALTER TABLE customers ADD COLUMN callTakenBy TEXT`); } catch (e) { }
  try { await run(`ALTER TABLE customers ADD COLUMN storeContactEmail TEXT`); } catch (e) { }
  try { await run(`ALTER TABLE customers ADD COLUMN callDuration INTEGER DEFAULT 0`); } catch (e) { }
  try { await run(`ALTER TABLE customers ADD COLUMN optomCallStartTime TEXT`); } catch (e) { }
  try { await run(`ALTER TABLE customers ADD COLUMN offeredToOptomEmail TEXT`); } catch (e) { }
  try { await run(`ALTER TABLE customers ADD COLUMN declinedByOptomEmails TEXT`); } catch (e) { }
  try { await run(`ALTER TABLE customers ADD COLUMN createdOn TEXT`); } catch (e) { }

  // Legacy rows predate the createdOn column; lastUpdatedOn is the closest
  // available timestamp for them and only backfills rows still missing it.
  await run(`UPDATE customers SET createdOn = lastUpdatedOn WHERE createdOn IS NULL AND lastUpdatedOn IS NOT NULL AND lastUpdatedOn != ''`);

  try { await run(`ALTER TABLE customer_logs ADD COLUMN callStartTime TEXT`); } catch (e) { }
  try { await run(`ALTER TABLE customer_logs ADD COLUMN optomCallStartTime TEXT`); } catch (e) { }

  await run(`
    CREATE TABLE IF NOT EXISTS customer_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      customerId TEXT NOT NULL,
      lastUpdatedOn TEXT,
      status TEXT NOT NULL,
      callDuration INTEGER,
      callTakenBy TEXT,
      callStartTime TEXT,
      optomCallStartTime TEXT
    )
  `);

  await run(`DROP TRIGGER IF EXISTS customer_after_insert`);
  await run(`DROP TRIGGER IF EXISTS customer_after_update`);

  await run(`
    CREATE TRIGGER IF NOT EXISTS customer_after_insert
    AFTER INSERT ON customers
    BEGIN
      INSERT INTO customer_logs (
        customerId, lastUpdatedOn, status, callDuration, callTakenBy, callStartTime, optomCallStartTime
      ) VALUES (
        NEW.id, NEW.lastUpdatedOn, NEW.status, NEW.callDuration, NEW.callTakenBy, NEW.callStartTime, NEW.optomCallStartTime
      );
    END;
  `);

  await run(`
    CREATE TRIGGER IF NOT EXISTS customer_after_update
    AFTER UPDATE ON customers
    BEGIN
      INSERT INTO customer_logs (
        customerId, lastUpdatedOn, status, callDuration, callTakenBy, callStartTime, optomCallStartTime
      ) VALUES (
        NEW.id, NEW.lastUpdatedOn, NEW.status, NEW.callDuration, NEW.callTakenBy, NEW.callStartTime, NEW.optomCallStartTime
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
    CREATE VIEW customer_summary AS
    SELECT id, name, age, gender, mobile, customerType, storeName, preferredLanguage, preferredLanguage2, storeFeedback, optomFeedback, status, activeProfile, createdOn, lastUpdatedOn, rxData, optomRxData, callStartTime, callActive, callTakenBy, storeContactEmail, callDuration, optomCallStartTime, offeredToOptomEmail, declinedByOptomEmails
    FROM customers
  `);

  const VALID_ROLES = ['store', 'optom', 'admin'];
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
  } else {
    await run('UPDATE users SET status = ? WHERE LOWER(email) = LOWER(?)', ['active', adminEmail]);
    if (!existingAdmin.password.includes(':')) {
      await run('UPDATE users SET password = ? WHERE email = ?', [hashPassword(adminPassword), existingAdmin.email]);
    }
  }
  logger.info('Seeded default admin and optom accounts.');
}
