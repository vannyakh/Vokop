import { Router } from 'express';
import { checkDatabaseHealth } from '@vokop/db';
import { toApiResponse, gatewayHealthResponseSchema } from '@vokop/api';

export function createHealthRouter(): Router {
  const router = Router();

  router.get('/api/v1/health', async (_req, res) => {
    const databases = await checkDatabaseHealth();
    const ok = databases.mongo && databases.redis;
    const payload = toApiResponse(gatewayHealthResponseSchema, {
      status: ok ? 'ok' : 'degraded',
      service: 'gateway',
      databases,
      timestamp: new Date().toISOString(),
    });
    res.status(ok ? 200 : 503).json(payload);
  });

  return router;
}
