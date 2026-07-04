const SAMPLE_RATE = 24000;

export function getAudioContext(): AudioContext {
  return new (window.AudioContext ||
    (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)({
    sampleRate: SAMPLE_RATE,
  });
}

export async function ensureAudioContext(ctx: AudioContext | null): Promise<AudioContext> {
  const context = ctx ?? getAudioContext();
  if (context.state === 'suspended') {
    await context.resume();
  }
  return context;
}

function base64ToBytes(base64: string): Uint8Array {
  const binaryString = atob(base64);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

function decodePcm16Base64(ctx: AudioContext, base64: string): AudioBuffer {
  const binaryString = atob(base64);
  const bytes = new Int16Array(binaryString.length / 2);
  for (let i = 0; i < binaryString.length; i += 2) {
    bytes[i / 2] = (binaryString.charCodeAt(i + 1) << 8) | binaryString.charCodeAt(i);
  }

  const float32Data = new Float32Array(bytes.length);
  for (let i = 0; i < bytes.length; i++) {
    float32Data[i] = bytes[i] / 32768.0;
  }

  const audioBuffer = ctx.createBuffer(1, float32Data.length, SAMPLE_RATE);
  audioBuffer.getChannelData(0).set(float32Data);
  return audioBuffer;
}

/**
 * Decode TTS audio from ai-content (mp3/wav) or legacy Gemini PCM s16le @ 24kHz.
 */
export async function decodeBase64ToAudioBuffer(
  ctx: AudioContext,
  base64: string,
): Promise<AudioBuffer> {
  const bytes = base64ToBytes(base64);
  try {
    return await ctx.decodeAudioData(bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength));
  } catch {
    return decodePcm16Base64(ctx, base64);
  }
}

/** Object URL for waveform players — prefers encoded audio (mp3) from ai-content. */
export function audioBase64ToObjectUrl(base64: string, mimeType = 'audio/mpeg'): string {
  const bytes = base64ToBytes(base64);
  return URL.createObjectURL(new Blob([bytes], { type: mimeType }));
}

/** @deprecated Use audioBase64ToObjectUrl — kept for existing imports. */
export function pcmBase64ToObjectUrl(base64: string): string {
  return audioBase64ToObjectUrl(base64);
}

export function audioBufferToWavBlob(buffer: AudioBuffer): Blob {
  const numChannels = buffer.numberOfChannels;
  const sampleRate = buffer.sampleRate;
  const format = 1;
  const bitDepth = 16;
  const samples = buffer.length;
  const blockAlign = (numChannels * bitDepth) / 8;
  const byteRate = sampleRate * blockAlign;
  const dataSize = samples * blockAlign;
  const bufferSize = 44 + dataSize;
  const arrayBuffer = new ArrayBuffer(bufferSize);
  const view = new DataView(arrayBuffer);

  const writeString = (offset: number, str: string) => {
    for (let i = 0; i < str.length; i++) view.setUint8(offset + i, str.charCodeAt(i));
  };

  writeString(0, 'RIFF');
  view.setUint32(4, bufferSize - 8, true);
  writeString(8, 'WAVE');
  writeString(12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, format, true);
  view.setUint16(22, numChannels, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, byteRate, true);
  view.setUint16(32, blockAlign, true);
  view.setUint16(34, bitDepth, true);
  writeString(36, 'data');
  view.setUint32(40, dataSize, true);

  let offset = 44;
  for (let i = 0; i < samples; i++) {
    for (let channel = 0; channel < numChannels; channel++) {
      const sample = Math.max(-1, Math.min(1, buffer.getChannelData(channel)[i]));
      view.setInt16(offset, sample < 0 ? sample * 0x8000 : sample * 0x7fff, true);
      offset += 2;
    }
  }

  return new Blob([arrayBuffer], { type: 'audio/wav' });
}
