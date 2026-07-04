import { GoogleGenAI } from '@google/genai';
import { config } from '../../config.js';
import type {
  LlmCompleteOptions,
  LlmCompleteResult,
  LlmMediaInput,
  LlmProvider,
} from '../types.js';
import { requireText, withRetry } from '../utils.js';

export function createGeminiProvider(): LlmProvider {
  let client: GoogleGenAI | null = null;

  function getClient(): GoogleGenAI {
    if (!config.gemini.apiKey) {
      throw new Error('Gemini is not configured. Set GEMINI_API_KEY in the root .env file.');
    }
    if (!client) {
      client = new GoogleGenAI({ apiKey: config.gemini.apiKey });
    }
    return client;
  }

  return {
    id: 'gemini',
    name: 'Google Gemini',
    supportsMedia: true,
    defaultModel: config.gemini.defaultModel,
    models: config.gemini.models,

    isConfigured() {
      return Boolean(config.gemini.apiKey);
    },

    async complete(prompt, options = {}): Promise<LlmCompleteResult> {
      const model = options.model ?? config.gemini.defaultModel;
      const ai = getClient();

      const contents = options.system
        ? [
            { role: 'user' as const, parts: [{ text: options.system }] },
            { role: 'model' as const, parts: [{ text: 'Understood.' }] },
            { role: 'user' as const, parts: [{ text: prompt }] },
          ]
        : prompt;

      const response = await withRetry(() =>
        ai.models.generateContent({
          model,
          contents,
          config: {
            temperature: options.temperature ?? 0.4,
            responseMimeType: options.json ? 'application/json' : undefined,
          },
        }),
      );

      return {
        text: requireText(response.text, 'Gemini'),
        model,
        provider: 'gemini',
      };
    },

    async completeWithMedia(
      prompt: string,
      media: LlmMediaInput,
      options: LlmCompleteOptions = {},
    ): Promise<LlmCompleteResult> {
      const model = options.model ?? config.gemini.defaultModel;
      const ai = getClient();

      const response = await withRetry(() =>
        ai.models.generateContent({
          model,
          contents: [
            {
              role: 'user',
              parts: [
                { inlineData: { data: media.data, mimeType: media.mimeType } },
                { text: prompt },
              ],
            },
          ],
          config: {
            temperature: options.temperature ?? 0.2,
            responseMimeType: options.json ? 'application/json' : undefined,
          },
        }),
      );

      return {
        text: requireText(response.text, 'Gemini'),
        model,
        provider: 'gemini',
      };
    },
  };
}
