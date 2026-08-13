import { CommunicationIdentityClient } from '@azure/communication-identity';

import { logger } from '../utils/logger.js';
import { getMicrosoftGraphToken, isGraphConfigured } from './microsoft/auth.js';

export function isAcsConfigured(): boolean {
  return Boolean(process.env.ACS_CONNECTION_STRING);
}

export function getAcsEndpoint(): string {
  return process.env.ACS_ENDPOINT || 'https://communication.azure.com';
}

export interface AcsUserTokenResult {
  acsToken: string;
  acsUserId: string;
  expiresOn: Date;
}

export async function createAcsUserAndToken(): Promise<AcsUserTokenResult> {
  const connectionString = process.env.ACS_CONNECTION_STRING;

  if (!connectionString) {
    throw new Error('Azure Communication Services is not configured (ACS_CONNECTION_STRING missing).');
  }

  const identityClient = new CommunicationIdentityClient(connectionString);
  const userToken = await identityClient.createUserAndToken(['voip']);

  return {
    acsToken: userToken.token,
    acsUserId: userToken.user.communicationUserId,
    expiresOn: userToken.expiresOn,
  };
}

export interface TeamsMeetingResult {
  joinWebUrl: string;
  meetingId: string;
}

export async function createTeamsOnlineMeeting(
  subject: string,
  organizerUpn?: string
): Promise<TeamsMeetingResult> {
  if (!isGraphConfigured()) {
    throw new Error('Microsoft Graph is not configured (ENTRA environment variables missing).');
  }

  const upn = organizerUpn || process.env.TEAMS_MEETING_ORGANIZER_UPN;

  if (!upn) {
    throw new Error('TEAMS_MEETING_ORGANIZER_UPN environment variable or user email is missing.');
  }

  const token = await getMicrosoftGraphToken();
  const now = new Date();
  const end = new Date(now.getTime() + 60 * 60 * 1000); // 1 hour duration

  const response = await fetch(
    `https://graph.microsoft.com/v1.0/users/${encodeURIComponent(upn)}/onlineMeetings`,
    {
      body: JSON.stringify({
        endDateTime: end.toISOString(),
        lobbyBypassSettings: {
          isDialInBypassingLobby: true,
          scope: 'everyone',
        },
        startDateTime: now.toISOString(),
        subject,
      }),
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      method: 'POST',
    }
  );

  if (!response.ok) {
    const errorText = await response.text();
    logger.error('[ACS/Graph] Failed to create Teams online meeting', {
      error: errorText,
      status: response.status,
    });
    throw new Error(`Failed to create Teams online meeting (${response.status}): ${errorText}`);
  }

  const data = (await response.json()) as { id: string; joinWebUrl: string };

  return {
    joinWebUrl: data.joinWebUrl,
    meetingId: data.id,
  };
}
