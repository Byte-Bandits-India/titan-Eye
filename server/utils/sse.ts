import { Response } from 'express';

import { logger } from './logger.js';
import { encryptPayload } from './payloadEncryption.js';

export interface SseClient {
  id: number;
  res: Response;
}

export let sseClients: SseClient[] = [];

export function addSseClient(client: SseClient) {
  sseClients.push(client);
}

export function broadcastEvent<T extends object | string | number | boolean>(type: string, data: T) {
  let outboundData: object | string | number | boolean = data;
  if (data && typeof data === 'object') {
    try {
      outboundData = encryptPayload(data);
    } catch {
      outboundData = data;
    }
  }

  sseClients.forEach((client) => {
    try {
      client.res.write(`data: ${JSON.stringify({ data: outboundData, type })}\n\n`);
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err));
      logger.error('Failed to write to SSE client', { clientId: client.id, errorMessage: error.message });
    }
  });
}

export function removeSseClient(clientId: number) {
  sseClients = sseClients.filter((c) => c.id !== clientId);
}
