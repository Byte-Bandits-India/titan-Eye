interface RevokedEntry {
  signature: string;
  expiresAt: number;
}

const revokedTokens: Map<string, RevokedEntry> = new Map();

function extractSignature(token: string): string | null {
  const parts = token.split('.');
  if (parts.length !== 3) return null;
  return parts[2];
}

function extractExpiry(token: string): number {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return Date.now() + 24 * 60 * 60 * 1000;
    const payload = JSON.parse(Buffer.from(parts[1], 'base64url').toString('utf8'));
    return payload.exp || Date.now() + 24 * 60 * 60 * 1000;
  } catch {
    return Date.now() + 24 * 60 * 60 * 1000;
  }
}

export function revokeToken(token: string): void {
  const sig = extractSignature(token);
  if (!sig) return;
  const expiresAt = extractExpiry(token);
  revokedTokens.set(sig, { signature: sig, expiresAt });
}

export function isRevoked(token: string): boolean {
  const sig = extractSignature(token);
  if (!sig) return false;
  return revokedTokens.has(sig);
}

function purgeExpired(): void {
  const now = Date.now();
  for (const [key, entry] of revokedTokens) {
    if (now > entry.expiresAt) {
      revokedTokens.delete(key);
    }
  }
}

setInterval(purgeExpired, 60 * 60 * 1000);
