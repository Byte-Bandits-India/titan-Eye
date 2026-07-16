import { Router, Request, Response } from 'express';
import { get, run, UserRow } from '../db/database.js';
import { generateToken } from '../config/jwt.js';
import { msalClient, cryptoProvider, ENTRA_REDIRECT_URI, ENTRA_SCOPES } from '../config/msal.js';

const router = Router();

const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:5173';
const STATE_COOKIE = 'sso_state';

router.get('/login', async (_req: Request, res: Response) => {
  try {
    const state = cryptoProvider.createNewGuid();
    const { verifier, challenge } = await cryptoProvider.generatePkceCodes();

    res.cookie(STATE_COOKIE, JSON.stringify({ state, verifier }), {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 5 * 60 * 1000,
    });

    const authUrl = await msalClient.getAuthCodeUrl({
      scopes: ENTRA_SCOPES,
      redirectUri: ENTRA_REDIRECT_URI,
      state,
      codeChallenge: challenge,
      codeChallengeMethod: 'S256',
    });

    return res.redirect(authUrl);
  } catch (err) {
    const error = err as Error;
    console.error('SSO login error:', error.message);
    return res.redirect(`${FRONTEND_URL}/login?error=sso_failed`);
  }
});

router.get('/callback', async (req: Request, res: Response) => {
  try {
    const raw = req.cookies?.[STATE_COOKIE];
    res.clearCookie(STATE_COOKIE);

    if (!raw) {
      return res.redirect(`${FRONTEND_URL}/login?error=sso_failed`);
    }
    const { state: expectedState, verifier } = JSON.parse(raw) as { state: string; verifier: string };

    const { code, state: returnedState } = req.query;
    if (!code || typeof code !== 'string' || returnedState !== expectedState) {
      return res.redirect(`${FRONTEND_URL}/login?error=sso_failed`);
    }

    const result = await msalClient.acquireTokenByCode({
      code,
      scopes: ENTRA_SCOPES,
      redirectUri: ENTRA_REDIRECT_URI,
      codeVerifier: verifier,
    });

    const email = result.account?.username;
    const azureObjectId = result.account?.localAccountId;
    const upn = result.account?.upn || result.account?.username;

    if (!email) {
      return res.redirect(`${FRONTEND_URL}/login?error=sso_failed`);
    }

    const user = await get<UserRow>('SELECT email, status FROM users WHERE LOWER(email) = LOWER(?)', [email]);
    if (!user) {
      return res.redirect(`${FRONTEND_URL}/login?error=not_provisioned`);
    }
    if (user.status === 'inactive') {
      return res.redirect(`${FRONTEND_URL}/login?error=inactive`);
    }

    await run(
      'UPDATE users SET azureObjectId = ?, microsoftUpn = ?, lastLogin = ? WHERE email = ?',
      [azureObjectId || null, upn || null, new Date().toISOString(), user.email]
    );

    const fullUser = await get<UserRow>('SELECT email, name, role, storeName FROM users WHERE email = ?', [user.email]);
    if (!fullUser) {
      return res.redirect(`${FRONTEND_URL}/login?error=sso_failed`);
    }

    // ── VAPT Fix #7: Single-session enforcement for SSO login ──────────
    const SESSION_IDLE_MS = 60 * 60 * 1000; // 1 hour — same as regular login
    const TOKEN_MAX_AGE_MS = 24 * 60 * 60 * 1000;

    const token = generateToken({
      email: fullUser.email,
      name: fullUser.name,
      role: fullUser.role,
      storeName: fullUser.storeName ?? undefined,
    }, SESSION_IDLE_MS);

    // Store activeTokenSig so old sessions are invalidated
    const newTokenSig = token.split('.')[2];
    await run(
      `UPDATE users SET lastLogin = ?, failedLoginAttempts = 0, lockedUntil = NULL, activeTokenSig = ? WHERE email = ?`,
      [new Date().toISOString(), newTokenSig, fullUser.email]
    );

    res.cookie('token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: TOKEN_MAX_AGE_MS,
    });

    return res.redirect(`${FRONTEND_URL}/sso/callback`);
  } catch (err) {
    const error = err as Error;
    console.error('SSO callback error:', error.message);
    return res.redirect(`${FRONTEND_URL}/login?error=sso_failed`);
  }
});

export default router;
