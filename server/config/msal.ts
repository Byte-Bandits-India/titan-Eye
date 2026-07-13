import { ConfidentialClientApplication, CryptoProvider } from '@azure/msal-node';

const tenantId = process.env.ENTRA_TENANT_ID;
const clientId = process.env.ENTRA_CLIENT_ID;
const clientSecret = process.env.ENTRA_CLIENT_SECRET;
const redirectUri = process.env.ENTRA_REDIRECT_URI;

if (!tenantId || !clientId || !clientSecret || !redirectUri) {
  throw new Error('FATAL: ENTRA_TENANT_ID, ENTRA_CLIENT_ID, ENTRA_CLIENT_SECRET, and ENTRA_REDIRECT_URI environment variables are required for Microsoft SSO.');
}

export const ENTRA_REDIRECT_URI = redirectUri;
export const ENTRA_SCOPES = ['openid', 'profile', 'email'];

export const msalClient = new ConfidentialClientApplication({
  auth: {
    clientId,
    authority: `https://login.microsoftonline.com/${tenantId}`,
    clientSecret,
  },
});

export const cryptoProvider = new CryptoProvider();
