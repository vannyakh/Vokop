/**
 * 302.AI — unified multi-model gateway (OpenAI-compatible).
 * Docs: https://302ai-en.apifox.cn/  ·  https://302.ai/
 *
 *   API_KEY  = AI_302_API_KEY
 *   BASE_URL = https://api.302.ai  (SDK uses …/v1)
 */

import OpenAI from 'openai';
import { config } from '../../config.js';
import type {
  LlmCompleteOptions,
  LlmCompleteResult,
  LlmMediaInput,
  LlmProvider,
} from '../types.js';
import { requireText, withRetry } from '../utils.js';

/** OpenAI SDK expects a `/v1` base; accept bare `https://api.302.ai`. */
export function normalize302BaseUrl(baseUrl: string): string {
  const trimmed = baseUrl.replace(/\/+$/, '');
  return trimmed.endsWith('/v1') ? trimmed : `${trimmed}/v1`;
}

export function createAi302Provider(): LlmProvider {
  let client: OpenAI | null = null;

  function getClient(): OpenAI {
    if (!config.ai302.apiKey) {
      throw new Error(
        '302.AI is not configured. Set AI_302_API_KEY in the root .env file.',
      );
    }
    if (!client) {
      client = new OpenAI({
        apiKey: config.ai302.apiKey,
        baseURL: normalize302BaseUrl(config.ai302.baseUrl),
      });
    }
    return client;
  }

  function buildMessages(
    prompt: string,
    options: LlmCompleteOptions,
    media?: LlmMediaInput,
  ): OpenAI.Chat.ChatCompletionMessageParam[] {
    const messages: OpenAI.Chat.ChatCompletionMessageParam[] = [];
    if (options.system) {
      messages.push({ role: 'system', content: options.system });
    }
    if (options.json) {
      messages.push({
        role: 'system',
        content: 'Respond with valid JSON only. No markdown fences.',
      });
    }

    if (media) {
      messages.push({
        role: 'user',
        content: [
          {
            type: 'image_url',
            image_url: { url: `data:${media.mimeType};base64,${media.data}` },
          },
          { type: 'text', text: prompt },
        ],
      });
    } else {
      messages.push({ role: 'user', content: prompt });
    }

    return messages;
  }

  async function chat(
    prompt: string,
    options: LlmCompleteOptions,
    media?: LlmMediaInput,
  ): Promise<LlmCompleteResult> {
    const model = options.model ?? config.ai302.defaultModel;
    const openai = getClient();

    // Some routed models reject response_format — fall back without it.
    const tryCreate = async (withJsonFormat: boolean) =>
      openai.chat.completions.create({
        model,
        messages: buildMessages(prompt, options, media),
        temperature: options.temperature ?? (media ? 0.2 : 0.4),
        response_format:
          withJsonFormat && options.json ? { type: 'json_object' } : undefined,
      });

    let response;
    try {
      response = await withRetry(() => tryCreate(Boolean(options.json)));
    } catch (err) {
      if (options.json) {
        response = await withRetry(() => tryCreate(false));
      } else {
        throw err;
      }
    }

    return {
      text: requireText(response.choices[0]?.message?.content, '302.AI'),
      model,
      provider: '302ai',
    };
  }

  return {
    id: '302ai',
    name: '302.AI',
    supportsMedia: true,
    defaultModel: config.ai302.defaultModel,
    models: config.ai302.models,

    isConfigured() {
      return Boolean(config.ai302.apiKey);
    },

    complete(prompt, options = {}) {
      return chat(prompt, options);
    },

    async completeWithMedia(prompt, media, options = {}) {
      // OpenAI-compatible image path; audio/video models (e.g. Gemini via 302) may accept data URLs.
      if (
        !media.mimeType.startsWith('image/') &&
        !media.mimeType.startsWith('audio/') &&
        !media.mimeType.startsWith('video/')
      ) {
        throw new Error(`302.AI does not support media type ${media.mimeType}`);
      }
      return chat(prompt, options, media);
    },
  };
}
