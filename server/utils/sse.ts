import { Response } from 'express';

import { logger } from './logger.js';

export interface SseClient {
  id: number;
  res: Response;
}

export let sseClients: SseClient[] = [];

export function addSseClient(client: SseClient) {
  sseClients.push(client);
}

export function broadcastEvent<T>(type: string, data: T) {
  sseClients.forEach((client) => {
    try {
      client.res.write(`data: ${JSON.stringify({ data, type })}\n\n`);
    } catch (err) {
      const error = err as Error;
      logger.error('Failed to write to SSE client', { clientId: client.id, errorMessage: error.message });
    }
  });
}

export function removeSseClient(clientId: number) {
  sseClients = sseClients.filter((c) => c.id !== clientId);
}
