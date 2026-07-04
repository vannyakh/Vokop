/**
 * Feature → best provider/model routing for studio AI workloads.
 * Prefers 302.AI gateway when configured (one key, many models).
 */

import { config } from '../config.js';
import { listConfiguredProviders, resolveProvider } from './registry.js';
import type { LlmCompleteOptions, LlmProviderId } from './types.js';

export type AiFeature =
  | 'text'
  | 'translate'
  | 'transcript'
  | 'image'
  | 'voice'
  | 'agent'
  | 'clips'
  | 'analyze';

export interface FeatureCapability {
  feature: AiFeature;
  available: boolean;
  preferredProvider?: LlmProviderId;
  preferredModel?: string;
  note?: string;
}

/** Preferred models per feature when using the 302.AI gateway. */
const GATEWAY_MODELS: Record<AiFeature, string> = {
  text: 'gpt-4o-mini',
  translate: 'gpt-4o-mini',
  transcript: 'gemini-2.0-flash',
  image: 'gpt-4o',
  voice: 'tts-1',
  agent: 'gpt-4o-mini',
  clips: 'gpt-4o-mini',
  analyze: 'gemini-2.0-flash',
};

function hasGateway(): boolean {
  return Boolean(config.ai302.apiKey);
}

function hasOpenAiSpeech(): boolean {
  return Boolean(config.ai302.apiKey || config.openai.apiKey);
}

/** Resolve LLM options for a studio feature (caller may still override). */
export function optionsForFeature(
  feature: AiFeature,
  overrides: LlmCompleteOptions = {},
): LlmCompleteOptions {
  const base: LlmCompleteOptions = { ...overrides };

  if (base.provider && base.model) {
    return base;
  }

  if (hasGateway()) {
    return {
      ...base,
      provider: base.provider ?? '302ai',
      model: base.model ?? GATEWAY_MODELS[feature],
    };
  }

  // Native fallbacks for media-heavy features
  if (
    (feature === 'transcript' || feature === 'image' || feature === 'analyze') &&
    config.gemini.apiKey
  ) {
    return {
      ...base,
      provider: base.provider ?? 'gemini',
      model: base.model ?? config.gemini.defaultModel,
    };
  }

  const provider = resolveProvider(base);
  return {
    ...base,
    provider: base.provider ?? provider.id,
    model: base.model ?? provider.defaultModel,
  };
}

export function listFeatureCapabilities(): FeatureCapability[] {
  const configured = listConfiguredProviders();
  const anyLlm = configured.length > 0;
  const media = configured.some((p) => p.supportsMedia);
  const speech = hasOpenAiSpeech();

  return [
    {
      feature: 'text',
      available: anyLlm,
      preferredProvider: hasGateway() ? '302ai' : configured[0]?.id,
      preferredModel: hasGateway() ? GATEWAY_MODELS.text : configured[0]?.defaultModel,
      note: 'Rewrite, summarize, caption polish',
    },
    {
      feature: 'translate',
      available: anyLlm,
      preferredProvider: hasGateway() ? '302ai' : configured[0]?.id,
      preferredModel: hasGateway() ? GATEWAY_MODELS.translate : configured[0]?.defaultModel,
      note: 'Segment + free-text translation for captions',
    },
    {
      feature: 'transcript',
      available: media || hasGateway(),
      preferredProvider: hasGateway() ? '302ai' : config.gemini.apiKey ? 'gemini' : configured.find((p) => p.supportsMedia)?.id,
      preferredModel: hasGateway() ? GATEWAY_MODELS.transcript : config.gemini.defaultModel,
      note: 'ASR / timed transcripts from audio or video',
    },
    {
      feature: 'analyze',
      available: media || hasGateway(),
      preferredProvider: hasGateway() ? '302ai' : config.gemini.apiKey ? 'gemini' : configured.find((p) => p.supportsMedia)?.id,
      preferredModel: hasGateway() ? GATEWAY_MODELS.analyze : config.gemini.defaultModel,
      note: 'Video summary + highlight clips',
    },
    {
      feature: 'image',
      available: media || hasGateway(),
      preferredProvider: hasGateway() ? '302ai' : configured.find((p) => p.supportsMedia)?.id,
      preferredModel: hasGateway() ? GATEWAY_MODELS.image : undefined,
      note: 'Image describe / OCR / scene analysis',
    },
    {
      feature: 'voice',
      available: speech,
      preferredProvider: hasGateway() ? '302ai' : config.openai.apiKey ? 'openai' : undefined,
      preferredModel: GATEWAY_MODELS.voice,
      note: 'Text-to-speech (OpenAI-compatible TTS via 302 or OpenAI)',
    },
    {
      feature: 'agent',
      available: anyLlm,
      preferredProvider: hasGateway() ? '302ai' : configured[0]?.id,
      preferredModel: hasGateway() ? GATEWAY_MODELS.agent : configured[0]?.defaultModel,
    },
    {
      feature: 'clips',
      available: anyLlm,
      preferredProvider: hasGateway() ? '302ai' : configured[0]?.id,
      preferredModel: hasGateway() ? GATEWAY_MODELS.clips : configured[0]?.defaultModel,
      note: 'LLM highlight / clip suggestions',
    },
  ];
}
