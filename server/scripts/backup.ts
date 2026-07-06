import './../config/env.js';
import fs from 'fs';
import path from 'path';
import { db } from '../db/database.js';

const RETENTION_DAYS = 14;

async function main() {
  const dbPath = process.env.DATABASE_PATH || 'database.db';
  const backupDir = process.env.BACKUP_DIR || path.join(path.dirname(dbPath), 'backups');
  fs.mkdirSync(backupDir, { recursive: true });

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const destPath = path.join(backupDir, `database-${timestamp}.db`);

  await db.backup(destPath);
  console.log(`Backup written to ${destPath}`);

  const cutoff = Date.now() - RETENTION_DAYS * 24 * 60 * 60 * 1000;
  for (const file of fs.readdirSync(backupDir)) {
    if (!file.startsWith('database-') || !file.endsWith('.db')) continue;
    const filePath = path.join(backupDir, file);
    if (fs.statSync(filePath).mtimeMs < cutoff) {
      fs.unlinkSync(filePath);
      console.log(`Removed old backup ${file}`);
    }
  }

  db.close();
}

main().catch((err) => {
  console.error('Backup failed:', err);
  process.exit(1);
});
