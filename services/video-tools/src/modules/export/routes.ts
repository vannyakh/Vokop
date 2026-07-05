import { Router } from 'express';
import type { Request, Response } from 'express';
import multer from 'multer';
import { exportComposedRenderMetaSchema, exportRenderSettingsSchema } from '@vokop/api';
import { config } from '../../config.js';
import { getFfmpegHealth, requireFfmpegHealth } from '../../lib/ffmpegHealth.js';
import { getJob } from '../../lib/jobQueue.js';
import { startComposedExportRender } from './composedRender.js';
import { exportOutputPath, startLocalExportRender } from './localRender.js';
import { getRenderJob, listRenderJobs, startExport } from './service.js';

function ownerId(req: Request): string {
  return (req as Request & { userId?: string }).userId ?? 'anonymous';
}

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: config.MAX_UPLOAD_MB * 1024 * 1024 },
});

export function createExportRouter(): Router {
  const router = Router();

  /** POST /render/composed — WebCodecs H.264 + server session audio mux + transcode. */
  router.post(
    '/render/composed',
    upload.fields([
      { name: 'composedVideo', maxCount: 1 },
      { name: 'voiceAudio', maxCount: 1 },
    ]),
    async (req: Request, res: Response) => {
      const files = req.files as
        | { composedVideo?: Express.Multer.File[]; voiceAudio?: Express.Multer.File[] }
        | undefined;
      const videoFile = files?.composedVideo?.[0];
      if (!videoFile) {
        res.status(400).json({ error: 'Missing composedVideo file' });
        return;
      }

      const rawMeta = typeof req.body?.meta === 'string' ? JSON.parse(req.body.meta) : req.body?.meta;
      const parsedMeta = exportComposedRenderMetaSchema.safeParse(rawMeta);
      if (!parsedMeta.success) {
        res.status(400).json({ error: 'Invalid composed export meta', details: parsedMeta.error.flatten() });
        return;
      }

      const ffmpegErr = requireFfmpegHealth(await getFfmpegHealth());
      if (ffmpegErr) {
        res.status(503).json({ error: ffmpegErr });
        return;
      }

      const voiceFile = files?.voiceAudio?.[0];

      try {
        const job = await startComposedExportRender({
          videoBuffer: videoFile.buffer,
          voiceBuffer: voiceFile?.buffer ?? null,
          meta: parsedMeta.data,
        });
        res.status(202).json({ jobId: job.jobId, status: job.status });
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to start composed export';
        res.status(500).json({ error: message });
      }
    },
  );

  /** POST /render — Export Video modal: upload a recorded clip for transcode/watermark. */
  router.post('/render', upload.single('recording'), async (req: Request, res: Response) => {
    const file = req.file;
    if (!file) {
      res.status(400).json({ error: 'Missing recording file' });
      return;
    }

    const rawSettings = typeof req.body?.settings === 'string' ? JSON.parse(req.body.settings) : req.body?.settings;
    const parsed = exportRenderSettingsSchema.safeParse(rawSettings);
    if (!parsed.success) {
      res.status(400).json({ error: 'Invalid export settings', details: parsed.error.flatten() });
      return;
    }

    const ffmpegErr = requireFfmpegHealth(await getFfmpegHealth());
    if (ffmpegErr) {
      res.status(503).json({ error: ffmpegErr });
      return;
    }

    try {
      const job = await startLocalExportRender({
        buffer: file.buffer,
        originalFilename: file.originalname,
        settings: parsed.data,
      });
      res.status(202).json({ jobId: job.jobId, status: job.status });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to start export';
      res.status(500).json({ error: message });
    }
  });

  /** GET /jobs/:jobId/download — stream the finished export render. */
  router.get('/jobs/:jobId/download', async (req: Request, res: Response) => {
    const job = await getJob(req.params.jobId);
    if (!job || job.type !== 'export') {
      res.status(404).json({ error: 'Export job not found' });
      return;
    }
    if (job.status !== 'completed' || !job.outputFormat) {
      res.status(409).json({ error: 'Export job is not finished yet' });
      return;
    }

    const filePath = exportOutputPath(job.jobId, job.outputFormat);
    res.download(filePath, `vokop_export.${job.outputFormat}`, (err) => {
      if (err && !res.headersSent) {
        res.status(404).json({ error: 'Export file not found or already expired' });
      }
    });
  });

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

  /** GET /jobs/:jobId — filmstrip/probe jobs (Redis) or render jobs (Mongo) */
  router.get('/jobs/:jobId', async (req: Request, res: Response) => {
    const videoJob = await getJob(req.params.jobId);
    if (videoJob) {
      res.json(videoJob);
      return;
    }

    const job = await getRenderJob(req.params.jobId, ownerId(req));
    if (!job) {
      res.status(404).json({ error: 'Job not found' });
      return;
    }
    res.json({ job });
  });

  return router;
}
