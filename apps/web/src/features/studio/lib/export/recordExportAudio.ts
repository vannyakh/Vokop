import { decodeBase64ToAudioBuffer } from '@/lib/utils/audio';
import type { VideoAudioGraph } from '@/features/audio/hooks/useAudioEngine';

function pickAudioMimeType(): string {
  const candidates = ['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4'];
  for (const mime of candidates) {
    if (MediaRecorder.isTypeSupported(mime)) return mime;
  }
  return 'audio/webm';
}

export interface RecordExportAudioInput {
  sourceVideo: HTMLVideoElement;
  connectVideoAudioGraph: (video: HTMLVideoElement) => Promise<VideoAudioGraph>;
  rangeIn: number;
  durationSec: number;
  includeOriginalAudio: boolean;
  includeVoiceover: boolean;
  audioBase64: string | null;
  originalVolume: number;
  voiceVolume: number;
  onProgress?: (percent: number) => void;
}

/**
 * Record mixed export audio in a dedicated playback pass so WebCodecs video
 * encoding can run frame-accurately on a separate (seek-based) timeline.
 */
export async function recordExportAudioPass(input: RecordExportAudioInput): Promise<Blob | null> {
  const needsAudio = input.includeOriginalAudio || (input.includeVoiceover && input.audioBase64);
  if (!needsAudio || input.durationSec <= 0) return null;

  const video = input.sourceVideo;
  const { ctx: actx, gain: videoGain } = await input.connectVideoAudioGraph(video);
  const dest = actx.createMediaStreamDestination();
  videoGain.gain.value = input.includeOriginalAudio ? input.originalVolume : 0;
  videoGain.connect(dest);

  let voiceSrc: AudioBufferSourceNode | null = null;
  if (input.audioBase64 && input.includeVoiceover) {
    const audioBuffer = await decodeBase64ToAudioBuffer(actx, input.audioBase64);
    voiceSrc = actx.createBufferSource();
    voiceSrc.buffer = audioBuffer;
    const voiceGain = actx.createGain();
    voiceGain.gain.value = input.voiceVolume;
    voiceSrc.connect(voiceGain);
    voiceGain.connect(dest);
  }

  const mimeType = pickAudioMimeType();
  const recorder = new MediaRecorder(dest.stream, mimeType ? { mimeType } : undefined);
  const chunks: Blob[] = [];
  recorder.ondataavailable = (event) => {
    if (event.data.size > 0) chunks.push(event.data);
  };

  const stopPromise = new Promise<Blob>((resolve) => {
    recorder.onstop = () => {
      videoGain.disconnect(dest);
      videoGain.gain.value = 1.0;
      voiceSrc?.stop();
      video.pause();
      resolve(new Blob(chunks, { type: mimeType }));
    };
  });

  video.pause();
  video.currentTime = input.rangeIn;
  await new Promise<void>((resolve) => {
    if (Math.abs(video.currentTime - input.rangeIn) < 0.001) {
      resolve();
      return;
    }
    video.addEventListener('seeked', () => resolve(), { once: true });
  });

  recorder.start(100);
  voiceSrc?.start(0);

  const startedAt = performance.now();
  await video.play().catch(() => undefined);

  await new Promise<void>((resolve) => {
    const tick = () => {
      const elapsed = (performance.now() - startedAt) / 1000;
      input.onProgress?.(Math.min(99, (elapsed / input.durationSec) * 100));
      if (elapsed >= input.durationSec || video.ended) {
        resolve();
        return;
      }
      requestAnimationFrame(tick);
    };
    tick();
  });

  recorder.stop();
  return stopPromise;
}
