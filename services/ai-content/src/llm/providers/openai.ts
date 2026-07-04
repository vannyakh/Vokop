import OpenAI from 'openai';
import { config } from '../../config.js';
import type {
  LlmCompleteOptions,
  LlmCompleteResult,
  LlmMediaInput,
  LlmProvider,
} from '../types.js';
import { requireText, withRetry } from '../utils.js';

export function createOpenAiProvider(): LlmProvider {
  let client: OpenAI | null = null;

  function getClient(): OpenAI {
    if (!config.openai.apiKey) {
      throw new Error('OpenAI is not configured. Set OPENAI_API_KEY in the root .env file.');
    }
    if (!client) {
      client = new OpenAI({
        apiKey: config.openai.apiKey,
        baseURL: config.openai.baseUrl,
      });
    }
    return client;
  }

  return {
    id: 'openai',
    name: 'OpenAI',
    supportsMedia: true,
    defaultModel: config.openai.defaultModel,
    models: config.openai.models,

    isConfigured() {
      return Boolean(config.openai.apiKey);
    },

    async complete(prompt, options = {}): Promise<LlmCompleteResult> {
      const model = options.model ?? config.openai.defaultModel;
      const openai = getClient();

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
      messages.push({ role: 'user', content: prompt });

      const response = await withRetry(() =>
        openai.chat.completions.create({
          model,
          messages,
          temperature: options.temperature ?? 0.4,
          response_format: options.json ? { type: 'json_object' } : undefined,
        }),
      );

      return {
        text: requireText(response.choices[0]?.message?.content, 'OpenAI'),
        model,
        provider: 'openai',
      };
    },

    async completeWithMedia(
      prompt: string,
      media: LlmMediaInput,
      options: LlmCompleteOptions = {},
    ): Promise<LlmCompleteResult> {
      if (!media.mimeType.startsWith('image/')) {
        throw new Error(
          'OpenAI media completion currently supports images only. Use Gemini for audio/video.',
        );
      }

      const model = options.model ?? config.openai.defaultModel;
      const openai = getClient();

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

      const response = await withRetry(() =>
        openai.chat.completions.create({
          model,
          messages,
          temperature: options.temperature ?? 0.2,
          response_format: options.json ? { type: 'json_object' } : undefined,
        }),
      );

      return {
        text: requireText(response.choices[0]?.message?.content, 'OpenAI'),
        model,
        provider: 'openai',
      };
    },
  };
}
