export { buildExportAudioSnapshot, voiceBlobFromBase64 } from '@/features/studio/lib/export/buildExportAudioSnapshot';
export { BinaryAccumulator } from '@/features/studio/lib/export/binaryAccumulator';
export { ExportClipDecoderPool } from '@/features/studio/lib/export/exportClipDecoders';
export { ExportVideoEncoder } from '@/features/studio/lib/export/exportVideoEncoder';
export { findActiveExportTransition } from '@/features/studio/lib/export/exportActiveTransition';
export { muxExportClip } from '@/features/studio/lib/export/muxExportClip';
export { recordExportAudioPass } from '@/features/studio/lib/export/recordExportAudio';
export { resolveClipVideoSource } from '@/features/studio/lib/export/resolveClipVideoSource';
export {
  evenExportDimensions,
  isWebCodecsExportSupported,
  mapExportCodecToWebCodecs,
  type WebCodecsExportCodec,
} from '@/features/studio/lib/export/webCodecsSupport';
