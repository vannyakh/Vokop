import { probe } from '@vokop/pipeline';

/** API / session probe shape (matches `@vokop/api` videoProbeResponseSchema). */
export interface ProbeResult {
  duration: number;
  width: number;
  height: number;
  codec: string | null;
  fps: number | null;
  hasAudio: boolean;
  bitrate: number | null;
}

/** Probe a media file via `@vokop/pipeline`, mapped to the video-tools probe shape. */
export async function probeVideo(inputPath: string): Promise<ProbeResult> {
  const info = await probe(inputPath);
  return {
    duration: info.durationSec,
    width: info.width ?? 0,
    height: info.height ?? 0,
    codec: info.videoCodec ?? null,
    fps: info.fps ?? null,
    hasAudio: info.hasAudio,
    bitrate: info.bitrate != null ? Math.round(info.bitrate / 1000) : null,
  };
}
