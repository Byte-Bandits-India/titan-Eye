import sqlite3 from 'sqlite3';
import fs from 'fs';
import { hashPassword } from '../utils/hash.js';

const DB_PATH = process.env.DATABASE_PATH || 'database.db';
export const db = new sqlite3.Database(DB_PATH);

// Restrict file permissions to owner-only (read/write)
try {
  fs.chmodSync(DB_PATH, 0o600);
} catch (e) {
  // May fail on Windows or if file doesn't exist yet; non-fatal
}

// Enable WAL mode for better concurrent read safety
db.run('PRAGMA journal_mode=WAL', (err) => {
  if (err) console.error('Failed to enable WAL mode:', err.message);
});

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
      storeName TEXT,
      password TEXT NOT NULL
    )
  `);

  try {
    await run(`ALTER TABLE users ADD COLUMN storeName TEXT`);
  } catch (e) {}

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

  // Seed default users if they do not exist
  const defaultUsers = [
    { email: 'store@gmail.com', name: 'Meena', role: 'store', storeName: 'Store A', password: 'pass@123' },
    { email: 'store2@gmail.com', name: 'Rahul', role: 'store', storeName: 'Store B', password: 'pass@123' },
    { email: 'store3@gmail.com', name: 'Sonia', role: 'store', storeName: 'Store C', password: 'pass@123' },
    { email: 'optem@gmail.com', name: 'Dr. Priya', role: 'optem', storeName: null, password: 'pass@123' },
    { email: 'optem2@gmail.com', name: 'Dr. Amit', role: 'optem', storeName: null, password: 'pass@123' },
    { email: 'optem3@gmail.com', name: 'Dr. Vikram', role: 'optem', storeName: null, password: 'pass@123' },
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
