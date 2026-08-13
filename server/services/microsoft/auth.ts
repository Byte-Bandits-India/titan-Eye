import { ConfidentialClientApplication } from '@azure/msal-node';

import { logger } from '../../utils/logger.js';

export function isGraphConfigured(): boolean {
  return Boolean(
    process.env.ENTRA_TENANT_ID && process.env.ENTRA_CLIENT_ID && process.env.ENTRA_CLIENT_SECRET
  );
}

export async function getMicrosoftGraphToken(): Promise<string> {
  const tenantId = process.env.ENTRA_TENANT_ID;
  const clientId = process.env.ENTRA_CLIENT_ID;
  const clientSecret = process.env.ENTRA_CLIENT_SECRET;

  if (!tenantId || !clientId || !clientSecret) {
    logger.warn('[Graph] ENTRA_TENANT_ID, ENTRA_CLIENT_ID or ENTRA_CLIENT_SECRET missing.');
    throw new Error(
      'Microsoft Graph environment variables (ENTRA_TENANT_ID, ENTRA_CLIENT_ID, ENTRA_CLIENT_SECRET) are missing.'
    );
  }

  const graphClient = new ConfidentialClientApplication({
    auth: {
      authority: `https://login.microsoftonline.com/${tenantId}`,
      clientId,
      clientSecret,
    },
  });

  const result = await graphClient.acquireTokenByClientCredential({
    scopes: ['https://graph.microsoft.com/.default'],
  });

  if (!result?.accessToken) {
    throw new Error('Unable to acquire Microsoft Graph access token');
  }

  return result.accessToken;
}
