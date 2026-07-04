import Anthropic from '@anthropic-ai/sdk';
import { config } from '../../config.js';
import type {
  LlmCompleteOptions,
  LlmCompleteResult,
  LlmMediaInput,
  LlmProvider,
} from '../types.js';
import { requireText, withRetry } from '../utils.js';

function toAnthropicImageMediaType(
  mimeType: string,
): 'image/jpeg' | 'image/png' | 'image/gif' | 'image/webp' {
  if (
    mimeType === 'image/jpeg' ||
    mimeType === 'image/png' ||
    mimeType === 'image/gif' ||
    mimeType === 'image/webp'
  ) {
    return mimeType;
  }
  throw new Error(`Claude does not support media type ${mimeType}. Use an image or Gemini for audio/video.`);
}

export function createClaudeProvider(): LlmProvider {
  let client: Anthropic | null = null;

  function getClient(): Anthropic {
    if (!config.claude.apiKey) {
      throw new Error(
        'Claude is not configured. Set ANTHROPIC_API_KEY (or CLAUDE_API_KEY) in the root .env file.',
      );
    }
    if (!client) {
      client = new Anthropic({ apiKey: config.claude.apiKey });
    }
    return client;
  }

  return {
    id: 'claude',
    name: 'Anthropic Claude',
    supportsMedia: true,
    defaultModel: config.claude.defaultModel,
    models: config.claude.models,

    isConfigured() {
      return Boolean(config.claude.apiKey);
    },

    async complete(prompt, options = {}): Promise<LlmCompleteResult> {
      const model = options.model ?? config.claude.defaultModel;
      const anthropic = getClient();

      const systemParts: string[] = [];
      if (options.system) systemParts.push(options.system);
      if (options.json) systemParts.push('Respond with valid JSON only. No markdown fences.');

      const response = await withRetry(() =>
        anthropic.messages.create({
          model,
          max_tokens: 4096,
          temperature: options.temperature ?? 0.4,
          system: systemParts.length ? systemParts.join('\n\n') : undefined,
          messages: [{ role: 'user', content: prompt }],
        }),
      );

      const text = response.content
        .filter((block): block is Anthropic.TextBlock => block.type === 'text')
        .map((block) => block.text)
        .join('\n');

      return {
        text: requireText(text, 'Claude'),
        model,
        provider: 'claude',
      };
    },

    async completeWithMedia(
      prompt: string,
      media: LlmMediaInput,
      options: LlmCompleteOptions = {},
    ): Promise<LlmCompleteResult> {
      if (!media.mimeType.startsWith('image/')) {
        throw new Error(
          'Claude media completion currently supports images only. Use Gemini for audio/video.',
        );
      }

      const model = options.model ?? config.claude.defaultModel;
      const anthropic = getClient();
      const mediaType = toAnthropicImageMediaType(media.mimeType);

      const systemParts: string[] = [];
      if (options.system) systemParts.push(options.system);
      if (options.json) systemParts.push('Respond with valid JSON only. No markdown fences.');

      const response = await withRetry(() =>
        anthropic.messages.create({
          model,
          max_tokens: 4096,
          temperature: options.temperature ?? 0.2,
          system: systemParts.length ? systemParts.join('\n\n') : undefined,
          messages: [
            {
              role: 'user',
              content: [
                {
                  type: 'image',
                  source: {
                    type: 'base64',
                    media_type: mediaType,
                    data: media.data,
                  },
                },
                { type: 'text', text: prompt },
              ],
            },
          ],
        }),
      );

      const text = response.content
        .filter((block): block is Anthropic.TextBlock => block.type === 'text')
        .map((block) => block.text)
        .join('\n');

      return {
        text: requireText(text, 'Claude'),
        model,
        provider: 'claude',
      };
    },
  };
}
