export {
  listFeatureCapabilities,
  optionsForFeature,
  type AiFeature,
  type FeatureCapability,
} from './capabilities.js';
export {
  complete,
  completeJson,
  completeWithMedia,
  completeWithMediaJson,
} from './client.js';
export {
  describeDefaultLlm,
  getProvider,
  listConfiguredProviders,
  listProviders,
  registerProvider,
  resolveProvider,
} from './registry.js';
export { getSpeechClient } from './speechClient.js';
export type {
  LlmCompleteOptions,
  LlmCompleteResult,
  LlmMediaInput,
  LlmProvider,
  LlmProviderId,
  LlmProviderInfo,
} from './types.js';
export { LLM_PROVIDER_IDS } from './types.js';
