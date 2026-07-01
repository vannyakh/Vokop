const SAMPLE_RATE = 24000;

export function getAudioContext(): AudioContext {
  return new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)({
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

export function decodeBase64ToAudioBuffer(
  ctx: AudioContext,
  base64: string,
): AudioBuffer {
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
