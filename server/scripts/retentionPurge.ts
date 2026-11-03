import '../config/env.js';
import fs from 'fs';
import path from 'path';

import { all, db, run } from '../db/database.js';
import { logger, logSecurityEvent } from '../utils/logger.js';

export interface RetentionPurgeResult {
  anonymizedCustomers: number;
  deletedCustomerLogs: number;
  deletedFeedbackTokens: number;
  deletedImageFiles: number;
  dryRun: boolean;
  executedAt: string;
}

const DEFAULT_IMAGE_RETENTION_DAYS = 90;
const DEFAULT_TOKEN_RETENTION_DAYS = 180; // 6 months (DPA Survey & Tokens)
const DEFAULT_LOG_RETENTION_DAYS = 365;
const DEFAULT_CUSTOMER_RETENTION_DAYS = 1095; // 3 years

export async function runRetentionPurge(dryRun = false): Promise<RetentionPurgeResult> {
  const imageDays = parseInt(process.env.RETENTION_IMAGE_DAYS || '', 10) || DEFAULT_IMAGE_RETENTION_DAYS;
  const tokenDays = parseInt(process.env.RETENTION_TOKEN_DAYS || '', 10) || DEFAULT_TOKEN_RETENTION_DAYS;
  const logDays = parseInt(process.env.RETENTION_LOG_DAYS || '', 10) || DEFAULT_LOG_RETENTION_DAYS;
  const customerDays = parseInt(process.env.RETENTION_CUSTOMER_DAYS || '', 10) || DEFAULT_CUSTOMER_RETENTION_DAYS;

  logger.info('[RetentionPurge] Starting data retention purge cycle', {
    customerDays,
    dryRun,
    imageDays,
    logDays,
    tokenDays,
  });

  const now = new Date();
  const tokenCutoff = new Date(now.getTime() - tokenDays * 24 * 60 * 60 * 1000).toISOString();
  const logCutoff = new Date(now.getTime() - logDays * 24 * 60 * 60 * 1000).toISOString();
  const customerCutoff = new Date(now.getTime() - customerDays * 24 * 60 * 60 * 1000).toISOString();
  const imageCutoffMs = now.getTime() - imageDays * 24 * 60 * 60 * 1000;

  let deletedFeedbackTokens = 0;
  let deletedCustomerLogs = 0;
  let anonymizedCustomers = 0;
  let deletedImageFiles = 0;

  // 1. Purge expired or used feedback tokens
  const tokenCandidates = await all<{ token: string }>(
    `SELECT token FROM feedback_tokens
     WHERE (usedAt IS NOT NULL AND usedAt < ?)
        OR (usedAt IS NULL AND expiresAt < ?)`,
    [tokenCutoff, tokenCutoff]
  );
  deletedFeedbackTokens = tokenCandidates.length;

  if (!dryRun && deletedFeedbackTokens > 0) {
    await run(
      `DELETE FROM feedback_tokens
       WHERE (usedAt IS NOT NULL AND usedAt < ?)
          OR (usedAt IS NULL AND expiresAt < ?)`,
      [tokenCutoff, tokenCutoff]
    );
  }

  // 2. Purge aged operational call logs
  const logCandidates = await all<{ id: number }>(
    `SELECT id FROM customer_logs
     WHERE lastUpdatedOn IS NOT NULL AND lastUpdatedOn < ?`,
    [logCutoff]
  );
  deletedCustomerLogs = logCandidates.length;

  if (!dryRun && deletedCustomerLogs > 0) {
    await run(
      `DELETE FROM customer_logs
       WHERE lastUpdatedOn IS NOT NULL AND lastUpdatedOn < ?`,
      [logCutoff]
    );
  }

  // 3. Delete prescription image uploads older than retention window
  const imageDir = path.resolve(
    process.env.STORE_FEEDBACK_IMAGE_UPLOADS_DIR || 'uploads/store-feedback-images'
  );

  if (fs.existsSync(imageDir)) {
    const files = fs.readdirSync(imageDir);
    for (const file of files) {
      const fullPath = path.join(imageDir, file);
      try {
        const stat = fs.statSync(fullPath);
        if (stat.isFile() && stat.mtimeMs < imageCutoffMs) {
          deletedImageFiles++;
          if (!dryRun) {
            fs.unlinkSync(fullPath);
            await run(
              `UPDATE customers SET storeFeedbackImage1 = NULL WHERE storeFeedbackImage1 = ?`,
              [file]
            );
            await run(
              `UPDATE customers SET storeFeedbackImage2 = NULL WHERE storeFeedbackImage2 = ?`,
              [file]
            );
          }
        }
      } catch (fileErr) {
        logger.warn('[RetentionPurge] Unable to inspect image file', {
          errorMessage: fileErr instanceof Error ? fileErr.message : String(fileErr),
          file,
        });
      }
    }
  }

  // 4. Anonymize customer health records older than customer retention cutoff
  const customerCandidates = await all<{ id: string }>(
    `SELECT id FROM customers
     WHERE lastUpdatedOn IS NOT NULL
       AND lastUpdatedOn < ?
       AND name != 'ANONYMIZED'`,
    [customerCutoff]
  );
  anonymizedCustomers = customerCandidates.length;

  if (!dryRun && anonymizedCustomers > 0) {
    await run(
      `UPDATE customers
       SET name = 'ANONYMIZED',
           mobile = '0000000000',
           rxData = NULL,
           optometristRxData = NULL,
           storeFeedback = '',
           optometristFeedback = '',
           patientFeedback = NULL,
           storeFeedbackImage1 = NULL,
           storeFeedbackImage2 = NULL
       WHERE lastUpdatedOn IS NOT NULL
         AND lastUpdatedOn < ?
         AND name != 'ANONYMIZED'`,
      [customerCutoff]
    );
  }

  const result: RetentionPurgeResult = {
    anonymizedCustomers,
    deletedCustomerLogs,
    deletedFeedbackTokens,
    deletedImageFiles,
    dryRun,
    executedAt: now.toISOString(),
  };

  logSecurityEvent('DATA_RETENTION_PURGE_EXECUTED', {
    anonymizedCustomers,
    deletedCustomerLogs,
    deletedFeedbackTokens,
    deletedImageFiles,
    dryRun,
    executedAt: result.executedAt,
  });

  logger.info('[RetentionPurge] Completed data retention purge cycle', result);

  return result;
}

async function cli() {
  const isDryRun = process.argv.includes('--dry-run');
  try {
    const result = await runRetentionPurge(isDryRun);
    console.log('[Retention Purge Summary]:', JSON.stringify(result, null, 2));
    db.close();
    process.exit(0);
  } catch (err) {
    const error = err instanceof Error ? err : new Error(String(err));
    logger.error('[RetentionPurge] Purge process failed', {
      errorMessage: error.message,
      stack: error.stack,
    });
    console.error('Retention purge failed:', error);
    process.exit(1);
  }
}

// Execute directly if run via CLI
const isDirectCli = process.argv[1] && process.argv[1].includes('retentionPurge');
if (isDirectCli) {
  cli();
}

