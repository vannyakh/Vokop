import path from 'node:path';
import { mkdir, rm, writeFile } from 'node:fs/promises';
import type { ExportComposedRenderMeta, ExportRenderSettings, VideoJobResponse } from '@vokop/api';
import type { VideoSession } from '../../lib/sessionStore.js';
import { getVideoSession } from '../../lib/sessionStore.js';
import { createJobRecord, enqueueJob, updateJob } from '../../lib/jobQueue.js';
import { runFfmpeg } from '../../workers/pipeline/ffmpeg.js';
import { EXPORTS_DIR, exportOutputPath, renderExport } from './localRender.js';

interface StartComposedExportInput {
  videoBuffer: Buffer;
  voiceBuffer: Buffer | null;
  meta: ExportComposedRenderMeta;
}

type AudioClipRef = ExportComposedRenderMeta['audioSnapshot']['audioClips'][number];
type VideoClipRef = ExportComposedRenderMeta['audioSnapshot']['videoClips'][number];

/** Kick off server-side mux of WebCodecs H.264 + session/voice audio, then transcode/watermark. */
export async function startComposedExportRender({
  videoBuffer,
  voiceBuffer,
  meta,
}: StartComposedExportInput): Promise<VideoJobResponse> {
  const job = await createJobRecord('export');
  const jobDir = path.join(EXPORTS_DIR, job.jobId);
  await mkdir(jobDir, { recursive: true });

  enqueueJob(job.jobId, async () => {
    try {
      await renderComposedExport(job.jobId, jobDir, videoBuffer, voiceBuffer, meta, async (progress) => {
        await updateJob(job.jobId, { progress });
      });
      await updateJob(job.jobId, {
        progress: 100,
        downloadUrl: `/jobs/${job.jobId}/download`,
        outputFormat: meta.settings.format,
      });
      scheduleCleanup(jobDir);
    } catch (err) {
      await rm(jobDir, { recursive: true, force: true }).catch(() => undefined);
      throw err;
    }
  });

  return job;
}

function scheduleCleanup(jobDir: string): void {
  const ttlMs = Number(process.env.EXPORT_TTL_SEC ?? 3600) * 1000;
  setTimeout(() => {
    void rm(jobDir, { recursive: true, force: true }).catch(() => undefined);
  }, ttlMs).unref();
}

async function renderComposedExport(
  jobId: string,
  jobDir: string,
  videoBuffer: Buffer,
  voiceBuffer: Buffer | null,
  meta: ExportComposedRenderMeta,
  onProgress: (percent: number) => Promise<void>,
): Promise<void> {
  const { settings, fps, audioSnapshot } = meta;
  const h264Path = path.join(jobDir, 'composed.h264');
  await writeFile(h264Path, videoBuffer);
  await onProgress(8);

  const session = audioSnapshot.sessionId ? await getVideoSession(audioSnapshot.sessionId) : null;
  const voicePath = voiceBuffer ? path.join(jobDir, 'voice.webm') : null;
  if (voiceBuffer && voicePath) {
    await writeFile(voicePath, voiceBuffer);
  }

  await onProgress(15);
  const audioPath = await buildExportAudioMix(jobDir, settings, audioSnapshot, session, voicePath);
  await onProgress(35);

  const muxedPath = path.join(jobDir, 'muxed.mp4');
  if (audioPath) {
    await runFfmpeg({
      args: [
        '-f',
        'h264',
        '-r',
        String(fps),
        '-i',
        h264Path,
        '-i',
        audioPath,
        '-map',
        '0:v:0',
        '-map',
        '1:a:0',
        '-c:v',
        'copy',
        '-c:a',
        'aac',
        '-b:a',
        '192k',
        '-shortest',
        muxedPath,
      ],
      onProgress: async (event) => {
        await onProgress(35 + Math.round(event.percent * 0.25));
      },
    });
  } else {
    await runFfmpeg({
      args: ['-f', 'h264', '-r', String(fps), '-i', h264Path, '-c:v', 'copy', '-an', muxedPath],
      onProgress: async (event) => {
        await onProgress(35 + Math.round(event.percent * 0.25));
      },
    });
  }

  await onProgress(65);
  await renderExport(jobDir, muxedPath, settings, async (percent) => {
    await onProgress(65 + Math.round(percent * 0.34));
  });

  const outputPath = exportOutputPath(jobId, settings.format);
  await onProgress(99);
}

async function buildExportAudioMix(
  jobDir: string,
  settings: ExportRenderSettings,
  snapshot: ExportComposedRenderMeta['audioSnapshot'],
  session: VideoSession | null,
  voicePath: string | null,
): Promise<string | null> {
  const rangeDuration = Math.max(0.001, settings.rangeOutSec - settings.rangeInSec);
  const stems: { path: string; delayMs: number; volume: number }[] = [];

  if (snapshot.includeOriginalAudio && session) {
    for (const clip of snapshot.videoClips) {
      if (clip.muted) continue;
      const stemPath = path.join(jobDir, `video-audio-${clip.id}.m4a`);
      const ok = await extractAudioStem(session.filePath, clip, rangeDuration, settings.rangeInSec, stemPath);
      if (!ok) continue;
      const delayMs = Math.max(0, Math.round((clip.start - settings.rangeInSec) * 1000));
      stems.push({ path: stemPath, delayMs, volume: clip.volume ?? snapshot.originalVolume });
    }

    if (stems.length === 0) {
      const stemPath = path.join(jobDir, 'session-audio.m4a');
      await runFfmpeg([
        '-ss',
        String(settings.rangeInSec),
        '-i',
        session.filePath,
        '-t',
        String(rangeDuration),
        '-vn',
        '-c:a',
        'aac',
        '-b:a',
        '192k',
        stemPath,
      ]);
      stems.push({ path: stemPath, delayMs: 0, volume: snapshot.originalVolume });
    }
  }

  for (const clip of snapshot.audioClips) {
    if (clip.muted || !session) continue;
    const stemPath = path.join(jobDir, `audio-${clip.id}.m4a`);
    const ok = await extractAudioStem(session.filePath, clip, rangeDuration, settings.rangeInSec, stemPath);
    if (!ok) continue;
    const delayMs = Math.max(0, Math.round((clip.start - settings.rangeInSec) * 1000));
    stems.push({ path: stemPath, delayMs, volume: clip.volume ?? 1 });
  }

  if (snapshot.includeVoiceover && voicePath) {
    stems.push({ path: voicePath, delayMs: 0, volume: snapshot.voiceVolume });
  }

  if (stems.length === 0) return null;
  if (stems.length === 1) {
    const only = stems[0]!;
    if (only.volume === 1 && only.delayMs === 0) return only.path;
    return applyVolumeDelay(jobDir, only.path, only.delayMs, only.volume, 'mixed.m4a');
  }

  return mixAudioStems(jobDir, stems, rangeDuration);
}

async function extractAudioStem(
  sourcePath: string,
  clip: AudioClipRef | VideoClipRef,
  rangeDuration: number,
  rangeInSec: number,
  outputPath: string,
): Promise<boolean> {
  const clipEnd = clip.start + clip.duration;
  const exportEnd = rangeInSec + rangeDuration;
  const overlapStart = Math.max(clip.start, rangeInSec);
  const overlapEnd = Math.min(clipEnd, exportEnd);
  if (overlapEnd <= overlapStart) return false;

  const sourceOffset = clip.sourceStart + (overlapStart - clip.start);
  const extractDuration = overlapEnd - overlapStart;

  await runFfmpeg([
    '-ss',
    String(sourceOffset),
    '-i',
    sourcePath,
    '-t',
    String(extractDuration),
    '-vn',
    '-c:a',
    'aac',
    '-b:a',
    '192k',
    outputPath,
  ]);
  return true;
}

async function applyVolumeDelay(
  jobDir: string,
  inputPath: string,
  delayMs: number,
  volume: number,
  filename: string,
): Promise<string> {
  const outputPath = path.join(jobDir, filename);
  const filters: string[] = [];
  if (delayMs > 0) filters.push(`adelay=${delayMs}:all=1`);
  if (volume !== 1) filters.push(`volume=${volume}`);
  const filterArgs = filters.length > 0 ? ['-filter:a', filters.join(',')] : [];
  await runFfmpeg(['-i', inputPath, ...filterArgs, '-c:a', 'aac', '-b:a', '192k', outputPath]);
  return outputPath;
}

async function mixAudioStems(
  jobDir: string,
  stems: { path: string; delayMs: number; volume: number }[],
  rangeDuration: number,
): Promise<string> {
  const outputPath = path.join(jobDir, 'mixed.m4a');
  const inputArgs = stems.flatMap((stem) => ['-i', stem.path]);
  const filterParts = stems.map((stem, index) => {
    const parts: string[] = [];
    if (stem.delayMs > 0) parts.push(`adelay=${stem.delayMs}:all=1`);
    if (stem.volume !== 1) parts.push(`volume=${stem.volume}`);
    const chain = parts.length > 0 ? parts.join(',') : 'anull';
    return `[${index}:a]${chain}[a${index}]`;
  });
  const mixInputs = stems.map((_, index) => `[a${index}]`).join('');
  const filter = `${filterParts.join(';')};${mixInputs}amix=inputs=${stems.length}:duration=longest:dropout_transition=0[aout]`;

  await runFfmpeg([
    ...inputArgs,
    '-filter_complex',
    filter,
    '-map',
    '[aout]',
    '-t',
    String(rangeDuration),
    '-c:a',
    'aac',
    '-b:a',
    '192k',
    outputPath,
  ]);

  return outputPath;
}
