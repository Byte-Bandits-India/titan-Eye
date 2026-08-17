import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import winston from 'winston';

import DailyRotateFile from 'winston-daily-rotate-file';
import { Syslog } from 'winston-syslog';

const LOG_DIR = process.env.LOG_DIR || 'logs';
const LOG_LEVEL = process.env.LOG_LEVEL || (process.env.NODE_ENV === 'production' ? 'info' : 'debug');
const isProduction = process.env.NODE_ENV === 'production';

fs.mkdirSync(LOG_DIR, { mode: 0o750, recursive: true });

try {
  fs.chmodSync(LOG_DIR, 0o750);
} catch {
  /* platform doesn't support chmod */
}

const RESTRICTED_FILE_OPTIONS = { flags: 'a', mode: 0o640 };

const SENSITIVE_SUBSTRINGS = [
  'password',
  'token',
  'secret',
  'authorization',
  'cookie',
  'signature',
  'verifier',
  'apikey',
  'privatekey',
];

export type JsonPrimitive = string | number | boolean | null | undefined;
export type JsonValue = JsonPrimitive | JsonObject | JsonArray;
export interface JsonObject {
  [key: string]: JsonValue;
}
export type JsonArray = JsonValue[];

export type SecurityEventMeta = JsonObject;

export function stableStringify(value: JsonValue): string {
  if (Array.isArray(value)) {
    return `[${value.map(stableStringify).join(',')}]`;
  }

  if (value && typeof value === 'object') {
    const obj = value as JsonObject;
    const keys = Object.keys(obj).sort();

    return `{${keys.map((k) => `${JSON.stringify(k)}:${stableStringify(obj[k])}`).join(',')}}`;
  }

  return JSON.stringify(value);
}

function isSensitiveKey(key: string): boolean {
  const normalized = key.toLowerCase();

  return SENSITIVE_SUBSTRINGS.some((s) => normalized.includes(s));
}

function redact(value: JsonValue, seen = new WeakSet<object>()): JsonValue {
  if (Array.isArray(value)) {
    return value.map((v) => redact(v, seen));
  }

  if (value && typeof value === 'object') {
    const obj = value as JsonObject;

    if (seen.has(obj)) {
      return '[Circular]';
    }

    seen.add(obj);
    const out: JsonObject = {};

    for (const [key, val] of Object.entries(obj)) {
      out[key] = isSensitiveKey(key) ? '[REDACTED]' : redact(val, seen);
    }

    return out;
  }

  return value;
}

const redactFormat = winston.format((info) => {
  const { level: _level, message: _message, service: _service, timestamp: _timestamp, ...meta } = info;

  for (const key of Object.keys(meta)) {
    delete (info as JsonObject)[key];
  }

  Object.assign(info, redact(meta as JsonObject) as object);

  return info;
});

const baseFormat = winston.format.combine(
  winston.format.timestamp(),
  redactFormat(),
  winston.format.errors({ stack: true }),
  winston.format.json()
);

const consoleFormat = winston.format.combine(
  winston.format.timestamp({ format: 'HH:mm:ss' }),
  redactFormat(),
  winston.format.errors({ stack: true }),
  winston.format.colorize(),
  winston.format.printf(({ level, message, timestamp, ...meta }) => {
    delete (meta as JsonObject).service;
    const extra = Object.keys(meta).length ? ` ${JSON.stringify(meta)}` : '';

    return `${timestamp} ${level}: ${message}${extra}`;
  })
);

function rotateFile(filename: string, level: string, maxFiles: string) {
  return new DailyRotateFile({
    datePattern: 'YYYY-MM-DD',
    dirname: LOG_DIR,
    filename: `${filename}-%DATE%.log`,
    level,
    maxFiles,
    maxSize: '20m',
    options: RESTRICTED_FILE_OPTIONS,
    zippedArchive: true,
  });
}

function syslogTransport(): InstanceType<typeof Syslog> | null {
  if (!process.env.SYSLOG_HOST) {
    return null;
  }

  return new Syslog({
    app_name: 'titan-server',
    host: process.env.SYSLOG_HOST,
    port: process.env.SYSLOG_PORT ? Number(process.env.SYSLOG_PORT) : 514,
    protocol: (process.env.SYSLOG_PROTOCOL as 'tcp4' | 'tls4' | 'udp4') || 'udp4',
  });
}

export const logger = winston.createLogger({
  defaultMeta: { service: 'titan-server' },
  exitOnError: false,
  format: baseFormat,
  level: LOG_LEVEL,
  transports: [rotateFile('app', 'info', '30d'), rotateFile('error', 'error', '90d')],
});

if (!isProduction) {
  logger.add(new winston.transports.Console({ format: consoleFormat }));
} else {
  logger.add(new winston.transports.Console({ format: baseFormat, level: 'info' }));
}

const appSyslog = syslogTransport();

if (appSyslog) {
  logger.add(appSyslog);
}

const securityTransport = rotateFile('security', 'info', '365d');
export const securityLogger = winston.createLogger({
  defaultMeta: { channel: 'security', service: 'titan-server' },
  exitOnError: false,
  format: baseFormat,
  level: 'info',
  transports: [securityTransport],
});

const securitySyslog = syslogTransport();

if (securitySyslog) {
  securityLogger.add(securitySyslog);
}

const GENESIS_HASH = '0'.repeat(64);
const CHAIN_STATE_FILE = path.join(LOG_DIR, '.security-chain-state.json');

function loadChainState(): { lastHash: string } {
  try {
    const raw = JSON.parse(fs.readFileSync(CHAIN_STATE_FILE, 'utf8'));

    if (typeof raw?.lastHash === 'string') {
      return raw;
    }
  } catch {
    /* first run, or file missing/corrupt — restart the chain */
  }

  return { lastHash: GENESIS_HASH };
}

const chainState = loadChainState();

export function logSecurityEvent(event: string, meta: SecurityEventMeta = {}) {
  const eventTimestamp = new Date().toISOString();
  const prevHash = chainState.lastHash;
  const redactedMeta = redact(meta) as JsonObject;

  const canonical = stableStringify({ event, eventTimestamp, meta: redactedMeta, prevHash });
  const hash = crypto.createHash('sha256').update(canonical).digest('hex');

  const chainedMeta = { ...redactedMeta, eventTimestamp, hash, prevHash };
  securityLogger.info(event, chainedMeta);
  logger.info(`[security] ${event}`, chainedMeta);

  chainState.lastHash = hash;
  persistChainState();
}

function persistChainState() {
  try {
    fs.writeFileSync(CHAIN_STATE_FILE, JSON.stringify(chainState), { mode: 0o640 });
  } catch (e) {
    logger.error('Failed to persist security log chain state', {
      errorMessage: e instanceof Error ? e.message : String(e),
    });
  }
}

const ALERT_WEBHOOK_URL = process.env.ALERT_WEBHOOK_URL;

export function alertCritical(message: string, meta: SecurityEventMeta = {}) {
  logger.error(`[ALERT] ${message}`, meta);

  if (!ALERT_WEBHOOK_URL) {
    return;
  }

  const text = `🚨 Titan server alert: ${message}\n${JSON.stringify(redact(meta))}`;
  fetch(ALERT_WEBHOOK_URL, {
    body: JSON.stringify({ text }),
    headers: { 'Content-Type': 'application/json' },
    method: 'POST',
  }).catch((err) => {
    logger.error('Failed to deliver alert webhook', {
      errorMessage: err instanceof Error ? err.message : String(err),
    });
  });
}

export function resolveLogDir(): string {
  return path.resolve(LOG_DIR);
}
