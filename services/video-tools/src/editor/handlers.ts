import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { findEditorPreset, getEditorCatalog } from '@vokop/shared';
import type { ApplyEditorEditResponse } from '@vokop/api';
import type { StudioToolId } from '@vokop/shared';
import { runFfmpeg } from '../ffmpeg.js';
import { getVideoSession } from '../lib/sessionStore.js';

export function getCatalogResponse() {
  return { tools: getEditorCatalog() };
}

export async function applyEditorEdit(
  sessionId: string,
  tool: StudioToolId,
  presetId: string,
): Promise<ApplyEditorEditResponse> {
  const session = await getVideoSession(sessionId);
  if (!session) throw new Error('Session not found or expired');

  const preset = findEditorPreset(tool, presetId);
  if (!preset) throw new Error(`Unknown preset "${presetId}" for tool "${tool}"`);

  return {
    tool,
    presetId,
    label: preset.label,
    ffmpegFilter: preset.ffmpegFilter,
    cssFilter: preset.cssFilter,
    appliedAt: new Date().toISOString(),
    meta: preset.meta,
  };
}

export async function renderEditorPreview(
  sessionId: string,
  tool: 'filters' | 'effects',
  presetId: string,
  atTime = 0,
): Promise<{ image: string; width: number; height: number; presetId: string }> {
  const session = await getVideoSession(sessionId);
  if (!session) throw new Error('Session not found or expired');

  const preset = findEditorPreset(tool, presetId);
  if (!preset) throw new Error(`Unknown preset "${presetId}"`);

  const workDir = path.join('/tmp', `vokop-preview-${Date.now()}`);
  const outPath = path.join(workDir, 'preview.jpg');

  const { mkdir, rm } = await import('node:fs/promises');
  await mkdir(workDir, { recursive: true });

  try {
    const vfParts = [
      'scale=640:-2:force_original_aspect_ratio=decrease',
      preset.ffmpegFilter,
    ].filter(Boolean);

    await runFfmpeg([
      '-hide_banner',
      '-loglevel',
      'error',
      '-ss',
      String(Math.max(0, atTime)),
      '-i',
      session.filePath,
      '-frames:v',
      '1',
      '-vf',
      vfParts.join(','),
      '-q:v',
      '6',
      outPath,
    ]);

    const data = await readFile(outPath);
    return {
      image: `data:image/jpeg;base64,${data.toString('base64')}`,
      width: session.probe.width || 640,
      height: session.probe.height || 360,
      presetId,
    };
  } finally {
    await rm(workDir, { recursive: true, force: true }).catch(() => undefined);
  }
}
