import '../config/env.js';
import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import zlib from 'zlib';

import { decryptLogLine, getLogEncryptionKey, isEncryptedLogLine } from '../utils/logCrypto.js';
import { JsonObject, JsonValue, stableStringify } from '../utils/logger.js';

const GENESIS_HASH = '0'.repeat(64);
const NON_META_KEYS = new Set([
  'channel', 'eventTimestamp', 'hash', 'level', 'message',
  'prevHash', 'service', 'timestamp',
]);

interface SecurityLogLine {
  [key: string]: JsonValue;
  eventTimestamp?: string;
  hash?: string;
  message: string;
  prevHash?: string;
}

function collectLogFiles(target: string): string[] {
  const stat = fs.statSync(target);
  if (stat.isFile()) {
    return [target];
  }

  const results: string[] = [];
  const entries = fs.readdirSync(target, { withFileTypes: true });

  for (const entry of entries) {
    const full = path.join(target, entry.name);
    if (entry.isDirectory()) {
      if (['audit', 'signin', 'err', 'monitoring'].includes(entry.name)) {
        results.push(...collectLogFiles(full));
      }
    } else if (
      /^(audit|signin|security)-\d{4}-\d{2}-\d{2}\.log(\.gz)?$/.test(entry.name)
    ) {
      results.push(full);
    }
  }

  return results.sort();
}

function readLines(filePath: string, key?: Buffer | null): string[] {
  const raw = filePath.endsWith('.gz')
    ? zlib.gunzipSync(fs.readFileSync(filePath)).toString('utf8')
    : fs.readFileSync(filePath, 'utf8');

  return raw
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean)
    .map((line) => {
      if (isEncryptedLogLine(line)) {
        try {
          return decryptLogLine(line, key);
        } catch (e) {
          console.error(`[Decrypt Error] Failed to decrypt line in ${path.basename(filePath)}:`, e);
          return line;
        }
      }
      return line;
    });
}

function verifyChainGroup(chainName: string, files: string[], key?: Buffer | null): boolean {
  console.log(`\n--- Verifying ${chainName.toUpperCase()} Log Chain (${files.length} file(s)) ---`);
  let expectedPrevHash = GENESIS_HASH;
  let lineNo = 0;
  let ok = true;

  for (const file of files) {
    let fileLineNo = 0;
    for (const raw of readLines(file, key)) {
      fileLineNo += 1;
      lineNo += 1;
      let entry: SecurityLogLine;

      try {
        entry = JSON.parse(raw);
      } catch {
        console.error(`Line ${lineNo} (${path.basename(file)}): not valid JSON — skipping`);
        continue;
      }

      if (!entry.hash || !entry.prevHash || !entry.eventTimestamp) {
        console.error(`Line ${lineNo} (${path.basename(file)}): missing chain fields (hash/prevHash/eventTimestamp) — cannot verify`);
        ok = false;
        continue;
      }

      if (entry.prevHash === GENESIS_HASH) {
        expectedPrevHash = GENESIS_HASH;
      }

      if (entry.prevHash !== expectedPrevHash) {
        console.error(
          `Line ${lineNo} (${path.basename(file)}): chain broken — expected prevHash ${expectedPrevHash.slice(0, 12)}… but found ${entry.prevHash.slice(0, 12)}…`
        );
        ok = false;
      }

      const meta: JsonObject = {};
      for (const [keyName, value] of Object.entries(entry)) {
        if (!NON_META_KEYS.has(keyName)) {
          meta[keyName] = value;
        }
      }

      const canonical = stableStringify({
        event: entry.message,
        eventTimestamp: entry.eventTimestamp,
        meta,
        prevHash: entry.prevHash,
      });
      const recomputed = crypto.createHash('sha256').update(canonical).digest('hex');

      if (recomputed !== entry.hash) {
        console.error(`Line ${lineNo} (${path.basename(file)}): hash mismatch — entry was modified after being written`);
        ok = false;
      }

      expectedPrevHash = entry.hash;
    }
  }

  if (ok) {
    console.log(`✓ OK — ${lineNo} ${chainName} log entries verified across ${files.length} file(s), chain intact.`);
  } else {
    console.error(`✗ FAILED — tampering or corruption detected in ${chainName} log chain.`);
  }

  return ok;
}

function verify(target: string): boolean {
  const allFiles = collectLogFiles(target);
  const key = getLogEncryptionKey();

  if (allFiles.length === 0) {
    console.error(`No chained log files (audit-*, signin-*, security-*) found at ${target}`);
    return false;
  }

  // Group files by prefix (audit, signin, security)
  const groups: Record<string, string[]> = {
    audit: [],
    signin: [],
    security: [],
  };

  for (const f of allFiles) {
    const base = path.basename(f);
    if (base.startsWith('audit-')) groups.audit.push(f);
    else if (base.startsWith('signin-')) groups.signin.push(f);
    else if (base.startsWith('security-')) groups.security.push(f);
  }

  let allOk = true;

  for (const [name, files] of Object.entries(groups)) {
    if (files.length > 0) {
      const ok = verifyChainGroup(name, files, key);
      if (!ok) allOk = false;
    }
  }

  return allOk;
}

const target = process.argv[2] || 'logs';
process.exit(verify(path.resolve(target)) ? 0 : 1);
