import { fetchFile } from '@ffmpeg/util';
import { getFFmpeg } from '@/features/studio/lib/ffmpeg';
import type { WebCodecsExportCodec } from '@/features/studio/lib/export/webCodecsSupport';

export interface MuxExportClipInput {
  videoBinary: Uint8Array;
  audioBlob: Blob | null;
  fps: number;
  /** Container to produce before server transcode. */
  format: 'mp4' | 'webm';
  codec: WebCodecsExportCodec;
}

/**
 * Mux WebCodecs-encoded video (Annex-B H.264 or VP9 elementary stream) with an
 * optional audio blob via ffmpeg.wasm — Omniclip-style client mux before upload.
 */
export async function muxExportClip(input: MuxExportClipInput): Promise<Blob> {
  const ffmpeg = await getFFmpeg();
  const videoName = input.codec === 'vp9' ? 'composed.ivf' : 'composed.h264';
  const audioName = 'audio.webm';
  const outName = `output.${input.format}`;

  await ffmpeg.writeFile(videoName, input.videoBinary);

  const hasAudio = Boolean(input.audioBlob && input.audioBlob.size > 0);
  if (hasAudio && input.audioBlob) {
    await ffmpeg.writeFile(audioName, await fetchFile(input.audioBlob));
  }

  try {
    if (input.codec === 'vp9') {
      const args = hasAudio
        ? [
            '-r',
            String(input.fps),
            '-i',
            videoName,
            '-i',
            audioName,
            '-map',
            '0:v:0',
            '-map',
            '1:a:0',
            '-c:v',
            'copy',
            '-c:a',
            'libopus',
            '-shortest',
            outName,
          ]
        : ['-r', String(input.fps), '-i', videoName, '-c:v', 'copy', '-an', outName];
      await ffmpeg.exec(args);
    } else {
      const args = hasAudio
        ? [
            '-f',
            'h264',
            '-r',
            String(input.fps),
            '-i',
            videoName,
            '-i',
            audioName,
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
            outName,
          ]
        : ['-f', 'h264', '-r', String(input.fps), '-i', videoName, '-c:v', 'copy', '-an', outName];
      await ffmpeg.exec(args);
    }

    const data = await ffmpeg.readFile(outName);
    const bytes = data instanceof Uint8Array ? data : new TextEncoder().encode(String(data));
    const mime = input.format === 'webm' ? 'video/webm' : 'video/mp4';
    return new Blob([new Uint8Array(bytes)], { type: mime });
  } finally {
    await ffmpeg.deleteFile(videoName).catch(() => undefined);
    await ffmpeg.deleteFile(audioName).catch(() => undefined);
    await ffmpeg.deleteFile(outName).catch(() => undefined);
  }
}
