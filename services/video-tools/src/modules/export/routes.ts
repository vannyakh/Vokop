import { Router } from 'express';
import type { Request, Response } from 'express';
import { getRenderJob, listRenderJobs, startExport } from './service.js';

function ownerId(req: Request): string {
  return (req as Request & { userId?: string }).userId ?? 'anonymous';
}

export function createExportRouter(): Router {
  const router = Router();

  /** POST /projects/:projectId/export */
  router.post('/projects/:projectId/export', async (req: Request, res: Response) => {
    const { timelineSnapshot, exportSettings } = req.body as Record<string, unknown>;
    if (!timelineSnapshot) {
      res.status(400).json({ error: 'timelineSnapshot is required' });
      return;
    }
    try {
      const job = await startExport(
        req.params.projectId,
        ownerId(req),
        timelineSnapshot as Record<string, unknown>,
        (exportSettings as Record<string, unknown>) ?? {},
      );
      res.status(202).json({ job });
    } catch (err) {
      const e = err as Error & { statusCode?: number };
      res.status(e.statusCode ?? 500).json({ error: e.message });
    }
  });

  /** GET /projects/:projectId/export — list export jobs for a project */
  router.get('/projects/:projectId/export', async (req: Request, res: Response) => {
    const jobs = await listRenderJobs(req.params.projectId, ownerId(req));
    res.json({ jobs });
  });

  /** GET /jobs/:jobId — get a specific render job */
  router.get('/jobs/:jobId', async (req: Request, res: Response) => {
    const job = await getRenderJob(req.params.jobId, ownerId(req));
    if (!job) {
      res.status(404).json({ error: 'Job not found' });
      return;
    }
    res.json({ job });
  });

  return router;
}
