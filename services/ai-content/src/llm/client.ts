import { resolveProvider } from './registry.js';
import type { LlmCompleteOptions, LlmCompleteResult, LlmMediaInput } from './types.js';
import { parseJsonText } from './utils.js';

/** Text completion via the resolved provider (Gemini / OpenAI / Claude). */
export async function complete(
  prompt: string,
  options: LlmCompleteOptions = {},
): Promise<LlmCompleteResult> {
  const provider = resolveProvider(options);
  return provider.complete(prompt, options);
}

/** Structured JSON completion. */
export async function completeJson<T>(
  prompt: string,
  options: Omit<LlmCompleteOptions, 'json'> = {},
): Promise<T> {
  const { text } = await complete(prompt, { ...options, json: true });
  return parseJsonText(text) as T;
}

/**
 * Multimodal completion. Prefers a media-capable provider (Gemini for audio/video;
 * OpenAI/Claude for images). Falls back to another configured provider when needed.
 */
export async function completeWithMedia(
  prompt: string,
  media: LlmMediaInput,
  options: LlmCompleteOptions = {},
): Promise<LlmCompleteResult> {
  const provider = resolveProvider({ ...options, requireMedia: true });

  if (provider.completeWithMedia) {
    try {
      return await provider.completeWithMedia(prompt, media, options);
    } catch (err) {
      // Image-only providers reject audio/video — fall back to Gemini when available.
      const message = err instanceof Error ? err.message : String(err);
      if (provider.id !== 'gemini' && /audio|video|supports images only/i.test(message)) {
        const gemini = resolveProvider({ provider: 'gemini', requireMedia: true });
        if (gemini.id === 'gemini' && gemini.completeWithMedia) {
          return gemini.completeWithMedia(prompt, media, options);
        }
      }
      throw err;
    }
  }

  throw new Error(`Provider ${provider.id} does not support media completion`);
}

export async function completeWithMediaJson<T>(
  prompt: string,
  media: LlmMediaInput,
  options: Omit<LlmCompleteOptions, 'json'> = {},
): Promise<T> {
  const { text } = await completeWithMedia(prompt, media, { ...options, json: true });
  return parseJsonText(text) as T;
}
