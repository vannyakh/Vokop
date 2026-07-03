import { Router } from 'express';
import {
  editorCatalogResponseSchema,
  toApiResponse,
  editorPreviewRequestSchema,
  editorPreviewResponseSchema,
  applyEditorEditRequestSchema,
  textEffectPreviewsResponseSchema,
} from '@vokop/api';
import { findEditorPreset, getEditorCatalog } from '@vokop/shared';
import { FILTER_PRESETS } from './filters.js';
import { TRANSITION_PRESETS } from './transitions.js';
import { getTextEffectPreviews } from './textEffects.js';
import { getVideoSession } from '../../lib/sessionStore.js';
import { runFfmpeg } from '../../workers/pipeline/ffmpeg.js';
import { readFile, mkdir, rm } from 'node:fs/promises';
import path from 'node:path';

export function createPresetsRouter(): Router {
  const router = Router();

  /** GET /presets/catalog — editor tool presets */
  router.get('/catalog', (_req, res) => {
    res.json(toApiResponse(editorCatalogResponseSchema, { tools: getEditorCatalog() }));
  });

  /** GET /presets/transitions */
  router.get('/transitions', (_req, res) => {
    res.json({ transitions: TRANSITION_PRESETS });
  });

  /** GET /presets/filters */
  router.get('/filters', (_req, res) => {
    res.json({ filters: FILTER_PRESETS });
  });

  /** GET /presets/text-effects */
  router.get('/text-effects', async (_req, res) => {
    try {
      res.json(toApiResponse(textEffectPreviewsResponseSchema, await getTextEffectPreviews()));
    } catch (err) {
      res.status(500).json({ error: (err as Error).message });
    }
  });

  /** POST /presets/apply */
  router.post('/apply', async (req, res) => {
    const parsed = applyEditorEditRequestSchema.safeParse(req.body);
    if (!parsed.success) { res.status(400).json({ error: 'Invalid apply request' }); return; }
    const { sessionId, tool, presetId } = parsed.data;
    const preset = findEditorPreset(tool, presetId);
    if (!preset) { res.status(404).json({ error: `Unknown preset "${presetId}" for tool "${tool}"` }); return; }
    res.json({ tool, presetId, label: preset.label, ffmpegFilter: preset.ffmpegFilter, cssFilter: preset.cssFilter, appliedAt: new Date().toISOString(), meta: preset.meta });
  });

  /** POST /presets/preview */
  router.post('/preview', async (req, res) => {
    const parsed = editorPreviewRequestSchema.safeParse(req.body);
    if (!parsed.success) { res.status(400).json({ error: 'Invalid preview request' }); return; }
    const { sessionId, tool, presetId, atTime } = parsed.data;

    const session = await getVideoSession(sessionId);
    if (!session) { res.status(404).json({ error: 'Session not found or expired' }); return; }
    const preset = findEditorPreset(tool, presetId);
    if (!preset) { res.status(404).json({ error: `Unknown preset "${presetId}"` }); return; }

    const workDir = path.join('/tmp', `vokop-preview-${Date.now()}`);
    const outPath = path.join(workDir, 'preview.jpg');
    await mkdir(workDir, { recursive: true });
    try {
      const vfParts = ['scale=640:-2:force_original_aspect_ratio=decrease', preset.ffmpegFilter].filter(Boolean);
      await runFfmpeg(['-hide_banner', '-loglevel', 'error', '-ss', String(Math.max(0, atTime ?? 0)), '-i', session.filePath, '-frames:v', '1', '-vf', vfParts.join(','), '-q:v', '6', outPath]);
      const data = await readFile(outPath);
      res.json(toApiResponse(editorPreviewResponseSchema, {
        image: `data:image/jpeg;base64,${data.toString('base64')}`,
        width: session.probe.width || 640,
        height: session.probe.height || 360,
        presetId,
      }));
    } catch (err) {
      res.status(500).json({ error: (err as Error).message });
    } finally {
      await rm(workDir, { recursive: true, force: true }).catch(() => undefined);
    }
  });

  return router;
}
