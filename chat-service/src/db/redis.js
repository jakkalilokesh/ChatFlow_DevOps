import { createClient } from 'redis';

const createRedisClient = async (name = 'client') => {
  const client = createClient({
    socket: {
      host: process.env.REDIS_HOST || 'redis',
      port: parseInt(process.env.REDIS_PORT || '6379', 10),
      reconnectStrategy: (retries) => {
        if (retries > 20) return new Error('Redis max retries exceeded');
        return Math.min(retries * 100, 3000);
      },
    },
    password: process.env.REDIS_PASSWORD || undefined,
  });

  client.on('error',        (err) => console.error(`Redis [${name}] error:`, err.message));
  client.on('connect',      ()    => console.log(`✅ Redis [${name}] connected`));
  client.on('reconnecting', ()    => console.warn(`Redis [${name}] reconnecting...`));

  await client.connect();
  return client;
};

let pubClient, subClient, cacheClient;

export const initRedis = async () => {
  cacheClient = await createRedisClient('cache');
  pubClient   = await createRedisClient('publisher');
  subClient   = await createRedisClient('subscriber');
  return { pub: pubClient, sub: subClient, cache: cacheClient };
};

export const getRedis = () => ({ pub: pubClient, sub: subClient, cache: cacheClient });
