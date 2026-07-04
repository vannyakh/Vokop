/**
 * OpenAI-compatible speech (TTS) client.
 * Prefers 302.AI gateway, then direct OpenAI.
 */

import OpenAI from 'openai';
import { config } from '../config.js';
import { normalize302BaseUrl } from './providers/ai302.js';
import type { LlmProviderId } from './types.js';

export interface SpeechClientRef {
  client: OpenAI;
  provider: LlmProviderId;
}

export function getSpeechClient(preferred?: LlmProviderId): SpeechClientRef {
  if (preferred === 'openai' && config.openai.apiKey) {
    return {
      client: new OpenAI({
        apiKey: config.openai.apiKey,
        baseURL: config.openai.baseUrl,
      }),
      provider: 'openai',
    };
  }

  if (preferred === '302ai' || !preferred) {
    if (config.ai302.apiKey) {
      return {
        client: new OpenAI({
          apiKey: config.ai302.apiKey,
          baseURL: normalize302BaseUrl(config.ai302.baseUrl),
        }),
        provider: '302ai',
      };
    }
  }

  if (config.openai.apiKey) {
    return {
      client: new OpenAI({
        apiKey: config.openai.apiKey,
        baseURL: config.openai.baseUrl,
      }),
      provider: 'openai',
    };
  }

  if (config.ai302.apiKey) {
    return {
      client: new OpenAI({
        apiKey: config.ai302.apiKey,
        baseURL: normalize302BaseUrl(config.ai302.baseUrl),
      }),
      provider: '302ai',
    };
  }

  throw new Error(
    'Voice TTS is not configured. Set AI_302_API_KEY or OPENAI_API_KEY for OpenAI-compatible speech.',
  );
}
