import crypto from 'crypto';

export const JWT_SECRET = process.env.JWT_SECRET ?? '';
// The JWT's own absolute lifetime. Kept long and uniform across roles so it is never the reason
// a session ends while the app stays open — actual session cleanup is driven by presence pings
// (see PRESENCE_IDLE_MS / SESSION_ABANDONED_MS), not a fixed clock from login time.
export const JWT_TTL_MS = 30 * 24 * 60 * 60 * 1000;
// How recently the client's app must have sent a presence ping to be considered online.
// Kept short so status reflects the app actually being open.
export const PRESENCE_IDLE_MS = 35 * 1000;
// How long a session may go without a presence ping before it's treated as abandoned (tab
// closed without the pagehide beacon firing, e.g. a crash) and its token is invalidated.
// Generous relative to the ~10s ping interval so brief network drops/sleep never log anyone out.
export const SESSION_ABANDONED_MS = 10 * 60 * 1000;

export interface UserPayload {
  email: string;
  exp?: number;
  name: string;
  role: string;
  storeName?: string;
}

export function generateToken(payload: UserPayload, ttlMs: number = 24 * 60 * 60 * 1000): string {
  const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url');
  const body = Buffer.from(JSON.stringify({ ...payload, exp: Date.now() + ttlMs })).toString('base64url');
  const signature = crypto.createHmac('sha256', JWT_SECRET).update(`${header}.${body}`).digest('base64url');

  return `${header}.${body}.${signature}`;
}

export function verifyToken(token: string): null | UserPayload {
  try {
    const [header, body, signature] = token.split('.');

    if (!header || !body || !signature) {
      return null;
    }

    const expectedSignature = crypto
      .createHmac('sha256', JWT_SECRET)
      .update(`${header}.${body}`)
      .digest('base64url');

    const sigBuf = Buffer.from(signature);
    const expectedBuf = Buffer.from(expectedSignature);

    if (sigBuf.length !== expectedBuf.length || !crypto.timingSafeEqual(sigBuf, expectedBuf)) {
      return null;
    }

    const payload = JSON.parse(Buffer.from(body, 'base64url').toString('utf8'));

    if (!payload || typeof payload !== 'object') {
      return null;
    }

    if (typeof payload.email !== 'string' || typeof payload.name !== 'string') {
      return null;
    }

    if (payload.exp && Date.now() > payload.exp) {
      return null;
    }

    return payload;
  } catch {
    return null;
  }
}
