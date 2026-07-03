/**
 * WebSocket server attached to the gateway HTTP server.
 * Clients connect and subscribe to job progress by sending:
 *   { type: "subscribe", jobId: "<id>" }
 * They unsubscribe via:
 *   { type: "unsubscribe", jobId: "<id>" }
 */

import { WebSocketServer, WebSocket, type RawData } from 'ws';
import type { Server } from 'node:http';

interface SubscribeMessage { type: 'subscribe'; jobId: string }
interface UnsubscribeMessage { type: 'unsubscribe'; jobId: string }
type ClientMessage = SubscribeMessage | UnsubscribeMessage;

/** Map of jobId → set of subscribed WebSocket clients */
const rooms = new Map<string, Set<WebSocket>>();

export function createWsServer(httpServer: Server): WebSocketServer {
  const wss = new WebSocketServer({ server: httpServer, path: '/ws' });

  wss.on('connection', (ws) => {
    const subscriptions = new Set<string>();

    ws.on('message', (raw: RawData) => {
      try {
        const msg = JSON.parse(raw.toString()) as ClientMessage;

        if (msg.type === 'subscribe' && msg.jobId) {
          subscriptions.add(msg.jobId);
          if (!rooms.has(msg.jobId)) rooms.set(msg.jobId, new Set());
          rooms.get(msg.jobId)!.add(ws);
        } else if (msg.type === 'unsubscribe' && msg.jobId) {
          unsubscribe(ws, msg.jobId);
          subscriptions.delete(msg.jobId);
        }
      } catch {
        // ignore malformed messages
      }
    });

    ws.on('close', () => {
      for (const jobId of subscriptions) {
        unsubscribe(ws, jobId);
      }
    });

    ws.on('error', () => {
      for (const jobId of subscriptions) {
        unsubscribe(ws, jobId);
      }
    });
  });

  return wss;
}

function unsubscribe(ws: WebSocket, jobId: string): void {
  const room = rooms.get(jobId);
  if (!room) return;
  room.delete(ws);
  if (room.size === 0) rooms.delete(jobId);
}

/**
 * Push a progress event to all clients subscribed to the given jobId.
 * Called from the Redis pub/sub subscriber.
 */
export function broadcastJobProgress(jobId: string, payload: unknown): void {
  const room = rooms.get(jobId);
  if (!room || room.size === 0) return;

  const message = JSON.stringify(payload);
  for (const client of room) {
    if (client.readyState === WebSocket.OPEN) {
      try {
        client.send(message);
      } catch {
        // client disconnected mid-send
      }
    }
  }
}
