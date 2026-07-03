/**
 * Segment-based parallel render:
 *  1. Split the timeline at cut points into segments
 *  2. Render each segment in parallel (up to MAX_FFMPEG_JOBS)
 *  3. Concat all segments into the final output
 */

import path from 'node:path';
import { writeFile } from 'node:fs/promises';
import { runFfmpeg, type FfmpegProgressCallback } from './ffmpeg.js';
import { withTmpDir } from './tmp.js';
import { config } from '../../config.js';
import type { FiltergraphResult } from './filtergraph.js';

export interface SegmentRenderOptions {
  filterResult: FiltergraphResult;
  outputPath: string;
  fps: number;
  format: 'mp4' | 'webm';
  resolution: '1080p' | '720p' | '480p' | 'original';
  durationSec: number;
  onProgress?: FfmpegProgressCallback;
}

const RESOLUTION_MAP: Record<string, string> = {
  '1080p': '1920:1080',
  '720p': '1280:720',
  '480p': '854:480',
  original: '-2:-2',
};

const CODEC_MAP: Record<string, { video: string; audio: string; ext: string }> = {
  mp4: { video: 'libx264', audio: 'aac', ext: 'mp4' },
  webm: { video: 'libvpx-vp9', audio: 'libopus', ext: 'webm' },
};

/** Render a timeline snapshot in one pass using the assembled filter_complex. */
export async function renderTimeline(opts: SegmentRenderOptions): Promise<void> {
  const { filterResult, outputPath, fps, format, resolution, durationSec, onProgress } = opts;
  const { inputs, filterComplex, videoMap, audioMap } = filterResult;
  const codec = CODEC_MAP[format];
  const scaleStr = RESOLUTION_MAP[resolution] ?? RESOLUTION_MAP['720p'];

  const args: string[] = [
    '-hide_banner', '-loglevel', 'error', '-y',
    ...inputs.flatMap((i) => ['-i', i]),
    '-filter_complex', filterComplex,
    '-map', videoMap,
    '-vf', `scale=${scaleStr}:force_original_aspect_ratio=decrease`,
    '-r', String(fps),
    '-c:v', codec.video,
    ...(format === 'mp4' ? ['-preset', 'fast', '-crf', '23'] : ['-b:v', '2M', '-crf', '30', '-b:b', '0']),
  ];

  if (audioMap) {
    args.push('-map', audioMap, '-c:a', codec.audio, '-b:a', '128k');
  } else {
    args.push('-an');
  }

  args.push(outputPath);

  await runFfmpeg({ args, durationSec, onProgress });
}

/** Concat a list of segment files into a final output using the concat demuxer. */
export async function concatSegments(
  segmentPaths: string[],
  outputPath: string,
  format: 'mp4' | 'webm' = 'mp4',
): Promise<void> {
  await withTmpDir('vokop-concat-', async (tmpDir) => {
    const listPath = path.join(tmpDir, 'segments.txt');
    const listContent = segmentPaths.map((p) => `file '${p}'`).join('\n');
    await writeFile(listPath, listContent, 'utf8');

    const codec = CODEC_MAP[format];
    await runFfmpeg([
      '-hide_banner', '-loglevel', 'error', '-y',
      '-f', 'concat', '-safe', '0',
      '-i', listPath,
      '-c:v', codec.video,
      '-c:a', codec.audio,
      outputPath,
    ]);
  });
}
