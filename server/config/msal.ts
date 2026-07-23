import { ConfidentialClientApplication, CryptoProvider } from '@azure/msal-node';

const tenantId = process.env.ENTRA_TENANT_ID;
const clientId = process.env.ENTRA_CLIENT_ID;
const clientSecret = process.env.ENTRA_CLIENT_SECRET;
const redirectUri = process.env.ENTRA_REDIRECT_URI;

export const isSsoConfigured = Boolean(tenantId && clientId && clientSecret && redirectUri);

if (!isSsoConfigured) {
  console.warn('[MSAL] Microsoft SSO environment variables missing. SSO login endpoints will be disabled.');
}

export const ENTRA_REDIRECT_URI = redirectUri || '';
export const ENTRA_SCOPES = ['openid', 'profile', 'email'];

export const msalClient = isSsoConfigured
  ? new ConfidentialClientApplication({
      auth: {
        clientId: clientId!,
        authority: `https://login.microsoftonline.com/${tenantId}`,
        clientSecret: clientSecret!,
      },
    })
  : null;

export const cryptoProvider = new CryptoProvider();

