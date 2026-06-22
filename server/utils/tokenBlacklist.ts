interface RevokedEntry {
  signature: string;
  expiresAt: number; // timestamp (ms) when the original token would expire
}

const revokedTokens: Map<string, RevokedEntry> = new Map();

/** Extract the signature portion (third segment) from a JWT */
function extractSignature(token: string): string | null {
  const parts = token.split('.');
  if (parts.length !== 3) return null;
  return parts[2];
}

/** Extract the expiry from a JWT payload without verifying */
function extractExpiry(token: string): number {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return Date.now() + 24 * 60 * 60 * 1000; // fallback: 24h
    const payload = JSON.parse(Buffer.from(parts[1], 'base64url').toString('utf8'));
    return payload.exp || Date.now() + 24 * 60 * 60 * 1000;
  } catch {
    return Date.now() + 24 * 60 * 60 * 1000;
  }
}

/**
 * Revoke a token so it can no longer be used, even if its signature is valid.
 * Stores only the signature hash, not the full token.
 */
export function revokeToken(token: string): void {
  const sig = extractSignature(token);
  if (!sig) return;
  const expiresAt = extractExpiry(token);
  revokedTokens.set(sig, { signature: sig, expiresAt });
}

/**
 * Check if a token has been revoked.
 */
export function isRevoked(token: string): boolean {
  const sig = extractSignature(token);
  if (!sig) return false;
  return revokedTokens.has(sig);
}

/**
 * Purge expired revocation entries to prevent unbounded memory growth.
 * Called automatically on a timer.
 */
function purgeExpired(): void {
  const now = Date.now();
  for (const [key, entry] of revokedTokens) {
    if (now > entry.expiresAt) {
      revokedTokens.delete(key);
    }
  }
}

// Auto-purge every hour
setInterval(purgeExpired, 60 * 60 * 1000);
