import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import zlib from 'zlib';

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

function listChainFiles(target: string): string[] {
  const stat = fs.statSync(target);

  if (stat.isFile()) {return [target];}

  return fs.readdirSync(target)
    .filter((f) => /^security-\d{4}-\d{2}-\d{2}\.log(\.gz)?$/.test(f))
    .sort()
    .map((f) => path.join(target, f));
}

function readLines(filePath: string): string[] {
  const raw = filePath.endsWith('.gz')
    ? zlib.gunzipSync(fs.readFileSync(filePath)).toString('utf8')
    : fs.readFileSync(filePath, 'utf8');

  return raw.split('\n').map((l) => l.trim()).filter(Boolean);
}

function verify(target: string): boolean {
  const files = listChainFiles(target);

  if (files.length === 0) {
    console.error(`No security-*.log files found at ${target}`);

    return false;
  }

  let expectedPrevHash = GENESIS_HASH;
  let lineNo = 0;
  let ok = true;

  for (const file of files) {
    for (const raw of readLines(file)) {
      lineNo += 1;
      let entry: SecurityLogLine;

      try {
        entry = JSON.parse(raw);
      } catch {
        console.error(`Line ${lineNo} (${file}): not valid JSON — skipping`);
        continue;
      }

      if (!entry.hash || !entry.prevHash || !entry.eventTimestamp) {
        console.error(`Line ${lineNo} (${file}): missing chain fields (hash/prevHash/eventTimestamp) — cannot verify`);
        ok = false;
        continue;
      }

      if (entry.prevHash !== expectedPrevHash) {
        console.error(
          `Line ${lineNo} (${file}): chain broken — expected prevHash ${expectedPrevHash.slice(0, 12)}… but found ${entry.prevHash.slice(0, 12)}…`
        );
        ok = false;
      }

      const meta: JsonObject = {};

      for (const [key, value] of Object.entries(entry)) {
        if (!NON_META_KEYS.has(key)) {meta[key] = value;}
      }

      const canonical = stableStringify({ event: entry.message, eventTimestamp: entry.eventTimestamp, meta, prevHash: entry.prevHash });
      const recomputed = crypto.createHash('sha256').update(canonical).digest('hex');

      if (recomputed !== entry.hash) {
        console.error(`Line ${lineNo} (${file}): hash mismatch — entry was modified after being written`);
        ok = false;
      }

      expectedPrevHash = entry.hash;
    }
  }

  if (ok) {
    console.log(`OK — ${lineNo} security log entries verified across ${files.length} file(s), chain intact.`);
  } else {
    console.error(`FAILED — tampering or corruption detected (see above). Checked ${lineNo} entries across ${files.length} file(s).`);
  }

  return ok;
}

const target = process.argv[2];

if (!target) {
  console.error('Usage: verify-logs <path-to-security-*.log-file-or-logs-directory>');
  process.exit(2);
}

process.exit(verify(path.resolve(target)) ? 0 : 1);
