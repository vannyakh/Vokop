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

/** Full-length mono PCM peaks via ffmpeg — reliable for long video files. */
export async function extractWaveformPeaksFromFile(
  file: File,
  samples = 32768,
  signal?: AbortSignal,
): Promise<{ peaks: Float32Array; duration: number }> {
  if (signal?.aborted) return { peaks: new Float32Array(0), duration: 0 };

  const ffmpeg = await getFFmpeg();
  if (signal?.aborted) return { peaks: new Float32Array(0), duration: 0 };

  const inputName = `input.${extensionForFile(file)}`;
  const pcmName = 'waveform.pcm';
  const sampleRate = 8000;

  await ffmpeg.writeFile(inputName, await fetchFile(file));
  if (signal?.aborted) {
    await ffmpeg.deleteFile(inputName).catch(() => undefined);
    return { peaks: new Float32Array(0), duration: 0 };
  }

  try {
    await ffmpeg.exec([
      '-i',
      inputName,
      '-vn',
      '-ac',
      '1',
      '-ar',
      String(sampleRate),
      '-f',
      'f32le',
      pcmName,
    ]);
  } catch {
    return { peaks: new Float32Array(samples), duration: 0 };
  } finally {
    await ffmpeg.deleteFile(inputName).catch(() => undefined);
  }

  if (signal?.aborted) {
    await ffmpeg.deleteFile(pcmName).catch(() => undefined);
    return { peaks: new Float32Array(0), duration: 0 };
  }

  try {
    const raw = await ffmpeg.readFile(pcmName);
    const bytes = raw instanceof Uint8Array ? raw : new TextEncoder().encode(String(raw));
    const floatCount = Math.floor(bytes.byteLength / 4);
    if (floatCount <= 0) return { peaks: new Float32Array(samples), duration: 0 };

    const duration = floatCount / sampleRate;
    const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
    const peaks = new Float32Array(samples);
    const blockSize = Math.max(1, Math.floor(floatCount / samples));

    for (let i = 0; i < samples; i++) {
      const start = i * blockSize;
      const end = Math.min(start + blockSize, floatCount);
      let max = 0;
      for (let j = start; j < end; j++) {
        max = Math.max(max, Math.abs(view.getFloat32(j * 4, true)));
      }
      peaks[i] = max;
    }

    return { peaks, duration };
  } finally {
    await ffmpeg.deleteFile(pcmName).catch(() => undefined);
  }
}

export { FILMSTRIP_THUMB_WIDTH } from '@/features/studio/lib/filmstripConstants';
