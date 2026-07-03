import { Router } from 'express';
import type { Request, Response } from 'express';
import { enqueueTranscribe, enqueueTranslate, enqueueTts } from './service.js';

function ownerId(req: Request): string {
  return (req as Request & { userId?: string }).userId ?? 'anonymous';
}

export function createAiRouter(): Router {
  const router = Router();

  /** POST /ai/captions — transcribe video/audio asset */
  router.post('/captions', async (req: Request, res: Response) => {
    const { projectId, r2Key, language, hotwords } = req.body as Record<string, unknown>;
    if (!projectId || !r2Key) {
      res.status(400).json({ error: 'projectId and r2Key are required' });
      return;
    }
    try {
      const ref = await enqueueTranscribe(
        String(projectId),
        ownerId(req),
        String(r2Key),
        language as string | undefined,
        hotwords as string | undefined,
      );
      res.status(202).json(ref);
    } catch (err) {
      const e = err as Error;
      res.status(500).json({ error: e.message });
    }
  });

  /** POST /ai/tts — text-to-speech */
  router.post('/tts', async (req: Request, res: Response) => {
    const { projectId, text, voice, outputR2Key } = req.body as Record<string, unknown>;
    if (!projectId || !text || !outputR2Key) {
      res.status(400).json({ error: 'projectId, text, and outputR2Key are required' });
      return;
    }
    try {
      const ref = await enqueueTts(
        String(projectId),
        ownerId(req),
        String(text),
        String(voice ?? 'en-US-Standard-A'),
        String(outputR2Key),
      );
      res.status(202).json(ref);
    } catch (err) {
      const e = err as Error;
      res.status(500).json({ error: e.message });
    }
  });

  /** POST /ai/translate — translate subtitle segments */
  router.post('/translate', async (req: Request, res: Response) => {
    const { projectId, segments, targetLanguage } = req.body as Record<string, unknown>;
    if (!projectId || !segments || !targetLanguage) {
      res.status(400).json({ error: 'projectId, segments, and targetLanguage are required' });
      return;
    }
    try {
      const ref = await enqueueTranslate(
        String(projectId),
        ownerId(req),
        segments as { start: number; end: number; text: string }[],
        String(targetLanguage),
      );
      res.status(202).json(ref);
    } catch (err) {
      const e = err as Error;
      res.status(500).json({ error: e.message });
    }
  });

  return router;
}
