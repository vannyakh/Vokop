import IORedis from 'ioredis';
import { bullRedisUrl } from '../config.js';

let _connection: IORedis | null = null;

/** Shared ioredis connection used by BullMQ Queues and Workers. */
export function getBullConnection(): IORedis {
  if (!_connection) {
    _connection = new IORedis(bullRedisUrl, {
      maxRetriesPerRequest: null, // required by BullMQ
      enableReadyCheck: false,
    });
    _connection.on('error', (err) => {
      console.error('[bull] Redis connection error:', err.message);
    });
  }
  return _connection;
}

export async function closeBullConnection(): Promise<void> {
  if (_connection) {
    await _connection.quit();
    _connection = null;
  }
}
