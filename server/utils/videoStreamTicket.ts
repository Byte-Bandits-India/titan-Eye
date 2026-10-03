import crypto from 'crypto';
import { JWT_SECRET } from '../config/jwt.js';

export interface VideoStreamTicketPayload {
  videoId: number;
  email: string;
  role: string;
  purpose: 'video_stream';
  exp: number; // Unix timestamp in seconds
  iat: number;
  nonce: string;
}

/**
 * Generates a short-lived, cryptographically signed video streaming ticket.
 * Strictly bound to videoId, requesting user email, role, and expiration timestamp.
 *
 * @param videoId Target video numeric ID
 * @param user Authenticated user context
 * @param expiresInSeconds Lifetime of ticket in seconds (default 15 minutes / 900s)
 */
export function generateVideoStreamTicket(
  videoId: number,
  user: { email: string; role: string },
  expiresInSeconds = 900
): string {
  const iat = Math.floor(Date.now() / 1000);
  const exp = iat + expiresInSeconds;
  const nonce = crypto.randomBytes(8).toString('hex');

  const payload: VideoStreamTicketPayload = {
    videoId,
    email: user.email,
    role: user.role,
    purpose: 'video_stream',
    exp,
    iat,
    nonce,
  };

  const payloadJson = JSON.stringify(payload);
  const payloadB64 = Buffer.from(payloadJson, 'utf8').toString('base64url');

  const hmac = crypto.createHmac('sha256', JWT_SECRET);
  hmac.update(`video_stream_ticket:${payloadB64}`);
  const signature = hmac.digest('base64url');

  return `${payloadB64}.${signature}`;
}

/**
 * Validates a video streaming ticket against the target video resource and current time.
 * Enforces timing-safe HMAC signature verification, expiration check, and videoId match.
 *
 * @param ticket Encoded ticket string (payloadB64.signature)
 * @param targetVideoId ID of the video being requested
 */
export function verifyVideoStreamTicket(
  ticket: string | undefined,
  targetVideoId: number
): { valid: boolean; payload?: VideoStreamTicketPayload; error?: string } {
  if (!ticket || typeof ticket !== 'string') {
    return { valid: false, error: 'A signed stream ticket is required to access video content.' };
  }

  const parts = ticket.split('.');
  if (parts.length !== 2) {
    return { valid: false, error: 'Malformed stream ticket structure.' };
  }

  const [payloadB64, providedSignature] = parts;

  // Timing-safe HMAC verification
  const hmac = crypto.createHmac('sha256', JWT_SECRET);
  hmac.update(`video_stream_ticket:${payloadB64}`);
  const expectedSignature = hmac.digest('base64url');

  const providedBuf = Buffer.from(providedSignature, 'utf8');
  const expectedBuf = Buffer.from(expectedSignature, 'utf8');

  if (providedBuf.length !== expectedBuf.length || !crypto.timingSafeEqual(providedBuf, expectedBuf)) {
    return { valid: false, error: 'Invalid stream ticket signature.' };
  }

  let payload: VideoStreamTicketPayload;
  try {
    const jsonStr = Buffer.from(payloadB64, 'base64url').toString('utf8');
    payload = JSON.parse(jsonStr) as VideoStreamTicketPayload;
  } catch {
    return { valid: false, error: 'Invalid stream ticket payload encoding.' };
  }

  if (payload.purpose !== 'video_stream') {
    return { valid: false, error: 'Invalid ticket purpose.' };
  }

  const now = Math.floor(Date.now() / 1000);
  if (payload.exp < now) {
    return { valid: false, error: 'Stream ticket has expired.' };
  }

  if (payload.videoId !== targetVideoId) {
    return {
      valid: false,
      error: `Stream ticket is for video ${payload.videoId}, not video ${targetVideoId}.`,
    };
  }

  return { valid: true, payload };
}
