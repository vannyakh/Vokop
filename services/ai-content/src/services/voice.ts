import type { VoiceTtsRequest, VoiceTtsResponse } from '@vokop/api';
import { getSpeechClient } from '../llm/speechClient.js';

const DEFAULT_VOICE = 'alloy';
const DEFAULT_MODEL = 'tts-1';

function stripTimestamps(text: string): string {
  return text.replace(/\[\d{2}:\d{2}(?::\d{2})?\]\s*/g, '').trim();
}

export async function synthesizeSpeech(input: VoiceTtsRequest): Promise<VoiceTtsResponse> {
  const { client, provider } = getSpeechClient(input.provider);
  const model = input.model ?? DEFAULT_MODEL;
  const voice = input.voice ?? DEFAULT_VOICE;
  const clean = stripTimestamps(input.text);

  if (!clean) {
    throw new Error('Text is empty after removing timestamps');
  }

  const speech = await client.audio.speech.create({
    model,
    voice: voice as 'alloy' | 'echo' | 'fable' | 'onyx' | 'nova' | 'shimmer',
    input: clean,
    response_format: input.format ?? 'mp3',
  });

  const buffer = Buffer.from(await speech.arrayBuffer());
  const format = input.format ?? 'mp3';
  const mimeType = format === 'wav' ? 'audio/wav' : format === 'opus' ? 'audio/opus' : 'audio/mpeg';

  return {
    audioBase64: buffer.toString('base64'),
    mimeType,
    format,
    voice,
    model,
    provider,
  };
}
