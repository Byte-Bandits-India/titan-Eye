import { ConfidentialClientApplication } from '@azure/msal-node';

import { logger } from '../../utils/logger.js';

const tenantId = process.env.ENTRA_TENANT_ID;
const clientId = process.env.ENTRA_CLIENT_ID;
const clientSecret = process.env.ENTRA_CLIENT_SECRET;

export const isGraphConfigured = Boolean(tenantId && clientId && clientSecret);

if (!isGraphConfigured) {
  logger.warn(
    '[Graph] ENTRA_TENANT_ID, ENTRA_CLIENT_ID or ENTRA_CLIENT_SECRET missing. Graph endpoints will be disabled.'
  );
}

const graphClient = isGraphConfigured
  ? new ConfidentialClientApplication({
      auth: {
        authority: `https://login.microsoftonline.com/${tenantId}`,
        clientId: clientId!,
        clientSecret: clientSecret!,
      },
    })
  : null;

export async function getMicrosoftGraphToken(): Promise<string> {
  if (!graphClient) {
    throw new Error('Microsoft Graph is not configured');
  }

  const result = await graphClient.acquireTokenByClientCredential({
    scopes: ['https://graph.microsoft.com/.default'],
  });

  if (!result?.accessToken) {
    throw new Error('Unable to acquire Microsoft Graph access token');
  }

  return result.accessToken;
}
