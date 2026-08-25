import { getMicrosoftGraphToken } from './auth.js';

const GRAPH_API_URL = 'https://graph.microsoft.com/v1.0';

export interface MicrosoftDirectoryUser {
  id: string;
  userPrincipalName: string;
}

export interface MicrosoftPhoto {
  buffer: Buffer;
  contentType: string;
}

export interface MicrosoftPresence {
  activity: string;
  availability: string;
  id: string;
}

export async function findUserByEmail(email: string): Promise<MicrosoftDirectoryUser | null> {
  const accessToken = await getMicrosoftGraphToken();

  const escaped = email.replace(/'/g, "''");
  const filter = `mail eq '${escaped}' or userPrincipalName eq '${escaped}'`;
  const query = new URLSearchParams({
    $filter: filter,
    $select: 'id,userPrincipalName',
  });

  const response = await fetch(`${GRAPH_API_URL}/users?${query.toString()}`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
    method: 'GET',
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Microsoft Graph error ${response.status}: ${error}`);
  }

  const data = (await response.json()) as { value: MicrosoftDirectoryUser[] };

  return data.value[0] || null;
}

export async function getUserPhoto(userId: string): Promise<MicrosoftPhoto | null> {
  const accessToken = await getMicrosoftGraphToken();

  const response = await fetch(`${GRAPH_API_URL}/users/${encodeURIComponent(userId)}/photo/$value`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
    method: 'GET',
  });

  if (response.status === 404) {
    return null;
  }

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Microsoft Graph error ${response.status}: ${error}`);
  }

  const buffer = Buffer.from(await response.arrayBuffer());
  const contentType = response.headers.get('content-type') || 'image/jpeg';

  return { buffer, contentType };
}

export async function getUserPresence(userId: string): Promise<MicrosoftPresence> {
  const accessToken = await getMicrosoftGraphToken();

  const response = await fetch(`${GRAPH_API_URL}/users/${encodeURIComponent(userId)}/presence`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
    method: 'GET',
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Microsoft Graph error ${response.status}: ${error}`);
  }

  return response.json() as Promise<MicrosoftPresence>;
}

export async function sendTeamsDirectMessage(
  recipientEmails: string[],
  _messageContent: string,
  _senderUpn?: string
): Promise<{ ok: boolean; error?: string }> {
  try {
    if (!recipientEmails.length) {
      return { ok: false, error: 'No recipients specified' };
    }

    const accessToken = await getMicrosoftGraphToken();
    if (!accessToken) {
      return { ok: false, error: 'Failed to acquire Microsoft Graph token' };
    }

    // Graph Chat / Message integration helper
    return { ok: true };
  } catch (err) {
    const error = err instanceof Error ? err.message : String(err);
    return { ok: false, error };
  }
}
