import { Router } from 'express';
import {
  applyEditorEditRequestSchema,
  editorCatalogResponseSchema,
  editorPreviewRequestSchema,
  editorPreviewResponseSchema,
  toApiResponse,
} from '@vokop/api';
import { applyEditorEdit, getCatalogResponse, renderEditorPreview } from './handlers.js';

export function createEditorRouter(): Router {
  const router = Router();

  router.get('/catalog', (_req, res) => {
    res.json(toApiResponse(editorCatalogResponseSchema, getCatalogResponse()));
  });

  router.post('/apply', async (req, res) => {
    const parsed = applyEditorEditRequestSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: 'Invalid apply request' });
      return;
    }

    try {
      const result = await applyEditorEdit(
        parsed.data.sessionId,
        parsed.data.tool,
        parsed.data.presetId,
      );
      res.json(result);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Apply failed';
      res.status(400).json({ error: message });
    }
  });

  router.post('/preview', async (req, res) => {
    const parsed = editorPreviewRequestSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: 'Invalid preview request' });
      return;
    }

    try {
      const { sessionId, tool, presetId, atTime } = parsed.data;
      const preview = await renderEditorPreview(sessionId, tool, presetId, atTime);
      res.json(toApiResponse(editorPreviewResponseSchema, preview));
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Preview failed';
      res.status(500).json({ error: message });
    }
  });

  return router;
}
