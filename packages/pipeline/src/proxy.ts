import path from "node:path";
import { mkdir, writeFile } from "node:fs/promises";
import { runFFmpeg, runFFmpegCapture, type FFmpegProgress } from "./ffmpeg.js";
import { probe, type MediaInfo } from "./probe.js";

/**
 * Ingest step: turn an uploaded original into everything the editor needs
 * for smooth scrubbing — a low-res proxy, thumbnails, and waveform peaks.
 * Run by services/video-tools ingest.worker (cloud) and by the Electron
 * main process (desktop), producing identical artifacts.
 */

export interface ProxyOptions {
  /** proxy target height; width follows aspect (default 720) */
  height?: number;
  crf?: number;
  preset?: string;
  /** cap proxy frame rate to save decode work while scrubbing (default 30) */
  maxFps?: number;
}

export interface ThumbnailOptions {
  /** number of evenly spaced thumbnails (default 10) */
  count?: number;
  /** thumbnail width in px; height follows aspect (default 160) */
  width?: number;
}

export interface WaveformOptions {
  /** number of peak buckets (default 1000) */
  samples?: number;
}

export interface IngestResult {
  info: MediaInfo;
  proxyPath?: string;
  thumbnailPaths: string[];
  /** normalized 0..1 peaks, or undefined when the asset has no audio */
  waveformPath?: string;
}

export interface IngestOptions {
  ffmpegBin?: string;
  ffprobeBin?: string;
  signal?: AbortSignal;
  onProgress?: (p: FFmpegProgress) => void;
  proxy?: ProxyOptions;
  thumbnails?: ThumbnailOptions;
  waveform?: WaveformOptions;
}

/** Build the ffmpeg args for a scrub-friendly 720p proxy. */
export function buildProxyArgs(
  input: string,
  output: string,
  opts: ProxyOptions = {},
): string[] {
  const height = opts.height ?? 720;
  const crf = opts.crf ?? 23;
  const preset = opts.preset ?? "veryfast";
  const maxFps = opts.maxFps ?? 30;
  return [
    "-i",
    input,
    "-vf",
    // -2 keeps width divisible by 2 for yuv420p; min() avoids upscaling
    `scale=-2:'min(${height},ih)',fps=${maxFps}`,
    "-c:v",
    "libx264",
    "-preset",
    preset,
    "-crf",
    String(crf),
    "-pix_fmt",
    "yuv420p",
    // frequent keyframes = fast seeking in the editor
    "-g",
    String(maxFps),
    "-c:a",
    "aac",
    "-b:a",
    "128k",
    "-movflags",
    "+faststart",
    output,
  ];
}

/** Build ffmpeg args for N evenly spaced thumbnails (pattern must contain %d). */
export function buildThumbnailArgs(
  input: string,
  outPattern: string,
  durationSec: number,
  opts: ThumbnailOptions = {},
): string[] {
  const count = Math.max(1, opts.count ?? 10);
  const width = opts.width ?? 160;
  const interval = Math.max(durationSec / count, 0.04);
  return [
    "-i",
    input,
    "-vf",
    `fps=1/${interval.toFixed(4)},scale=${width}:-1`,
    "-frames:v",
    String(count),
    "-q:v",
    "4",
    outPattern,
  ];
}

/**
 * Extract normalized waveform peaks (0..1) by decoding mono low-rate PCM
 * and taking the max absolute sample per bucket.
 */
export async function extractWaveformPeaks(
  input: string,
  opts: WaveformOptions & { ffmpegBin?: string; signal?: AbortSignal } = {},
): Promise<number[]> {
  const samples = Math.max(16, opts.samples ?? 1000);
  const pcm = await runFFmpegCapture({
    bin: opts.ffmpegBin,
    signal: opts.signal,
    args: [
      "-i",
      input,
      "-map",
      "0:a:0",
      "-ac",
      "1",
      "-ar",
      "4000",
      "-c:a",
      "pcm_s16le",
      "-f",
      "s16le",
      "pipe:1",
    ],
  });

  const totalSamples = Math.floor(pcm.length / 2);
  if (totalSamples === 0) return new Array<number>(samples).fill(0);

  const bucketSize = Math.max(1, Math.floor(totalSamples / samples));
  const peaks: number[] = [];
  for (let b = 0; b < samples; b++) {
    const startIdx = b * bucketSize;
    if (startIdx >= totalSamples) {
      peaks.push(0);
      continue;
    }
    const endIdx = Math.min(totalSamples, startIdx + bucketSize);
    let max = 0;
    for (let i = startIdx; i < endIdx; i++) {
      const v = Math.abs(pcm.readInt16LE(i * 2));
      if (v > max) max = v;
    }
    peaks.push(Math.round((max / 32768) * 1000) / 1000);
  }
  return peaks;
}

/**
 * Full ingest: probe -> proxy (if video) -> thumbnails (if video)
 * -> waveform peaks (if audio). Writes into outDir:
 *   proxy.mp4, thumb_0001.jpg .. thumb_NNNN.jpg, waveform.json
 */
export async function ingestAsset(
  input: string,
  outDir: string,
  opts: IngestOptions = {},
): Promise<IngestResult> {
  await mkdir(outDir, { recursive: true });
  const info = await probe(input, {
    ffprobeBin: opts.ffprobeBin,
    signal: opts.signal,
  });

  const result: IngestResult = { info, thumbnailPaths: [] };

  if (info.hasVideo) {
    const proxyPath = path.join(outDir, "proxy.mp4");
    await runFFmpeg({
      bin: opts.ffmpegBin,
      signal: opts.signal,
      totalDurationSec: info.durationSec,
      onProgress: opts.onProgress,
      args: buildProxyArgs(input, proxyPath, opts.proxy),
    });
    result.proxyPath = proxyPath;

    const count = Math.max(1, opts.thumbnails?.count ?? 10);
    const pattern = path.join(outDir, "thumb_%04d.jpg");
    await runFFmpeg({
      bin: opts.ffmpegBin,
      signal: opts.signal,
      args: buildThumbnailArgs(input, pattern, info.durationSec, opts.thumbnails),
    });
    for (let i = 1; i <= count; i++) {
      result.thumbnailPaths.push(
        path.join(outDir, `thumb_${String(i).padStart(4, "0")}.jpg`),
      );
    }
  }

  if (info.hasAudio) {
    const peaks = await extractWaveformPeaks(input, {
      ...opts.waveform,
      ffmpegBin: opts.ffmpegBin,
      signal: opts.signal,
    });
    const waveformPath = path.join(outDir, "waveform.json");
    await writeFile(
      waveformPath,
      JSON.stringify({ version: 1, samples: peaks.length, peaks }),
    );
    result.waveformPath = waveformPath;
  }

  return result;
}
