export const LLM_PROVIDER_IDS = ['gemini', 'openai', 'claude', '302ai'] as const;

export type LlmProviderId = (typeof LLM_PROVIDER_IDS)[number];

export interface LlmCompleteOptions {
  system?: string;
  json?: boolean;
  temperature?: number;
  /** Explicit model id (e.g. gpt-4o, claude-sonnet-4-5, gemini-2.0-flash). */
  model?: string;
  /** Explicit provider; inferred from model when omitted. */
  provider?: LlmProviderId;
}

export interface LlmCompleteResult {
  text: string;
  model: string;
  provider: LlmProviderId;
}

export interface LlmMediaInput {
  /** Base64-encoded media (no data: prefix). */
  data: string;
  mimeType: string;
}

export interface LlmProviderInfo {
  id: LlmProviderId;
  name: string;
  configured: boolean;
  defaultModel: string;
  models: string[];
  supportsMedia: boolean;
}

export interface LlmProvider {
  readonly id: LlmProviderId;
  readonly name: string;
  readonly supportsMedia: boolean;
  readonly defaultModel: string;
  readonly models: string[];
  isConfigured(): boolean;
  complete(prompt: string, options?: LlmCompleteOptions): Promise<LlmCompleteResult>;
  completeWithMedia?(
    prompt: string,
    media: LlmMediaInput,
    options?: LlmCompleteOptions,
  ): Promise<LlmCompleteResult>;
}
