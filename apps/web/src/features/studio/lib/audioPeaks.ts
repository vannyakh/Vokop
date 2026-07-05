import { samplesToPeaks } from '@vokop/shared';

/** Decode audio from a media file and return normalized peaks for beat detection. */
export async function extractPeaksFromFile(
  file: File,
  peakCount = 2000,
): Promise<{ peaks: number[]; durationSec: number }> {
  const ctx = new AudioContext();
  try {
    const arrayBuffer = await file.arrayBuffer();
    const audioBuffer = await ctx.decodeAudioData(arrayBuffer.slice(0));
    const durationSec = audioBuffer.duration;
    const channelCount = audioBuffer.numberOfChannels;
    const length = audioBuffer.length;
    const mono = new Float32Array(length);
    for (let ch = 0; ch < channelCount; ch++) {
      const data = audioBuffer.getChannelData(ch);
      for (let i = 0; i < length; i++) {
        mono[i]! += data[i]! / channelCount;
      }
    }
    return { peaks: samplesToPeaks(mono, peakCount), durationSec };
  } finally {
    await ctx.close();
  }
}
