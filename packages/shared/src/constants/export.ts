import type { ExportQuality, ExportResolution } from '../types/export.js';
import { EXPORT_QUALITY_BITRATE, EXPORT_RESOLUTION_HEIGHT } from '../config/defaults.js';

export function resolveExportDimensions(
  videoWidth: number,
  videoHeight: number,
  resolution: ExportResolution,
): { width: number; height: number } {
  const targetH = EXPORT_RESOLUTION_HEIGHT[resolution];
  if (!targetH || targetH >= videoHeight) return { width: videoWidth, height: videoHeight };
  const scale = targetH / videoHeight;
  return {
    width: Math.round(videoWidth * scale),
    height: targetH,
  };
}

export function resolveExportBitrate(quality: ExportQuality): number {
  return EXPORT_QUALITY_BITRATE[quality];
}
