import { Request, Response, Router } from 'express';

import { generateToken, JWT_TTL_MS } from '../config/jwt.js';
import {
  cryptoProvider,
  ENTRA_REDIRECT_URI,
  ENTRA_SCOPES,
  isSsoConfigured,
  msalClient,
} from '../config/msal.js';
import { get, run, UserRow } from '../db/database.js';
import { logger, logSecurityEvent } from '../utils/logger.js';
import { broadcastEvent } from '../utils/sse.js';

const router = Router();
const STATE_COOKIE = 'sso_state';

interface SsoCookieState {
  state: string;
  verifier: string;
}

function getFrontendRedirectUrl(req: Request, targetPath: string): string {
  const configuredUrl = (process.env.FRONTEND_URL || '').trim().replace(/\/+$/, '');
  const host = req.headers.host || '';
  if (!configuredUrl || (!host.includes('localhost') && configuredUrl.includes('localhost'))) {
    return targetPath;
  }
  return `${configuredUrl}${targetPath}`;
}

function isConnectionSecure(req: Request): boolean {
  return (
    process.env.NODE_ENV === 'production' ||
    req.secure ||
    req.headers['x-forwarded-proto'] === 'https' ||
    Boolean(req.headers.host && !req.headers.host.includes('localhost'))
  );
}

router.get('/url', async (req: Request, res: Response) => {
  if (!isSsoConfigured || !msalClient) {
    return res.status(400).json({ error: 'SSO is not configured' });
  }

  try {
    const state = cryptoProvider.createNewGuid();
    const { challenge, verifier } = await cryptoProvider.generatePkceCodes();

    res.cookie(STATE_COOKIE, JSON.stringify({ state, verifier }), {
      httpOnly: true,
      maxAge: 5 * 60 * 1000,
      path: '/',
      sameSite: 'lax',
      secure: isConnectionSecure(req),
    });

    const authUrl = await msalClient.getAuthCodeUrl({
      codeChallenge: challenge,
      codeChallengeMethod: 'S256',
      redirectUri: ENTRA_REDIRECT_URI,
      scopes: ENTRA_SCOPES,
      state,
    });

    return res.json({ authUrl });
  } catch (err) {
    const error = err instanceof Error ? err : new Error(String(err));
    logger.error('SSO getAuthCodeUrl error', { errorMessage: error.message, requestId: req.requestId });

    return res.status(500).json({ error: 'Failed to generate Microsoft login URL' });
  }
});

router.get('/login', async (req: Request, res: Response) => {
  if (!isSsoConfigured || !msalClient) {
    return res.redirect(getFrontendRedirectUrl(req, '/login?error=sso_disabled'));
  }

  try {
    const state = cryptoProvider.createNewGuid();
    const { challenge, verifier } = await cryptoProvider.generatePkceCodes();

    res.cookie(STATE_COOKIE, JSON.stringify({ state, verifier }), {
      httpOnly: true,
      maxAge: 5 * 60 * 1000,
      path: '/',
      sameSite: 'lax',
      secure: isConnectionSecure(req),
    });

    const authUrl = await msalClient.getAuthCodeUrl({
      codeChallenge: challenge,
      codeChallengeMethod: 'S256',
      redirectUri: ENTRA_REDIRECT_URI,
      scopes: ENTRA_SCOPES,
      state,
    });

    const sanitizedUrl = JSON.stringify(authUrl);
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    return res.send(`<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta http-equiv="refresh" content="0;url=${authUrl}">
  <title>Redirecting to Microsoft Sign-in...</title>
</head>
<body>
  <script>window.location.replace(${sanitizedUrl});</script>
  <noscript><p>Redirecting to Microsoft Sign-in... <a href="${authUrl}">Click here if not redirected</a>.</p></noscript>
</body>
</html>`);
  } catch (err) {
    const error = err instanceof Error ? err : new Error(String(err));
    logger.error('SSO login error', { errorMessage: error.message, requestId: req.requestId });

    return res.redirect(getFrontendRedirectUrl(req, '/login?error=sso_failed'));
  }
});

router.get('/callback', async (req: Request, res: Response) => {
  if (!isSsoConfigured || !msalClient) {
    return res.redirect(getFrontendRedirectUrl(req, '/login?error=sso_disabled'));
  }

  try {
    const raw = req.cookies?.[STATE_COOKIE];
    res.clearCookie(STATE_COOKIE, { path: '/' });

    if (!raw) {
      return res.redirect(getFrontendRedirectUrl(req, '/login?error=sso_failed'));
    }

    const parsed = JSON.parse(raw);
    if (
      !parsed ||
      typeof parsed !== 'object' ||
      typeof parsed.state !== 'string' ||
      typeof parsed.verifier !== 'string'
    ) {
      return res.redirect(getFrontendRedirectUrl(req, '/login?error=sso_failed'));
    }
    const { state: expectedState, verifier } = parsed as SsoCookieState;

    const { code, state: returnedState } = req.query;

    if (!code || typeof code !== 'string' || returnedState !== expectedState) {
      return res.redirect(getFrontendRedirectUrl(req, '/login?error=sso_failed'));
    }

    const result = await msalClient.acquireTokenByCode({
      code,
      codeVerifier: verifier,
      redirectUri: ENTRA_REDIRECT_URI,
      scopes: ENTRA_SCOPES,
    });

    const email = result.account?.username;
    const azureObjectId = result.account?.localAccountId;
    const upn = result.account?.upn || result.account?.username;
    const idClaims = (result.idTokenClaims || {}) as Record<string, unknown>;
    const candidateEmails = Array.from(
      new Set(
        [
          email,
          upn,
          idClaims['email'],
          idClaims['preferred_username'],
          idClaims['upn'],
          idClaims['unique_name'],
        ]
          .filter((e): e is string => typeof e === 'string' && e.includes('@'))
          .map((e) => e.toLowerCase())
      )
    );

    if (candidateEmails.length === 0) {
      return res.redirect(getFrontendRedirectUrl(req, '/login?error=sso_failed'));
    }

    let user: UserRow | undefined;
    for (const candidateEmail of candidateEmails) {
      user = await get<UserRow>(
        'SELECT email, status FROM users WHERE LOWER(email) = LOWER(?) OR LOWER(microsoftUpn) = LOWER(?)',
        [candidateEmail, candidateEmail]
      );
      if (user) {
        break;
      }
    }

    if (!user) {
      logSecurityEvent('SSO_LOGIN_NOT_PROVISIONED', {
        email: email || candidateEmails[0],
        ip: req.ip,
        requestId: req.requestId,
      });

      return res.redirect(getFrontendRedirectUrl(req, '/login?error=not_provisioned'));
    }

    if (user.status === 'inactive') {
      logSecurityEvent('SSO_LOGIN_INACTIVE_ACCOUNT', {
        email: user.email,
        ip: req.ip,
        requestId: req.requestId,
      });

      return res.redirect(getFrontendRedirectUrl(req, '/login?error=inactive'));
    }

    await run(
      'UPDATE users SET azureObjectId = ?, microsoftUpn = ?, lastLogin = ? WHERE LOWER(email) = LOWER(?)',
      [azureObjectId || null, upn || null, new Date().toISOString(), user.email]
    );

    const fullUser = await get<UserRow>(
      'SELECT email, name, role, storeName, status FROM users WHERE LOWER(email) = LOWER(?)',
      [user.email]
    );

    if (!fullUser) {
      return res.redirect(getFrontendRedirectUrl(req, '/login?error=sso_failed'));
    }

    const token = generateToken(
      {
        email: fullUser.email,
        name: fullUser.name || fullUser.email.split('@')[0],
        role: fullUser.role,
        storeName: fullUser.storeName ?? undefined,
      },
      JWT_TTL_MS
    );

    const newTokenSig = token.split('.')[2];
    await run(
      `UPDATE users SET lastLogin = ?, failedLoginAttempts = 0, lockedUntil = NULL, activeTokenSig = ? WHERE LOWER(email) = LOWER(?)`,
      [new Date().toISOString(), newTokenSig, fullUser.email]
    );

    broadcastEvent('USER_UPDATED', {
      email: fullUser.email,
      isLoggedIn: true,
      lastLogin: new Date().toISOString(),
      name: fullUser.name,
      role: fullUser.role,
      status: fullUser.status,
    });

    res.cookie('token', token, {
      httpOnly: true,
      maxAge: JWT_TTL_MS,
      path: '/',
      sameSite: 'lax',
      secure: isConnectionSecure(req),
    });

    logSecurityEvent('SSO_LOGIN_SUCCESS', {
      email: fullUser.email,
      ip: req.ip,
      requestId: req.requestId,
      role: fullUser.role,
    });

    return res.redirect(getFrontendRedirectUrl(req, '/sso/callback'));
  } catch (err) {
    const error = err instanceof Error ? err : new Error(String(err));
    logSecurityEvent('SSO_LOGIN_FAILED', {
      errorMessage: error.message,
      ip: req.ip,
      requestId: req.requestId,
    });
    logger.error('SSO callback error', { errorMessage: error.message, requestId: req.requestId });

    return res.redirect(getFrontendRedirectUrl(req, '/login?error=sso_failed'));
  }
});

export default router;
