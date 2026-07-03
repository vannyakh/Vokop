/**
 * Canonical path resolution for all locally stored media files.
 * Layout under userData/vokop-media/:
 *   originals/<assetId>.<ext>   — uploaded original
 *   proxies/<assetId>.mp4       — re-encoded proxy (lower-res for smooth editing)
 *   thumbs/<assetId>/           — filmstrip frame images
 *   waveforms/<assetId>.png     — waveform image
 *   exports/<projectId>/        — rendered output files
 */

import { app } from 'electron';
import path from 'node:path';
import { mkdirSync } from 'node:fs';

let _mediaRoot: string | null = null;

export function mediaRoot(): string {
  if (!_mediaRoot) {
    _mediaRoot = path.join(app.getPath('userData'), 'vokop-media');
    mkdirSync(_mediaRoot, { recursive: true });
  }
  return _mediaRoot;
}

export function originalsDir(): string {
  const d = path.join(mediaRoot(), 'originals');
  mkdirSync(d, { recursive: true });
  return d;
}

export function proxiesDir(): string {
  const d = path.join(mediaRoot(), 'proxies');
  mkdirSync(d, { recursive: true });
  return d;
}

export function thumbsDir(assetId: string): string {
  const d = path.join(mediaRoot(), 'thumbs', assetId);
  mkdirSync(d, { recursive: true });
  return d;
}

export function waveformsDir(): string {
  const d = path.join(mediaRoot(), 'waveforms');
  mkdirSync(d, { recursive: true });
  return d;
}

export function exportsDir(projectId: string): string {
  const d = path.join(mediaRoot(), 'exports', projectId);
  mkdirSync(d, { recursive: true });
  return d;
}

export function originalPath(assetId: string, ext: string): string {
  return path.join(originalsDir(), `${assetId}.${ext}`);
}

export function proxyPath(assetId: string): string {
  return path.join(proxiesDir(), `${assetId}.mp4`);
}

export function waveformPath(assetId: string): string {
  return path.join(waveformsDir(), `${assetId}.png`);
}

export function exportPath(projectId: string, jobId: string, ext: string): string {
  return path.join(exportsDir(projectId), `${jobId}.${ext}`);
}

export function extFromFilename(filename: string): string {
  return filename.split('.').pop()?.toLowerCase() ?? 'mp4';
}
