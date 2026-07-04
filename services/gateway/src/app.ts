import cors from 'cors';
import express, { type Express } from 'express';
import { gatewayConfig } from './config.js';
import { registerProxies } from './proxy/index.js';
import { createHealthRouter } from './routes/health.js';
import { notFoundHandler } from './routes/notFound.js';

export function createApp(): Express {
  const app = express();

  app.use(
    cors({
      origin: [gatewayConfig.webOrigin, gatewayConfig.adminOrigin].filter(Boolean),
      credentials: true,
    }),
  );

  app.use(createHealthRouter());
  registerProxies(app);
  app.use(notFoundHandler);

  return app;
}
