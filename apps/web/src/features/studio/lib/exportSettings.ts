/** Best codec/container the current browser supports, tried in preference order */
export function detectBestVideoCodec(): string {
  const candidates = [
    'video/mp4;codecs=avc1.42E01E,mp4a.40.2',
    'video/mp4;codecs=avc1.42001F',
    'video/webm;codecs=vp9,opus',
    'video/webm;codecs=vp8,opus',
    'video/webm',
  ];
  for (const c of candidates) {
    if (MediaRecorder.isTypeSupported(c)) return c;
  }
  return '';
}

export {
  DEFAULT_EXPORT_SETTINGS,
  resolveExportBitrate,
  resolveExportDimensions,
  type CaptionStyle,
  type ExportQuality,
  type ExportResolution,
  type ExportSettings,
} from '@vokop/shared';
