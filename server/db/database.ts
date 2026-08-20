import Database from 'better-sqlite3';
import fs from 'fs';
import path from 'path';

import { hashPassword } from '../utils/hash.js';
import { logger } from '../utils/logger.js';

export interface CustomerLogRow {
  callDuration: null | number;
  callStartTime: null | string;
  callTakenBy: null | string;
  customerId: string;
  id: number;
  lastUpdatedOn: null | string;
  optometristCallStartTime: null | string;
  status: string;
}

export interface CustomerRow {
  activeProfile: number;
  age: string;
  callActive: number;
  callDuration: number;
  callStartTime: null | string;
  callTakenBy: null | string;
  cancellationReason: null | string;
  conversionStatus: null | string;
  createdOn: null | string;
  customerType: string;
  declinedByOptometristEmails: null | string;
  gender: string;
  id: string;
  isPriority: number;
  lastUpdatedOn: null | string;
  mobile: string;
  name: string;
  nonConversionComment: null | string;
  nonConversionReason: null | string;
  offeredToOptometristEmail: null | string;
  optometristCallStartTime: null | string;
  optometristFeedback: string;
  optometristRxData: null | string;
  orderDate: null | string;
  patientFeedback: null | string;
  preferredLanguage: string;
  preferredLanguage2: string;
  rxData: null | string;
  salesOrderNumber: null | string;
  status: string;
  storeContactEmail: null | string;
  storeFeedback: string;
  storeFeedbackImage1: null | string;
  storeFeedbackImage2: null | string;
  storeName: string;
}

export interface FeedbackTokenRow {
  createdAt: string;
  customerId: string;
  expiresAt: string;
  token: string;
  usedAt: null | string;
}

export type SqlParam = bigint | Buffer | null | number | string;

export interface VideoRow {
  id: number;
  mimeType: null | string;
  originalName: null | string;
  size: null | number;
  sourceType: 'upload' | 'youtube';
  storedName: null | string;
  title: string;
  uploadedAt: string;
  uploadedBy: string;
  youtubeUrl: null | string;
}

export interface TvModeSettingRow {
  activeVideoId: null | number;
  id: number;
}

export interface UserRow {
  activeTokenSig: null | string;
  azureObjectId: null | string;
  city: null | string;
  email: string;
  failedLoginAttempts: number;
  languages: null | string;
  lastLogin: null | string;
  lastPing: null | string;
  location: null | string;
  lockedUntil: null | string;
  microsoftUpn: null | string;
  mobile: null | string;
  name: string;
  password: string;
  role: string;
  status: string;
  storeName: null | string;
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
  logger.warn('DB pragmas warning', { errorMessage: e instanceof Error ? e.message : String(e) });
}

export async function all<T>(sql: string, params: SqlParam[] = []): Promise<T[]> {
  return query<T>(sql, params);
}

export function execute(sql: string, params: SqlParam[] = []): Database.RunResult {
  const stmt = db.prepare(sql);

  return stmt.run(...params);
}

export async function get<T>(sql: string, params: SqlParam[] = []): Promise<T | undefined> {
  return queryOne<T>(sql, params);
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
      activeTokenSig TEXT,
      location TEXT,
      city TEXT,
      languages TEXT,
      lastPing TEXT
    )
  `);

  try {
    await run(`ALTER TABLE users ADD COLUMN location TEXT`);
  } catch {}

  try {
    await run(`ALTER TABLE users ADD COLUMN city TEXT`);
  } catch {}

  try {
    await run(`ALTER TABLE users ADD COLUMN languages TEXT`);
  } catch {}

  try {
    await run(`ALTER TABLE users ADD COLUMN lastPing TEXT`);
  } catch {}

  await run(`UPDATE users SET role = 'optometrist' WHERE role = 'optom'`);

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
      optometristFeedback TEXT NOT NULL,
      status TEXT NOT NULL,
      activeProfile INTEGER NOT NULL DEFAULT 0,
      createdOn TEXT,
      lastUpdatedOn TEXT,
      rxData TEXT,
      optometristRxData TEXT,
      callStartTime TEXT,
      callActive INTEGER DEFAULT 0,
      callTakenBy TEXT,
      storeContactEmail TEXT,
      callDuration INTEGER DEFAULT 0
    )
  `);

  try {
    await run(`ALTER TABLE customers RENAME COLUMN optomFeedback TO optometristFeedback`);
  } catch {}

  try {
    await run(`ALTER TABLE customers RENAME COLUMN optomRxData TO optometristRxData`);
  } catch {}

  try {
    await run(`ALTER TABLE customers RENAME COLUMN optomCallStartTime TO optometristCallStartTime`);
  } catch {}

  try {
    await run(`ALTER TABLE customers RENAME COLUMN offeredToOptomEmail TO offeredToOptometristEmail`);
  } catch {}

  try {
    await run(`ALTER TABLE customers RENAME COLUMN declinedByOptomEmails TO declinedByOptometristEmails`);
  } catch {}

  try {
    await run(`ALTER TABLE customers ADD COLUMN optometristFeedback TEXT`);
  } catch {}

  try {
    await run(`ALTER TABLE customers ADD COLUMN optometristRxData TEXT`);
  } catch {}

  try {
    await run(`ALTER TABLE customers ADD COLUMN callStartTime TEXT`);
  } catch {}

  try {
    await run(`ALTER TABLE customers ADD COLUMN callActive INTEGER DEFAULT 0`);
  } catch {}

  try {
    await run(`ALTER TABLE customers ADD COLUMN callTakenBy TEXT`);
  } catch {}

  try {
    await run(`ALTER TABLE customers ADD COLUMN storeContactEmail TEXT`);
  } catch {}

  try {
    await run(`ALTER TABLE customers ADD COLUMN callDuration INTEGER DEFAULT 0`);
  } catch {}

  try {
    await run(`ALTER TABLE customers ADD COLUMN optometristCallStartTime TEXT`);
  } catch {}

  try {
    await run(`ALTER TABLE customers ADD COLUMN offeredToOptometristEmail TEXT`);
  } catch {}

  try {
    await run(`ALTER TABLE customers ADD COLUMN declinedByOptometristEmails TEXT`);
  } catch {}

  try {
    await run(`ALTER TABLE customers ADD COLUMN createdOn TEXT`);
  } catch {}

  try {
    await run(`ALTER TABLE customers ADD COLUMN patientFeedback TEXT`);
  } catch {}

  try {
    await run(`ALTER TABLE customers ADD COLUMN isPriority INTEGER DEFAULT 0`);
  } catch {}

  try {
    await run(`ALTER TABLE customers ADD COLUMN cancellationReason TEXT`);
  } catch {}

  try {
    await run(`ALTER TABLE customers ADD COLUMN storeFeedbackImage1 TEXT`);
  } catch {}

  try {
    await run(`ALTER TABLE customers ADD COLUMN storeFeedbackImage2 TEXT`);
  } catch {}

  try {
    await run(`ALTER TABLE customers ADD COLUMN conversionStatus TEXT`);
  } catch {}

  try {
    await run(`ALTER TABLE customers ADD COLUMN salesOrderNumber TEXT`);
  } catch {}

  try {
    await run(`ALTER TABLE customers ADD COLUMN orderDate TEXT`);
  } catch {}

  try {
    await run(`ALTER TABLE customers ADD COLUMN nonConversionReason TEXT`);
  } catch {}

  try {
    await run(`ALTER TABLE customers ADD COLUMN nonConversionComment TEXT`);
  } catch {}

  await run(
    `UPDATE customers SET createdOn = lastUpdatedOn WHERE createdOn IS NULL AND lastUpdatedOn IS NOT NULL AND lastUpdatedOn != ''`
  );

  await run(`
    CREATE TABLE IF NOT EXISTS feedback_tokens (
      token TEXT PRIMARY KEY,
      customerId TEXT NOT NULL,
      createdAt TEXT NOT NULL,
      expiresAt TEXT NOT NULL,
      usedAt TEXT
    )
  `);

  try {
    await run(`ALTER TABLE customer_logs ADD COLUMN callStartTime TEXT`);
  } catch {}

  try {
    await run(`ALTER TABLE customer_logs RENAME COLUMN optomCallStartTime TO optometristCallStartTime`);
  } catch {}

  try {
    await run(`ALTER TABLE customer_logs ADD COLUMN optometristCallStartTime TEXT`);
  } catch {}

  await run(`
    CREATE TABLE IF NOT EXISTS customer_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      customerId TEXT NOT NULL,
      lastUpdatedOn TEXT,
      status TEXT NOT NULL,
      callDuration INTEGER,
      callTakenBy TEXT,
      callStartTime TEXT,
      optometristCallStartTime TEXT
    )
  `);

  await run(`DROP TRIGGER IF EXISTS customer_after_insert`);
  await run(`DROP TRIGGER IF EXISTS customer_after_update`);

  await run(`
    CREATE TRIGGER IF NOT EXISTS customer_after_insert
    AFTER INSERT ON customers
    BEGIN
      INSERT INTO customer_logs (
        customerId, lastUpdatedOn, status, callDuration, callTakenBy, callStartTime, optometristCallStartTime
      ) VALUES (
        NEW.id, NEW.lastUpdatedOn, NEW.status, NEW.callDuration, NEW.callTakenBy, NEW.callStartTime, NEW.optometristCallStartTime
      );
    END;
  `);

  await run(`
    CREATE TRIGGER IF NOT EXISTS customer_after_update
    AFTER UPDATE ON customers
    BEGIN
      INSERT INTO customer_logs (
        customerId, lastUpdatedOn, status, callDuration, callTakenBy, callStartTime, optometristCallStartTime
      ) VALUES (
        NEW.id, NEW.lastUpdatedOn, NEW.status, NEW.callDuration, NEW.callTakenBy, NEW.callStartTime, NEW.optometristCallStartTime
      );
    END;
  `);

  await run(`
    CREATE TABLE IF NOT EXISTS videos (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      sourceType TEXT NOT NULL DEFAULT 'upload',
      storedName TEXT,
      originalName TEXT,
      mimeType TEXT,
      size INTEGER,
      youtubeUrl TEXT,
      uploadedBy TEXT NOT NULL,
      uploadedAt TEXT NOT NULL
    )
  `);

  try {
    await run(`ALTER TABLE videos ADD COLUMN sourceType TEXT NOT NULL DEFAULT 'upload'`);
  } catch {}

  try {
    await run(`ALTER TABLE videos ADD COLUMN youtubeUrl TEXT`);
  } catch {}

  try {
    const columns = db.prepare('PRAGMA table_info(videos)').all() as { name: string; notnull: number }[];
    const storedNameColumn = columns.find((c) => c.name === 'storedName');

    if (storedNameColumn?.notnull) {
      await run(`ALTER TABLE videos RENAME TO videos_legacy`);
      await run(`
        CREATE TABLE videos (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          title TEXT NOT NULL,
          sourceType TEXT NOT NULL DEFAULT 'upload',
          storedName TEXT,
          originalName TEXT,
          mimeType TEXT,
          size INTEGER,
          youtubeUrl TEXT,
          uploadedBy TEXT NOT NULL,
          uploadedAt TEXT NOT NULL
        )
      `);
      await run(`
        INSERT INTO videos (id, title, sourceType, storedName, originalName, mimeType, size, youtubeUrl, uploadedBy, uploadedAt)
        SELECT id, title, sourceType, storedName, originalName, mimeType, size, youtubeUrl, uploadedBy, uploadedAt FROM videos_legacy
      `);
      await run(`DROP TABLE videos_legacy`);
    }
  } catch (e) {
    logger.error('Videos table migration failed', {
      errorMessage: e instanceof Error ? e.message : String(e),
    });
  }

  try {
    const kioskSettingsColumns = db.prepare('PRAGMA table_info(kiosk_settings)').all() as { name: string }[];
    const tvModeSettingsColumns = db.prepare('PRAGMA table_info(tvmode_settings)').all() as {
      name: string;
    }[];

    if (kioskSettingsColumns.length > 0 && tvModeSettingsColumns.length === 0) {
      await run(`ALTER TABLE kiosk_settings RENAME TO tvmode_settings`);
    }
  } catch (e) {
    logger.error('Kiosk settings table rename migration failed', {
      errorMessage: e instanceof Error ? e.message : String(e),
    });
  }

  await run(`
    CREATE TABLE IF NOT EXISTS tvmode_settings (
      id INTEGER PRIMARY KEY CHECK (id = 1),
      activeVideoId INTEGER
    )
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
    SELECT id, name, age, gender, mobile, customerType, storeName, preferredLanguage, preferredLanguage2, storeFeedback, storeFeedbackImage1, storeFeedbackImage2, optometristFeedback, status, activeProfile, createdOn, lastUpdatedOn, rxData, optometristRxData, callStartTime, callActive, callTakenBy, storeContactEmail, callDuration, optometristCallStartTime, offeredToOptometristEmail, declinedByOptometristEmails, patientFeedback, isPriority, cancellationReason, conversionStatus, salesOrderNumber, orderDate, nonConversionReason, nonConversionComment
    FROM customers
  `);

  const VALID_ROLES = ['store', 'optometrist', 'admin'];
  await run(`DELETE FROM users WHERE role NOT IN (${VALID_ROLES.map(() => '?').join(',')})`, VALID_ROLES);
  const adminEmail = process.env.ADMIN_EMAIL;
  const adminPassword = process.env.ADMIN_PASSWORD;

  if (adminEmail && adminPassword) {
    const existingAdmin = await get<UserRow>('SELECT * FROM users WHERE LOWER(email) = LOWER(?)', [
      adminEmail,
    ]);

    if (!existingAdmin) {
      await run(
        'INSERT INTO users (email, name, role, storeName, mobile, status, password) VALUES (?, ?, ?, ?, ?, ?, ?)',
        [adminEmail, 'Admin', 'admin', null, null, 'active', hashPassword(adminPassword)]
      );
    } else {
      await run('UPDATE users SET status = ? WHERE LOWER(email) = LOWER(?)', ['active', adminEmail]);

      if (!existingAdmin.password.includes(':')) {
        await run('UPDATE users SET password = ? WHERE email = ?', [
          hashPassword(adminPassword),
          existingAdmin.email,
        ]);
      }
    }
  }

  logger.info('Seeded default admin and optometrist accounts.');
}

export function query<T>(sql: string, params: SqlParam[] = []): T[] {
  const stmt = db.prepare(sql);

  return stmt.all(...params) as T[];
}

export function queryOne<T>(sql: string, params: SqlParam[] = []): T | undefined {
  const stmt = db.prepare(sql);

  return stmt.get(...params) as T | undefined;
}

export async function run(sql: string, params: SqlParam[] = []): Promise<Database.RunResult> {
  return execute(sql, params);
}
