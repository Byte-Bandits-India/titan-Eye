import { Request, Response, Router } from 'express';

import { generateToken, SESSION_IDLE_MS } from '../config/jwt.js';
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

const FRONTEND_URL = process.env.FRONTEND_URL ?? '';
const STATE_COOKIE = 'sso_state';

interface SsoCookieState {
  state: string;
  verifier: string;
}

router.get('/login', async (req: Request, res: Response) => {
  if (!isSsoConfigured || !msalClient) {
    return res.redirect(`${FRONTEND_URL}/login?error=sso_disabled`);
  }

  try {
    const state = cryptoProvider.createNewGuid();
    const { challenge, verifier } = await cryptoProvider.generatePkceCodes();

    res.cookie(STATE_COOKIE, JSON.stringify({ state, verifier }), {
      httpOnly: true,
      maxAge: 5 * 60 * 1000,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
    });

    const authUrl = await msalClient.getAuthCodeUrl({
      codeChallenge: challenge,
      codeChallengeMethod: 'S256',
      redirectUri: ENTRA_REDIRECT_URI,
      scopes: ENTRA_SCOPES,
      state,
    });

    return res.redirect(authUrl);
  } catch (err) {
    const error = err instanceof Error ? err : new Error(String(err));
    logger.error('SSO login error', { errorMessage: error.message, requestId: req.requestId });

    return res.redirect(`${FRONTEND_URL}/login?error=sso_failed`);
  }
});

router.get('/callback', async (req: Request, res: Response) => {
  if (!isSsoConfigured || !msalClient) {
    return res.redirect(`${FRONTEND_URL}/login?error=sso_disabled`);
  }

  try {
    const raw = req.cookies?.[STATE_COOKIE];
    res.clearCookie(STATE_COOKIE);

    if (!raw) {
      return res.redirect(`${FRONTEND_URL}/login?error=sso_failed`);
    }

    const parsed = JSON.parse(raw);
    if (
      !parsed ||
      typeof parsed !== 'object' ||
      typeof parsed.state !== 'string' ||
      typeof parsed.verifier !== 'string'
    ) {
      return res.redirect(`${FRONTEND_URL}/login?error=sso_failed`);
    }
    const { state: expectedState, verifier } = parsed as SsoCookieState;

    const { code, state: returnedState } = req.query;

    if (!code || typeof code !== 'string' || returnedState !== expectedState) {
      return res.redirect(`${FRONTEND_URL}/login?error=sso_failed`);
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

    if (!email) {
      return res.redirect(`${FRONTEND_URL}/login?error=sso_failed`);
    }

    const user = await get<UserRow>('SELECT email, status FROM users WHERE LOWER(email) = LOWER(?)', [email]);

    if (!user) {
      logSecurityEvent('SSO_LOGIN_NOT_PROVISIONED', { email, ip: req.ip, requestId: req.requestId });

      return res.redirect(`${FRONTEND_URL}/login?error=not_provisioned`);
    }

    if (user.status === 'inactive') {
      logSecurityEvent('SSO_LOGIN_INACTIVE_ACCOUNT', {
        email: user.email,
        ip: req.ip,
        requestId: req.requestId,
      });

      return res.redirect(`${FRONTEND_URL}/login?error=inactive`);
    }

    await run('UPDATE users SET azureObjectId = ?, microsoftUpn = ?, lastLogin = ? WHERE email = ?', [
      azureObjectId || null,
      upn || null,
      new Date().toISOString(),
      user.email,
    ]);

    const fullUser = await get<UserRow>('SELECT email, name, role, storeName FROM users WHERE email = ?', [
      user.email,
    ]);

    if (!fullUser) {
      return res.redirect(`${FRONTEND_URL}/login?error=sso_failed`);
    }

    const TOKEN_MAX_AGE_MS = 24 * 60 * 60 * 1000;

    const token = generateToken(
      {
        email: fullUser.email,
        name: fullUser.name,
        role: fullUser.role,
        storeName: fullUser.storeName ?? undefined,
      },
      SESSION_IDLE_MS
    );

    const newTokenSig = token.split('.')[2];
    await run(
      `UPDATE users SET lastLogin = ?, failedLoginAttempts = 0, lockedUntil = NULL, activeTokenSig = ? WHERE email = ?`,
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
      maxAge: TOKEN_MAX_AGE_MS,
      sameSite: 'strict',
      secure: process.env.NODE_ENV === 'production',
    });

    logSecurityEvent('SSO_LOGIN_SUCCESS', {
      email: fullUser.email,
      ip: req.ip,
      requestId: req.requestId,
      role: fullUser.role,
    });

    return res.redirect(`${FRONTEND_URL}/sso/callback`);
  } catch (err) {
    const error = err instanceof Error ? err : new Error(String(err));
    logSecurityEvent('SSO_LOGIN_FAILED', {
      errorMessage: error.message,
      ip: req.ip,
      requestId: req.requestId,
    });
    logger.error('SSO callback error', { errorMessage: error.message, requestId: req.requestId });

    return res.redirect(`${FRONTEND_URL}/login?error=sso_failed`);
  }
});

export default router;
