export interface DbEnv {
  mongodbUri: string;
  redisUrl: string;
}

export function loadDbEnv(): DbEnv {
  const mongodbUri =
    process.env.MONGODB_URI ??
    'mongodb://vokop:vokop@localhost:27017/vokop?authSource=admin';
  const redisUrl = process.env.REDIS_URL ?? 'redis://localhost:6379';

  return { mongodbUri, redisUrl };
}
