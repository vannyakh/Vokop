import { Router } from 'express';
import type { Request, Response } from 'express';
import { completeAssetUpload, getAsset, listAssets, presignAssetUpload } from './service.js';

function ownerId(req: Request): string {
  return (req as Request & { userId?: string }).userId ?? 'anonymous';
}

export function createAssetsRouter(): Router {
  const router = Router();

  /** POST /assets/presign — request presigned PUT URL for direct upload to R2 */
  router.post('/presign', async (req: Request, res: Response) => {
    const { filename, contentType, projectId, size } = req.body as Record<string, unknown>;
    if (!filename || !contentType || !projectId) {
      res.status(400).json({ error: 'filename, contentType, and projectId are required' });
      return;
    }
    try {
      const result = await presignAssetUpload(
        ownerId(req),
        String(projectId),
        String(filename),
        String(contentType),
        Number(size ?? 0),
      );
      res.status(201).json(result);
    } catch (err) {
      const e = err as Error & { statusCode?: number };
      res.status(e.statusCode ?? 500).json({ error: e.message });
    }
  });

  /** POST /assets/:id/complete — notify that upload finished → triggers ingest job */
  router.post('/:id/complete', async (req: Request, res: Response) => {
    try {
      const asset = await completeAssetUpload(req.params.id, ownerId(req));
      res.json({ asset });
    } catch (err) {
      const e = err as Error & { statusCode?: number };
      res.status(e.statusCode ?? 500).json({ error: e.message });
    }
  });

  /** GET /assets?projectId=xxx — list assets */
  router.get('/', async (req: Request, res: Response) => {
    const projectId = req.query.projectId as string | undefined;
    const list = await listAssets(ownerId(req), projectId);
    res.json({ assets: list });
  });

  /** GET /assets/:id */
  router.get('/:id', async (req: Request, res: Response) => {
    const asset = await getAsset(req.params.id, ownerId(req));
    if (!asset) {
      res.status(404).json({ error: 'Asset not found' });
      return;
    }
    res.json({ asset });
  });

  return router;
}
