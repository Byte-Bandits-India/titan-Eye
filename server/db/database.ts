import Database from 'better-sqlite3';
import fs from 'fs';
import path from 'path';
import { hashPassword } from '../utils/hash.js';

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

export const run = async (sql: string, params: any[] = []): Promise<any> => {
  const stmt = db.prepare(sql);
  return stmt.run(...params);
};

export const all = async (sql: string, params: any[] = []): Promise<any[]> => {
  const stmt = db.prepare(sql);
  return stmt.all(...params);
};

export const get = async (sql: string, params: any[] = []): Promise<any> => {
  const stmt = db.prepare(sql);
  return stmt.get(...params);
};

export async function initDb(): Promise<void> {
  await run(`
    CREATE TABLE IF NOT EXISTS users (
      email TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      role TEXT NOT NULL,
      storeName TEXT,
      password TEXT NOT NULL
    )
  `);

  try {
    await run(`ALTER TABLE users ADD COLUMN storeName TEXT`);
  } catch (e) { }

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
      optemFeedback TEXT NOT NULL,
      status TEXT NOT NULL,
      activeProfile INTEGER NOT NULL DEFAULT 0,
      lastUpdatedOn TEXT,
      rxData TEXT,
      optemRxData TEXT,
      callStartTime TEXT,
      callActive INTEGER DEFAULT 0,
      callTakenBy TEXT,
      callDuration INTEGER DEFAULT 0
    )
  `);

  try {
    await run(`ALTER TABLE customers ADD COLUMN optemFeedback TEXT`);
  } catch (e) { }
  try {
    await run(`UPDATE customers SET optemFeedback = optumFeedback WHERE optemFeedback IS NULL`);
  } catch (e) { }

  try {
    await run(`ALTER TABLE customers ADD COLUMN optemRxData TEXT`);
  } catch (e) { }
  try {
    await run(`UPDATE customers SET optemRxData = optomRxData WHERE optemRxData IS NULL`);
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
    const columns = db.prepare("PRAGMA table_info(customer_logs)").all() as any[];
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

  const logsCount = await get('SELECT COUNT(*) as count FROM customer_logs');
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
    SELECT id, name, age, gender, mobile, customerType, storeName, preferredLanguage, preferredLanguage2, storeFeedback, optemFeedback, status, activeProfile, lastUpdatedOn, rxData, optemRxData, callStartTime, callActive, callTakenBy, callDuration
    FROM customers
  `);

  const defaultUsers = [
    { email: 'store@gmail.com', name: ' ', role: 'store', storeName: 'Store A', password: 'pass@123' },
    { email: 'store2@gmail.com', name: ' ', role: 'store', storeName: 'Store B', password: 'pass@123' },
    { email: 'store3@gmail.com', name: ' ', role: 'store', storeName: 'Store C', password: 'pass@123' },
    { email: 'optem@gmail.com', name: ' ', role: 'optem', storeName: null, password: 'pass@123' },
    { email: 'optem2@gmail.com', name: ' ', role: 'optem', storeName: null, password: 'pass@123' },
    { email: 'optem3@gmail.com', name: ' ', role: 'optem', storeName: null, password: 'pass@123' },
  ];

  for (const u of defaultUsers) {
    const existing = await get('SELECT * FROM users WHERE email = ?', [u.email]);
    if (!existing) {
      await run('INSERT INTO users (email, name, role, storeName, password) VALUES (?, ?, ?, ?, ?)', [
        u.email, u.name, u.role, u.storeName, hashPassword(u.password)
      ]);
    } else {
      const needsUpdate = !existing.password.includes(':') || existing.storeName !== u.storeName;
      if (needsUpdate) {
        const newPassword = existing.password.includes(':') ? existing.password : hashPassword(u.password);
        await run('UPDATE users SET storeName = ?, password = ? WHERE email = ?', [
          u.storeName, newPassword, u.email
        ]);
      }
    }
  }
  console.log('Seeded and migrated default users.');
}
