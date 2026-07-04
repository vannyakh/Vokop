import { createServer, type Server } from 'node:http';
import { connectDatabases, setupGracefulShutdown } from '@vokop/db';
import { gatewayConfig } from './config.js';
import { createApp } from './app.js';
import { logProxyRoutes } from './proxy/index.js';
import { createWsServer } from './ws/server.js';
import { startProgressSubscriber, stopProgressSubscriber } from './ws/progress.js';

export async function startServer(): Promise<Server> {
  try {
    await connectDatabases();
    console.log('[gateway] connected to MongoDB and Redis');
  } catch (err) {
    console.error('[gateway] database connection failed:', err);
    process.exit(1);
  }

  await startProgressSubscriber(gatewayConfig.redisUrl);
  setupGracefulShutdown();

  const app = createApp();
  const httpServer = createServer(app);
  createWsServer(httpServer);

  httpServer.listen(gatewayConfig.port, () => {
    console.log(`[gateway] http://localhost:${gatewayConfig.port}`);
    console.log(`[gateway] ws://localhost:${gatewayConfig.port}/ws`);
    logProxyRoutes();
  });

  httpServer.on('error', (err: NodeJS.ErrnoException) => {
    if (err.code === 'EADDRINUSE') {
      console.error(`[gateway] Port ${gatewayConfig.port} is already in use. Run: pnpm stop`);
      process.exit(1);
    }
    throw err;
  });

  process.on('SIGTERM', async () => {
    await stopProgressSubscriber();
  });

  return httpServer;
}
