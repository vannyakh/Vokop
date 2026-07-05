import type { ExportCodec } from '@vokop/shared';

export type WebCodecsExportCodec = 'h264' | 'vp9';

export function mapExportCodecToWebCodecs(codec: ExportCodec, format: string): WebCodecsExportCodec {
  if (format === 'webm' && codec === 'vp9') return 'vp9';
  return 'h264';
}

export async function isWebCodecsExportSupported(
  width: number,
  height: number,
  fps: number,
  codec: WebCodecsExportCodec = 'h264',
): Promise<boolean> {
  if (typeof VideoEncoder === 'undefined' || typeof VideoFrame === 'undefined') return false;

  const evenW = width - (width % 2);
  const evenH = height - (height % 2);
  const config: VideoEncoderConfig =
    codec === 'vp9'
      ? {
          codec: 'vp09.00.10.08',
          width: evenW,
          height: evenH,
          bitrate: 4_000_000,
          framerate: fps,
        }
      : {
          codec: 'avc1.640034',
          avc: { format: 'annexb' },
          width: evenW,
          height: evenH,
          bitrate: 8_000_000,
          framerate: fps,
        };

  const result = await VideoEncoder.isConfigSupported(config);
  return result.supported;
}

/** Snap dimensions to even values required by H.264/VP9 encoders. */
export function evenExportDimensions(width: number, height: number): { width: number; height: number } {
  return {
    width: Math.max(2, width - (width % 2)),
    height: Math.max(2, height - (height % 2)),
  };
}
