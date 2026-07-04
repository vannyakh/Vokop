import { config } from '../config.js';
import { createAi302Provider } from './providers/ai302.js';
import { createClaudeProvider } from './providers/claude.js';
import { createGeminiProvider } from './providers/gemini.js';
import { createOpenAiProvider } from './providers/openai.js';
import type { LlmProvider, LlmProviderId, LlmProviderInfo } from './types.js';
import { LLM_PROVIDER_IDS } from './types.js';
import { inferProviderFromModel } from './utils.js';

const providers = new Map<LlmProviderId, LlmProvider>();

function ensureRegistered(): void {
  if (providers.size > 0) return;
  registerProvider(createGeminiProvider());
  registerProvider(createOpenAiProvider());
  registerProvider(createClaudeProvider());
  registerProvider(createAi302Provider());
}

/** Register (or replace) an LLM provider implementation. */
export function registerProvider(provider: LlmProvider): void {
  providers.set(provider.id, provider);
}

export function getProvider(id: LlmProviderId): LlmProvider {
  ensureRegistered();
  const provider = providers.get(id);
  if (!provider) {
    throw new Error(`Unknown LLM provider: ${id}`);
  }
  return provider;
}

export function listProviders(): LlmProviderInfo[] {
  ensureRegistered();
  return LLM_PROVIDER_IDS.map((id) => {
    const provider = providers.get(id)!;
    return {
      id: provider.id,
      name: provider.name,
      configured: provider.isConfigured(),
      defaultModel: provider.defaultModel,
      models: provider.models,
      supportsMedia: provider.supportsMedia,
    };
  });
}

export function listConfiguredProviders(): LlmProviderInfo[] {
  return listProviders().filter((p) => p.configured);
}

/**
 * Resolve which provider to use.
 * Priority: explicit provider → model prefix → LLM_PROVIDER default → first configured.
 */
export function resolveProvider(options?: {
  provider?: LlmProviderId;
  model?: string;
  requireMedia?: boolean;
}): LlmProvider {
  ensureRegistered();

  let id: LlmProviderId | undefined = options?.provider;
  if (!id && options?.model) {
    id = inferProviderFromModel(options.model) ?? undefined;
    // Unknown model ids (deepseek, qwen, glm, …) → 302.AI multi-model gateway
    if (!id) {
      const gateway = providers.get('302ai');
      if (gateway?.isConfigured()) id = '302ai';
    }
  }
  if (!id) {
    id = config.defaultProvider;
  }

  let provider = getProvider(id);

  // Native vendor missing → route through 302.AI gateway (one key, many models)
  if (!provider.isConfigured() && id !== '302ai') {
    const gateway = providers.get('302ai');
    if (gateway?.isConfigured()) {
      provider = gateway;
    }
  }

  if (options?.requireMedia && !provider.supportsMedia) {
    const mediaCapable = listConfiguredProviders().find((p) => p.supportsMedia);
    if (mediaCapable) {
      provider = getProvider(mediaCapable.id);
    }
  }

  if (!provider.isConfigured()) {
    const fallback = listConfiguredProviders().find(
      (p) => !options?.requireMedia || p.supportsMedia,
    );
    if (fallback) {
      return getProvider(fallback.id);
    }
    throw new Error(
      'No LLM provider is configured. Set AI_302_API_KEY, GEMINI_API_KEY, OPENAI_API_KEY, or ANTHROPIC_API_KEY.',
    );
  }

  return provider;
}

export function describeDefaultLlm(): string {
  const configured = listConfiguredProviders();
  if (configured.length === 0) {
    return 'not configured (set AI_302_API_KEY, GEMINI_API_KEY, OPENAI_API_KEY, or ANTHROPIC_API_KEY)';
  }
  const preferred = configured.find((p) => p.id === config.defaultProvider) ?? configured[0]!;
  const others = configured.filter((p) => p.id !== preferred.id).map((p) => p.id);
  const suffix = others.length ? `; also: ${others.join(', ')}` : '';
  return `${preferred.id}/${preferred.defaultModel}${suffix}`;
}
