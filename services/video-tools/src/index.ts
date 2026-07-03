/**
 * video-tools API entry point.
 * Mounts all module routers and preserves legacy session/filmstrip endpoints.
 */

import './config.js'; // validate env + load dotenv first
import express from 'express';
import multer from 'multer';
import path from 'node:path';
import { checkDatabaseHealth, connectDatabases, getRedis, setupGracefulShutdown } from '@vokop/db';
import {
  filmstripRequestSchema,
  filmstripResponseSchema,
  toApiResponse,
  videoProbeResponseSchema,
  videoToolsHealthResponseSchema,
} from '@vokop/api';
import { FILMSTRIP_THUMB_HEIGHT, FILMSTRIP_THUMB_WIDTH, getFilmstripFrameCount, DEV_PORTS } from '@vokop/shared';
import { config } from './config.js';
import { ensureIndexes } from './db/indexes.js';
import { createProjectsRouter } from './modules/projects/routes.js';
import { createAssetsRouter } from './modules/assets/routes.js';
import { createExportRouter } from './modules/export/routes.js';
import { createAiRouter } from './modules/ai/routes.js';
import { createStockRouter } from './modules/stock/routes.js';
import { createPresetsRouter } from './modules/presets/routes.js';
import { probeVideo } from './workers/pipeline/probe.js';
import { generateFilmstrip, extensionForFilename } from './workers/pipeline/ffmpeg.js';
import {
  createJobRecord,
  enqueueJob,
  getJob,
  logVideoJob,
  saveJob,
  updateJob,
} from './lib/jobQueue.js';
import { createVideoSession, getVideoSession, sessionCacheKey } from './lib/sessionStore.js';

const PORT = config.VIDEO_TOOLS_PORT;
const MAX_UPLOAD_MB = config.MAX_UPLOAD_MB;
const CACHE_TTL_SEC = config.CACHE_TTL_SEC;

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_UPLOAD_MB * 1024 * 1024 },
});

const app = express();
app.use(express.json({ limit: '2mb' }));

// ─── Module routers ───────────────────────────────────────────────────────────
app.use('/projects', createProjectsRouter());
app.use('/assets', createAssetsRouter());
app.use('/presets', createPresetsRouter());

// Export sub-routes live under two paths
const exportRouter = createExportRouter();
app.use('/', exportRouter);         // /projects/:id/export, /jobs/:jobId

app.use('/media', createStockRouter());    // backward-compat path kept
app.use('/stock', createStockRouter());    // new path
app.use('/ai', createAiRouter());

// ─── Health ───────────────────────────────────────────────────────────────────
app.get('/health', async (_req, res) => {
  const databases = await checkDatabaseHealth();
  const ok = databases.mongo && databases.redis;
  const payload = toApiResponse(videoToolsHealthResponseSchema, {
    status: ok ? 'ok' : 'degraded',
    service: 'video-tools',
    databases,
    timestamp: new Date().toISOString(),
  });
  res.status(ok ? 200 : 503).json(payload);
});

// ─── Session / filmstrip (legacy + current) ───────────────────────────────────
app.post('/session', upload.single('video'), async (req, res) => {
  const file = req.file;
  if (!file) { res.status(400).json({ error: 'Missing video file' }); return; }
  const ext = extensionForFilename(file.originalname);
  const inputPath = path.join('/tmp', `vokop-session-probe-${Date.now()}.${ext}`);
  try {
    const { writeFile } = await import('node:fs/promises');
    await writeFile(inputPath, file.buffer);
    const probe = toApiResponse(videoProbeResponseSchema, await probeVideo(inputPath));
    const session = await createVideoSession(file, probe);
    res.status(201).json({ sessionId: session.sessionId, filename: session.filename, size: session.size, probe: session.probe, expiresAt: session.expiresAt });
  } catch (err) {
    res.status(500).json({ error: err instanceof Error ? err.message : 'Session creation failed' });
  } finally {
    const { unlink } = await import('node:fs/promises');
    await unlink(inputPath).catch(() => undefined);
  }
});

async function runFilmstrip(
  inputPath: string,
  duration: number,
  onProgress?: (thumbnails: string[], progress: number) => Promise<void>,
): Promise<{ thumbnails: string[]; width: number; height: number }> {
  const frameCount = getFilmstripFrameCount(duration);
  const thumbnails: string[] = [];
  await generateFilmstrip(inputPath, duration, FILMSTRIP_THUMB_WIDTH, FILMSTRIP_THUMB_HEIGHT, frameCount, async ({ done, total, thumbnail }) => {
    thumbnails.push(thumbnail);
    await onProgress?.(thumbnails, Math.round((done / total) * 100));
  });
  return { thumbnails, width: FILMSTRIP_THUMB_WIDTH, height: FILMSTRIP_THUMB_HEIGHT };
}

app.post('/session/:sessionId/filmstrip', async (req, res) => {
  const session = await getVideoSession(req.params.sessionId);
  if (!session) { res.status(404).json({ error: 'Session not found or expired' }); return; }
  const parsed = filmstripRequestSchema.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: 'Missing or invalid duration' }); return; }
  const { duration } = parsed.data;
  const redis = getRedis();
  const key = sessionCacheKey(session.sessionId, 'filmstrip', String(duration));
  const cached = await redis.get(key);
  if (cached) { res.json(toApiResponse(filmstripResponseSchema, JSON.parse(cached))); return; }
  try {
    const payload = toApiResponse(filmstripResponseSchema, await runFilmstrip(session.filePath, duration));
    await redis.setEx(key, CACHE_TTL_SEC, JSON.stringify(payload));
    await logVideoJob('filmstrip', session.filename, session.size, 'completed', { duration });
    res.json(payload);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Filmstrip generation failed';
    await logVideoJob('filmstrip', session.filename, session.size, 'failed', { error: message });
    res.status(500).json({ error: message });
  }
});

app.post('/session/:sessionId/jobs/filmstrip', async (req, res) => {
  const session = await getVideoSession(req.params.sessionId);
  if (!session) { res.status(404).json({ error: 'Session not found or expired' }); return; }
  const parsed = filmstripRequestSchema.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: 'Missing or invalid duration' }); return; }
  const { duration } = parsed.data;
  const redis = getRedis();
  const key = sessionCacheKey(session.sessionId, 'filmstrip', String(duration));
  const cached = await redis.get(key);
  if (cached) {
    const job = await createJobRecord('filmstrip', session.sessionId);
    job.status = 'completed'; job.progress = 100; job.thumbnails = JSON.parse(cached).thumbnails;
    await saveJob(job);
    res.status(201).json({ jobId: job.jobId, status: job.status });
    return;
  }
  const job = await createJobRecord('filmstrip', session.sessionId);
  res.status(202).json({ jobId: job.jobId, status: job.status });
  enqueueJob(job.jobId, async () => {
    const payload = await runFilmstrip(session.filePath, duration, async (thumbnails, progress) => {
      await updateJob(job.jobId, { thumbnails: [...thumbnails], progress });
    });
    const validated = toApiResponse(filmstripResponseSchema, payload);
    await redis.setEx(key, CACHE_TTL_SEC, JSON.stringify(validated));
    await updateJob(job.jobId, { thumbnails: validated.thumbnails, progress: 100 });
    await logVideoJob('filmstrip', session.filename, session.size, 'completed', { duration, sessionId: session.sessionId, jobId: job.jobId });
  });
});

app.get('/jobs/:jobId', async (req, res) => {
  const job = await getJob(req.params.jobId);
  if (!job) { res.status(404).json({ error: 'Job not found' }); return; }
  res.json(job);
});

// Legacy probe + filmstrip (file upload)
app.post('/probe', upload.single('video'), async (req, res) => {
  const file = req.file;
  if (!file) { res.status(400).json({ error: 'Missing video file' }); return; }
  const ext = extensionForFilename(file.originalname);
  const inputPath = path.join('/tmp', `vokop-probe-${Date.now()}.${ext}`);
  try {
    const { writeFile } = await import('node:fs/promises');
    await writeFile(inputPath, file.buffer);
    const result = await probeVideo(inputPath);
    const payload = toApiResponse(videoProbeResponseSchema, result);
    await getRedis().setEx(`vokop:legacy:probe:${file.originalname}:${file.size}`, CACHE_TTL_SEC, JSON.stringify(payload));
    await logVideoJob('probe', file.originalname, file.size, 'completed', result);
    res.json(payload);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Probe failed';
    await logVideoJob('probe', file.originalname, file.size, 'failed', { error: message });
    res.status(500).json({ error: message });
  } finally {
    const { unlink } = await import('node:fs/promises');
    await unlink(inputPath).catch(() => undefined);
  }
});

// Backward-compat editor routes (now also at /presets/*)
app.use('/editor', createPresetsRouter());

app.use((_req, res) => { res.status(404).json({ error: 'Not found' }); });

// ─── Boot ─────────────────────────────────────────────────────────────────────
async function start() {
  try {
    await connectDatabases();
    console.log('[video-tools] connected to MongoDB and Redis');
    await ensureIndexes();
    console.log('[video-tools] DB indexes ensured');
  } catch (err) {
    console.error('[video-tools] database connection failed:', err);
    process.exit(1);
  }

  setupGracefulShutdown();

  const server = app.listen(PORT, () => {
    console.log(`[video-tools] http://localhost:${PORT}`);
  });

  server.on('error', (err: NodeJS.ErrnoException) => {
    if (err.code === 'EADDRINUSE') {
      console.error(`[video-tools] Port ${PORT} is already in use. Run: pnpm stop`);
      process.exit(1);
    }
    throw err;
  });
}

void start();
