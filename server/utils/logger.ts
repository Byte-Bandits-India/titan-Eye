import '../config/env.js';
import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import winston from 'winston';
import DailyRotateFile from 'winston-daily-rotate-file';
import { Syslog } from 'winston-syslog';

import { decryptLogLine, encryptLogLine, getLogEncryptionKey, isLogEncryptionEnabled } from './logCrypto.js';

const LOG_DIR = process.env.LOG_DIR || 'logs';
const LOG_RETENTION_DAYS = process.env.LOG_RETENTION_DAYS || '180d';
const LOG_LEVEL = process.env.LOG_LEVEL || (process.env.NODE_ENV === 'production' ? 'info' : 'debug');
const isProduction = process.env.NODE_ENV === 'production';

// Subfolder paths for the 4 dedicated log categories
export const AUDIT_LOG_DIR = path.join(LOG_DIR, 'audit');
export const ERR_LOG_DIR = path.join(LOG_DIR, 'err');
export const SIGNIN_LOG_DIR = path.join(LOG_DIR, 'signin');
export const MONITORING_LOG_DIR = path.join(LOG_DIR, 'monitoring');

const ALL_LOG_DIRS = [LOG_DIR, AUDIT_LOG_DIR, ERR_LOG_DIR, SIGNIN_LOG_DIR, MONITORING_LOG_DIR];

for (const dir of ALL_LOG_DIRS) {
  fs.mkdirSync(dir, { mode: 0o750, recursive: true });
  try {
    fs.chmodSync(dir, 0o750);
  } catch {
    /* platform doesn't support chmod */
  }
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

const fileFormat = winston.format.combine(
  winston.format.timestamp(),
  redactFormat(),
  winston.format.errors({ stack: true }),
  winston.format.printf((info) => {
    const jsonStr = JSON.stringify(info);
    if (isLogEncryptionEnabled()) {
      return encryptLogLine(jsonStr);
    }
    return jsonStr;
  })
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

function createDailyRotateTransport(dirname: string, filename: string, level: string, maxFiles = LOG_RETENTION_DAYS) {
  return new DailyRotateFile({
    datePattern: 'YYYY-MM-DD',
    dirname,
    filename: `${filename}-%DATE%.log`,
    level,
    maxFiles, // 180 days retention
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

// ==============================================================================
// 1. AUDIT LOGGER (logs/audit/audit-YYYY-MM-DD.log) - 180 Days Retention
// ==============================================================================
const auditTransport = createDailyRotateTransport(AUDIT_LOG_DIR, 'audit', 'info', '180d');
export const auditLogger = winston.createLogger({
  defaultMeta: { channel: 'audit', service: 'titan-server' },
  exitOnError: false,
  format: fileFormat,
  level: 'info',
  transports: [auditTransport],
});

// ==============================================================================
// 2. ERROR LOGGER (logs/err/error-YYYY-MM-DD.log) - 180 Days Retention
// ==============================================================================
const errorTransport = createDailyRotateTransport(ERR_LOG_DIR, 'error', 'error', '180d');
export const errorLogger = winston.createLogger({
  defaultMeta: { channel: 'error', service: 'titan-server' },
  exitOnError: false,
  format: fileFormat,
  level: 'error',
  transports: [errorTransport],
});

// ==============================================================================
// 3. SIGNIN LOGGER (logs/signin/signin-YYYY-MM-DD.log) - 180 Days Retention
// ==============================================================================
const signinTransport = createDailyRotateTransport(SIGNIN_LOG_DIR, 'signin', 'info', '180d');
export const signinLogger = winston.createLogger({
  defaultMeta: { channel: 'signin', service: 'titan-server' },
  exitOnError: false,
  format: fileFormat,
  level: 'info',
  transports: [signinTransport],
});

// ==============================================================================
// 4. MONITORING LOGGER (logs/monitoring/monitoring-YYYY-MM-DD.log) - 180 Days Retention
// ==============================================================================
const monitoringTransport = createDailyRotateTransport(MONITORING_LOG_DIR, 'monitoring', 'info', '180d');
export const monitoringLogger = winston.createLogger({
  defaultMeta: { channel: 'monitoring', service: 'titan-server' },
  exitOnError: false,
  format: fileFormat,
  level: 'info',
  transports: [monitoringTransport],
});

// ==============================================================================
// General Application Logger (Console + Error transport bridge)
// ==============================================================================
export const logger = winston.createLogger({
  defaultMeta: { service: 'titan-server' },
  exitOnError: false,
  format: baseFormat,
  level: LOG_LEVEL,
  transports: [errorTransport],
});

if (!isProduction) {
  const consoleTr = new winston.transports.Console({ format: consoleFormat });
  logger.add(consoleTr);
  auditLogger.add(consoleTr);
  signinLogger.add(consoleTr);
  errorLogger.add(consoleTr);
} else {
  const prodConsoleTr = new winston.transports.Console({ format: baseFormat, level: 'info' });
  logger.add(prodConsoleTr);
  errorLogger.add(prodConsoleTr);
}

const sysLog = syslogTransport();
if (sysLog) {
  logger.add(sysLog);
  auditLogger.add(sysLog);
  signinLogger.add(sysLog);
  errorLogger.add(sysLog);
}

// Backward compatibility alias: securityLogger -> auditLogger
export const securityLogger = auditLogger;

// ==============================================================================
// Tamper-Evident SHA-256 Hash Chaining (Audit & Signin)
// ==============================================================================
const GENESIS_HASH = '0'.repeat(64);
const AUDIT_CHAIN_STATE_FILE = path.join(AUDIT_LOG_DIR, '.audit-chain-state.json');
const SIGNIN_CHAIN_STATE_FILE = path.join(SIGNIN_LOG_DIR, '.signin-chain-state.json');

function loadChainState(filePath: string): { lastHash: string } {
  try {
    if (fs.existsSync(filePath)) {
      const raw = JSON.parse(fs.readFileSync(filePath, 'utf8'));
      if (typeof raw?.lastHash === 'string') {
        return raw;
      }
    }
  } catch {
    /* start chain if file is missing or corrupt */
  }

  return { lastHash: GENESIS_HASH };
}

const auditChainState = loadChainState(AUDIT_CHAIN_STATE_FILE);
const signinChainState = loadChainState(SIGNIN_CHAIN_STATE_FILE);

function persistChainState(filePath: string, state: { lastHash: string }) {
  try {
    fs.writeFileSync(filePath, JSON.stringify(state), { mode: 0o640 });
  } catch (e) {
    errorLogger.error('Failed to persist log chain state', {
      errorMessage: e instanceof Error ? e.message : String(e),
      filePath,
    });
  }
}

/**
 * Logs an administrative, compliance, data mutation or security audit event.
 * Writes to logs/audit/audit-YYYY-MM-DD.log with cryptographic chaining.
 */
export function logAuditEvent(event: string, meta: SecurityEventMeta = {}) {
  const eventTimestamp = new Date().toISOString();
  const prevHash = auditChainState.lastHash;
  const redactedMeta = redact(meta) as JsonObject;

  const canonical = stableStringify({ event, eventTimestamp, meta: redactedMeta, prevHash });
  const hash = crypto.createHash('sha256').update(canonical).digest('hex');

  const chainedMeta = { ...redactedMeta, eventTimestamp, hash, prevHash };
  auditLogger.info(event, chainedMeta);

  auditChainState.lastHash = hash;
  persistChainState(AUDIT_CHAIN_STATE_FILE, auditChainState);
}

/**
 * Logs an authentication or signin event (login, logout, SSO, lockout, token event).
 * Writes to logs/signin/signin-YYYY-MM-DD.log with cryptographic chaining.
 */
export function logSigninEvent(event: string, meta: SecurityEventMeta = {}) {
  const eventTimestamp = new Date().toISOString();
  const prevHash = signinChainState.lastHash;
  const redactedMeta = redact(meta) as JsonObject;

  const canonical = stableStringify({ event, eventTimestamp, meta: redactedMeta, prevHash });
  const hash = crypto.createHash('sha256').update(canonical).digest('hex');

  const chainedMeta = { ...redactedMeta, eventTimestamp, hash, prevHash };
  signinLogger.info(event, chainedMeta);

  signinChainState.lastHash = hash;
  persistChainState(SIGNIN_CHAIN_STATE_FILE, signinChainState);
}

/**
 * Logs request and latency metrics for system monitoring and observability.
 * Writes to logs/monitoring/monitoring-YYYY-MM-DD.log.
 */
export function logMonitoringMetric(meta: SecurityEventMeta = {}) {
  monitoringLogger.info('HTTP_REQUEST', redact(meta) as JsonObject);
}

/**
 * Logs an error with message, error stack, and request metadata.
 * Writes to logs/err/error-YYYY-MM-DD.log.
 */
export function logError(message: string, error?: Error | unknown, meta: SecurityEventMeta = {}) {
  const errObj = error instanceof Error
    ? { errorMessage: error.message, stack: error.stack }
    : error
      ? { errorMessage: String(error) }
      : {};

  errorLogger.error(message, {
    ...(redact(meta) as JsonObject),
    ...errObj,
  });
}

const SIGNIN_EVENT_KEYWORDS = [
  'LOGIN',
  'LOGOUT',
  'SSO',
  'AUTH',
  'TOKEN',
  'SESSION',
  'PASSWORD',
  'CAPTCHA',
  'ACCOUNT_LOCKED',
];

/**
 * Unified security event dispatcher for backward compatibility.
 * Intelligently routes authentication events to signin log, and system events to audit log.
 */
export function logSecurityEvent(event: string, meta: SecurityEventMeta = {}) {
  const isSigninEvent = SIGNIN_EVENT_KEYWORDS.some((kw) => event.toUpperCase().includes(kw));

  if (isSigninEvent) {
    logSigninEvent(event, meta);
  } else {
    logAuditEvent(event, meta);
  }
}

const ALERT_WEBHOOK_URL = process.env.ALERT_WEBHOOK_URL;

export function alertCritical(message: string, meta: SecurityEventMeta = {}) {
  logError(`[ALERT] ${message}`, undefined, meta);

  if (!ALERT_WEBHOOK_URL) {
    return;
  }

  const text = `🚨 Titan server alert: ${message}\n${JSON.stringify(redact(meta))}`;
  fetch(ALERT_WEBHOOK_URL, {
    body: JSON.stringify({ text }),
    headers: { 'Content-Type': 'application/json' },
    method: 'POST',
  }).catch((err) => {
    errorLogger.error('Failed to deliver alert webhook', {
      errorMessage: err instanceof Error ? err.message : String(err),
    });
  });
}

export function resolveLogDir(): string {
  return path.resolve(LOG_DIR);
}
