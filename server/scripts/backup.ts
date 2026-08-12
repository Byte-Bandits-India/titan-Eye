import './../config/env.js';
import fs from 'fs';
import path from 'path';

import { db } from '../db/database.js';
import { logger } from '../utils/logger.js';

const RETENTION_DAYS = 14;

async function main() {
  const dbPath = process.env.DATABASE_PATH || 'database.db';
  const backupDir = process.env.BACKUP_DIR || path.join(path.dirname(dbPath), 'backups');
  fs.mkdirSync(backupDir, { recursive: true });

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const destPath = path.join(backupDir, `database-${timestamp}.db`);

  await db.backup(destPath);
  logger.info('Backup written', { destPath });

  const cutoff = Date.now() - RETENTION_DAYS * 24 * 60 * 60 * 1000;

  for (const file of fs.readdirSync(backupDir)) {
    if (!file.startsWith('database-') || !file.endsWith('.db')) {continue;}

    const filePath = path.join(backupDir, file);

    if (fs.statSync(filePath).mtimeMs < cutoff) {
      fs.unlinkSync(filePath);
      logger.info('Removed old backup', { file });
    }
  }

  db.close();
}

main().catch((err) => {
  const error = err instanceof Error ? err : new Error(String(err));
  logger.error('Backup failed', { errorMessage: error.message, stack: error.stack });
  process.exit(1);
});
