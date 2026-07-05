/**
 * Export Video modal — local FFmpeg render.
 *
 * Bypasses the R2/BullMQ project-render pipeline entirely: the browser
 * composites the timeline (canvas + captions + mixed audio) and uploads the
 * recorded clip here for a real server-side transcode (container/codec/
 * quality) plus an optional branded watermark bumper. Uses the same
 * "upload once, poll job" pattern as filmstrip jobs (`lib/jobQueue.ts`).
 */

import path from 'node:path';
import { mkdir, rm, writeFile } from 'node:fs/promises';
import type { ExportRenderSettings, VideoJobResponse } from '@vokop/api';
import {
  EXPORT_QUALITY_RESOLUTION,
  EXPORT_RESOLUTION_HEIGHT,
  type ExportCodec,
  type ExportQuality,
} from '@vokop/shared';
import { probeVideo } from '../../workers/pipeline/probe.js';
import { runFfmpeg, extensionForFilename } from '../../workers/pipeline/ffmpeg.js';
import { createJobRecord, enqueueJob, updateJob } from '../../lib/jobQueue.js';

export const EXPORTS_DIR = process.env.EXPORTS_DIR ?? '/tmp/vokop-exports';
const EXPORT_TTL_MS = Number(process.env.EXPORT_TTL_SEC ?? 3600) * 1000;

/** Bumper duration (seconds) appended when the watermark is not removed. */
const WATERMARK_BUMPER_SEC = 1.2;
const WATERMARK_BG_COLOR = '0x141420';

const QUALITY_CRF: Record<ExportQuality, number> = { ultra: 16, high: 20, medium: 23, low: 28 };
const AUDIO_BITRATE: Record<ExportQuality, string> = {
  ultra: '320k',
  high: '192k',
  medium: '128k',
  low: '96k',
};
const VIDEO_ENCODER: Record<ExportCodec, string> = {
  h264: 'libx264',
  h265: 'libx265',
  vp9: 'libvpx-vp9',
};
const AUDIO_ENCODER_FOR_CONTAINER: Record<'mp4' | 'webm', string> = {
  mp4: 'aac',
  webm: 'libopus',
};
const AUDIO_ENCODER_FOR_FORMAT: Record<'mp3' | 'wav' | 'aac', string> = {
  mp3: 'libmp3lame',
  wav: 'pcm_s16le',
  aac: 'aac',
};

function outputPathFor(jobDir: string, format: string): string {
  return path.join(jobDir, `output.${format}`);
}

/** Round to the nearest even integer >= 2 (most video codecs require even dimensions). */
function toEven(n: number): number {
  const rounded = Math.round(n / 2) * 2;
  return Math.max(2, rounded);
}

interface StartLocalExportInput {
  buffer: Buffer;
  originalFilename: string;
  settings: ExportRenderSettings;
}

/** Kick off a local export render job; returns immediately with a pollable job record. */
export async function startLocalExportRender({
  buffer,
  originalFilename,
  settings,
}: StartLocalExportInput): Promise<VideoJobResponse> {
  const job = await createJobRecord('export');
  const jobDir = path.join(EXPORTS_DIR, job.jobId);
  await mkdir(jobDir, { recursive: true });

  const inputExt = extensionForFilename(originalFilename);
  const inputPath = path.join(jobDir, `input.${inputExt}`);
  await writeFile(inputPath, buffer);

  enqueueJob(job.jobId, async () => {
    try {
      await renderExport(jobDir, inputPath, settings, async (progress) => {
        await updateJob(job.jobId, { progress });
      });
      await updateJob(job.jobId, {
        progress: 100,
        downloadUrl: `/jobs/${job.jobId}/download`,
        outputFormat: settings.format,
      });
      scheduleCleanup(jobDir);
    } catch (err) {
      await rm(jobDir, { recursive: true, force: true }).catch(() => undefined);
      throw err;
    }
  });

  return job;
}

/** Resolve the on-disk output path for a completed export job (deterministic from jobId + format). */
export function exportOutputPath(jobId: string, outputFormat: string): string {
  return outputPathFor(path.join(EXPORTS_DIR, jobId), outputFormat);
}

function scheduleCleanup(jobDir: string): void {
  setTimeout(() => {
    void rm(jobDir, { recursive: true, force: true }).catch(() => undefined);
  }, EXPORT_TTL_MS).unref();
}

export async function renderExport(
  jobDir: string,
  inputPath: string,
  settings: ExportRenderSettings,
  onProgress: (percent: number) => Promise<void>,
): Promise<void> {
  const probeResult = await probeVideo(inputPath);
  const durationSec = probeResult.duration > 0 ? probeResult.duration : 1;
  const outputPath = outputPathFor(jobDir, settings.format);

  const reportProgress = async (percent: number) => {
    await onProgress(Math.max(0, Math.min(99, Math.round(percent * 100))));
  };

  if (settings.exportType === 'audio') {
    const format = settings.format as 'mp3' | 'wav' | 'aac';
    const encoder = AUDIO_ENCODER_FOR_FORMAT[format];
    const args = ['-i', inputPath, '-vn', '-c:a', encoder];
    if (format !== 'wav') args.push('-b:a', AUDIO_BITRATE[settings.quality]);
    args.push(outputPath);

    await runFfmpeg({
      args,
      durationSec,
      onProgress: (p) => reportProgress(p.percent),
    });
    return;
  }

  const container = settings.format as 'mp4' | 'webm';
  const codec: ExportCodec = settings.codec ?? (container === 'webm' ? 'vp9' : 'h264');
  const encoder = VIDEO_ENCODER[codec];
  const crf = QUALITY_CRF[settings.quality] + (codec === 'vp9' ? 8 : 0);

  const targetHeight = EXPORT_RESOLUTION_HEIGHT[EXPORT_QUALITY_RESOLUTION[settings.quality]] ?? probeResult.height;
  const srcWidth = probeResult.width || 1280;
  const srcHeight = probeResult.height || 720;
  const scaleToHeight = targetHeight && targetHeight < srcHeight ? targetHeight : srcHeight;
  const scaleW = toEven(srcWidth * (scaleToHeight / srcHeight));
  const scaleH = toEven(scaleToHeight);
  const fps = probeResult.fps && probeResult.fps > 0 ? probeResult.fps : 30;
  const hasAudio = probeResult.hasAudio;

  const audioEncoder = AUDIO_ENCODER_FOR_CONTAINER[container];
  const videoArgs = buildVideoEncoderArgs(crf, codec === 'vp9');

  if (settings.removeWatermark) {
    const args = [
      '-i', inputPath,
      '-vf', `scale=${scaleW}:${scaleH},fps=${fps},format=yuv420p,setsar=1`,
      '-c:v', encoder,
      ...videoArgs,
      ...(hasAudio ? ['-c:a', audioEncoder, '-b:a', '128k'] : ['-an']),
      outputPath,
    ];
    await runFfmpeg({ args, durationSec, onProgress: (p) => reportProgress(p.percent) });
    return;
  }

  // Append a short branded watermark bumper via a solid-color lavfi source + concat filter.
  const inputs = [
    '-i', inputPath,
    '-f', 'lavfi', '-t', String(WATERMARK_BUMPER_SEC), '-i', `color=c=${WATERMARK_BG_COLOR}:s=${scaleW}x${scaleH}:r=${fps}`,
  ];
  const filters = [
    `[0:v]scale=${scaleW}:${scaleH},fps=${fps},format=yuv420p,setsar=1[main]`,
    `[1:v]format=yuv420p,setsar=1[wm]`,
  ];

  let mapArgs: string[];
  if (hasAudio) {
    inputs.push('-f', 'lavfi', '-t', String(WATERMARK_BUMPER_SEC), '-i', 'anullsrc=r=44100:cl=stereo');
    filters.push('[main][0:a][wm][2:a]concat=n=2:v=1:a=1[outv][outa]');
    mapArgs = ['-map', '[outv]', '-map', '[outa]', '-c:a', audioEncoder, '-b:a', '128k'];
  } else {
    filters.push('[main][wm]concat=n=2:v=1:a=0[outv]');
    mapArgs = ['-map', '[outv]', '-an'];
  }

  const args = [
    ...inputs,
    '-filter_complex', filters.join(';'),
    ...mapArgs,
    '-c:v', encoder,
    ...videoArgs,
    outputPath,
  ];

  await runFfmpeg({ args, durationSec: durationSec + WATERMARK_BUMPER_SEC, onProgress: (p) => reportProgress(p.percent) });
}

function buildVideoEncoderArgs(crf: number, isVp9: boolean): string[] {
  if (isVp9) {
    return ['-crf', String(crf), '-b:v', '0', '-deadline', 'good', '-cpu-used', '2'];
  }
  return ['-crf', String(crf), '-preset', 'fast'];
}
