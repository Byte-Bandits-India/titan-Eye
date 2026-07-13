import { Response } from 'express';

export interface SseClient {
  id: number;
  res: Response;
}

export let sseClients: SseClient[] = [];

export function addSseClient(client: SseClient) {
  sseClients.push(client);
}

export function removeSseClient(clientId: number) {
  sseClients = sseClients.filter(c => c.id !== clientId);
}

export function broadcastEvent<T>(type: string, data: T) {
  sseClients.forEach(client => {
    try {
      client.res.write(`data: ${JSON.stringify({ type, data })}\n\n`);
    } catch (err) {
      const error = err as Error;
      console.error('Failed to write to client:', error.message);
    }
  });
}
