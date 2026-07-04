import dotenv from 'dotenv';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { DEV_PORTS } from '@vokop/shared';
import type { LlmProviderId } from './llm/types.js';
import { LLM_PROVIDER_IDS } from './llm/types.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '../../../.env') });

function parseDefaultProvider(raw: string | undefined): LlmProviderId {
  const value = (raw ?? 'gemini').toLowerCase().replace(/^ai_?/, '');
  // Accept "302", "302.ai", "302ai"
  const normalized = value === '302' || value === '302.ai' ? '302ai' : value;
  if ((LLM_PROVIDER_IDS as readonly string[]).includes(normalized)) {
    return normalized as LlmProviderId;
  }
  return 'gemini';
}

function csvModels(raw: string | undefined, fallback: string): string[] {
  return (raw ?? fallback)
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
}

export const config = {
  port: Number(process.env.AI_CONTENT_PORT ?? DEV_PORTS.aiContent),
  defaultProvider: parseDefaultProvider(process.env.LLM_PROVIDER),
  jobTtlSec: Number(process.env.AI_JOB_TTL_SEC ?? 3600),
  maxConcurrentJobs: Number(process.env.AI_MAX_CONCURRENT_JOBS ?? 2),

  gemini: {
    apiKey: process.env.GEMINI_API_KEY ?? '',
    defaultModel: process.env.GEMINI_MODEL ?? 'gemini-2.0-flash',
    models: csvModels(
      process.env.GEMINI_MODELS,
      'gemini-2.0-flash,gemini-2.5-flash,gemini-2.5-pro',
    ),
  },

  openai: {
    apiKey: process.env.OPENAI_API_KEY ?? '',
    baseUrl: process.env.OPENAI_BASE_URL || undefined,
    defaultModel: process.env.OPENAI_MODEL ?? 'gpt-4o-mini',
    models: csvModels(process.env.OPENAI_MODELS, 'gpt-4o-mini,gpt-4o,o4-mini'),
  },

  claude: {
    apiKey: process.env.ANTHROPIC_API_KEY ?? process.env.CLAUDE_API_KEY ?? '',
    defaultModel: process.env.CLAUDE_MODEL ?? 'claude-sonnet-4-5',
    models: csvModels(
      process.env.CLAUDE_MODELS,
      'claude-sonnet-4-5,claude-haiku-4-5,claude-opus-4-5',
    ),
  },

  /** 302.AI unified gateway — https://302.ai/ · https://302ai-en.apifox.cn/ */
  ai302: {
    apiKey: process.env.AI_302_API_KEY ?? process.env.API_302_KEY ?? '',
    baseUrl: process.env.AI_302_BASE_URL ?? 'https://api.302.ai',
    defaultModel: process.env.AI_302_MODEL ?? 'gpt-4o-mini',
    models: csvModels(
      process.env.AI_302_MODELS,
      [
        'gpt-4o-mini',
        'gpt-4o',
        'claude-sonnet-4-5',
        'gemini-2.0-flash',
        'deepseek-chat',
        'qwen-plus',
        'glm-4-flash',
      ].join(','),
    ),
  },
} as const;
