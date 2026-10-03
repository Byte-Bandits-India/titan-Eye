import crypto from 'crypto';

const CAPTCHA_TTL_MS = 5 * 60 * 1000; // 5 minutes
const CHARSET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // Excluded ambiguous chars: 0, O, 1, I, l
const CONSUMED_TOKENS = new Map<string, number>();

// Periodic cleanup of consumed tokens past TTL
setInterval(() => {
  const now = Date.now();
  for (const [token, expiry] of CONSUMED_TOKENS.entries()) {
    if (now > expiry) {
      CONSUMED_TOKENS.delete(token);
    }
  }
}, 60 * 1000).unref();

function getCaptchaSecret(): string {
  return process.env.JWT_SECRET || process.env.INTER_SERVER_SECRET || 'trvc-captcha-secure-salt-key';
}

function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function randomColor(): string {
  const colors = ['#0d9488', '#0284c7', '#2563eb', '#7c3aed', '#c026d3', '#059669', '#d97706'];

  return colors[randomInt(0, colors.length - 1)] ?? '#0d9488';
}

export interface CaptchaResult {
  captchaId: string;
  captchaSvg: string;
}

/**
 * Generates an SVG CAPTCHA challenge and returns a cryptographically signed HMAC token.
 */
export function generateCaptcha(): CaptchaResult {
  let solution = '';
  for (let i = 0; i < 5; i++) {
    solution += CHARSET[randomInt(0, CHARSET.length - 1)];
  }

  const width = 150;
  const height = 48;

  // Generate noise lines
  let noiseLines = '';
  for (let i = 0; i < 4; i++) {
    const x1 = randomInt(0, width);
    const y1 = randomInt(0, height);
    const x2 = randomInt(0, width);
    const y2 = randomInt(0, height);
    const strokeColor = randomColor();
    noiseLines += `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${strokeColor}" stroke-width="${randomInt(1, 2)}" stroke-opacity="0.35" />`;
  }

  // Generate noise dots
  let noiseDots = '';
  for (let i = 0; i < 25; i++) {
    const cx = randomInt(0, width);
    const cy = randomInt(0, height);
    const r = randomInt(1, 2);
    noiseDots += `<circle cx="${cx}" cy="${cy}" r="${r}" fill="${randomColor()}" fill-opacity="0.25" />`;
  }

  // Render individual letters with distortion
  let textElements = '';
  const letterSpacing = 24;
  const startX = 16;

  for (let i = 0; i < solution.length; i++) {
    const char = solution[i];
    const x = startX + i * letterSpacing + randomInt(-2, 3);
    const y = 32 + randomInt(-3, 3);
    const rotate = randomInt(-15, 15);
    const color = randomColor();
    const fontSize = randomInt(22, 26);

    textElements += `
      <text
        x="${x}"
        y="${y}"
        font-family="monospace, sans-serif"
        font-size="${fontSize}"
        font-weight="bold"
        fill="${color}"
        transform="rotate(${rotate}, ${x}, ${y})"
        letter-spacing="2"
      >${char}</text>
    `;
  }

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" style="background-color: #f8fafc; border-radius: 6px; border: 1px solid #e2e8f0; user-select: none;">
    ${noiseDots}
    ${noiseLines}
    ${textElements}
  </svg>`;

  const timestamp = Date.now();
  const secret = getCaptchaSecret();
  const normalizedSolution = solution.toUpperCase().trim();
  const hmac = crypto
    .createHmac('sha256', secret)
    .update(`${timestamp}.${normalizedSolution}`)
    .digest('hex');

  const captchaId = `${timestamp}.${hmac}`;

  return {
    captchaId,
    captchaSvg: `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`,
  };
}

/**
 * Validates a submitted CAPTCHA solution against its cryptographic HMAC token.
 */
export function verifyCaptcha(captchaId?: string, solution?: string): boolean {
  if (!captchaId || !solution || typeof captchaId !== 'string' || typeof solution !== 'string') {
    return false;
  }

  const parts = captchaId.split('.');
  if (parts.length !== 2) {
    return false;
  }

  const [timestampStr, signature] = parts;
  const timestamp = Number(timestampStr);

  if (!timestamp || isNaN(timestamp)) {
    return false;
  }

  const now = Date.now();
  if (now - timestamp > CAPTCHA_TTL_MS || timestamp > now + 10000) {
    return false; // Expired or future timestamp
  }

  // Check anti-replay: has this token already been consumed?
  if (CONSUMED_TOKENS.has(captchaId)) {
    return false;
  }

  const secret = getCaptchaSecret();
  const normalizedSolution = solution.toUpperCase().trim();
  const expectedHmac = crypto
    .createHmac('sha256', secret)
    .update(`${timestamp}.${normalizedSolution}`)
    .digest('hex');

  const sigBuf = Buffer.from(signature, 'hex');
  const expBuf = Buffer.from(expectedHmac, 'hex');

  if (sigBuf.length !== expBuf.length || !crypto.timingSafeEqual(sigBuf, expBuf)) {
    return false;
  }

  // Mark token as consumed with expiry
  CONSUMED_TOKENS.set(captchaId, now + CAPTCHA_TTL_MS);

  return true;
}
