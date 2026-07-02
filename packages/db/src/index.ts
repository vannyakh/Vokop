import { loadDbEnv } from './env.js';
import { connectMongo, disconnectMongo, pingMongo } from './mongo.js';
import { connectRedis, disconnectRedis, pingRedis } from './redis.js';

export * from './env.js';
export * from './mongo.js';
export * from './redis.js';

export async function connectDatabases(): Promise<void> {
  const { mongodbUri, redisUrl } = loadDbEnv();
  await Promise.all([connectMongo(mongodbUri), connectRedis(redisUrl)]);
}

export async function checkDatabaseHealth(): Promise<{ mongo: boolean; redis: boolean }> {
  const [mongo, redis] = await Promise.all([
    pingMongo().catch(() => false),
    pingRedis().catch(() => false),
  ]);
  return { mongo, redis };
}

export async function disconnectDatabases(): Promise<void> {
  await Promise.all([disconnectMongo(), disconnectRedis()]);
}

export function setupGracefulShutdown(): void {
  const shutdown = async () => {
    await disconnectDatabases();
    process.exit(0);
  };
  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
}
