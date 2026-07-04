import { FFmpeg } from '@ffmpeg/ffmpeg';
import { fetchFile, toBlobURL } from '@ffmpeg/util';

const CORE_VERSION = '0.12.6';
const CORE_BASE = `https://cdn.jsdelivr.net/npm/@ffmpeg/core@${CORE_VERSION}/dist/umd`;

let ffmpegInstance: FFmpeg | null = null;
let loadPromise: Promise<FFmpeg> | null = null;

export async function getFFmpeg(): Promise<FFmpeg> {
  if (ffmpegInstance?.loaded) return ffmpegInstance;

  if (!loadPromise) {
    loadPromise = (async () => {
      if (typeof crossOriginIsolated !== 'undefined' && !crossOriginIsolated) {
        console.warn(
          '[ffmpeg] Page is not cross-origin isolated. Enable coi-serviceworker or COOP/COEP headers for SharedArrayBuffer.',
        );
      }
      const ffmpeg = new FFmpeg();
      await ffmpeg.load({
        coreURL: await toBlobURL(`${CORE_BASE}/ffmpeg-core.js`, 'text/javascript'),
        wasmURL: await toBlobURL(`${CORE_BASE}/ffmpeg-core.wasm`, 'application/wasm'),
      });
      ffmpegInstance = ffmpeg;
      return ffmpeg;
    })();
  }

  return loadPromise;
}

import {
  FILMSTRIP_THUMB_HEIGHT,
  FILMSTRIP_THUMB_WIDTH,
  getFilmstripFrameCount,
} from '@/features/studio/lib/filmstripConstants';

function extensionForFile(file: File): string {
  const fromName = file.name.split('.').pop()?.toLowerCase();
  if (fromName && fromName.length <= 5) return fromName;
  if (file.type.includes('webm')) return 'webm';
  if (file.type.includes('quicktime')) return 'mov';
  return 'mp4';
}

export async function extractFilmstripThumbnails(
  file: File,
  duration: number,
  signal?: AbortSignal,
): Promise<string[]> {
  if (signal?.aborted) return [];

  const ffmpeg = await getFFmpeg();
  if (signal?.aborted) return [];

  const count = getFilmstripFrameCount(duration);
  const inputName = `input.${extensionForFile(file)}`;

  await ffmpeg.writeFile(inputName, await fetchFile(file));
  if (signal?.aborted) {
    await ffmpeg.deleteFile(inputName).catch(() => undefined);
    return [];
  }

  const fps = Math.max(0.05, count / Math.max(duration, 0.1));

  await ffmpeg.exec([
    '-i',
    inputName,
    '-vf',
    `fps=${fps},scale=${FILMSTRIP_THUMB_WIDTH}:${FILMSTRIP_THUMB_HEIGHT}:force_original_aspect_ratio=decrease,pad=${FILMSTRIP_THUMB_WIDTH}:${FILMSTRIP_THUMB_HEIGHT}:(ow-iw)/2:(oh-ih)/2:black`,
    '-frames:v',
    String(count),
    '-q:v',
    '6',
    'thumb_%03d.jpg',
  ]);

  const entries = await ffmpeg.listDir('/');
  const thumbFiles = entries
    .filter((entry) => entry.isDir === false && entry.name.startsWith('thumb_'))
    .sort((a, b) => a.name.localeCompare(b.name));

  const thumbnails: string[] = [];
  for (const entry of thumbFiles) {
    if (signal?.aborted) break;
    const data = await ffmpeg.readFile(entry.name);
    const bytes = data instanceof Uint8Array ? data : new TextEncoder().encode(String(data));
    const blob = new Blob([new Uint8Array(bytes)], { type: 'image/jpeg' });
    thumbnails.push(URL.createObjectURL(blob));
    await ffmpeg.deleteFile(entry.name).catch(() => undefined);
  }

  await ffmpeg.deleteFile(inputName).catch(() => undefined);
  return thumbnails;
}

export { FILMSTRIP_THUMB_WIDTH } from '@/features/studio/lib/filmstripConstants';
