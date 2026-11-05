import '../config/env.js';
import fs from 'fs';
import path from 'path';
import zlib from 'zlib';

import { decryptLogLine, getLogEncryptionKey, isEncryptedLogLine } from '../utils/logCrypto.js';

interface CliOptions {
  channel?: string;
  isTail: boolean;
  outPath?: string;
  target?: string;
}

function parseArgs(): CliOptions {
  const args = process.argv.slice(2);
  const options: CliOptions = {
    isTail: false,
  };

  for (const arg of args) {
    if (arg === '--tail' || arg === '-f') {
      options.isTail = true;
    } else if (arg.startsWith('--out=')) {
      options.outPath = arg.slice(6);
    } else if (arg.startsWith('--channel=')) {
      options.channel = arg.slice(10);
    } else if (!arg.startsWith('-')) {
      options.target = arg;
    }
  }

  return options;
}

function getTodayLogPath(channel: string): string {
  const today = new Date().toISOString().slice(0, 10);
  const baseLogDir = path.resolve(process.env.LOG_DIR || 'logs');

  const candidates = [
    path.join(baseLogDir, channel, `${channel}-${today}.log`),
    path.join(baseLogDir, channel, `${channel === 'err' ? 'error' : channel}-${today}.log`),
    path.join(baseLogDir, `${channel}-${today}.log`),
  ];

  for (const cand of candidates) {
    if (fs.existsSync(cand)) {
      return cand;
    }
  }

  return candidates[0];
}

function resolveFiles(target: string): string[] {
  const resolved = path.resolve(target);
  if (!fs.existsSync(resolved)) {
    // Check if target is a channel name (audit, signin, err, monitoring)
    const todayPath = getTodayLogPath(target);
    if (fs.existsSync(todayPath)) {
      return [todayPath];
    }
    throw new Error(`File or directory not found: ${target}`);
  }

  const stat = fs.statSync(resolved);
  if (stat.isFile()) {
    return [resolved];
  }

  const files: string[] = [];
  const entries = fs.readdirSync(resolved, { withFileTypes: true });

  for (const entry of entries) {
    const full = path.join(resolved, entry.name);
    if (entry.isDirectory()) {
      files.push(...resolveFiles(full));
    } else if (/\.(log|gz)$/.test(entry.name)) {
      files.push(full);
    }
  }

  return files.sort();
}

function readRawLines(filePath: string): string[] {
  const raw = filePath.endsWith('.gz')
    ? zlib.gunzipSync(fs.readFileSync(filePath)).toString('utf8')
    : fs.readFileSync(filePath, 'utf8');

  return raw.split('\n').map((l) => l.trim()).filter(Boolean);
}

function decryptFile(filePath: string, key: Buffer, outStream?: fs.WriteStream): { total: number; encrypted: number } {
  const lines = readRawLines(filePath);
  let encCount = 0;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    let output = line;

    if (isEncryptedLogLine(line)) {
      encCount++;
      try {
        output = decryptLogLine(line, key);
      } catch (err) {
        output = `[DECRYPTION_ERROR: Line ${i + 1} - ${err instanceof Error ? err.message : String(err)}] ${line}`;
      }
    }

    if (outStream) {
      outStream.write(output + '\n');
    } else {
      console.log(output);
    }
  }

  return { total: lines.length, encrypted: encCount };
}

function tailFile(filePath: string, key: Buffer) {
  console.log(`\n👀 Tailing decrypted log stream: ${filePath}`);
  console.log(`Press Ctrl+C to stop.\n----------------------------------------------------`);

  // Print existing lines first
  if (fs.existsSync(filePath)) {
    decryptFile(filePath, key);
  }

  let currentSize = fs.existsSync(filePath) ? fs.statSync(filePath).size : 0;

  fs.watchFile(filePath, { interval: 500 }, (curr) => {
    if (curr.size <= currentSize) {
      currentSize = curr.size;
      return;
    }

    const stream = fs.createReadStream(filePath, {
      start: currentSize,
      end: curr.size,
      encoding: 'utf8',
    });

    currentSize = curr.size;

    stream.on('data', (chunk: string | Buffer) => {
      const text = chunk.toString();
      const lines = text.split('\n').map((l) => l.trim()).filter(Boolean);
      for (const line of lines) {
        if (isEncryptedLogLine(line)) {
          try {
            console.log(decryptLogLine(line, key));
          } catch (e) {
            console.error('[Decryption Failed]:', e instanceof Error ? e.message : String(e));
          }
        } else {
          console.log(line);
        }
      }
    });
  });
}

async function main() {
  const opts = parseArgs();
  const key = getLogEncryptionKey();

  if (!key) {
    console.error('❌ Error: LOG_ENCRYPTION_KEY is not defined in environment or .env.');
    console.error('Please configure LOG_ENCRYPTION_KEY in your .env file before running decrypt.');
    process.exit(1);
  }

  const maskedKey = `${key.toString('hex').slice(0, 8)}...${key.toString('hex').slice(-8)}`;
  console.log(`[Log Decryptor] Key loaded: ${maskedKey} (256-bit AES-GCM)`);

  const target = opts.target || opts.channel || 'logs';

  if (opts.isTail) {
    let tailTarget = target;
    if (['audit', 'signin', 'err', 'error', 'monitoring'].includes(target.toLowerCase())) {
      tailTarget = getTodayLogPath(target.toLowerCase());
    } else if (fs.existsSync(target) && fs.statSync(target).isDirectory()) {
      tailTarget = getTodayLogPath('audit');
    }
    tailFile(tailTarget, key);
    return;
  }

  const files = resolveFiles(target);
  if (files.length === 0) {
    console.warn(`No log files found for target: ${target}`);
    return;
  }

  let outStream: fs.WriteStream | undefined;
  if (opts.outPath) {
    outStream = fs.createWriteStream(path.resolve(opts.outPath), { flags: 'w' });
    console.log(`Writing decrypted logs to: ${opts.outPath}`);
  }

  let totalLines = 0;
  let totalEncrypted = 0;

  for (const file of files) {
    if (!opts.outPath) {
      console.log(`\n=== Decrypting: ${path.relative(process.cwd(), file)} ===`);
    }
    const result = decryptFile(file, key, outStream);
    totalLines += result.total;
    totalEncrypted += result.encrypted;
  }

  if (outStream) {
    outStream.end();
  }

  console.log(`\n✓ Completed. Processed ${totalLines} line(s) across ${files.length} file(s) (${totalEncrypted} line(s) decrypted).`);
}

main().catch((err) => {
  console.error('Fatal Decryption Error:', err);
  process.exit(1);
});

