export async function withRetry<T>(
  fn: () => Promise<T>,
  retries = 3,
  delayMs = 1000,
): Promise<T> {
  try {
    return await fn();
  } catch (error: unknown) {
    const err = error as { status?: number; statusCode?: number };
    const status = err.status ?? err.statusCode;
    if (retries > 0 && (status === 500 || status === 503 || status === 429)) {
      await new Promise((r) => setTimeout(r, delayMs));
      return withRetry(fn, retries - 1, delayMs * 2);
    }
    throw error;
  }
}

export function parseJsonText(text: string): unknown {
  const trimmed = text.trim();
  const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/);
  const raw = fenced?.[1]?.trim() ?? trimmed;
  return JSON.parse(raw);
}

export function requireText(text: string | null | undefined, provider: string): string {
  const value = text?.trim() ?? '';
  if (!value) throw new Error(`Empty response from ${provider}`);
  return value;
}

/**
 * Infer a *native* provider from a model id when caller omits `provider`.
 * Returns null for gateway-only models (deepseek, qwen, …) so the registry
 * can route them through 302.AI when configured.
 */
export function inferProviderFromModel(model: string): import('./types.js').LlmProviderId | null {
  const m = model.toLowerCase();
  if (m.startsWith('gemini') || m.startsWith('models/gemini')) return 'gemini';
  if (
    m.startsWith('gpt-') ||
    m.startsWith('o1') ||
    m.startsWith('o3') ||
    m.startsWith('o4') ||
    m === 'chat-latest'
  ) {
    return 'openai';
  }
  if (m.startsWith('claude')) return 'claude';
  return null;
}
