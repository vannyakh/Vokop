import { createClient, type RedisClientType } from 'redis';

let client: RedisClientType | null = null;

export async function connectRedis(url: string): Promise<RedisClientType> {
  if (client?.isOpen) return client;

  client = createClient({ url });
  client.on('error', (err) => console.error('[redis]', err.message));
  await client.connect();
  return client;
}

export function getRedis(): RedisClientType {
  if (!client?.isOpen) throw new Error('Redis not connected');
  return client;
}

export async function pingRedis(): Promise<boolean> {
  if (!client?.isOpen) return false;
  return (await client.ping()) === 'PONG';
}

export async function disconnectRedis(): Promise<void> {
  if (client?.isOpen) await client.quit();
  client = null;
}
