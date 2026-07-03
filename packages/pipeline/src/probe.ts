import { runFFprobe } from "./ffmpeg.js";

export interface MediaInfo {
  durationSec: number;
  sizeBytes: number;
  container: string;
  hasVideo: boolean;
  hasAudio: boolean;
  width?: number;
  height?: number;
  fps?: number;
  /** degrees from the display matrix / rotate tag (phone footage) */
  rotation: number;
  videoCodec?: string;
  audioCodec?: string;
  audioChannels?: number;
  audioSampleRate?: number;
  bitrate?: number;
}

interface FFprobeStream {
  codec_type?: string;
  codec_name?: string;
  width?: number;
  height?: number;
  avg_frame_rate?: string;
  r_frame_rate?: string;
  channels?: number;
  sample_rate?: string;
  tags?: Record<string, string>;
  side_data_list?: Array<{ side_data_type?: string; rotation?: number }>;
}

interface FFprobeOutput {
  format?: {
    duration?: string;
    size?: string;
    bit_rate?: string;
    format_name?: string;
  };
  streams?: FFprobeStream[];
}

/** Probe a media file into a normalized MediaInfo. */
export async function probe(
  filePath: string,
  opts: { ffprobeBin?: string; signal?: AbortSignal } = {},
): Promise<MediaInfo> {
  const raw = await runFFprobe({
    bin: opts.ffprobeBin,
    signal: opts.signal,
    args: [
      "-v",
      "error",
      "-print_format",
      "json",
      "-show_format",
      "-show_streams",
      filePath,
    ],
  });

  let parsed: FFprobeOutput;
  try {
    parsed = JSON.parse(raw) as FFprobeOutput;
  } catch {
    throw new Error(`ffprobe returned invalid JSON for ${filePath}`);
  }

  const streams = parsed.streams ?? [];
  const video = streams.find((s) => s.codec_type === "video");
  const audio = streams.find((s) => s.codec_type === "audio");

  return {
    durationSec: num(parsed.format?.duration) ?? 0,
    sizeBytes: num(parsed.format?.size) ?? 0,
    container: parsed.format?.format_name ?? "unknown",
    hasVideo: video !== undefined,
    hasAudio: audio !== undefined,
    width: video?.width,
    height: video?.height,
    fps: video ? parseFrameRate(video.avg_frame_rate ?? video.r_frame_rate) : undefined,
    rotation: video ? extractRotation(video) : 0,
    videoCodec: video?.codec_name,
    audioCodec: audio?.codec_name,
    audioChannels: audio?.channels,
    audioSampleRate: num(audio?.sample_rate),
    bitrate: num(parsed.format?.bit_rate),
  };
}

function num(v: string | number | undefined): number | undefined {
  if (v === undefined) return undefined;
  const n = Number(v);
  return Number.isFinite(n) ? n : undefined;
}

function parseFrameRate(rate: string | undefined): number | undefined {
  if (!rate) return undefined;
  const [n, d] = rate.split("/").map(Number);
  if (!n || !d) return undefined;
  const fps = n / d;
  return Number.isFinite(fps) && fps > 0 ? Math.round(fps * 100) / 100 : undefined;
}

function extractRotation(stream: FFprobeStream): number {
  const sideData = stream.side_data_list?.find(
    (s) => s.side_data_type === "Display Matrix",
  );
  if (sideData && typeof sideData.rotation === "number") {
    // ffprobe reports counter-clockwise; normalize to positive clockwise
    return ((-sideData.rotation % 360) + 360) % 360;
  }
  const tag = stream.tags?.rotate;
  if (tag) {
    const r = Number(tag);
    if (Number.isFinite(r)) return ((r % 360) + 360) % 360;
  }
  return 0;
}
