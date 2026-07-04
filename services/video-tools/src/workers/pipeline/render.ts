import {
  buildRenderArgs,
  runFFmpeg,
  type AssetMediaFlags,
  type Timeline,
} from '@vokop/pipeline';
import type { FfmpegProgressCallback } from './ffmpeg.js';

export type ExportFormat = 'mp4' | 'webm';

export interface RenderTimelineOptions {
  timeline: Timeline;
  assetPaths: Record<string, string>;
  assetFlags?: Record<string, AssetMediaFlags>;
  outputPath: string;
  format: ExportFormat;
  onProgress?: FfmpegProgressCallback;
}

/** Single-pass export using `@vokop/pipeline` filtergraph + ffmpeg runner. */
export async function renderTimeline(opts: RenderTimelineOptions): Promise<void> {
  const { timeline, assetPaths, assetFlags, outputPath, format, onProgress } = opts;

  const compiled = buildRenderArgs({
    timeline,
    assetPaths,
    assetFlags,
    output: outputPath,
    video:
      format === 'webm'
        ? { codec: 'libvpx-vp9', crf: 30, preset: 'medium', pixFmt: 'yuv420p' }
        : { codec: 'libx264', crf: 23, preset: 'fast', pixFmt: 'yuv420p' },
    audio:
      format === 'webm'
        ? { codec: 'libopus', bitrate: '128k' }
        : { codec: 'aac', bitrate: '128k' },
    extraOutputArgs: format === 'mp4' ? ['-movflags', '+faststart'] : [],
  });

  await runFFmpeg({
    args: compiled.args,
    totalDurationSec: compiled.durationSec,
    onProgress: onProgress
      ? (p) => {
          void onProgress({
            percent: p.percent >= 0 ? Math.min(99, Math.round(p.percent * 100)) : 0,
            time: p.outTimeSec,
          });
        }
      : undefined,
  });
}
