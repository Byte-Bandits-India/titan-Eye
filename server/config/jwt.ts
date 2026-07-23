import crypto from 'crypto';

export const JWT_SECRET = process.env.JWT_SECRET || 'titan-eye-super-secure-jwt-secret-key-123456789-abc';

export interface UserPayload {
  email: string;
  name: string;
  role: string;
  storeName?: string;
  exp?: number;
}

export function generateToken(payload: UserPayload, ttlMs: number = 24 * 60 * 60 * 1000): string {
  const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url');
  const body = Buffer.from(JSON.stringify({ ...payload, exp: Date.now() + ttlMs })).toString('base64url');
  const signature = crypto.createHmac('sha256', JWT_SECRET).update(`${header}.${body}`).digest('base64url');
  return `${header}.${body}.${signature}`;
}


export function verifyToken(token: string): UserPayload | null {
  try {
    const [header, body, signature] = token.split('.');
    if (!header || !body || !signature) return null;
    const expectedSignature = crypto.createHmac('sha256', JWT_SECRET).update(`${header}.${body}`).digest('base64url');

    const sigBuf = Buffer.from(signature);
    const expectedBuf = Buffer.from(expectedSignature);
    if (sigBuf.length !== expectedBuf.length || !crypto.timingSafeEqual(sigBuf, expectedBuf)) {
      return null;
    }

    const payload = JSON.parse(Buffer.from(body, 'base64url').toString('utf8')) as UserPayload;
    if (payload.exp && Date.now() > payload.exp) return null;
    return payload;
  } catch (err) {
    return null;
  }
}
