import { db } from '../db/database.js';

interface RevokedEntry {
  expiresAt: number;
  signature: string;
}

const revokedTokens: Map<string, RevokedEntry> = new Map();

export function isRevoked(token: string): boolean {
  const sig = extractSignature(token);

  if (!sig) {
    return false;
  }

  if (revokedTokens.has(sig)) {
    return true;
  }

  try {
    const row = db
      .prepare('SELECT expiresAt FROM token_blacklist WHERE signature = ?')
      .get(sig) as { expiresAt: number } | undefined;

    if (row) {
      if (row.expiresAt > Date.now()) {
        revokedTokens.set(sig, { expiresAt: row.expiresAt, signature: sig });
        return true;
      } else {
        db.prepare('DELETE FROM token_blacklist WHERE signature = ?').run(sig);
        return false;
      }
    }
  } catch {
    // If table not initialized yet during bootstrap, fall back to memory
  }

  return false;
}

export function revokeToken(token: string): void {
  const sig = extractSignature(token);

  if (!sig) {
    return;
  }

  const expiresAt = extractExpiry(token);
  revokedTokens.set(sig, { expiresAt, signature: sig });

  try {
    db.prepare('INSERT OR REPLACE INTO token_blacklist (signature, expiresAt) VALUES (?, ?)').run(
      sig,
      expiresAt
    );
  } catch {
    // Memory store fallback if DB is temporarily busy
  }
}

function extractExpiry(token: string): number {
  try {
    const parts = token.split('.');

    if (parts.length !== 3) {
      return Date.now() + 24 * 60 * 60 * 1000;
    }

    const payload = JSON.parse(Buffer.from(parts[1], 'base64url').toString('utf8'));

    if (!payload.exp) {
      return Date.now() + 24 * 60 * 60 * 1000;
    }

    // Convert RFC 7519 seconds to milliseconds if needed
    return payload.exp < 100_000_000_000 ? payload.exp * 1000 : payload.exp;
  } catch {
    return Date.now() + 24 * 60 * 60 * 1000;
  }
}

function extractSignature(token: string): null | string {
  const parts = token.split('.');

  if (parts.length !== 3) {
    return null;
  }

  return parts[2];
}

function purgeExpired(): void {
  const now = Date.now();

  for (const [key, entry] of revokedTokens) {
    if (now > entry.expiresAt) {
      revokedTokens.delete(key);
    }
  }

  try {
    db.prepare('DELETE FROM token_blacklist WHERE expiresAt < ?').run(now);
  } catch {}
}

setInterval(purgeExpired, 60 * 60 * 1000).unref();
