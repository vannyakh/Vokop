import { Router } from 'express';
import {
  agentRunRequestSchema,
  agentRunResponseSchema,
  aiCapabilitiesResponseSchema,
  aiJobResponseSchema,
  clipSuggestRequestSchema,
  clipSuggestResponseSchema,
  imageAnalyzeRequestSchema,
  imageAnalyzeResponseSchema,
  llmCompleteRequestSchema,
  llmCompleteResponseSchema,
  llmProvidersResponseSchema,
  startAiJobResponseSchema,
  subtitlesRequestSchema,
  subtitlesResponseSchema,
  textAssistRequestSchema,
  textAssistResponseSchema,
  toApiResponse,
  transcribeRequestSchema,
  translateRequestSchema,
  translateResponseSchema,
  videoAnalyzeRequestSchema,
  videoAnalyzeResponseSchema,
  voiceTtsRequestSchema,
  voiceTtsResponseSchema,
} from '@vokop/api';
import { runStudioAgent } from '../agent/index.js';
import { config } from '../config.js';
import { createJobRecord, enqueueJob, getJob, updateJob } from '../lib/jobs.js';
import { complete, listFeatureCapabilities, listProviders, optionsForFeature } from '../llm/index.js';
import { analyzeVideoMedia } from '../services/analyze.js';
import { suggestClipsFromTranscript } from '../services/clipSuggest.js';
import { analyzeImage } from '../services/image.js';
import { buildSubtitles } from '../services/subtitles.js';
import { assistText } from '../services/text.js';
import { transcribeMedia } from '../services/transcribe.js';
import { translateContent } from '../services/translate.js';
import { synthesizeSpeech } from '../services/voice.js';

function llmErrorStatus(message: string): number {
  if (/not configured|No LLM provider|Voice TTS is not configured/i.test(message)) return 503;
  return 400;
}

export function createAiRouter(): Router {
  const router = Router();

  /** GET /ai/capabilities — which studio AI features are available */
  router.get('/capabilities', (_req, res) => {
    res.json(
      toApiResponse(aiCapabilitiesResponseSchema, {
        defaultProvider: config.defaultProvider,
        features: listFeatureCapabilities(),
      }),
    );
  });

  /** GET /ai/llm/providers — registered backends */
  router.get('/llm/providers', (_req, res) => {
    res.json(
      toApiResponse(llmProvidersResponseSchema, {
        defaultProvider: config.defaultProvider,
        providers: listProviders(),
      }),
    );
  });

  /** POST /ai/transcribe — async ASR / timed transcript */
  router.post('/transcribe', async (req, res) => {
    try {
      const body = transcribeRequestSchema.parse(req.body);
      const job = await createJobRecord('transcribe', {
        sessionId: body.sessionId,
        projectId: body.projectId,
      });

      enqueueJob(job.jobId, async () => {
        await updateJob(job.jobId, { progress: 20 });
        const result = await transcribeMedia(body);
        await updateJob(job.jobId, {
          progress: 90,
          segments: result.segments,
          transcript: result.transcript,
          result: {
            detectedLanguage: result.detectedLanguage,
            provider: result.provider,
            model: result.model,
          },
        });
      });

      res.status(202).json(
        toApiResponse(startAiJobResponseSchema, {
          jobId: job.jobId,
          type: 'transcribe',
          status: 'queued',
        }),
      );
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to start transcription';
      res.status(llmErrorStatus(message)).json({ error: message });
    }
  });

  /** POST /ai/translate — text or caption segments */
  router.post('/translate', async (req, res) => {
    try {
      const body = translateRequestSchema.parse(req.body);
      const payload = await translateContent(body);
      res.json(toApiResponse(translateResponseSchema, payload));
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Translation failed';
      res.status(llmErrorStatus(message)).json({ error: message });
    }
  });

  /** POST /ai/analyze — video summary + highlight clips */
  router.post('/analyze', async (req, res) => {
    try {
      const body = videoAnalyzeRequestSchema.parse(req.body);
      const payload = await analyzeVideoMedia(body);
      res.json(toApiResponse(videoAnalyzeResponseSchema, payload));
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Video analysis failed';
      res.status(llmErrorStatus(message)).json({ error: message });
    }
  });

  /** POST /ai/image/analyze — describe / OCR / caption from image */
  router.post('/image/analyze', async (req, res) => {
    try {
      const body = imageAnalyzeRequestSchema.parse(req.body);
      const payload = await analyzeImage(body);
      res.json(toApiResponse(imageAnalyzeResponseSchema, payload));
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Image analysis failed';
      res.status(llmErrorStatus(message)).json({ error: message });
    }
  });

  /** POST /ai/voice/tts — text-to-speech */
  router.post('/voice/tts', async (req, res) => {
    try {
      const body = voiceTtsRequestSchema.parse(req.body);
      const payload = await synthesizeSpeech(body);
      res.json(toApiResponse(voiceTtsResponseSchema, payload));
    } catch (err) {
      const message = err instanceof Error ? err.message : 'TTS failed';
      res.status(llmErrorStatus(message)).json({ error: message });
    }
  });

  /** POST /ai/text — rewrite / summarize / captions / polish / expand */
  router.post('/text', async (req, res) => {
    try {
      const body = textAssistRequestSchema.parse(req.body);
      const payload = await assistText(body);
      res.json(toApiResponse(textAssistResponseSchema, payload));
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Text assist failed';
      res.status(llmErrorStatus(message)).json({ error: message });
    }
  });

  /** GET /ai/jobs/:jobId */
  router.get('/jobs/:jobId', async (req, res) => {
    try {
      const job = await getJob(req.params.jobId);
      if (!job) {
        res.status(404).json({ error: 'Job not found' });
        return;
      }
      res.json(toApiResponse(aiJobResponseSchema, job));
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to load job';
      res.status(500).json({ error: message });
    }
  });

  /** POST /ai/subtitles — sync SRT/VTT from segments */
  router.post('/subtitles', (req, res) => {
    try {
      const body = subtitlesRequestSchema.parse(req.body);
      const payload = buildSubtitles(body);
      res.json(toApiResponse(subtitlesResponseSchema, payload));
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to build subtitles';
      res.status(400).json({ error: message });
    }
  });

  /** POST /ai/clip-suggest — LLM highlight ranges */
  router.post('/clip-suggest', async (req, res) => {
    try {
      const body = clipSuggestRequestSchema.parse(req.body);
      const payload = await suggestClipsFromTranscript(body);
      res.json(toApiResponse(clipSuggestResponseSchema, payload));
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to suggest clips';
      res.status(llmErrorStatus(message)).json({ error: message });
    }
  });

  /** POST /ai/agent — studio agent */
  router.post('/agent', async (req, res) => {
    try {
      const body = agentRunRequestSchema.parse(req.body);
      const payload = await runStudioAgent(body);
      res.json(toApiResponse(agentRunResponseSchema, payload));
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Agent run failed';
      res.status(llmErrorStatus(message)).json({ error: message });
    }
  });

  /** POST /ai/llm/complete — low-level LLM completion */
  router.post('/llm/complete', async (req, res) => {
    try {
      const body = llmCompleteRequestSchema.parse(req.body);
      const opts = optionsForFeature('text', {
        system: body.system,
        json: body.json,
        temperature: body.temperature,
        provider: body.provider,
        model: body.model,
      });
      const result = await complete(body.prompt, opts);
      res.json(toApiResponse(llmCompleteResponseSchema, result));
    } catch (err) {
      const message = err instanceof Error ? err.message : 'LLM completion failed';
      res.status(llmErrorStatus(message)).json({ error: message });
    }
  });

  return router;
}
