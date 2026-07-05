import type { ExportComposedAudioSnapshot } from '@vokop/api';
import type { MediaClip } from '@/features/studio/lib/timelineTypes';

function clipRef(clip: MediaClip) {
  return {
    id: clip.id,
    start: clip.start,
    duration: clip.duration,
    sourceStart: clip.sourceStart,
    muted: clip.muted,
    volume: clip.volume,
    linkedVideoClipId: clip.linkedVideoClipId,
  };
}

export function voiceBlobFromBase64(base64: string | null): Blob | null {
  if (!base64) return null;
  const normalized = base64.includes(',') ? base64.split(',')[1]! : base64;
  const binary = atob(normalized);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) {
    bytes[i] = binary.charCodeAt(i);
  }
  return new Blob([bytes], { type: 'audio/mpeg' });
}

/** Audio mux instructions for server-side composed export (Phase C). */
export function buildExportAudioSnapshot(input: {
  sessionId: string | null;
  videoClips: MediaClip[];
  audioClips: MediaClip[];
  includeOriginalAudio: boolean;
  includeVoiceover: boolean;
  originalVolume: number;
  voiceVolume: number;
}): ExportComposedAudioSnapshot {
  return {
    sessionId: input.sessionId ?? undefined,
    originalVolume: input.originalVolume,
    voiceVolume: input.voiceVolume,
    includeOriginalAudio: input.includeOriginalAudio,
    includeVoiceover: input.includeVoiceover,
    audioClips: input.audioClips.map(clipRef),
    videoClips: input.videoClips.map(clipRef),
  };
}
